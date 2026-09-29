const state = {
  get(key, fallback) {
    const result = CapacitorKV.get(key);
    return result && result.value ? JSON.parse(result.value) : fallback;
  },
  set(key, value) {
    CapacitorKV.set(key, JSON.stringify(value));
  },
};

async function performSync(force) {
  if (!force && !state.get("syncEnabled", false)) return { disabled: true };
  const token = state.get("token", "");
  const api = state.get("api", "");
  if (!token || !api) return { skipped: true };
  const network = CapacitorDevice.getNetworkStatus();
  if (!network.connected) return { offline: true };

  const outbox = state.get("outbox", []).slice(0, 50);
  if (outbox.length) {
    const pushed = await fetch(`${api}/v1/sync/push`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ deviceId: "qingxiaolu-android", changes: outbox }),
    });
    if (pushed.ok) {
      const result = await pushed.json();
      const done = {};
      result.applied.forEach((item) => { done[item.id] = true; });
      state.set("outbox", state.get("outbox", []).filter((item) => !done[item.id]));
    }
  }

  let cursor = state.get("cursor", 0);
  const pulled = await fetch(`${api}/v1/sync/pull?cursor=${cursor}&limit=50`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (pulled.ok) {
    const page = await pulled.json();
    const items = state.get("items", {});
    page.changes.forEach((change) => { items[change.id] = change; });
    state.set("items", items);
    state.set("cursor", page.nextCursor);
  }
  state.set("lastSync", new Date().toISOString());
  return { ok: true };
}

addEventListener("configureSync", (resolve, reject, args) => {
  try {
    state.set("token", args.token);
    state.set("api", args.api);
    state.set("syncEnabled", Boolean(args.enabled));
    resolve({ configured: true });
  } catch (error) { reject(error); }
});

addEventListener("queueChange", (resolve, reject, args) => {
  try {
    const outbox = state.get("outbox", []);
    outbox.push(args.change);
    state.set("outbox", outbox);
    if (state.get("syncEnabled", false)) performSync(false).then(resolve).catch(reject);
    else resolve({ queued: true });
  } catch (error) { reject(error); }
});

addEventListener("setSyncEnabled", (resolve, reject, args) => {
  try {
    state.set("syncEnabled", Boolean(args.enabled));
    if (args.enabled) performSync(false).then(resolve).catch(reject);
    else resolve({ enabled: false });
  } catch (error) { reject(error); }
});

addEventListener("syncNow", (resolve, reject, args) => {
  performSync(Boolean(args && args.force)).then(resolve).catch(reject);
});

addEventListener("backgroundSync", (resolve, reject) => {
  performSync(false).then(resolve).catch(reject);
});
