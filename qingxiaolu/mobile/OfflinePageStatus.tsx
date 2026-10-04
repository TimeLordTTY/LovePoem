import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
declare const __QX_BUILD_VERSION__: string;

export default function OfflinePageStatus() {
  const enabled = import.meta.env.PROD && !Capacitor.isNativePlatform() && location.pathname.startsWith("/qingxiaolu/");
  const [state, setState] = useState<"preparing" | "ready" | "failed">("preparing");
  const [online, setOnline] = useState(navigator.onLine);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const changed = () => setOnline(navigator.onLine);
    window.addEventListener("online", changed); window.addEventListener("offline", changed);
    setState("preparing");
    void (async () => {
      if (!("serviceWorker" in navigator)) throw new Error("Offline pages unavailable");
      const scope = new URL("/qingxiaolu/", location.origin).href;
      const check = async () => {
        const name = "qingxiaolu-page-" + __QX_BUILD_VERSION__;
        if (!(await caches.keys()).includes(name)) return false;
        return Boolean(await (await caches.open(name)).match(new URL("__offline_ready__", scope).href));
      };
      if (await check()) { if (active) setState("ready"); return; }
      const registration = await navigator.serviceWorker.register(new URL("offline-sw.js", scope), { scope, updateViaCache: "none" });
      const worker = registration.installing || registration.waiting || registration.active;
      if (!worker) throw new Error("Offline worker unavailable");
      await new Promise<void>((resolve, reject) => {
        const changed = () => {
          if (worker.state === "activated" || (worker.state === "installed" && registration.active)) { worker.removeEventListener("statechange", changed); resolve(); }
          else if (worker.state === "redundant") { worker.removeEventListener("statechange", changed); reject(new Error("Offline preparation failed")); }
        };
        worker.addEventListener("statechange", changed); changed();
      });
      if (!await check()) throw new Error("Offline preparation incomplete");
      if (active) setState("ready");
    })().catch(() => { if (active) setState("failed"); });
    return () => { active = false; window.removeEventListener("online", changed); window.removeEventListener("offline", changed); };
  }, [enabled, attempt]);
  if (!enabled || (state === "ready" && online)) return null;
  return <aside className="real-message offline-page-status" role="status">
    {state === "failed" ? "离线页面暂未准备完成。当前仍可写作，请联网后重试。"
      : state === "preparing" ? "正在准备离线页面，请保持联网片刻…" : "当前离线，可继续本机写作；联网后再手动同步。"}
    {state === "failed" && <button onClick={() => setAttempt(value => value + 1)}>重试准备离线页面</button>}
  </aside>;
}
