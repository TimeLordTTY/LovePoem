import http from "node:http";
import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";

const port = Number(process.env.PORT || 8082);
const host = process.env.HOST || "127.0.0.1";
const token = process.env.SYNC_TOKEN || "";
const decode = (name) => process.env[`${name}_BASE64`]
  ? Buffer.from(process.env[`${name}_BASE64`], "base64").toString("utf8")
  : process.env[name];
const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 9009),
  user: decode("DB_USER"),
  password: decode("DB_PASSWORD"),
  database: process.env.DB_NAME || "poem",
  connectionLimit: 5,
  charset: "utf8mb4",
});

function json(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...res.corsHeaders,
  });
  res.end(JSON.stringify(body));
}

function corsHeaders(req) {
  const origin = req.headers.origin || "";
  const allowed = new Set([
    "https://poem.timelordtty.cn",
    "capacitor://localhost",
    "http://localhost",
    "https://localhost",
  ]);
  return allowed.has(origin) ? {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "authorization,content-type",
    "access-control-max-age": "86400",
    vary: "Origin",
  } : {};
}

async function body(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 5 * 1024 * 1024) throw new Error("请求内容超过 5MB");
    chunks.push(chunk);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

function authorized(req) {
  if (!token) return false;
  return req.headers.authorization === `Bearer ${token}`;
}

async function validLogin(username, password) {
  const allowedUser = process.env.SYNC_AUTH_USER || "";
  if (!allowedUser || username !== allowedUser) return false;
  const response = await fetch("http://127.0.0.1:8080/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) return false;
  const result = await response.json();
  return Number(result.code) === 200;
}

async function migrate() {
  const sql = await readFile(new URL("./schema.sql", import.meta.url), "utf8");
  const connection = await pool.getConnection();
  try {
    for (const statement of sql.split(/;\s*(?:\r?\n|$)/).map((x) => x.trim()).filter(Boolean)) {
      await connection.query(statement);
    }
  } finally {
    connection.release();
  }
}

async function pushChanges(payload) {
  const deviceId = String(payload.deviceId || "").slice(0, 100);
  const changes = Array.isArray(payload.changes) ? payload.changes.slice(0, 500) : [];
  if (!deviceId) throw new Error("缺少 deviceId");
  const connection = await pool.getConnection();
  const applied = [];
  const conflicts = [];
  try {
    await connection.beginTransaction();
    for (const change of changes) {
      const id = String(change.id || "").slice(0, 64);
      if (!id) continue;
      const [rows] = await connection.query("SELECT * FROM qx_items WHERE id=? FOR UPDATE", [id]);
      const current = rows[0];
      const baseRevision = Number(change.baseRevision || 0);
      if (current && Number(current.revision) !== baseRevision) {
        conflicts.push({ id, server: current });
        continue;
      }
      const revision = current ? Number(current.revision) + 1 : 1;
      const operation = change.deleted ? "delete" : "upsert";
      const content = JSON.stringify(change.content ?? {});
      await connection.query(
        `INSERT INTO qx_items
          (id,item_type,project_id,title,content_json,revision,deleted,device_id)
         VALUES (?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE item_type=VALUES(item_type),project_id=VALUES(project_id),
          title=VALUES(title),content_json=VALUES(content_json),revision=VALUES(revision),
          deleted=VALUES(deleted),device_id=VALUES(device_id),updated_at=CURRENT_TIMESTAMP(3)`,
        [id, String(change.itemType || "note").slice(0, 32), change.projectId || null,
          String(change.title || "").slice(0, 500), content, revision, change.deleted ? 1 : 0, deviceId]
      );
      const snapshot = { ...change, id, revision, deviceId };
      const [result] = await connection.query(
        "INSERT INTO qx_changes(item_id,revision,operation,payload_json,device_id) VALUES(?,?,?,?,?)",
        [id, revision, operation, JSON.stringify(snapshot), deviceId]
      );
      applied.push({ id, revision, seq: Number(result.insertId) });
    }
    await connection.commit();
    return { applied, conflicts };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

const server = http.createServer(async (req, res) => {
  try {
    res.corsHeaders = corsHeaders(req);
    if (req.method === "OPTIONS") {
      res.writeHead(204, res.corsHeaders);
      return res.end();
    }
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (req.method === "GET" && url.pathname === "/health") {
      await pool.query("SELECT 1");
      return json(res, 200, { ok: true, service: "qingxiaolu-sync", time: new Date().toISOString() });
    }
    if (req.method === "POST" && url.pathname === "/v1/auth/login") {
      const credentials = await body(req);
      if (!await validLogin(String(credentials.username || ""), String(credentials.password || ""))) {
        return json(res, 401, { error: "用户名或密码错误" });
      }
      return json(res, 200, { token, syncUrl: "/qingxiaolu-api" });
    }
    if (!authorized(req)) return json(res, 401, { error: "未授权" });
    if (req.method === "GET" && url.pathname === "/v1/sync/pull") {
      const cursor = Math.max(0, Number(url.searchParams.get("cursor") || 0));
      const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") || 100)));
      const [rows] = await pool.query(
        "SELECT seq,item_id,revision,operation,payload_json,device_id,changed_at FROM qx_changes WHERE seq>? ORDER BY seq ASC LIMIT ?",
        [cursor, limit + 1]
      );
      const hasMore = rows.length > limit;
      const page = rows.slice(0, limit).map((row) => ({
        seq: Number(row.seq), id: row.item_id, revision: Number(row.revision),
        operation: row.operation, payload: JSON.parse(row.payload_json),
        deviceId: row.device_id, changedAt: row.changed_at,
      }));
      return json(res, 200, {
        changes: page,
        nextCursor: page.length ? page.at(-1).seq : cursor,
        hasMore,
      });
    }
    if (req.method === "POST" && url.pathname === "/v1/sync/push") {
      return json(res, 200, await pushChanges(await body(req)));
    }
    return json(res, 404, { error: "接口不存在" });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: "服务暂时不可用" });
  }
});

await migrate();
server.listen(port, host, () => console.log(`qingxiaolu-sync listening on ${host}:${port}`));
