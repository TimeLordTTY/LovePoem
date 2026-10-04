import { useEffect, useRef, useState } from "react";
import { createArticleImages, createArticleImageArchive, downloadArticleImage } from "./longImage";
import { nativeFileAvailable, saveNativeFile, shareNativeImages } from "./nativeFile";

export default function ArticleImageShare({ title, text, images, close }: {
  title: string; text: string; images: string[]; close: () => void;
}) {
  const [pages, setPages] = useState<Array<{ file: File; url: string }>>([]);
  const [message, setMessage] = useState("正在生成分享图片…");
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const sharing = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let disposed = false;
    let urls: string[] = [];
    setPages([]); setFailed(false); setMessage("正在生成分享图片…");
    void createArticleImages(title, text, images).then(files => {
      if (disposed) return;
      const result = files.map(file => ({ file, url: URL.createObjectURL(file) }));
      urls = result.map(page => page.url);
      setPages(result); setMessage(`已生成 ${files.length} 张图片，正文和附图按顺序排列。`);
    }).catch(error => {
      if (!disposed) { setFailed(true); setMessage(error instanceof Error ? error.message : "图片生成失败，请重试"); }
    });
    return () => { disposed = true; urls.forEach(url => URL.revokeObjectURL(url)); };
  }, [title, text, images, attempt]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && !sharing.current) close(); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [close]);
  const files = pages.map(page => page.file);
  let canShare = false;
  try { canShare = Boolean(files.length && (nativeFileAvailable() || navigator.share && navigator.canShare?.({ files }))); } catch { /* 浏览器不支持文件分享时仍可下载。 */ }
  async function share() {
    if (sharing.current || !files.length) return;
    sharing.current = true; setBusy(true);
    try {
      // 图片提前生成，系统分享直接由本次点击触发。
      if (nativeFileAvailable()) await shareNativeImages(files, title);
      else await navigator.share({ title, files });
      if (mounted.current) setMessage("图片已交给系统分享，请在目标应用中确认发送。");
    } catch (error) {
      if (mounted.current) setMessage(error instanceof Error && error.name === "AbortError"
        ? "已取消分享，图片仍可预览或下载。" : "系统分享未完成，可以重试或下载图片后发送。");
    } finally { sharing.current = false; if (mounted.current) setBusy(false); }
  }
  async function downloadAll() {
    if (sharing.current || !files.length) return;
    sharing.current = true; setBusy(true);
    try {
      const archive = await createArticleImageArchive(files);
      if (nativeFileAvailable()) {
        const result = await saveNativeFile(archive);
        if (mounted.current) setMessage(result.saved ? "图片压缩包已保存，解压后可按页码发送。" : "已取消保存，图片仍可预览或分享。");
      } else if (mounted.current) { downloadArticleImage(archive); setMessage("已开始下载图片压缩包，解压后可按页码发送全部图片。"); }
    } catch {
      if (mounted.current) setMessage("图片打包失败，可以重试或逐张下载。");
    } finally { sharing.current = false; if (mounted.current) setBusy(false); }
  }
  async function savePage(file: File, index: number) {
    if (sharing.current) return;
    sharing.current = true; setBusy(true);
    try {
      if (nativeFileAvailable()) {
        const result = await saveNativeFile(file);
        if (mounted.current) setMessage(result.saved ? `第 ${index + 1} 张图片已保存。` : "已取消保存，图片仍可预览或分享。");
      } else { downloadArticleImage(file); setMessage(`已开始下载第 ${index + 1} 张图片。`); }
    } catch (error) { if (mounted.current) setMessage(error instanceof Error ? error.message : "图片保存失败，请重试"); }
    finally { sharing.current = false; if (mounted.current) setBusy(false); }
  }
  return <main className="mobile-screen image-share-page">
    <header><button onClick={close} disabled={busy}>返回记录</button><h1>分享成图片</h1></header>
    <h2>{title}</h2>
    <p>仅生成本条记录的图片，不会发布到网站。原文和原图保持不变。</p>
    <p role="status" aria-live="polite">{message}</p>
    {failed && <button onClick={() => setAttempt(value => value + 1)}>重新生成</button>}
    {!!pages.length && <>
      <div className="image-share-actions">
        {canShare && <button className="primary" disabled={busy} onClick={() => void share()}>{busy ? "正在分享…" : "分享图片"}</button>}
        <button disabled={busy} onClick={() => void downloadAll()}>下载全部图片（压缩包）</button>
      </div>
      {!canShare && <p>当前浏览器不支持直接分享文件，请下载图片后发送。</p>}
      <div className="image-share-preview">{pages.map((page, index) => <figure key={page.url}>
        <img src={page.url} alt={`分享图片，第 ${index + 1} 张，共 ${pages.length} 张`} loading="lazy" decoding="async" />
        <figcaption>第 {index + 1} / {pages.length} 张 <button disabled={busy} onClick={() => void savePage(page.file, index)}>下载第 {index + 1} 张</button></figcaption>
      </figure>)}</div>
    </>}
  </main>;
}
