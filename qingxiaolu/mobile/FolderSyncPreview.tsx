import { useState } from "react";
import type { FolderChange } from "./folderSync";

export type FolderPreview = { direction: "写入本地" | "读回情晓录"; rows: FolderChange[]; apply: () => Promise<void> };
export default function FolderSyncPreview({ preview, busy, close, confirm }: {
  preview: FolderPreview; busy: boolean; close: () => void; confirm: () => void;
}) {
  const [onlyChanges, setOnlyChanges] = useState(true);
  const [expanded, setExpanded] = useState(new Set<number>());
  const counts = (status: string) => preview.rows.filter(row => row.status === status).length;
  const blocked = preview.direction === "写入本地" && counts("冲突") > 0;
  return <section className="folder-sync-preview" role="dialog" aria-modal="true" aria-labelledby="folder-preview-heading">
    <header><div><small>手动文件同步</small><h2 id="folder-preview-heading">{preview.direction}前确认</h2></div>
      <button disabled={busy} onClick={close}>取消本次同步</button></header>
    <p>新增 {counts("新增")} · 修改 {counts("修改")} · 冲突 {counts("冲突")} · 不变 {counts("不变")}</p>
    <p>{blocked ? "文件夹中有未读回的修改，不能覆盖。取消后先读回情晓录，或保留文件副本。" :
      preview.direction === "读回情晓录" ? "只保存到本机。被更新的已有内容保留版本；请对照冲突双方后确认。" : "只写入已关联的项目目录，移出项目的旧文件仍保留。"}</p>
    <label><input type="checkbox" checked={onlyChanges} onChange={event => setOnlyChanges(event.target.checked)} />只看变更</label>
    <div className="folder-preview-list">{preview.rows.map((row, index) => onlyChanges && row.status === "不变" ? null :
      <details key={index} onToggle={event => {
        const open = event.currentTarget.open;
        setExpanded(value => { if (value.has(index) === open) return value; const next = new Set(value); if (open) next.add(index); else next.delete(index); return next; });
      }}><summary><b>{row.status}</b> {row.directory ? `${row.directory}/` : ""}{row.name}</summary>
        {expanded.has(index) && <>{row.reason && <p>{row.reason}</p>}
        <div className="folder-preview-compare"><div><h3>情晓录内容</h3><pre>{row.appText || "（空内容）"}</pre></div>
          <div><h3>本地文件内容</h3><pre>{row.localText ?? "（尚无文件）"}</pre></div></div></>}
      </details>)}</div>
    <button className="primary" disabled={busy || blocked} onClick={confirm}>{busy ? "正在同步…" : "确认本次同步"}</button>
  </section>;
}
