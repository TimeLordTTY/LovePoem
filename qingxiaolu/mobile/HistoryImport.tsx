import { useEffect, useRef, useState } from "react";
import { importAdapters, type ImportCandidate, type ImportMode } from "./importers";
import { candidate } from "./importers/types";
import { commitImport } from "./importers/importCommit";
import { nativeCaptureAvailable, openNativeCaptureSettings } from "./nativeHistory";

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
}: {
  close: () => void;
  kind?: "history" | "documents";
  projects?: any[];
}) {
  const previewKey = `qx_import_preview_${kind}`;
  const [initialPreview] = useState<any>(() => {
    try { const value = JSON.parse(sessionStorage.getItem(previewKey) || "null"); return Array.isArray(value?.candidates) ? value : null; }
    catch { return null; }
  });
  const [step, setStep] = useState<"source" | "preview">(initialPreview ? "preview" : "source");
  const [candidates, setCandidates] = useState<ImportCandidate[]>(initialPreview?.candidates || []);
  const [message, setMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const [targetProjectId, setTargetProjectId] = useState(initialPreview?.targetProjectId || "");
  const [targetCategory, setTargetCategory] = useState(initialPreview?.targetCategory || "正文");
  const [pastedResult, setPastedResult] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [skipDuplicates, setSkipDuplicates] = useState(initialPreview?.skipDuplicates !== false);
  const previewRef = useRef<any>(null);
  const previewDone = useRef(false);
  previewRef.current = { candidates, targetProjectId, targetCategory, skipDuplicates };
  function clearPreview() { previewDone.current = true; sessionStorage.removeItem(previewKey); sessionStorage.removeItem("qx_import_active"); }
  useEffect(() => {
    if (step !== "preview") return;
    const persist = () => {
      if (previewDone.current) return;
      try { sessionStorage.setItem(previewKey, JSON.stringify(previewRef.current)); sessionStorage.setItem("qx_import_active", kind); }
      catch { setMessage("预览内容较大，无法保留刷新副本；请先完成导入再刷新页面。"); }
    };
    persist(); window.addEventListener("beforeunload", persist);
    return () => window.removeEventListener("beforeunload", persist);
  }, [step, candidates, targetProjectId, targetCategory, skipDuplicates, previewKey, kind]);
  const isAndroid = nativeCaptureAvailable();
  const platformUrls: Record<string, string> = {
    weibo: "https://weibo.com/",
    qqzone: "https://user.qzone.qq.com/",
  };

  function goBack() {
    if (busyRef.current) return;
    if (step === "preview") {
      clearPreview();
      setStep("source");
      setCandidates([]);
      setMessage("");
      return;
    }
    clearPreview(); close();
  }

  useEffect(() => {
    const handleBack = () => goBack();
    window.addEventListener("qx-history-back", handleBack);
    return () => window.removeEventListener("qx-history-back", handleBack);
  });

  async function importFiles(files: File[]) {
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

  async function importPastedResult() {
    if (!pastedResult.trim()) return setMessage("请先粘贴采集结果");
    await importFiles([new File([pastedResult], "QQ空间采集结果.json", { type: "application/json" })]);
  }

  async function startPlatform(adapterId: string, label: string, mode: ImportMode) {
    const adapter = importAdapters.find((item) => item.id === adapterId);
    if (mode === "accessibility" && adapter && nativeCaptureAvailable()) {
      const captured = await adapter.collect({ mode });
      if (captured.length) {
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
    const selected = candidates.filter((item) => item.selected);
    if (!selected.length) return setMessage("请至少选择一条内容");
    setMessage(`正在导入 ${selected.length} 条…`);
    busyRef.current = true; setBusy(true);
    try {
      const result = commitImport(selected, { projectId: targetProjectId, category: kind === "documents" ? targetCategory : "正文", skipDuplicates });
      clearPreview();
      setMessage(`已正式导入 ${result.added} 条内容${result.skipped ? `，跳过 ${result.skipped} 条相同内容` : ""}`);
      window.setTimeout(close, 800);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "导入失败，预览内容已保留，请重试。");
      busyRef.current = false; setBusy(false);
    }
  }

  function splitOutline(item: ImportCandidate) {
    const entries = (item.raw as any)?.outlineEntries;
    if (!Array.isArray(entries)) return;
    const nodes = entries.filter((entry: any, index: number) => entry.text || !entries[index + 1] || entries[index + 1].depth <= entry.depth);
    setCandidates(items => items.flatMap(entry => entry.id !== item.id ? [entry] : nodes.map((node: any) =>
      candidate(item.source, item.sourceLabel, node.title, node.text || node.title, { raw: { ...(item.raw as any), outlineEntries: undefined, outlineDepth: node.depth }, warnings: item.warnings }))));
  }

  return (
    <div className="history-import">
      <header><button disabled={busy} onClick={goBack}>‹ 返回</button><div>
        <b>{kind === "documents" ? "导入本地文档" : "历史导入"}</b>
        <span>{kind === "documents" ? "解析后先预览，再保存到项目" : "一次性导入，不会实时同步"}</span>
      </div></header>
      {message && <div className="import-message">{message}</div>}
      <input ref={fileInput} hidden multiple type="file"
        accept={kind === "documents"
          ? ".doc,.docx,.txt,.md,.markdown,.pdf,.json,.xmind,.mm,.opml,.csv,text/plain,text/markdown,application/pdf,application/json"
          : ".json,application/json"}
        onChange={(event) => void importFiles(Array.from(event.target.files || []))} />

      {step === "source" && <section>
        <h1>{kind === "documents" ? "选择本地文件" : "选择内容来源"}</h1>
        <p>采集结果会先进入临时预览，不会直接写入正式数据。</p>
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

      {step === "preview" && <section><fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        <div className="preview-head"><div><h1>临时预览</h1><p>可以勾选、修改或删除，再正式导入。</p></div>
          <button onClick={() => { clearPreview(); setStep("source"); setCandidates([]); }}>重新选择</button></div>
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
        <div className="candidate-list">
          {candidates.map((item) => <article key={item.id}>
            <label><input type="checkbox" checked={item.selected}
              onChange={(event) => update(item.id, { selected: event.target.checked })} /> 导入</label>
            <button className="remove" onClick={() => setCandidates((items) => items.filter((entry) => entry.id !== item.id))}>删除</button>
            <small>{item.sourceLabel}{item.publishedAt ? ` · ${item.publishedAt}` : ""}</small>
            {item.warnings?.map((warning, index) => <p key={index} role="note">{warning}</p>)}
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
        <button className="commit-import" onClick={() => void commit()}>
          正式导入已选内容（{candidates.filter((item) => item.selected).length}）
        </button></fieldset>
      </section>}
    </div>
  );
}
