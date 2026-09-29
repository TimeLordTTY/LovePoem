import { Capacitor } from "@capacitor/core";
import { BackgroundRunner } from "@capacitor/background-runner";

const API = "https://poem.timelordtty.cn/qingxiaolu-api";
const TOKEN_KEY = "qx_sync_token";

export function hasSyncLogin() {
  return Boolean(localStorage.getItem(TOKEN_KEY));
}

export async function loginSync(username: string, password: string) {
  const response = await fetch(`${API}/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) throw new Error("用户名或密码错误");
  const data = await response.json();
  localStorage.setItem(TOKEN_KEY, data.token);
  if (Capacitor.isNativePlatform()) {
    await BackgroundRunner.dispatchEvent({
      label: "com.qingxiaolu.sync",
      event: "configureSync",
      details: { token: data.token, api: API, enabled: false },
    });
  }
  return true;
}

export async function queueDraft(title: string, content: string) {
  return queueItem("idea", title, { text: content });
}

export async function queueItem(
  itemType: "idea" | "article" | "project",
  title: string,
  content: Record<string, unknown>,
  projectId?: string,
  sendToServer = false,
  itemId?: string,
  baseRevision = 0,
) {
  const id = itemId || crypto.randomUUID();
  const change = {
    id,
    itemType,
    projectId,
    title,
    content,
    baseRevision,
    deleted: false,
  };
  const local = JSON.parse(localStorage.getItem("qx_drafts") || "[]");
  const previous = local.find((item: any) => item.id === id);
  if (previous) {
    const versions = JSON.parse(localStorage.getItem("qx_item_versions") || "{}");
    versions[id] = [
      { ...previous, versionSavedAt: new Date().toISOString() },
      ...(versions[id] || []),
    ].slice(0, 30);
    localStorage.setItem("qx_item_versions", JSON.stringify(versions));
  }
  const withoutOld = local.filter((item: any) => item.id !== id);
  withoutOld.unshift({ ...change, savedAt: new Date().toISOString(), syncState: "pending" });
  localStorage.setItem("qx_drafts", JSON.stringify(withoutOld.slice(0, 500)));
  const token = localStorage.getItem(TOKEN_KEY);
  if (sendToServer && token && Capacitor.isNativePlatform()) {
    await BackgroundRunner.dispatchEvent({
      label: "com.qingxiaolu.sync",
      event: "queueChange",
      details: { change },
    });
  } else if (sendToServer && token) {
    const webOutbox = JSON.parse(localStorage.getItem("qx_web_outbox") || "[]");
    webOutbox.push(change);
    localStorage.setItem("qx_web_outbox", JSON.stringify(webOutbox));
  }
  return id;
}

export async function selectItemsForSync(ids: string[]) {
  const wanted = new Set(ids);
  const drafts = JSON.parse(localStorage.getItem("qx_drafts") || "[]");
  const changes = drafts.filter((item: any) => wanted.has(item.id)).map((item: any) => ({
    id: item.id,
    itemType: item.itemType,
    projectId: item.projectId,
    title: item.title,
    content: item.content,
    baseRevision: item.baseRevision || 0,
    deleted: false,
  }));
  if (Capacitor.isNativePlatform()) {
    for (const change of changes) {
      await BackgroundRunner.dispatchEvent({
        label: "com.qingxiaolu.sync",
        event: "queueChange",
        details: { change },
      });
    }
  } else {
    const outbox = JSON.parse(localStorage.getItem("qx_web_outbox") || "[]");
    const known = new Set(outbox.map((item: any) => item.id));
    localStorage.setItem("qx_web_outbox", JSON.stringify([
      ...outbox,
      ...changes.filter((item: any) => !known.has(item.id)),
    ]));
  }
}

export function deleteLocalItem(item: any) {
  const id = String(item.id);
  const drafts = JSON.parse(localStorage.getItem("qx_drafts") || "[]");
  localStorage.setItem("qx_drafts", JSON.stringify(drafts.filter((item: any) => item.id !== id)));
  const trash = JSON.parse(localStorage.getItem("qx_local_trash") || "[]");
  localStorage.setItem("qx_local_trash", JSON.stringify([
    { ...item, deletedAt: new Date().toISOString() },
    ...trash.filter((entry: any) => entry.id !== id),
  ].slice(0, 200)));
  const deleted = JSON.parse(localStorage.getItem("qx_deleted_ids") || "[]");
  if (!deleted.includes(id)) {
    deleted.unshift(id);
    localStorage.setItem("qx_deleted_ids", JSON.stringify(deleted.slice(0, 1000)));
  }
}

export function getLocalTrash() {
  return JSON.parse(localStorage.getItem("qx_local_trash") || "[]");
}

export function restoreLocalTrashItem(id: string) {
  const trash = getLocalTrash();
  const item = trash.find((entry: any) => entry.id === id);
  localStorage.setItem("qx_local_trash", JSON.stringify(trash.filter((entry: any) => entry.id !== id)));
  const deleted = JSON.parse(localStorage.getItem("qx_deleted_ids") || "[]");
  localStorage.setItem("qx_deleted_ids", JSON.stringify(deleted.filter((entry: string) => entry !== id)));
  return item;
}

export function permanentlyDeleteLocalTrashItem(id: string) {
  localStorage.setItem("qx_local_trash", JSON.stringify(
    getLocalTrash().filter((entry: any) => entry.id !== id),
  ));
}

export function getItemVersions(id: string) {
  const versions = JSON.parse(localStorage.getItem("qx_item_versions") || "{}");
  return versions[id] || [];
}

export function getLocallyDeletedIds() {
  return new Set<string>(JSON.parse(localStorage.getItem("qx_deleted_ids") || "[]"));
}

export async function fetchServerItems() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return [];
  let cursor = 0;
  const latest = new Map<string, any>();
  let hasMore = true;
  while (hasMore) {
    const response = await fetch(`${API}/v1/sync/pull?cursor=${cursor}&limit=500`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      throw new Error("登录状态已失效，请重新登录");
    }
    if (!response.ok) throw new Error("读取服务器数据失败");
    const page = await response.json();
    for (const change of page.changes) latest.set(change.id, change);
    cursor = page.nextCursor;
    hasMore = page.hasMore;
  }
  return [...latest.values()]
    .filter((change) => change.operation !== "delete")
    .sort((a, b) => Number(b.seq) - Number(a.seq));
}

export function disconnectSync() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getLocalItems() {
  const drafts = JSON.parse(localStorage.getItem("qx_drafts") || "[]");
  return drafts.map((item: any, index: number) => ({
    id: item.id,
    seq: Date.parse(item.savedAt || "") || Date.now() - index,
    payload: item,
    localPending: true,
  }));
}

export async function syncNow(force = true) {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;
  if (Capacitor.isNativePlatform()) {
    await BackgroundRunner.dispatchEvent({
      label: "com.qingxiaolu.sync",
      event: "syncNow",
      details: { force },
    });
  } else {
    const changes = JSON.parse(localStorage.getItem("qx_web_outbox") || "[]");
    if (!changes.length) return;
    const response = await fetch(`${API}/v1/sync/push`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ deviceId: "qingxiaolu-web", changes }),
    });
    if (!response.ok) throw new Error("同步失败");
    const result = await response.json();
    const appliedIds = new Set<string>((result.applied || []).map((item: any) => String(item.id)));
    const conflictIds = new Set<string>((result.conflicts || []).map((item: any) => String(item.id)));
    localStorage.setItem("qx_web_outbox", JSON.stringify(
      changes.filter((item: any) => !appliedIds.has(String(item.id))),
    ));
    if (appliedIds.size) {
      const drafts = JSON.parse(localStorage.getItem("qx_drafts") || "[]");
      localStorage.setItem("qx_drafts", JSON.stringify(
        drafts.filter((item: any) => !appliedIds.has(String(item.id))),
      ));
    }
    if (conflictIds.size) throw new Error(`有 ${conflictIds.size} 条内容存在云端新版本，请先刷新后再编辑`);
  }
}
