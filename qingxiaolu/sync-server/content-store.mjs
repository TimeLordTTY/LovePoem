import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile, stat, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";

export const CONTENT_FORMAT = "qingxiaolu-content-v2";
export const CHUNK_BYTES = 256 * 1024;
const MAX_BYTES = 128 * 1024 * 1024;
export class ContentError extends Error { constructor(status, message) { super(message); this.status = status; } }
const hashPattern = /^[a-f0-9]{64}$/;
const validKind = kind => ["image", "string"].includes(kind);

export function createContentStore(root, namespace) {
  const directory = join(root, createHash("sha256").update(namespace).digest("hex"));
  const locks = new Map();
  function paths(hash, kind) {
    if (!hashPattern.test(hash) || !validKind(kind)) throw new ContentError(400, "内容标识不正确");
    return { folder: join(directory, kind), blob: join(directory, kind, `${hash}.blob`),
      metadata: join(directory, kind, `${hash}.json`), parts: join(directory, kind, `${hash}.parts`) };
  }
  async function info(hash, kind) {
    const path = paths(hash, kind);
    try {
      const metadata = JSON.parse(await readFile(path.metadata, "utf8"));
      const file = await stat(path.blob);
      return metadata.hash === hash && metadata.kind === kind && file.isFile() && file.size === metadata.bytes ? metadata : null;
    } catch (error) { if (error.code === "ENOENT") return null; throw error; }
  }
  async function chunk(hash, kind, index, total, bytes, data) {
    const path = paths(hash, kind);
    if (!Number.isInteger(bytes) || bytes < 1 || bytes > MAX_BYTES || !Number.isInteger(total) || total !== Math.ceil(bytes / CHUNK_BYTES) ||
      !Number.isInteger(index) || index < 0 || index >= total || data.length !== Math.min(CHUNK_BYTES, bytes - index * CHUNK_BYTES))
      throw new ContentError(400, "分块大小或顺序不正确");
    if (await info(hash, kind)) return { present: true };
    await mkdir(path.parts, { recursive: true, mode: 0o700 });
    const temporary = join(path.parts, `${index}-${randomUUID()}.tmp`);
    await writeFile(temporary, data, { mode: 0o600 });
    await rename(temporary, join(path.parts, `${index}.part`));
    return { uploaded: index };
  }
  async function finish(hash, kind, bytes) {
    const key = `${kind}/${hash}`;
    if (locks.has(key)) return locks.get(key);
    const operation = finalize(hash, kind, bytes).finally(() => locks.delete(key));
    locks.set(key, operation); return operation;
  }
  async function finalize(hash, kind, bytes) {
    const path = paths(hash, kind);
    if (!Number.isInteger(bytes) || bytes < 1 || bytes > MAX_BYTES) throw new ContentError(400, "内容大小不正确");
    const existing = await info(hash, kind);
    if (existing) {
      if (existing.bytes !== bytes) throw new ContentError(409, "内容校验不一致");
      return existing;
    }
    await mkdir(path.folder, { recursive: true, mode: 0o700 });
    const temporary = join(path.folder, `${hash}-${randomUUID()}.tmp`);
    const checksum = createHash("sha256");
    let size = 0;
    async function* parts() {
      for (let index = 0; index < Math.ceil(bytes / CHUNK_BYTES); index++) {
        let data;
        try { data = await readFile(join(path.parts, `${index}.part`)); }
        catch (error) { if (error.code === "ENOENT") throw new ContentError(409, "部分内容尚未上传，请重试"); throw error; }
        if (data.length !== Math.min(CHUNK_BYTES, bytes - index * CHUNK_BYTES)) throw new ContentError(409, "分块不完整，请重试");
        size += data.length; checksum.update(data); yield data;
      }
    }
    try {
      await pipeline(parts(), createWriteStream(temporary, { mode: 0o600 }));
      if (size !== bytes || checksum.digest("hex") !== hash) throw new ContentError(409, "内容校验失败，请重新上传");
      if (kind === "string") await validateJsonString(temporary);
      await rename(temporary, path.blob);
      const metadata = { hash, kind, bytes };
      const metaTemporary = `${path.metadata}-${randomUUID()}.tmp`;
      await writeFile(metaTemporary, JSON.stringify(metadata), { mode: 0o600 });
      await rename(metaTemporary, path.metadata);
      await rm(path.parts, { recursive: true, force: true });
      return metadata;
    } finally { await rm(temporary, { force: true }); }
  }
  async function validate(tree, depth = 0) {
    if (depth > 100 || !Array.isArray(tree)) throw new ContentError(400, "内容结构不正确");
    const [type, value, kind, prefix, bytes] = tree;
    if (type === "s" && tree.length === 2 && typeof value === "string") return;
    if (type === "v" && tree.length === 2 && (value === null || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value)))) return;
    if (type === "b" && tree.length === 5 && validKind(kind) && (kind !== "image" || /^data:image\/[a-z0-9.+-]+;base64,$/i.test(prefix))) {
      const stored = await info(value, kind);
      if (!stored || stored.bytes !== bytes) throw new ContentError(409, "所需内容尚未完整上传，请重试");
      return;
    }
    if (type === "a" && tree.length === 2 && Array.isArray(value)) { for (const node of value) await validate(node, depth + 1); return; }
    if (type === "o" && tree.length === 2 && Array.isArray(value)) {
      for (const pair of value) {
        if (!Array.isArray(pair) || pair.length !== 2 || !["s", "b"].includes(pair[0]?.[0]) || (pair[0][0] === "b" && pair[0][2] !== "string")) throw new ContentError(400, "内容字段不正确");
        await validate(pair[0], depth + 1); await validate(pair[1], depth + 1);
      } return;
    }
    throw new ContentError(400, "内容结构不正确");
  }
  async function stream(writer, tree) {
    const [type, value, kind, prefix] = tree;
    if (type === "s" || type === "v") return writer.write(JSON.stringify(value));
    if (type === "b") {
      const path = paths(value, kind);
      if (kind === "string") {
        for await (const text of createReadStream(path.blob, { encoding: "utf8", highWaterMark: 64 * 1024 })) await writer.write(text);
      } else {
        await writer.write(JSON.stringify(prefix).slice(0, -1));
        let remainder = Buffer.alloc(0);
        for await (const data of createReadStream(path.blob, { highWaterMark: 64 * 1024 })) {
          const buffer = remainder.length ? Buffer.concat([remainder, data]) : data;
          const length = buffer.length - buffer.length % 3;
          await writer.write(buffer.subarray(0, length).toString("base64")); remainder = buffer.subarray(length);
        }
        if (remainder.length) await writer.write(remainder.toString("base64"));
        await writer.write('"');
      } return;
    }
    await writer.write(type === "a" ? "[" : "{");
    for (let index = 0; index < value.length; index++) {
      if (index) await writer.write(",");
      if (type === "a") await stream(writer, value[index]);
      else { await stream(writer, value[index][0]); await writer.write(":"); await stream(writer, value[index][1]); }
    }
    await writer.write(type === "a" ? "]" : "}");
  }
  function estimate(tree) {
    const [type, value, kind, prefix, bytes] = tree;
    if (type === "s" || type === "v") return Buffer.byteLength(JSON.stringify(value));
    if (type === "b") return kind === "string" ? bytes : Buffer.byteLength(JSON.stringify(prefix)) + Math.ceil(bytes / 3) * 4;
    return 2 + Math.max(0, value.length - 1) + value.reduce((total, entry) => total +
      (type === "a" ? estimate(entry) : estimate(entry[0]) + 1 + estimate(entry[1])), 0);
  }
  return { info, chunk, finish, validate, stream, estimate };
}

async function validateJsonString(path) {
  let state = "start", digits = 0;
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const accept = text => {
    for (const character of text) {
      if (state === "start") { if (character !== '"') throw new ContentError(400, "文字内容不正确"); state = "text"; }
      else if (state === "end") throw new ContentError(400, "文字内容不正确");
      else if (state === "unicode") { if (!/[0-9a-f]/i.test(character)) throw new ContentError(400, "文字转义不正确"); if (!--digits) state = "text"; }
      else if (state === "escape") {
        if (character === "u") { state = "unicode"; digits = 4; }
        else if ('"\\/bfnrt'.includes(character)) state = "text";
        else throw new ContentError(400, "文字转义不正确");
      } else if (character === '"') state = "end";
      else if (character === "\\") state = "escape";
      else if (character.charCodeAt(0) < 32) throw new ContentError(400, "文字内容不正确");
    }
  };
  for await (const data of createReadStream(path, { highWaterMark: 64 * 1024 })) accept(decoder.decode(data, { stream: true }));
  accept(decoder.decode());
  if (state !== "end") throw new ContentError(400, "文字内容不完整");
}

export class StreamContent { constructor(store, tree, quoted = false) { this.store = store; this.tree = tree; this.quoted = quoted; } }
export async function streamJson(res, value) {
  const writer = { write: async text => {
    if (res.destroyed) throw new Error("ClientClosed");
    if (!res.write(text)) await new Promise((resolve, reject) => {
      const cleanup = () => { res.off("drain", drained); res.off("close", closed); res.off("error", failed); };
      const drained = () => { cleanup(); resolve(); };
      const closed = () => { cleanup(); reject(new Error("ClientClosed")); };
      const failed = error => { cleanup(); reject(error); };
      res.once("drain", drained); res.once("close", closed); res.once("error", failed);
    });
  } };
  async function write(data) {
    if (data instanceof StreamContent) {
      if (data.quoted) {
        await writer.write('"');
        await data.store.stream({ write: text => writer.write(JSON.stringify(text).slice(1, -1)) }, data.tree);
        await writer.write('"');
      } else await data.store.stream(writer, data.tree);
    } else if (data && typeof data.toJSON === "function") await write(data.toJSON());
    else if (Array.isArray(data)) {
      await writer.write("["); for (let at = 0; at < data.length; at++) { if (at) await writer.write(","); await write(data[at]); } await writer.write("]");
    } else if (data && typeof data === "object") {
      await writer.write("{"); let first = true;
      for (const [key, entry] of Object.entries(data)) if (entry !== undefined) { if (!first) await writer.write(","); first = false; await writer.write(`${JSON.stringify(key)}:`); await write(entry); }
      await writer.write("}");
    } else await writer.write(JSON.stringify(data));
  }
  await write(value); res.end();
}
