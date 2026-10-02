export const CONTENT_FORMAT = "qingxiaolu-content-v2";
const CHUNK_BYTES = 256 * 1024;
const LARGE_STRING_BYTES = 64 * 1024;
export const SYNC_BATCH_BYTES = 4 * 1024 * 1024;
type Tree = any[];
export type ContentMemo = Map<string, Promise<Tree>>;

async function apiResponse(response: Response) {
  if (response.status === 401) throw new Error("登录状态已失效，请重新登录");
  if (!response.ok) {
    let message = "内容上传失败，稿件仍保留在本机，请稍后重试。";
    try { const value = await response.json(); if (typeof value?.error === "string") message = value.error; } catch { /* 不解析异常的 HTML 响应 */ }
    throw new Error(message);
  }
  return response.json();
}

async function upload(bytes: Uint8Array<ArrayBuffer>, kind: "image" | "string", prefix: string, api: string, token: string): Promise<Tree> {
  if (bytes.length > 128 * 1024 * 1024) throw new Error("单份内容超过 128 MB，尚未同步。原稿仍在本机，请拆分文档后重试。");
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = Array.from(new Uint8Array(digest)).map(value => value.toString(16).padStart(2, "0")).join("");
  const address = `${api}/v1/sync/content/${hash}?kind=${kind}`;
  const headers = { authorization: `Bearer ${token}` };
  const status = await apiResponse(await fetch(address, { headers }));
  if (!status.present) {
    const total = Math.ceil(bytes.length / CHUNK_BYTES);
    for (let index = 0; index < total; index++) {
      await apiResponse(await fetch(`${api}/v1/sync/content/${hash}/chunks/${index}?kind=${kind}&bytes=${bytes.length}&total=${total}`, {
        method: "PUT", headers: { ...headers, "content-type": "application/octet-stream" },
        body: new Blob([bytes.subarray(index * CHUNK_BYTES, (index + 1) * CHUNK_BYTES)]),
      }));
    }
    await apiResponse(await fetch(`${api}/v1/sync/content/${hash}/complete?kind=${kind}&bytes=${bytes.length}`, { method: "POST", headers }));
  } else if (status.bytes !== bytes.length) throw new Error("已上传内容的大小不一致，原稿仍保留在本机。");
  return ["b", hash, kind, prefix, bytes.length];
}

export async function encodeContent(value: unknown, api: string, token: string, memo: ContentMemo = new Map(), depth = 0): Promise<Tree> {
  if (depth > 100) throw new Error("内容层次太深，尚未同步。原稿仍保留在本机。");
  if (typeof value === "string") return encodeString(value, true, api, token, memo);
  if (value === null || typeof value === "boolean" || typeof value === "number") return ["v", value];
  if (Array.isArray(value)) {
    const nodes: Tree[] = []; for (const entry of value) nodes.push(await encodeContent(entry ?? null, api, token, memo, depth + 1));
    return ["a", nodes];
  }
  if (value && typeof value === "object") {
    const entries: any[] = [];
    for (const [key, entry] of Object.entries(value)) if (entry !== undefined) entries.push([
      await encodeString(key, false, api, token, memo), await encodeContent(entry, api, token, memo, depth + 1),
    ]);
    return ["o", entries];
  }
  return ["v", null];
}

async function encodeString(value: string, image: boolean, api: string, token: string, memo: ContentMemo): Promise<Tree> {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  if (bytes.length < LARGE_STRING_BYTES) return ["s", value];
  const key = `${image ? "value" : "key"}:${value}`;
  if (memo.has(key)) return memo.get(key)!;
  const pending = (async () => {
    const match = image ? value.match(/^(data:image\/[a-z0-9.+-]+;base64,)([a-z0-9+/=]+)$/i) : null;
    if (match) {
      try {
        const binary = atob(match[2]);
        // 只对可原样往返的 Base64 分离图片，其余字符串按原 JSON 保存。
        if (btoa(binary) === match[2]) {
          const raw = new Uint8Array(binary.length); for (let at = 0; at < binary.length; at++) raw[at] = binary.charCodeAt(at);
          return upload(raw, "image", match[1], api, token);
        }
      } catch { /* 非标准 Base64 仍保留原始字符串 */ }
    }
    return upload(bytes, "string", "", api, token);
  })();
  memo.set(key, pending);
  try { return await pending; } catch (error) { memo.delete(key); throw error; }
}

export async function prepareSyncBatch(pending: any[], api: string, token: string, memo: ContentMemo) {
  const changes: any[] = [], encoded: any[] = [];
  let bytes = new TextEncoder().encode(JSON.stringify({ deviceId: "qingxiaolu-web", changes: [] })).length;
  for (const change of pending.slice(0, 500)) {
    const plainBytes = new TextEncoder().encode(JSON.stringify(change)).length;
    const wire = plainBytes < LARGE_STRING_BYTES ? change : {
      ...change, contentEncoding: CONTENT_FORMAT, content: await encodeContent(change.content ?? {}, api, token, memo),
    };
    const size = new TextEncoder().encode(JSON.stringify(wire)).length;
    if (size + 100 > SYNC_BATCH_BYTES) throw new Error("单篇资料结构过大，尚未同步。原稿仍在本机，请拆分资料后重试。");
    if (encoded.length && bytes + size + 1 > SYNC_BATCH_BYTES) break;
    changes.push(change); encoded.push(wire); bytes += size + 1;
  }
  return { changes, body: JSON.stringify({ deviceId: "qingxiaolu-web", changes: encoded }) };
}
