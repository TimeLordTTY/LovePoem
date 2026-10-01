import { useEffect, useRef, useState } from "react";
import { hasSyncLogin } from "./sync";
import { requestWebsite, WebsiteRequestError, imageExtension } from "./website-client";

const htmlEscape = (text: string) => text.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] || char));
const eligible = (item: any) => item?.payload?.content?.publicationState === "ready" && item?.payload?.content?.visibility === "public";

export default function WebsitePublish({ item, items = [], close, onLogin }: {
  item?: any; items?: any[]; close: () => void; onLogin: () => void;
}) {
  const candidates = items.filter(eligible);
  const [selectedId, setSelectedId] = useState(String(item?.id || candidates[0]?.id || ""));
  const selected = item || candidates.find(entry => String(entry.id) === selectedId);
  const [types, setTypes] = useState<any[]>([]);
  const [postTypeId, setPostTypeId] = useState("");
  const [series, setSeries] = useState<any[]>([]);
  const [seriesId, setSeriesId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(!hasSyncLogin());
  const uploading = useRef(false);
  const postMap = useRef<Record<string, any>>((() => {
    try { const value = JSON.parse(localStorage.getItem("qx_lovepoem_post_map") || "{}"); return value && typeof value === "object" && !Array.isArray(value) ? value : {}; }
    catch { return {}; }
  })());

  function showError(error: unknown) {
    setMessage(error instanceof Error ? error.message : "上传失败，稿件仍保留在情晓录");
    if (error instanceof WebsiteRequestError && error.status === 401) { setNeedsLogin(true); setConnected(false); }
  }

  async function loadOptions() {
    setBusy(true); setMessage("正在读取上传选项…");
    try {
      const [session, typeData, seriesData] = await Promise.all([
        requestWebsite("/session"), requestWebsite("/post-types"), requestWebsite("/series/all"),
      ]);
      const list = Array.isArray(typeData) ? typeData : typeData?.records || [];
      setTypes(list); setPostTypeId(String(list[0]?.id || ""));
      setSeries(Array.isArray(seriesData) ? seriesData : []);
      setConnected(Boolean(session.connected)); setNeedsLogin(false); setMessage("");
    } catch (error) { showError(error); }
    finally { setBusy(false); }
  }
  useEffect(() => { void loadOptions(); }, []);

  async function uploadImage(source: string, title: string) {
    const response = await fetch(source);
    if (!response.ok) throw new Error("稿件中的图片无法读取，尚未上传稿件");
    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) throw new Error("稿件图片格式无法识别，尚未上传稿件");
    const form = new FormData();
    form.append("file", blob, `qingxiaolu-${crypto.randomUUID().slice(0, 8)}.${imageExtension(blob.type)}`);
    form.append("title", title || "情晓录正文图片");
    const image = await requestWebsite("/assets/upload-image", { method: "POST", body: form });
    if (!image?.id || !image?.url) throw new Error("网站未确认保存图片，稿件尚未上传，请稍后重试");
    return image;
  }

  async function upload() {
    if (uploading.current) return;
    if (!selected || !postTypeId) return setMessage("请选择稿件和网站文章类型");
    if (!eligible(selected)) return setMessage("请先将稿件标为已定稿并允许公开使用，私密稿不会上传");
    uploading.current = true; setBusy(true);
    try {
      const text = String(selected.payload.content?.text || "");
      const images = (selected.payload.content?.images || []).filter((source: string) => Boolean(source));
      const uploaded = [];
      for (const [index, image] of images.entries()) {
        setMessage(`正在上传图片 ${index + 1}/${images.length}…`);
        uploaded.push(await uploadImage(String(image), selected.payload.title));
      }
      const contentHtml = text.split(/\n{2,}/).map(paragraph => `<p>${htmlEscape(paragraph).replace(/\n/g, "<br>")}</p>`).join("") +
        uploaded.map(image => `<p><img src="${htmlEscape(String(image.url))}" alt=""></p>`).join("");
      const map = postMap.current;
      const existingId = map[selected.id];
      setMessage("正在保存网站草稿…");
      const websiteId = await requestWebsite(existingId ? `/posts/${existingId}` : "/posts", {
        method: existingId ? "PUT" : "POST",
        body: JSON.stringify({ _qingxiaoluSourceId: String(selected.id), title: selected.payload.title || text.slice(0, 20) || "图片稿件",
          slug: `qingxiaolu-${String(selected.id).slice(0, 8)}-${Date.now()}`, contentHtml,
          summary: text.replace(/\s+/g, " ").slice(0, 160), postTypeId: Number(postTypeId),
          seriesId: seriesId ? Number(seriesId) : null, coverAssetId: uploaded[0]?.id || null,
          visibility: "PRIVATE", status: "DRAFT", publishDate: null, sortOrder: 0,
          hasChapters: false, autoGenerateToc: true, tagIds: [],
        }),
      });
      if (!websiteId) throw new Error("网站未确认保存，请检查后重试");
      map[selected.id] = websiteId;
      try { localStorage.setItem("qx_lovepoem_post_map", JSON.stringify(map)); }
      catch { setMessage(`网站私密草稿已保存（ID：${websiteId}），本机存储不足，上传记录未写入；稿件没有对外发布。`); return; }
      setMessage(`已上传为网站私密草稿（ID：${websiteId}），没有对外发布`);
    } catch (error) { showError(error); }
    finally { uploading.current = false; setBusy(false); }
  }

  return <main className="website-publish">
    <header><button onClick={close}>‹ 返回</button><b>上传网站</b><span /></header>
    <section>
      <p>沿用情晓录当前账户。这里只上传为网站私密草稿，不会自动对外发布。</p>
      {connected && <div className="website-connected">当前账户已连接 · 无需再次登录</div>}
      {needsLogin ? <button className="primary-project-action" onClick={onLogin}>连接情晓录云端</button> : <>
        {!item && <label>选择稿件<select disabled={busy} value={selectedId} onChange={event => setSelectedId(event.target.value)}>
          <option value="">请选择已定稿且允许公开使用的稿件</option>
          {candidates.map(entry => <option key={entry.id} value={entry.id}>{entry.payload.title || "未命名稿件"}</option>)}
        </select></label>}
        {!selected && <p>暂时没有可上传的稿件。请先在写作页将稿件设为“已定稿”，并在“对外使用选项”中允许公开使用。</p>}
        <label>文章类型<select disabled={busy} value={postTypeId} onChange={event => setPostTypeId(event.target.value)}>
          <option value="">请选择</option>{types.map(type => <option key={type.id} value={type.id}>{type.name || type.title}</option>)}
        </select></label>
        <label>网站系列<select disabled={busy} value={seriesId} onChange={event => setSeriesId(event.target.value)}>
          <option value="">不归入系列</option>{series.map(entry => <option key={entry.id} value={entry.id}>{entry.name || entry.title}</option>)}
        </select></label>
        {selected && <div className="website-draft-preview"><small>准备上传</small><h2>{selected.payload.title}</h2><p>{String(selected.payload.content?.text || "").slice(0, 180)}</p></div>}
        <button className="primary-project-action" disabled={busy || !connected || !selected || !postTypeId} onClick={() => void upload()}>{busy ? "处理中…" : "上传网站草稿"}</button>
        {!connected && !busy && <button onClick={() => void loadOptions()}>重新读取上传选项</button>}
      </>}
      {message && <div className="real-message" role="status">{message}</div>}
    </section>
  </main>;
}
