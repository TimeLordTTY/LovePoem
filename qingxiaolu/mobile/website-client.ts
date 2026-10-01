import { SYNC_API, getSyncToken, disconnectSync } from "./sync";

export class WebsiteRequestError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function imageExtension(mime: string) {
  const known: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp",
    "image/svg+xml": "svg", "image/avif": "avif", "image/bmp": "bmp", "image/x-icon": "ico" };
  return known[mime.toLowerCase()] || "img";
}

export async function requestWebsite(path: string, options: RequestInit = {}) {
  const token = getSyncToken();
  if (!token) throw new WebsiteRequestError(401, "请先连接情晓录云端，上传会沿用同一账户");
  let response: Response;
  try {
    response = await fetch(`${SYNC_API}/v1/website${path}`, { ...options,
      headers: { ...(options.body && !(options.body instanceof FormData) ? { "content-type": "application/json" } : {}),
        ...(options.headers || {}), authorization: `Bearer ${token}` },
    });
  } catch { throw new WebsiteRequestError(0, "网络暂时无法连接，稿件仍保留在情晓录"); }
  if (response.status === 401) {
    disconnectSync();
    throw new WebsiteRequestError(401, "情晓录登录状态已失效，请重新连接情晓录");
  }
  let result: any;
  try { result = JSON.parse(await response.text()); }
  catch { throw new WebsiteRequestError(response.status, "上传服务返回了异常响应，请稍后重试"); }
  if (!result || typeof result !== "object") throw new WebsiteRequestError(response.status, "上传服务返回了异常响应，请稍后重试");
  if (!response.ok || (result.code != null && Number(result.code) !== 200)) {
    throw new WebsiteRequestError(response.status, result.error || result.message || "上传失败，稿件仍保留在情晓录");
  }
  return result.data;
}
