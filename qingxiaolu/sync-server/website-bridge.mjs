import { createHmac, createHash, randomUUID } from "node:crypto";

export class WebsiteError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function websiteJwt(user, secret, now = Math.floor(Date.now() / 1000)) {
  if (!secret || Buffer.byteLength(secret) < 64) throw new WebsiteError(503, "网站上传认证尚未配置");
  const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
  const content = `${encode({ alg: "HS512", typ: "JWT" })}.${encode({ sub: String(user.id), username: user.username, iat: now, exp: now + 300 })}`;
  return `${content}.${createHmac("sha512", secret).update(content).digest("base64url")}`;
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 8 * 1024 * 1024) throw new WebsiteError(413, "上传内容过大，图片应不超过 5MB");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// 调用方必须先验证情晓录会话。账号只取自服务器既有的 SYNC_AUTH_USER，不能由请求指定。
// 网站凭证仅在服务器内使用，接口限定为读取上传选项和保存私密草稿。
export function createWebsiteBridge({ pool, allowedUser, secret, fetcher = fetch }) {
  // 只缓存本通道确认上传过的图片，复用前核对资源未删除；有数量和时间上限。
  const imageCache = new Map();
  return async function websiteRequest(req, url) {
    let path = url.pathname.slice("/v1/website".length);
    let method = req.method;
    const session = method === "GET" && path === "/session";
    const update = method === "PUT" && /^\/posts\/\d+$/.test(path);
    const create = method === "POST" && path === "/posts";
    const image = method === "POST" && path === "/assets/upload-image";
    if (!(session || update || create || image || (method === "GET" && ["/post-types", "/series/all"].includes(path)))) {
      throw new WebsiteError(404, "上传接口不存在");
    }
    if (!allowedUser) throw new WebsiteError(503, "情晓录账户绑定尚未配置");
    const [users] = await pool.query("SELECT id,username FROM users WHERE username=? AND status=1 AND deleted=0 LIMIT 1", [allowedUser]);
    const user = users[0];
    if (!user) throw new WebsiteError(403, "当前情晓录账户已停用，不能上传网站");
    const jwt = websiteJwt(user, secret);
    const headers = { authorization: `Bearer ${jwt}` };
    let body;
    let imageKey;
    if (create || update) {
      let data;
      try { data = JSON.parse((await readBody(req)).toString("utf8")); }
      catch (error) { if (error instanceof WebsiteError) throw error; throw new WebsiteError(400, "稿件数据格式不正确"); }
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new WebsiteError(400, "稿件数据格式不正确");
      // 上传始终是私密草稿；不能通过此通道发布或改写已公开的作品。
      headers["content-type"] = "application/json";
      if (update) {
        const [posts] = await pool.query("SELECT created_by,status,visibility,deleted,slug FROM post WHERE id=? LIMIT 1", [path.split("/").at(-1)]);
        const post = posts[0];
        if (post && String(post.created_by) !== String(user.id)) throw new WebsiteError(403, "不能更新其他作者的稿件");
        if (!post || post.deleted || post.status !== "DRAFT" || post.visibility !== "PRIVATE") { method = "POST"; path = "/posts"; }
        else if (post.slug) data.slug = post.slug;
      }
      const sourceId = data._qingxiaoluSourceId;
      delete data._qingxiaoluSourceId;
      if (sourceId != null && (typeof sourceId !== "string" || !sourceId.length || sourceId.length > 200)) throw new WebsiteError(400, "稿件标识不正确");
      if (method === "POST" && sourceId) {
        // 使用原稿件标识找回已创建的私密草稿，网络中断或本机记录丢失后重试也不会重复新建。
        const slug = `qingxiaolu-${createHash("sha256").update(`${user.id}:${sourceId}`).digest("hex").slice(0, 32)}`;
        const [drafts] = await pool.query("SELECT id,slug FROM post WHERE created_by=? AND deleted=0 AND status='DRAFT' AND visibility='PRIVATE' AND (slug=? OR slug LIKE ?) ORDER BY id DESC LIMIT 1", [user.id, slug, `${slug}-%`]);
        if (drafts[0]) { method = "PUT"; path = `/posts/${drafts[0].id}`; data.slug = drafts[0].slug; }
        else {
          const [occupied] = await pool.query("SELECT id FROM post WHERE slug=? LIMIT 1", [slug]);
          data.slug = occupied.length ? `${slug}-${randomUUID().slice(0, 8)}` : slug;
        }
      }
      body = JSON.stringify({ ...data, status: "DRAFT", visibility: "PRIVATE", publishDate: null });
    } else if (image) {
      const contentType = req.headers["content-type"] || "";
      if (!contentType.startsWith("multipart/form-data;")) throw new WebsiteError(400, "请选择要上传的图片");
      headers["content-type"] = contentType;
      body = await readBody(req);
      let form;
      try { form = await new Request("http://localhost/upload", { method: "POST", headers: { "content-type": contentType }, body }).formData(); }
      catch { throw new WebsiteError(400, "图片上传数据格式不正确，请重新选择图片"); }
      const file = form.get("file");
      if (!file || typeof file === "string" || !file.type.startsWith("image/") || !file.size || file.size > 5 * 1024 * 1024) throw new WebsiteError(400, "请选择不超过 5MB 的图片");
      const imageTitle = String(form.get("title") || "");
      imageKey = `${user.id}:${file.type}:${createHash("sha256").update(imageTitle).update("\0").update(Buffer.from(await file.arrayBuffer())).digest("hex")}`;
      const cached = imageCache.get(imageKey);
      if (cached && cached.expires > Date.now()) {
        const [assets] = await pool.query("SELECT id FROM asset WHERE id=? AND deleted=0 LIMIT 1", [cached.result.data.id]);
        if (assets.length) return cached.result;
      }
      imageCache.delete(imageKey);
    }
    let response;
    try {
      response = await fetcher(`http://127.0.0.1:8080/api${session ? "/auth/me" : path}`, {
        method, headers, ...(body ? { body } : {}), signal: AbortSignal.timeout(20000),
      });
    } catch { throw new WebsiteError(502, "网站后台暂时无法连接，请稍后重试"); }
    let result;
    try { result = JSON.parse(await response.text()); }
    catch { throw new WebsiteError(502, "网站后台返回了异常响应，请稍后重试"); }
    if (!result || typeof result !== "object") throw new WebsiteError(502, "网站后台返回了异常响应，请稍后重试");
    if (response.status === 401 || response.status === 403 || Number(result.code) === 401) {
      throw new WebsiteError(502, "网站账户认证暂时不可用，请联系管理员检查上传通道");
    }
    if (!response.ok || Number(result.code) !== 200) throw new WebsiteError(400, result.message || "网站上传失败，稿件仍保留在情晓录");
    if (session) {
      if (String(result.data?.id) !== String(user.id)) throw new WebsiteError(502, "网站账户身份核对失败");
      return { code: 200, data: { connected: true } };
    }
    if (imageKey && result.data?.id && result.data?.url) {
      if (imageCache.size >= 200) imageCache.delete(imageCache.keys().next().value);
      imageCache.set(imageKey, { result, expires: Date.now() + 10 * 60 * 1000 });
    }
    return result;
  };
}
