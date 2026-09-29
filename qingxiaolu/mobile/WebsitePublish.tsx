import { useEffect, useState } from "react";

const DEFAULT_API = "https://poem.timelordtty.cn/api";
const TOKEN_KEY = "qx_lovepoem_token";
const API_KEY = "qx_lovepoem_api";

function escapeHtml(text: string) {
  return text.split(/\n{2,}/).map((paragraph) =>
    `<p>${paragraph.replace(/[&<>"]/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;",
    }[char] || char)).replace(/\n/g, "<br>")}</p>`).join("");
}

export default function WebsitePublish({ item, close }: { item?: any; close: () => void }) {
  const [api, setApi] = useState(localStorage.getItem(API_KEY) || DEFAULT_API);
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || "");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [types, setTypes] = useState<any[]>([]);
  const [postTypeId, setPostTypeId] = useState("");
  const [series, setSeries] = useState<any[]>([]);
  const [seriesId, setSeriesId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function request(path: string, options: RequestInit = {}) {
    const response = await fetch(`${api.replace(/\/+$/, "")}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || (result.code != null && result.code !== 200)) {
      throw new Error(result.message || `网站接口请求失败（${response.status}）`);
    }
    return result.data;
  }

  async function login() {
    setBusy(true);
    try {
      const response = await fetch(`${api.replace(/\/+$/, "")}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();
      if (!response.ok || result.code !== 200 || !result.data) throw new Error(result.message || "网站登录失败");
      localStorage.setItem(TOKEN_KEY, result.data);
      localStorage.setItem(API_KEY, api);
      setToken(result.data);
      setPassword("");
      setMessage("指定网站已连接");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "网站登录失败");
    } finally {
      setBusy(false);
    }
  }

  async function loadTypes() {
    try {
      const data = await request("/post-types");
      const list = Array.isArray(data) ? data : data?.records || [];
      setTypes(list);
      if (list[0]?.id) setPostTypeId(String(list[0].id));
      const seriesData = await request("/series/all");
      setSeries(Array.isArray(seriesData) ? seriesData : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "读取文章类型失败");
    }
  }

  useEffect(() => { if (token) void loadTypes(); }, [token]);

  async function uploadImage(dataUrl: string, title: string) {
    const blob = await (await fetch(dataUrl)).blob();
    const form = new FormData();
    form.append("file", blob, `${title || "qingxiaolu"}-${crypto.randomUUID().slice(0, 8)}.jpg`);
    form.append("title", title || "情晓录正文图片");
    const response = await fetch(`${api.replace(/\/+$/, "")}/assets/upload-image`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: form,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.code !== 200) throw new Error(result.message || "正文图片上传失败");
    return result.data;
  }

  async function publishDraft() {
    if (!item || !postTypeId) return setMessage("请选择网站文章类型");
    if (item.payload.content?.publicationState !== "ready" || item.payload.content?.visibility !== "public") {
      return setMessage("私密稿和待编辑稿不能上传到指定网站");
    }
    setBusy(true);
    try {
      const text = String(item.payload.content?.text || "");
      const localImages = (item.payload.content?.images || []).filter((image: string) => image.startsWith("data:"));
      const uploadedImages = [];
      for (const image of localImages) uploadedImages.push(await uploadImage(image, item.payload.title));
      const imageHtml = uploadedImages.map((image: any) => `<p><img src="${image.url}" alt=""></p>`).join("");
      const map = JSON.parse(localStorage.getItem("qx_lovepoem_post_map") || "{}");
      const existingWebsiteId = map[item.id];
      const websiteId = await request(existingWebsiteId ? `/posts/${existingWebsiteId}` : "/posts", {
        method: existingWebsiteId ? "PUT" : "POST",
        body: JSON.stringify({
          title: item.payload.title || text.slice(0, 20),
          slug: `qingxiaolu-${String(item.id).slice(0, 8)}-${Date.now()}`,
          contentHtml: `${escapeHtml(text)}${imageHtml}`,
          summary: text.replace(/\s+/g, " ").slice(0, 160),
          postTypeId: Number(postTypeId),
          seriesId: seriesId ? Number(seriesId) : null,
          chapterNo: null,
          coverAssetId: uploadedImages[0]?.id || null,
          visibility: "PRIVATE",
          status: "DRAFT",
          publishDate: null,
          sortOrder: 0,
          wallpaperUrl: null,
          wallpaperOpacity: 0.1,
          annotations: null,
          chapterTitle: null,
          tableOfContents: null,
          autoGenerateToc: true,
          hasChapters: false,
          preChapterContent: null,
          tagIds: [],
        }),
      });
      map[item.id] = existingWebsiteId || websiteId;
      localStorage.setItem("qx_lovepoem_post_map", JSON.stringify(map));
      setMessage(existingWebsiteId ? `网站草稿已更新（ID：${existingWebsiteId}）` :
        `网站草稿已创建（ID：${websiteId}）`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "创建网站草稿失败");
    } finally {
      setBusy(false);
    }
  }

  return <main className="website-publish">
    <header><button onClick={close}>‹ 返回</button><b>指定网站上传</b><span /></header>
    <section>
      <label>API 地址<input value={api} onChange={(event) => setApi(event.target.value)} /></label>
      {!token ? <>
        <label>网站账号<input value={username} onChange={(event) => setUsername(event.target.value)} /></label>
        <label>网站密码<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <button className="primary-project-action" disabled={busy} onClick={() => void login()}>
          {busy ? "连接中…" : "登录网站"}
        </button>
      </> : <>
        <div className="website-connected">已连接 LovePoem</div>
        <label>文章类型<select value={postTypeId} onChange={(event) => setPostTypeId(event.target.value)}>
          <option value="">请选择</option>
          {types.map((type) => <option key={type.id} value={type.id}>{type.name || type.title}</option>)}
        </select></label>
        <label>网站系列<select value={seriesId} onChange={(event) => setSeriesId(event.target.value)}>
          <option value="">不归入系列</option>
          {series.map((entry) => <option key={entry.id} value={entry.id}>{entry.name || entry.title}</option>)}
        </select></label>
        {item && <div className="website-draft-preview"><small>准备上传到指定网站</small>
          <h2>{item.payload.title}</h2><p>{String(item.payload.content?.text || "").slice(0, 180)}</p></div>}
        {item && <button className="primary-project-action" disabled={busy} onClick={() => void publishDraft()}>
          {busy ? "上传中…" : "上传为网站草稿"}
        </button>}
        <button className="website-disconnect" onClick={() => {
          localStorage.removeItem(TOKEN_KEY);
          setToken("");
        }}>断开网站连接</button>
      </>}
      {message && <div className="real-message">{message}</div>}
    </section>
  </main>;
}
