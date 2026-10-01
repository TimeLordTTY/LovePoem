import { Capacitor } from "@capacitor/core";
import { BackgroundRunner } from "@capacitor/background-runner";
import { storeJson, storeBatch } from "./storage";

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
  recordVersion = true,
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
  const previous = local.find((item: any) => item.id === id) ||
    getCachedServerItems().find((item: any) => item.id === id)?.payload;
  if (!sendToServer && previous && previous.title === title && previous.projectId === projectId &&
    JSON.stringify(previous.content) === JSON.stringify(content)) return id;
  if (previous && (previous.title !== title || JSON.stringify(previous.content) !== JSON.stringify(content))) {
    const versions = JSON.parse(localStorage.getItem("qx_item_versions") || "{}");
    if (recordVersion || !versions[id]?.length || Date.now() - Date.parse(versions[id][0].versionSavedAt) > 60000) {
    versions[id] = [
      { ...previous, versionSavedAt: new Date().toISOString() },
      ...(versions[id] || []),
    ].slice(0, 30);
    localStorage.setItem("qx_item_versions", JSON.stringify(versions));
    }
  }
  const withoutOld = local.filter((item: any) => item.id !== id);
  withoutOld.unshift({ ...change, savedAt: new Date().toISOString(), syncState: sendToServer ? "pending" : "local" });
  storeJson("qx_drafts", withoutOld);
  // 当前页面上的手动同步在网页和 Android 共用队列，错误和冲突也共用界面。
  if (sendToServer) {
    const webOutbox = JSON.parse(localStorage.getItem("qx_web_outbox") || "[]");
    storeJson("qx_web_outbox", [...webOutbox.filter((entry: any) => entry.id !== id), change]);
  } else if (!sendToServer) {
    storeJson("qx_web_outbox", JSON.parse(localStorage.getItem("qx_web_outbox") || "[]").filter((entry: any) => entry.id !== id));
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
    const outbox = JSON.parse(localStorage.getItem("qx_web_outbox") || "[]");
    storeJson("qx_web_outbox", [...outbox.filter((entry: any) => !wanted.has(entry.id)), ...changes]);
    storeJson("qx_drafts", drafts.map((item: any) => wanted.has(item.id) ? { ...item, syncState: "pending" } : item));
}

export function deleteLocalItem(item: any) {
  const id = String(item.id);
  const drafts = JSON.parse(localStorage.getItem("qx_drafts") || "[]");
  const trash = JSON.parse(localStorage.getItem("qx_local_trash") || "[]");
  const deleted = JSON.parse(localStorage.getItem("qx_deleted_ids") || "[]");
  storeBatch({ qx_drafts: drafts.filter((entry: any) => entry.id !== id), qx_local_trash: [
    { ...item, deletedAt: new Date().toISOString() },
    ...trash.filter((entry: any) => entry.id !== id),
  ], qx_web_outbox: JSON.parse(localStorage.getItem("qx_web_outbox") || "[]").filter((entry: any) => entry.id !== id),
    qx_deleted_ids: deleted.includes(id) ? deleted : [id, ...deleted] });
}

export function getLocalTrash() {
  return JSON.parse(localStorage.getItem("qx_local_trash") || "[]");
}

export function restoreLocalTrashItem(id: string) {
  const trash = getLocalTrash();
  const item = trash.find((entry: any) => entry.id === id);
  const deleted = JSON.parse(localStorage.getItem("qx_deleted_ids") || "[]");
  if (item) {
    const payload = item.payload || item;
    const drafts = JSON.parse(localStorage.getItem("qx_drafts") || "[]");
    storeBatch({ qx_drafts: [{ ...payload, syncState: "local", savedAt: new Date().toISOString() }, ...drafts.filter((entry: any) => entry.id !== id)],
      qx_local_trash: trash.filter((entry: any) => entry.id !== id), qx_deleted_ids: deleted.filter((entry: string) => entry !== id) });
  }
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
  const result = [...latest.values()]
    .filter((change) => change.operation !== "delete")
    .sort((a, b) => Number(b.seq) - Number(a.seq));
  storeJson("qx_server_cache", result);
  const drafts = JSON.parse(localStorage.getItem("qx_drafts") || "[]");
  // 已同步稿件使用云端最新版本；本机未同步的改动始终保留。
  storeJson("qx_drafts", drafts.filter((item: any) => item.syncState !== "synced"));
  localStorage.setItem("qx_last_sync", new Date().toISOString());
  return result;
}

export function disconnectSync() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getLocalItems() {
  const drafts = JSON.parse(localStorage.getItem("qx_drafts") || "[]");
  const local = drafts.map((item: any, index: number) => ({
    id: item.id,
    seq: Date.parse(item.savedAt || "") || Date.now() - index,
    payload: item,
    revision: Number(item.baseRevision || 0),
    localPending: item.syncState !== "synced",
    syncState: item.syncState || "local",
  }));
  const ids = new Set(local.map((item: any) => item.id));
  const deleted = getLocallyDeletedIds();
  return [...local, ...getCachedServerItems().filter((item: any) => !ids.has(item.id))]
    .filter((item: any) => !deleted.has(item.id));
}

export function getCachedServerItems(): any[] {
  return JSON.parse(localStorage.getItem("qx_server_cache") || "[]").map((item: any) => ({ ...item, revision: item.revision || item.payload?.revision, syncState: "synced" }));
}

export function getSyncConflicts(): any[] {
  const drafts = JSON.parse(localStorage.getItem("qx_drafts") || "[]");
  return JSON.parse(localStorage.getItem("qx_sync_conflicts") || "[]").map((item: any) => ({
    ...item, local: drafts.find((draft: any) => draft.id === item.id) || item.local,
  }));
}

export async function resolveSyncConflict(id: string, choice: "cloud" | "local" | "both") {
  const conflict = getSyncConflicts().find((item: any) => item.id === id);
  if (!conflict) return;
  const server = conflict.server;
  const cloud = { id, seq: Date.now(), revision: Number(server.revision), payload: {
    id, itemType: server.item_type, projectId: server.project_id, title: server.title,
    content: typeof server.content_json === "string" ? JSON.parse(server.content_json) : server.content_json,
    baseRevision: Number(server.revision),
  } };
  if (choice === "local") {
    const item = conflict.local;
    await queueItem(item.itemType, item.title, item.content, item.projectId, true, id, Number(server.revision));
  } else {
    const versions = JSON.parse(localStorage.getItem("qx_item_versions") || "{}");
    versions[id] = [{ ...conflict.local, versionSavedAt: new Date().toISOString() }, ...(versions[id] || [])].slice(0, 30);
    storeJson("qx_item_versions", versions);
    if (choice === "both") {
      const item = conflict.local;
      await queueItem(item.itemType, `${item.title}（本机副本）`, item.content, item.projectId);
    }
    storeJson("qx_server_cache", [cloud, ...getCachedServerItems().filter((item: any) => item.id !== id)]);
    if (cloud.payload.itemType === "project") {
      const workspaces = JSON.parse(localStorage.getItem("qx_project_workspaces") || "{}");
      storeJson("qx_project_workspaces", { ...workspaces, [id]: { ...cloud.payload.content, aiKey: workspaces[id]?.aiKey || "" } });
    }
    storeJson("qx_drafts", JSON.parse(localStorage.getItem("qx_drafts") || "[]").filter((item: any) => item.id !== id));
    storeJson("qx_web_outbox", JSON.parse(localStorage.getItem("qx_web_outbox") || "[]").filter((item: any) => item.id !== id));
  }
  storeJson("qx_sync_conflicts", getSyncConflicts().filter((item: any) => item.id !== id));
  const editor = JSON.parse(localStorage.getItem("qx_editor_autosave") || "null");
  if (editor?.editingId === id) {
    const current = getLocalItems().find((item: any) => item.id === id);
    if (current) storeJson("qx_editor_autosave", { ...editor, title: current.payload.title, body: current.payload.content?.text || "",
      images: current.payload.content?.images || [], metadata: { ...current.payload.content, projectId: current.payload.projectId,
        _baseRevision: current.revision, syncToServer: false }, savedAt: new Date().toISOString() });
  }
}

let runningSync: Promise<void> | null = null;
export async function syncNow(force = true) {
  if (runningSync) return runningSync;
  runningSync = pushPending(force).finally(() => { runningSync = null; });
  return runningSync;
}

async function pushPending(force: boolean) {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;
    const changes = JSON.parse(localStorage.getItem("qx_web_outbox") || "[]").slice(0, 500);
    if (!changes.length) return;
    const response = await fetch(`${API}/v1/sync/push`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ deviceId: "qingxiaolu-web", changes }),
    });
    if (response.status === 401) { localStorage.removeItem(TOKEN_KEY); throw new Error("登录状态已失效，请重新登录"); }
    if (!response.ok) throw new Error("同步失败");
    const result = await response.json();
    const appliedIds = new Set<string>((result.applied || []).map((item: any) => String(item.id)));
    const conflictIds = new Set<string>((result.conflicts || []).map((item: any) => String(item.id)));
    const conflicts = [...getSyncConflicts().filter((item: any) => !conflictIds.has(item.id)),
      ...(result.conflicts || []).map((item: any) => ({ ...item, local: changes.find((change: any) => change.id === item.id) }))];
    const submitted = new Map(changes.map((item: any) => [item.id, JSON.stringify(item)]));
    const remaining = JSON.parse(localStorage.getItem("qx_web_outbox") || "[]").filter((item: any) =>
      !appliedIds.has(String(item.id)) || JSON.stringify(item) !== submitted.get(item.id)).map((item: any) => {
        const applied = (result.applied || []).find((entry: any) => entry.id === item.id);
        return applied ? { ...item, baseRevision: applied.revision } : item;
      });
    const drafts = JSON.parse(localStorage.getItem("qx_drafts") || "[]");
    storeBatch({ qx_web_outbox: remaining, qx_sync_conflicts: conflicts, qx_drafts:
        drafts.map((item: any) => {
          const applied = (result.applied || []).find((entry: any) => entry.id === item.id);
          const sent = changes.find((entry: any) => entry.id === item.id);
          const unchanged = sent && item.title === sent.title && JSON.stringify(item.content) === JSON.stringify(sent.content);
          return applied ? { ...item, baseRevision: applied.revision, syncState: unchanged ? "synced" : remaining.some((entry: any) => entry.id === item.id) ? "pending" : "local" } :
            conflictIds.has(item.id) ? { ...item, syncState: "conflict" } : item;
        }) });
    if (conflictIds.size) throw new Error(`有 ${conflictIds.size} 篇稿件有版本冲突，请在稿件库选择保留方式，两版都已保留。`);
    if (remaining.length && appliedIds.size) await pushPending(force);
    else if (remaining.length) throw new Error("云端未确认保存，待同步内容仍保留在本机，请稍后重试。");
}
