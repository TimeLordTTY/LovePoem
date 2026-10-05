import { useRef, useState } from "react";
import { nativeFileAvailable } from "./nativeFile";
import { exportOriginalFile } from "./fileExport";

export default function OriginalDownloadLink({ source, name, children }: {
  source: string; name: string; children: string;
}) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const running = useRef(false);
  const native = nativeFileAvailable();
  return <span className="original-file-download"><a href={source} download={name} aria-disabled={busy} onClick={async event => {
    if (!native) return;
    event.preventDefault();
    if (running.current) return;
    running.current = true; setBusy(true); setMessage("正在准备原始文件…");
    try { const saved = await exportOriginalFile(name, source); setMessage(saved ? `原始文件已保存：${name}` : "已取消原文件保存，导入内容保持不变"); }
    catch (error) { setMessage(error instanceof Error ? error.message : "原文件保存失败，导入内容仍保留"); }
    finally { running.current = false; setBusy(false); }
  }}>{busy ? "正在保存原文件…" : children}</a>{message && <small role="status">{message}</small>}</span>;
}
