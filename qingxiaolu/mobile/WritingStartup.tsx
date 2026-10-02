import { useEffect, useState } from "react";
import RealMobileApp from "./RealMobileApp";
import { initializeWritingDatabase, legacyWritingSnapshot } from "./storageDatabase";
import { createBackup, createSnapshotBackup, downloadBackup } from "./backup";

export default function WritingStartup() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setError("");
    void initializeWritingDatabase().then(result => {
      if (active) { setRecovery(result.legacyRecovery); setReady(true); }
    }).catch(() => { if (active) setError("本机创作数据暂时无法打开，原有数据尚未改动。请确认浏览器允许保存本机数据后重试。"); });
    return () => { active = false; };
  }, [attempt]);

  async function exportOriginal(fromRecovery = false) {
    setBusy(true);
    try {
      const source = fromRecovery ? await legacyWritingSnapshot(true) : null;
      downloadBackup(source ? await createSnapshotBackup(source) : await createBackup(), fromRecovery ? "旧页面恢复" : "情晓录原资料");
    } catch { setError("原资料备份暂时无法生成。请保留当前浏览器的数据，不要清空本机存储。"); }
    finally { setBusy(false); }
  }

  if (!ready) return <main className="local-manager-page"><section>
    <h1>情晓录</h1><p role="status">{error || "正在打开本机创作资料…"}</p>
    {error && <div><button onClick={() => setAttempt(value => value + 1)}>重试</button>
      <button disabled={busy} onClick={() => void exportOriginal()}>下载原资料备份</button></div>}
  </section></main>;
  return <>{recovery && <aside className="real-message" role="status">
    旧页面遗留的修改已保留在本机备份中。
    <button disabled={busy} onClick={() => void exportOriginal(true)}>下载旧页面备份</button>
  </aside>}{error && <p className="real-message" role="status">{error}</p>}<RealMobileApp /></>;
}
