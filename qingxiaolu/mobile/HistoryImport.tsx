import { useEffect, useMemo, useRef, useState } from "react";
import { importAdapters, type ImportCandidate, type ImportMode } from "./importers";
import { candidate } from "./importers/types";
import OriginalDownloadLink from "./OriginalDownloadLink";
import { commitImport, filterPreviouslyImported } from "./importers/importCommit";
import { nativeCaptureAvailable, openNativeCaptureSettings } from "./nativeHistory";
import { loadImportPreview, saveImportPreview, removeImportPreview, listImportPreviews, claimImportPreview,
  discardImportPreview, type ImportPreview, type ImportPreviewSummary } from "./importPreviewStore";

const modeLabels: Record<ImportMode, string> = {
  browser: "电脑网页辅助",
  root: "Root 读取",
  accessibility: "辅助浏览",
  ocr: "OCR 识别",
  file: "文件解析",
};

export default function HistoryImport({
  close,
  kind = "history",
  projects = [],
  initialProjectId = "",
  initialFiles = [],
}: {
  close: () => void;
  kind?: "history" | "documents";
  projects?: any[];
  initialProjectId?: string;
  initialFiles?: File[];
}) {
  const previewKey = `qx_import_preview_${kind}`;
  const [initialStoreKey] = useState(() => {
    const key = `qx_import_session_${kind}`;
    const id = sessionStorage.getItem(key) || crypto.randomUUID();
    sessionStorage.setItem(key, id);
    return `${kind}:${id}`;
  });
  const [sourceStoreKey, setSourceStoreKey] = useState(initialStoreKey);
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const [previewStoreKey, setPreviewStoreKey] = useState(initialStoreKey);
  const [recoverable, setRecoverable] = useState<ImportPreviewSummary[]>([]);
  const [initialPreview] = useState<any>(() => {
    try { const value = JSON.parse(sessionStorage.getItem(previewKey) || "null"); return Array.isArray(value?.candidates) ? value : null; }
    catch { return null; }
  });
  const [step, setStep] = useState<"source" | "preview">(initialPreview ? "preview" : "source");
  const [candidates, setCandidates] = useState<ImportCandidate[]>(initialPreview?.candidates || []);
  const [message, setMessage] = useState("");
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [previewStatus, setPreviewStatus] = useState("正在恢复临时预览…");
  const fileInput = useRef<HTMLInputElement>(null);
  const [targetProjectId, setTargetProjectId] = useState(initialPreview?.targetProjectId || initialProjectId);
  const initialFilesRead = useRef(false);
  const [targetCategory, setTargetCategory] = useState(initialPreview?.targetCategory || "正文");
  const [pastedResult, setPastedResult] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [skipDuplicates, setSkipDuplicates] = useState(initialPreview?.skipDuplicates !== false);
  const previewRef = useRef<ImportPreview>(null);
  const previewDone = useRef(false);
  const closeTimer = useRef<number | undefined>(undefined);
  const [recordsChanged, setRecordsChanged] = useState(0);
  useEffect(() => {
    const changed = () => setRecordsChanged(value => value + 1);
    window.addEventListener("qx-writing-change", changed);
    return () => { clearTimeout(closeTimer.current); window.removeEventListener("qx-writing-change", changed); };
  }, []);
  const pendingCandidates = useMemo(() => skipDuplicates
    ? filterPreviouslyImported(candidates, targetProjectId || undefined, kind === "documents" ? targetCategory : "正文") : candidates,
  [candidates, skipDuplicates, targetProjectId, targetCategory, kind, recordsChanged]);
  const persistedPreview = useRef<ImportPreview | null>(null);
  const preview = useMemo(() => ({ candidates, targetProjectId, targetCategory, skipDuplicates }),
    [candidates, targetProjectId, targetCategory, skipDuplicates]);
  previewRef.current = preview;
  async function refreshRecoverable() {
    try { setRecoverable(await listImportPreviews(kind)); }
    catch { setMessage("未完成预览列表暂时无法读取，请重新打开导入页面。现有预览尚未删除。"); }
  }
  async function clearPreview() {
    previewDone.current = true;
    try {
      await removeImportPreview(previewStoreKey);
      setRecoverable(current => current.filter(saved => saved.key !== previewStoreKey));
      setPreviewStatus("");
      sessionStorage.removeItem(previewKey); sessionStorage.removeItem("qx_import_active");
    } catch (error) { previewDone.current = false; throw error; }
  }
  useEffect(() => {
    let active = true;
    void (async () => {
      const key = await claimImportPreview(sourceStoreKey);
      const saved = await loadImportPreview(key);
      const restored = saved || (sourceStoreKey === initialStoreKey ? initialPreview : null);
      const summaries = await listImportPreviews(kind);
      if (!active) return;
      setPreviewStoreKey(key); setRecoverable(summaries);
      sessionStorage.setItem(`qx_import_session_${kind}`, key.slice(kind.length + 1));
      previewDone.current = false; persistedPreview.current = null;
      if (restored) {
        setCandidates(restored.candidates); setTargetProjectId(restored.targetProjectId || "");
        setTargetCategory(restored.targetCategory || "正文"); setSkipDuplicates(restored.skipDuplicates !== false);
        setStep("preview");
      } else { setStep("source"); setCandidates([]); }
      setPreviewLoaded(true); setPreviewStatus("");
    })().catch(error => {
      if (active) setPreviewStatus(`${error.message || "临时预览无法读取"}。请保留原文件后重试。`);
    });
    return () => { active = false; };
  }, [sourceStoreKey, restoreAttempt, initialStoreKey, initialPreview, kind]);
  useEffect(() => {
    if (!previewLoaded || step !== "preview") return;
    let active = true;
    const persist = async () => {
      if (previewDone.current) return;
      const value = previewRef.current;
      try {
        await saveImportPreview(previewStoreKey, value);
        persistedPreview.current = value;
        if (!previewDone.current) {
          sessionStorage.setItem("qx_import_active", kind); sessionStorage.removeItem(previewKey);
          if (active && previewRef.current === value) setPreviewStatus("预览已保存在本机，刷新可恢复");
        }
      } catch {
        if (active) setPreviewStatus("预览未能保存刷新副本。请保留当前页面和原文件，完成导入或重试后再刷新。");
      }
    };
    setPreviewStatus("正在保留预览…");
    const timer = window.setTimeout(() => void persist(), 200);
    const leave = (event: BeforeUnloadEvent) => {
      if (!previewDone.current && persistedPreview.current !== previewRef.current) {
        event.preventDefault(); event.returnValue = ""; void persist();
      }
    };
    window.addEventListener("beforeunload", leave);
    return () => { active = false; window.clearTimeout(timer); window.removeEventListener("beforeunload", leave); };
  }, [step, preview, previewLoaded, previewStoreKey, previewKey, kind]);
  const isAndroid = nativeCaptureAvailable();
  const platformUrls: Record<string, string> = {
    weibo: "https://weibo.com/",
    qqzone: "https://user.qzone.qq.com/",
  };

  async function goBack() {
    if (busyRef.current) return;
    if (!previewLoaded) { close(); return; }
    try {
    if (step === "preview") {
      await clearPreview();
      setStep("source");
      setCandidates([]);
      setMessage("");
      void refreshRecoverable();
      return;
    }
    await clearPreview(); close();
    } catch { setMessage("临时预览尚未清理，当前内容已保留，请稍后重试。"); }
  }

  function restorePreview(key: string) {
    if (busyRef.current) return;
    setPreviewLoaded(false); setPreviewStatus("正在恢复临时预览…"); setMessage("");
    setSourceStoreKey(key);
    setRestoreAttempt(value => value + 1);
  }

  async function discardPreview(summary: ImportPreviewSummary) {
    if (busyRef.current || !window.confirm(`丢弃《${summary.title}》的未完成预览吗？尚未正式导入的修改将被删除。`)) return;
    busyRef.current = true; setBusy(true);
    try { await discardImportPreview(summary.key); await refreshRecoverable(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "预览未删除，请重试。"); }
    finally { busyRef.current = false; setBusy(false); }
  }

  useEffect(() => {
    const handleBack = () => { void goBack(); };
    window.addEventListener("qx-history-back", handleBack);
    return () => window.removeEventListener("qx-history-back", handleBack);
  });

  async function importFiles(files: File[]) {
    if (!previewLoaded) return setMessage("临时预览正在读取，请等待后再选择文件。");
    if (busyRef.current || !files.length) return;
    busyRef.current = true; setBusy(true);
    previewDone.current = false;
    setMessage("正在解析文件…");
    try {
      const adapter = importAdapters.find((item) => item.id === "other")!;
      const result = await adapter.collect({ mode: "file", files });
      setCandidates(result);
      setStep("preview");
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "文件解析失败");
    } finally { busyRef.current = false; setBusy(false); if (fileInput.current) fileInput.current.value = ""; }
  }

  useEffect(() => {
    if (previewLoaded && initialFiles.length && !initialFilesRead.current) {
      initialFilesRead.current = true;
      if (step === "preview") setMessage("上次预览已恢复，请先完成或重新选择，再拖入新文件。");
      else void importFiles(initialFiles);
    }
  }, [previewLoaded, initialFiles, step]);

  async function importPastedResult() {
    if (!pastedResult.trim()) return setMessage("请先粘贴采集结果");
    await importFiles([new File([pastedResult], "QQ空间采集结果.json", { type: "application/json" })]);
  }

  async function startPlatform(adapterId: string, label: string, mode: ImportMode) {
    const adapter = importAdapters.find((item) => item.id === adapterId);
    if (mode === "browser") {
      window.open("https://poem.timelordtty.cn/qingxiaolu/tools/desktop/guide.html#history", "_blank", "noopener,noreferrer");
      setMessage(`电脑助手内有${label}采集工具。请登录自己的历史页面后采集，再导入生成的 JSON 文件；原页面展开与缺失内容需自行核对。`);
      return;
    }
    if (mode === "accessibility" && adapter && nativeCaptureAvailable()) {
      const captured = await adapter.collect({ mode });
      if (captured.length) {
        previewDone.current = false;
        setCandidates(captured);
        setStep("preview");
        setMessage(`已读取 ${captured.length} 条手机采集内容`);
        return;
      }
      await openNativeCaptureSettings();
      setMessage(`请开启“情晓录历史采集”，然后打开${label}并向下浏览。浏览完成后回到这里再次点“辅助浏览”。`);
      return;
    }
    setMessage(`${label} · ${modeLabels[mode]}需要对应的采集工具。采集完成后在这里导入结果文件。`);
  }

  function update(id: string, patch: Partial<ImportCandidate>) {
    setCandidates((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  async function commit() {
    if (busyRef.current) return;
    const selected = pendingCandidates.filter((item) => item.selected);
    if (!selected.length) return setMessage("请至少选择一条内容");
    setMessage(`正在导入 ${selected.length} 条…`);
    busyRef.current = true; setBusy(true);
    try {
      const result = await commitImport(selected, { projectId: targetProjectId, category: kind === "documents" ? targetCategory : "正文", skipDuplicates });
      try { await clearPreview(); }
      catch { setMessage(`已正式导入 ${result.added} 条内容，但临时预览清理失败。稿件已保存，重新导入会按原去重设置处理。`); busyRef.current = false; setBusy(false); return; }
      setMessage(`已正式导入 ${result.added} 条内容${result.skipped ? `，跳过 ${result.skipped} 条相同内容` : ""}`);
      closeTimer.current = window.setTimeout(close, 800);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "导入失败，预览内容已保留，请重试。");
      busyRef.current = false; setBusy(false);
    }
  }

  function splitOutline(item: ImportCandidate) {
    const entries = (item.raw as any)?.outlineEntries;
    if (!Array.isArray(entries)) return;
    const nodes = entries.filter((entry: any, index: number) => entry.text || entry.images?.length || !entries[index + 1] || entries[index + 1].depth <= entry.depth);
    setCandidates(items => items.flatMap(entry => entry.id !== item.id ? [entry] : nodes.map((node: any) =>
      candidate(item.source, item.sourceLabel, node.title, node.text || node.title, { images: node.images || [], raw: { ...(item.raw as any), outlineEntries: undefined, outlineDepth: node.depth }, warnings: item.warnings }))));
  }

  return (
    <div className="history-import" onDragOver={event => { if (kind === "documents" && event.dataTransfer.types.includes("Files")) event.preventDefault(); }}
      onDrop={event => {
        if (kind !== "documents" || !event.dataTransfer.files.length) return;
        event.preventDefault();
        if (!previewLoaded) return setMessage("临时预览正在读取，请等待后再拖入文件。");
        if (step === "preview") return setMessage("请先完成当前预览，或点击“重新选择”后再拖入文件。");
        void importFiles(Array.from(event.dataTransfer.files));
      }}>
      <header><button disabled={busy} onClick={() => void goBack()}>‹ 返回</button><div>
        <b>{kind === "documents" ? "导入本地文档" : "历史导入"}</b>
        <span>{kind === "documents" ? "解析后先预览，再保存到项目" : "一次性导入，不会实时同步"}</span>
      </div></header>
      {message && <div className="import-message">{message}</div>}
      {previewStatus && <p role="status" className="import-message">{previewStatus}</p>}
      {!previewLoaded && <button onClick={() => window.location.reload()}>重试打开预览</button>}
      <input ref={fileInput} hidden multiple type="file"
        accept={kind === "documents"
          ? ".doc,.docx,.txt,.md,.markdown,.pdf,.json,.xmind,.mm,.opml,.csv,text/plain,text/markdown,application/pdf,application/json"
          : ".json,application/json"}
        onChange={(event) => void importFiles(Array.from(event.target.files || []))} />

      {previewLoaded && step === "source" && <section>
        <h1>{kind === "documents" ? "选择本地文件" : "选择内容来源"}</h1>
        <p>采集结果会先进入临时预览，不会直接写入正式数据。</p>
        {!!recoverable.length && <section className="candidate-list"><h2>未完成的导入预览</h2>
          <p>可以继续上次的修改。其他页面正在使用的预览会作为独立副本恢复。</p>
          {recoverable.map(saved => <article key={saved.key}>
            <h3>{saved.title}</h3><p>{saved.count} 条内容{saved.updatedAt ? ` · ${new Date(saved.updatedAt).toLocaleString()}` : ""}</p>
            <button disabled={busy} onClick={() => restorePreview(saved.key)}>恢复预览</button>
            <button disabled={busy} onClick={() => void discardPreview(saved)}>丢弃预览</button>
          </article>)}
        </section>}
        <div className="import-sources">
          {kind === "history" && importAdapters.filter((item) => item.id !== "other").map((adapter) =>
            <article key={adapter.id}>
              <h2>{adapter.label}</h2><p>{adapter.description}</p>
              <div>
                {isAndroid && <button className="primary"
                  onClick={() => void startPlatform(adapter.id, adapter.label, "accessibility")}>辅助采集</button>}
                {!isAndroid && platformUrls[adapter.id] && <button onClick={() =>
                  window.open(platformUrls[adapter.id], "_blank", "noopener,noreferrer")}>打开{adapter.label}网页版</button>}
                <button onClick={() => fileInput.current?.click()}>导入采集结果</button>
              </div>
            </article>)}
          {kind === "documents" && <article>
            <h2>文件导入</h2><p>Word、TXT、Markdown、PDF、XMind、FreeMind、OPML、CSV 和 JSON</p>
            <p>也可以把文件拖到此页面，识别后先预览。</p>
            <button className="primary" onClick={() => fileInput.current?.click()}>选择文件</button>
          </article>}
        </div>
        {kind === "history" && <div className="paste-import-result">
          <h2>粘贴电脑采集结果</h2>
          <textarea value={pastedResult} onChange={(event) => setPastedResult(event.target.value)}
            placeholder="从QQ空间采集工具复制的内容会放在这里" />
          <button className="primary" onClick={() => void importPastedResult()}>生成临时预览</button>
        </div>}
      </section>}

      {previewLoaded && step === "preview" && <section><fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <div className="preview-head"><div><h1>临时预览</h1><p>可以勾选、修改或删除，再正式导入。</p></div>
          <button onClick={() => void goBack()}>重新选择</button></div>
        {kind === "documents" && <div className="import-destination">
          <label>归入项目<select value={targetProjectId} onChange={(event) => setTargetProjectId(event.target.value)}>
            <option value="">不归入项目</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.payload.title}</option>)}
          </select></label>
          <label>导入为<select value={targetCategory} onChange={(event) => setTargetCategory(event.target.value)}>
            {["正文", "大纲", "人物", "背景", "时间轴", "资料"].map((name) => <option key={name}>{name}</option>)}
          </select></label>
        </div>}
        <label><input type="checkbox" checked={skipDuplicates} onChange={event => setSkipDuplicates(event.target.checked)} /> 跳过已导入的相同内容</label>
        {candidates.length > pendingCandidates.length && <p role="status">已隐藏 {candidates.length - pendingCandidates.length} 条已导入的相同内容，无需重复导入。</p>}
        <div className="candidate-list">
          {pendingCandidates.map((item) => <article key={item.id}>
            <label><input type="checkbox" checked={item.selected}
              onChange={(event) => update(item.id, { selected: event.target.checked })} /> 导入</label>
            <button className="remove" onClick={() => setCandidates((items) => items.filter((entry) => entry.id !== item.id))}>删除</button>
            <small>{item.sourceLabel}{item.publishedAt ? ` · ${item.publishedAt}` : ""}</small>
            {item.warnings?.map((warning, index) => <p key={index} role="note">{warning}</p>)}
            {item.source === "pdf" && typeof (item.raw as any)?.originalPdf === "string" && (item.raw as any).originalPdf.startsWith("data:application/pdf;base64,") &&
              <OriginalDownloadLink source={(item.raw as any).originalPdf} name={(item.raw as any).fileName || `${item.title}.pdf`}>下载原始 PDF 核对</OriginalDownloadLink>}
            {typeof (item.raw as any)?.originalXmind === "string" && (item.raw as any).originalXmind.startsWith("data:application/x-xmind;base64,") &&
              <OriginalDownloadLink source={(item.raw as any).originalXmind} name={(item.raw as any).fileName || `${item.title}.xmind`}>下载原始 XMind 核对</OriginalDownloadLink>}
            {Array.isArray((item.raw as any)?.outlineEntries) && <button onClick={() => splitOutline(item)}>按导图节点拆分</button>}
            {item.source !== "qqzone" && <input value={item.title}
              onChange={(event) => update(item.id, { title: event.target.value })} />}
            <textarea value={item.text} onChange={(event) => update(item.id, { text: event.target.value })} />
            {!!item.images.length && <div className="candidate-images">
              {item.images.map((image, index) => <a key={`${image}-${index}`} href={image}
                target="_blank" rel="noreferrer" aria-label={`查看第 ${index + 1} 张原图`}>
                <img src={image} alt={`导入图片 ${index + 1}`} loading="lazy" referrerPolicy="no-referrer" />
              </a>)}
            </div>}
          </article>)}
        </div>
        <button className="commit-import" disabled={!pendingCandidates.some(item => item.selected)} onClick={() => void commit()}>
          正式导入已选内容（{pendingCandidates.filter((item) => item.selected).length}）
        </button></fieldset>
      </section>}
    </div>
  );
}
