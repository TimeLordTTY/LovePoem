import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";

const envText = await readFile(new URL("./.env", import.meta.url), "utf8");
const env = Object.fromEntries(envText.split(/\r?\n/).filter(Boolean).map((line) => {
  const at = line.indexOf("=");
  return [line.slice(0, at), line.slice(at + 1)];
}));
const clientId = env.CLIENT_ID || "qingxiaolu-windows";
const api = env.SYNC_URL.replace(/\/$/, "");
const headers = { authorization: `Bearer ${env.SYNC_TOKEN}`, "content-type": "application/json" };
const pool = mysql.createPool({
  host: "127.0.0.1", port: 9009, user: "root", database: "poem",
  connectionLimit: 2, charset: "utf8mb4",
});

async function push() {
  const [rows] = await pool.query(
    "SELECT * FROM qx_outbox WHERE sent_at IS NULL ORDER BY id ASC LIMIT 50"
  );
  if (!rows.length) return;
  const changes = rows.map((row) => {
    const payload = JSON.parse(row.payload_json);
    return { ...payload, id: row.item_id, baseRevision: Number(row.base_revision),
      deleted: row.operation === "delete" };
  });
  const response = await fetch(`${api}/v1/sync/push`, {
    method: "POST", headers, body: JSON.stringify({ deviceId: clientId, changes }),
  });
  if (!response.ok) throw new Error(`push ${response.status}`);
  const result = await response.json();
  const appliedIds = new Set(result.applied.map((item) => item.id));
  for (const row of rows) {
    if (appliedIds.has(row.item_id)) {
      await pool.query("UPDATE qx_outbox SET sent_at=CURRENT_TIMESTAMP(3) WHERE id=?", [row.id]);
    }
  }
}

async function pull() {
  const [state] = await pool.query("SELECT last_cursor FROM qx_sync_state WHERE client_id=?", [clientId]);
  let cursor = state[0] ? Number(state[0].last_cursor) : 0;
  let more = true;
  while (more) {
    const response = await fetch(`${api}/v1/sync/pull?cursor=${cursor}&limit=50`, { headers });
    if (!response.ok) throw new Error(`pull ${response.status}`);
    const page = await response.json();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const change of page.changes) {
        const item = change.payload;
        await connection.query(
          `INSERT INTO qx_items
            (id,item_type,project_id,title,content_json,revision,deleted,device_id)
           VALUES(?,?,?,?,?,?,?,?)
           ON DUPLICATE KEY UPDATE item_type=VALUES(item_type),project_id=VALUES(project_id),
            title=VALUES(title),content_json=VALUES(content_json),revision=VALUES(revision),
            deleted=VALUES(deleted),device_id=VALUES(device_id),updated_at=CURRENT_TIMESTAMP(3)`,
          [item.id, item.itemType || "note", item.projectId || null, item.title || "",
            JSON.stringify(item.content || {}), change.revision, change.operation === "delete" ? 1 : 0,
            change.deviceId]
        );
      }
      cursor = Number(page.nextCursor);
      await connection.query(
        `INSERT INTO qx_sync_state(client_id,last_cursor) VALUES(?,?)
         ON DUPLICATE KEY UPDATE last_cursor=VALUES(last_cursor),last_seen_at=CURRENT_TIMESTAMP(3)`,
        [clientId, cursor]
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    more = Boolean(page.hasMore);
  }
}

try {
  await push();
  await pull();
  console.log(new Date().toISOString(), "sync ok");
} finally {
  await pool.end();
}
