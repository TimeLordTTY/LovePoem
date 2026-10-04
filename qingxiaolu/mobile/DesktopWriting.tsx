import { useRef, useState } from "react";
import { desktopAvailable, desktopRequest, desktopRootDirectory } from "./desktopClient";
import { projectFolder } from "./folderSync";
import { createWritingDocx } from "./docxExport";
import { FileImporter } from "./importers/FileImporter";
type Snapshot = { id: string; title: string; text: string; images: string[]; projectId: string; projectTitle: string };
type Link = { parts: string[]; hash: string };
const signature = (value: Snapshot) => JSON.stringify([value.title, value.text, value.images, value.projectId]);
function links(): Record<string, Link> { try { return JSON.parse(localStorage.getItem("qx_wps_links") || "{}"); } catch { return {}; } }

export default function DesktopWriting({ snapshot, saveLocal, apply }: {
  snapshot: Snapshot; saveLocal: () => Promise<string | undefined>; apply: (text: string, images: string[]) => Promise<void>;
}) {
  const latest = useRef({ snapshot, saveLocal, apply }); latest.current = { snapshot, saveLocal, apply };
  const running = useRef(false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [preview, setPreview] = useState<{ text: string; images: string[]; link: Link; original: string } | null>(null);
  if (!desktopAvailable()) return null;
  async function location(id: string) {
    const current = latest.current.snapshot;
    const folder = await projectFolder(desktopRootDirectory(), current.projectId || "standalone", current.projectTitle || "散篇记录");
    const word = await folder.getDirectoryHandle("Word编辑", { create: true });
    return { directory: word, parts: [...word.desktopParts, `${id}.docx`] };
  }
  async function run(action: () => Promise<void>) {
    if (running.current) return;
    running.current = true; setBusy(true);
    try { await action(); } catch (error) { setMessage(error instanceof Error ? error.message : "本地 Word 操作失败，原内容仍保留"); }
    finally { running.current = false; setBusy(false); }
  }
  async function open() {
    const original = signature(latest.current.snapshot);
    const id = await latest.current.saveLocal();
    if (!id) throw new Error("请先输入正文或加入图片");
    const current = latest.current.snapshot;
    const { directory, parts } = await location(id);
    let old: { hash: string } | null = null;
    try { old = await desktopRequest("read", { parts }); } catch (error) { if ((error as Error).name !== "NotFoundError") throw error; }
    const tracked = links()[id];
    if (old && (!tracked || JSON.stringify(tracked.parts) !== JSON.stringify(parts) || old.hash !== tracked.hash))
      throw new Error("Word 文件已有本地修改，未覆盖。请先点击“读回 WPS 文件”对照并确认。");
    const file = await createWritingDocx(current.title, current.text, current.images);
    if (signature(latest.current.snapshot) !== original) throw new Error("生成 Word 时正文发生变化，未写入，请重试");
    const handle = await directory.getFileHandle(`${id}.docx`, { create: true });
    const writable = await handle.createWritable({ expectedHash: old?.hash || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" });
    let hash: string;
    try { await writable.write(file); hash = (await writable.close()).hash; } catch (error) { await writable.abort(); throw error; }
    localStorage.setItem("qx_wps_links", JSON.stringify({ ...links(), [id]: { parts, hash } }));
    await desktopRequest("open-wps", { parts });
    setMessage("Word 文件已保存，已请求 WPS 打开；在 WPS 保存后点击“读回 WPS 文件”。");
  }
  async function readBack() {
    const id = latest.current.snapshot.id;
    if (!id) throw new Error("尚未关联 Word 文件，请先保存并用 WPS 编辑");
    const { parts } = await location(id);
    const value = await desktopRequest("read", { parts });
    const file = new File([Uint8Array.from(atob(value.base64), char => char.charCodeAt(0))], "WPS编辑.docx");
    const [candidate] = await new FileImporter().collect({ mode: "file", files: [file] });
    setPreview({ text: candidate.text, images: candidate.images || [], link: { parts, hash: value.hash }, original: signature(latest.current.snapshot) });
    setMessage("已读取 Word 文件，请对照后确认。尚未改动当前记录，也未上传云端。");
  }
  async function confirmRead() {
    if (!preview) return;
    const id = latest.current.snapshot.id;
    if (signature(latest.current.snapshot) !== preview.original || (await desktopRequest("read", { parts: preview.link.parts })).hash !== preview.link.hash)
      throw new Error("预览后正文或 Word 文件发生变化，请取消后重新读回，原文仍保留");
    await latest.current.apply(preview.text, preview.images);
    localStorage.setItem("qx_wps_links", JSON.stringify({ ...links(), [id]: preview.link }));
    setPreview(null); setMessage("已读回并保存到本机，原内容保留在版本中；未上传云端。");
  }
  return <section className="desktop-writing">
    <b>本地 Word 编辑</b><span>总文件夹：{desktopRootDirectory().name}</span>
    <div><button disabled={busy} onClick={() => void run(open)}>保存并用 WPS 编辑</button>
      <button disabled={busy} onClick={() => void run(readBack)}>读回 WPS 文件</button></div>
    <p role="status">{message || "手动写入、手动读回，不会在后台覆盖正文。"}</p>
    {preview && <div className="wps-read-preview"><h3>Word 读回预览</h3>
      <p>{preview.images.length} 张图片；原记录版本会保留。</p>
      <div className="candidate-images">{preview.images.map((image, index) => <img key={index} src={image} alt={`Word 读回图片 ${index + 1}`} loading="lazy" />)}</div>
      <div className="folder-preview-compare"><div><b>当前情晓录</b><pre>{snapshot.text}</pre></div><div><b>本地 Word</b><pre>{preview.text}</pre></div></div>
      <button disabled={busy} onClick={() => setPreview(null)}>取消读回</button>
      <button disabled={busy} onClick={() => void run(confirmRead)}>确认读回并保存</button></div>}
  </section>;
}
