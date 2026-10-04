const MANIFEST = __QX_OFFLINE_MANIFEST__;
const PREFIX = "qingxiaolu-page-";
const CACHE = PREFIX + MANIFEST.version;
const scope = new URL(self.registration.scope);
const shell = new URL("./", scope).href;
const readyKey = new URL("__offline_ready__", scope).href;
const assetUrls = MANIFEST.assets.map(path => new URL(path, scope).href);

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    try {
    const cache = await caches.open(CACHE);
    const response = await fetch(new Request(shell, { cache: "no-store" }));
    if (!response.ok) throw new Error("Offline shell unavailable");
    const bytes = await response.clone().arrayBuffer();
    const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map(value => value.toString(16).padStart(2, "0")).join("");
    if (hash !== MANIFEST.indexHash) throw new Error("Offline release changed during preparation");
    await cache.put(shell, response);
    for (const url of assetUrls) {
      const asset = await fetch(new Request(url, { cache: "no-store" }));
      if (!asset.ok) throw new Error("Offline asset unavailable");
      await cache.put(url, asset);
    }
    // 只有全部资源完成后才提供这一版离线入口，安装失败不会覆盖原有完整缓存。
    await cache.put(readyKey, new Response(JSON.stringify({ version: MANIFEST.version, preparedAt: Date.now() }), { headers: { "content-type": "application/json" } }));
    } catch (error) { await caches.delete(CACHE); throw error; }
  })());
});

self.addEventListener("activate", event => {
  // 不强制替换正在写作的页面；正常激活时原版本的页面已经关闭。
  event.waitUntil((async () => {
    const current = await (await (await caches.open(CACHE)).match(readyKey)).json();
    for (const key of await caches.keys()) {
      if (!key.startsWith(PREFIX) || key === CACHE) continue;
      const marker = await (await caches.open(key)).match(readyKey);
      if (marker && (await marker.json()).preparedAt <= current.preparedAt) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

async function newestShell() {
  const complete = [];
  for (const key of await caches.keys()) {
    if (!key.startsWith(PREFIX)) continue;
    const cache = await caches.open(key), marker = await cache.match(readyKey);
    if (marker) complete.push({ cache, preparedAt: (await marker.json()).preparedAt });
  }
  complete.sort((a, b) => b.preparedAt - a.preparedAt);
  for (const item of complete) { const response = await item.cache.match(shell); if (response) return response; }
  return null;
}

self.addEventListener("fetch", event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== scope.origin) return;
  if (request.mode === "navigate" && [scope.pathname, scope.pathname + "index.html"].includes(url.pathname)) {
    event.respondWith((async () => {
      try { const response = await fetch(request); if (response.ok) return response; } catch { /* 断网时使用完整离线页面 */ }
      return await newestShell() || new Response("离线页面尚未准备完成，请联网打开情晓录后重试。", { status: 503, headers: { "content-type": "text/plain;charset=utf-8" } });
    })());
    return;
  }
  // 只处理此应用的静态代码资源，稿件接口、账号会话、历史素材及其他项目不进入缓存。
  if (!url.pathname.startsWith(scope.pathname + "assets/") || !/\.(js|css|woff2?|ttf|otf)$/.test(url.pathname)) return;
  event.respondWith((async () => {
    for (const key of await caches.keys()) {
      if (!key.startsWith(PREFIX)) continue;
      const cached = await (await caches.open(key)).match(request);
      if (cached) return cached;
    }
    const response = await fetch(request);
    if (response.ok) await (await caches.open(CACHE)).put(request, response.clone());
    return response;
  })());
});
