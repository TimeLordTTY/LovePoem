import { Capacitor } from "@capacitor/core";
import { BackgroundRunner } from "@capacitor/background-runner";
import { readStored, changeJson } from "./storage";
import { confirmProjectSessions, projectSessionRevision, projectPayloadFingerprint, projectSessionEntries, PROJECT_SESSION_FIELD, projectDataWithoutSession, projectSnapshotSignature } from "./projectSession";
import { prepareSyncBatch, type ContentMemo } from "./sync-content";

const API = "https://poem.timelordtty.cn/qingxiaolu-api";
const TOKEN_KEY = "qx_sync_token";
export const SYNC_API = API;
export function getSyncToken() { return readStored(TOKEN_KEY) || ""; }
// 旧调用方未显式提供编辑会话时，也只复用当前页面自己的写入会话。
const localWriterSessions = new Map<string, string>();

export function hasSyncLogin() {
  return Boolean(readStored(TOKEN_KEY));
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

// 只沿用同一编辑会话收到的同步确认；不能把尚未读过的云端版本当成编辑基线。
export function getEditorBaseRevision(id: string, session: string, fallback = 0) {
  const editor = JSON.parse(readStored("qx_editor_autosave") || "null");
  return session && editor?.editingId === id && editor?.sessionId === session
    ? Math.max(fallback, Number(editor.metadata?._baseRevision || 0)) : fallback;
}

export function queueLocalBatch(input: any[] | (() => any[]), extra: Record<string, unknown> | (() => Record<string, unknown>) = {}) {
  return changeJson(() => {
  const changes = typeof input === "function" ? input() : input;
  if (new Set(changes.map(change => change.id)).size !== changes.length) throw new Error("导入内容含重复的稿件 ID，尚未导入任何内容。请核对文件。");
  const local = JSON.parse(readStored("qx_drafts") || "[]");
  const current = getLocalItems();
  const versions = JSON.parse(readStored("qx_item_versions") || "{}");
  const savedAt = new Date().toISOString();
  const records = changes.map(change => {
    const previous = current.find((item: any) => item.id === change.id);
    if (previous && (previous.payload.title !== change.title || JSON.stringify(previous.payload.content) !== JSON.stringify(change.content))) {
      versions[change.id] = [{ ...previous.payload, versionSavedAt: savedAt }, ...(versions[change.id] || [])].slice(0, 30);
    }
    return { ...change, baseRevision: change.baseRevision ?? previous?.revision ?? 0, deleted: false, savedAt, syncState: "local" };
  });
  const ids = new Set(records.map(record => record.id));
  return { values: { ...(typeof extra === "function" ? extra() : extra), qx_item_versions: versions,
    qx_web_outbox: JSON.parse(readStored("qx_web_outbox") || "[]").filter((item:any) => !ids.has(item.id)),
    qx_drafts: [...records, ...local.filter((item:any) => !ids.has(item.id))] }, result: undefined };
  });
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
  extra: Record<string, unknown> | (() => Record<string, unknown>) = {},
  projectSession?: string,
) {
  const id = itemId || crypto.randomUUID();
  return changeJson(() => {
  const additional = typeof extra === "function" ? extra() : extra;
  const editor = additional.qx_editor_autosave as any;
  let editingSession = editor?.sessionId || projectSession;
  if (!editingSession) {
    if (!localWriterSessions.has(id)) localWriterSessions.set(id, crypto.randomUUID());
    editingSession = localWriterSessions.get(id);
  }
  const local = JSON.parse(readStored("qx_drafts") || "[]");
  const revision = editor?.sessionId ? getEditorBaseRevision(id, editor.sessionId, baseRevision)
    : projectSession ? projectSessionRevision(id, projectSession, baseRevision)
    : Math.max(baseRevision, Number(local.find((item: any) => item.id === id && item.editorSessionId === editingSession)?.baseRevision || 0));
  if (editor) additional.qx_editor_autosave = { ...editor, metadata: { ...editor.metadata, _baseRevision: revision } };
  const change = {
    id,
    itemType,
    projectId,
    title,
    content,
    baseRevision: revision,
    deleted: false,
  };
  const previous = local.find((item: any) => item.id === id) ||
    getCachedServerItems().find((item: any) => item.id === id)?.payload;
  if (!sendToServer && previous && previous.title === title && previous.projectId === projectId &&
    JSON.stringify(previous.content) === JSON.stringify(content)) return { values: { ...additional,
      ...(editingSession && local.some((item: any) => item.id === id) ? {
        qx_drafts: local.map((item: any) => item.id === id ? { ...item, editorSessionId: editingSession } : item),
      } : {}) }, result: id };
  const values: Record<string, unknown> = { ...additional };
  if (previous && (previous.title !== title || JSON.stringify(previous.content) !== JSON.stringify(content))) {
    const versions = JSON.parse(readStored("qx_item_versions") || "{}");
    if (recordVersion || !versions[id]?.length || Date.now() - Date.parse(versions[id][0].versionSavedAt) > 60000) {
    versions[id] = [
      { ...previous, versionSavedAt: new Date().toISOString() },
      ...(versions[id] || []),
    ].slice(0, 30);
    values.qx_item_versions = versions;
    }
  }
  const withoutOld = local.filter((item: any) => item.id !== id);
  withoutOld.unshift({ ...change, ...(editingSession ? { editorSessionId: editingSession } : {}),
    savedAt: new Date().toISOString(), syncState: sendToServer ? "pending" : "local" });
  values.qx_drafts = withoutOld;
  // 当前页面上的手动同步在网页和 Android 共用队列，错误和冲突也共用界面。
  if (sendToServer) {
    const webOutbox = JSON.parse(readStored("qx_web_outbox") || "[]");
    values.qx_web_outbox = [...webOutbox.filter((entry: any) => entry.id !== id), change];
  } else if (!sendToServer) {
    values.qx_web_outbox = JSON.parse(readStored("qx_web_outbox") || "[]").filter((entry: any) => entry.id !== id);
  }
  return { values, result: id };
  });
}

export async function selectItemsForSync(ids: string[]) {
  return changeJson(() => {
  const wanted = new Set(ids);
  const drafts = JSON.parse(readStored("qx_drafts") || "[]");
  const changes = drafts.filter((item: any) => wanted.has(item.id)).map((item: any) => ({
    id: item.id,
    itemType: item.itemType,
    projectId: item.projectId,
    title: item.title,
    content: item.content,
    baseRevision: item.baseRevision || 0,
    deleted: false,
  }));
    const outbox = JSON.parse(readStored("qx_web_outbox") || "[]");
    return { values: { qx_web_outbox: [...outbox.filter((entry: any) => !wanted.has(entry.id)), ...changes],
      qx_drafts: drafts.map((item: any) => wanted.has(item.id) ? { ...item, syncState: "pending" } : item) }, result: undefined };
  });
}

export function deleteLocalItem(item: any) {
  return changeJson(() => {
  const id = String(item.id);
  const drafts = JSON.parse(readStored("qx_drafts") || "[]");
  const trash = JSON.parse(readStored("qx_local_trash") || "[]");
  const deleted = JSON.parse(readStored("qx_deleted_ids") || "[]");
  return { values: { qx_drafts: drafts.filter((entry: any) => entry.id !== id), qx_local_trash: [
    { ...item, deletedAt: new Date().toISOString() },
    ...trash.filter((entry: any) => entry.id !== id),
  ], qx_web_outbox: JSON.parse(readStored("qx_web_outbox") || "[]").filter((entry: any) => entry.id !== id),
    qx_deleted_ids: deleted.includes(id) ? deleted : [id, ...deleted] }, result: undefined };
  });
}

export function getLocalTrash() {
  return JSON.parse(readStored("qx_local_trash") || "[]");
}

export function restoreLocalTrashItem(id: string) {
  return changeJson(() => {
  const trash = getLocalTrash();
  const item = trash.find((entry: any) => entry.id === id);
  const deleted = JSON.parse(readStored("qx_deleted_ids") || "[]");
  if (item) {
    const payload = item.payload || item;
    const drafts = JSON.parse(readStored("qx_drafts") || "[]");
    return { values: { qx_drafts: [{ ...payload, baseRevision: Number(item.revision ?? payload.baseRevision ?? 0), syncState: "local", savedAt: new Date().toISOString() }, ...drafts.filter((entry: any) => entry.id !== id)],
      qx_local_trash: trash.filter((entry: any) => entry.id !== id), qx_deleted_ids: deleted.filter((entry: string) => entry !== id) }, result: item };
  }
  return { values: {}, result: item };
  });
}

export function permanentlyDeleteLocalTrashItem(id: string) {
  return changeJson(() => ({ values: { qx_local_trash: getLocalTrash().filter((entry: any) => entry.id !== id) }, result: undefined }));
}

export function getItemVersions(id: string) {
  const versions = JSON.parse(readStored("qx_item_versions") || "{}");
  return versions[id] || [];
}

export function getLocallyDeletedIds() {
  return new Set<string>(JSON.parse(readStored("qx_deleted_ids") || "[]"));
}

export async function fetchServerItems() {
  const token = readStored(TOKEN_KEY);
  if (!token) return [];
  let cursor = 0;
  const latest = new Map<string, any>();
  let hasMore = true;
  let watermark = 0;
  while (hasMore) {
    const response = await fetch(`${API}/v1/sync/pull?cursor=${cursor}&limit=500&snapshot=1${watermark ? `&watermark=${watermark}` : ""}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      throw new Error("登录状态已失效，请重新登录");
    }
    if (!response.ok) throw new Error("读取服务器数据失败");
    const page = await response.json();
    watermark = Number(page.watermark || watermark);
    for (const change of page.changes) latest.set(change.id, change);
    cursor = page.nextCursor;
    hasMore = page.hasMore;
  }
  const result = [...latest.values()]
    .filter((change) => change.operation !== "delete")
    .sort((a, b) => Number(b.seq) - Number(a.seq));
  await changeJson(() => {
    const drafts = JSON.parse(readStored("qx_drafts") || "[]");
    const workspaces = JSON.parse(readStored("qx_project_workspaces") || "{}");
    const versions = JSON.parse(readStored("qx_item_versions") || "{}");
    const oldCache = JSON.parse(readStored("qx_server_cache") || "[]");
    const dirty = new Set(drafts.filter((item: any) => item.syncState !== "synced").map((item: any) => item.id));
    let projectChanged = false, versionsChanged = false;
    for (const incoming of result.filter(item => item.payload?.itemType === "project" && !dirty.has(item.id))) {
      const saved = workspaces[incoming.id];
      const { aiKey: ignored, ...content } = projectDataWithoutSession(incoming.payload.content || {});
      if (saved) {
        const { aiKey: privateKey, ...oldContent } = projectDataWithoutSession(saved);
        const previous = drafts.find((item: any) => item.id === incoming.id) || oldCache.find((item: any) => item.id === incoming.id)?.payload;
        if (projectSnapshotSignature(previous?.title || incoming.payload.title, oldContent) !== projectSnapshotSignature(incoming.payload.title, content)) {
          versions[incoming.id] = [{ id: incoming.id, itemType: "project", title: previous?.title || incoming.payload.title,
            content: oldContent, baseRevision: previous?.baseRevision || 0, versionSavedAt: new Date().toISOString() }, ...(versions[incoming.id] || [])].slice(0, 30);
          versionsChanged = true;
        }
      }
      workspaces[incoming.id] = { ...content, aiKey: saved?.aiKey || "", ...(saved?.[PROJECT_SESSION_FIELD] ? { [PROJECT_SESSION_FIELD]: saved[PROJECT_SESSION_FIELD] } : {}) };
      projectChanged = true;
    }
    return { values: { qx_server_cache: result, qx_drafts: drafts.filter((item: any) => item.syncState !== "synced"),
      ...(projectChanged ? { qx_project_workspaces: workspaces } : {}), ...(versionsChanged ? { qx_item_versions: versions } : {}) }, result: undefined };
  });
  localStorage.setItem("qx_last_sync", new Date().toISOString());
  return result;
}

export function disconnectSync() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getLocalItems() {
  const drafts = JSON.parse(readStored("qx_drafts") || "[]");
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
  return JSON.parse(readStored("qx_server_cache") || "[]").map((item: any) => ({ ...item,
    cursorSeq: item.cursorSeq || item.seq,
    seq: Date.parse(String(item.changedAt || item.payload?.savedAt || "")) || item.seq,
    revision: item.revision || item.payload?.revision, syncState: "synced" }));
}

export function getSyncConflicts(): any[] {
  const drafts = JSON.parse(readStored("qx_drafts") || "[]");
  return JSON.parse(readStored("qx_sync_conflicts") || "[]").map((item: any) => ({
    ...item, local: drafts.find((draft: any) => draft.id === item.id) || item.local,
  }));
}

export async function resolveSyncConflict(id: string, choice: "cloud" | "local" | "both") {
  return changeJson(() => {
  const conflict = getSyncConflicts().find((item: any) => item.id === id);
  if (!conflict) return { values: {}, result: undefined };
  const server = conflict.server;
  const cloud = { id, seq: Date.now(), revision: Number(server.revision), payload: {
    id, itemType: server.item_type, projectId: server.project_id, title: server.title,
    content: typeof server.content_json === "string" ? JSON.parse(server.content_json) : server.content_json,
    baseRevision: Number(server.revision),
  } };
  const values: Record<string, unknown> = {};
  const drafts = JSON.parse(readStored("qx_drafts") || "[]");
  const outbox = JSON.parse(readStored("qx_web_outbox") || "[]").filter((item: any) => item.id !== id);
  let restored: any = cloud.payload;
  if (choice === "local") {
    const item = conflict.local;
    const change = { id, itemType: item.itemType, projectId: item.projectId, title: item.title, content: item.content,
      baseRevision: Number(server.revision), deleted: false };
    restored = { ...change, savedAt: new Date().toISOString(), syncState: "pending" };
    values.qx_drafts = [restored, ...drafts.filter((item: any) => item.id !== id)];
    values.qx_web_outbox = [...outbox, change];
  } else {
    const versions = JSON.parse(readStored("qx_item_versions") || "{}");
    versions[id] = [{ ...conflict.local, versionSavedAt: new Date().toISOString() }, ...(versions[id] || [])].slice(0, 30);
    values.qx_item_versions = versions;
    let copy: any;
    if (choice === "both") {
      const item = conflict.local;
      copy = { ...item, id: crypto.randomUUID(), title: `${item.title}（本机副本）`, baseRevision: 0,
        deleted: false, savedAt: new Date().toISOString(), syncState: "local" };
    }
    values.qx_server_cache = [cloud, ...getCachedServerItems().filter((item: any) => item.id !== id)];
    if (cloud.payload.itemType === "project") {
      const workspaces = JSON.parse(readStored("qx_project_workspaces") || "{}");
      values.qx_project_workspaces = { ...workspaces,
        ...(copy ? { [copy.id]: { ...copy.content, aiKey: workspaces[id]?.aiKey || "" } } : {}),
        [id]: { ...cloud.payload.content, aiKey: workspaces[id]?.aiKey || "" } };
    }
    values.qx_drafts = [...(copy ? [copy] : []), ...drafts.filter((item: any) => item.id !== id)];
    values.qx_web_outbox = outbox;
  }
  values.qx_sync_conflicts = getSyncConflicts().filter((item: any) => item.id !== id);
  values.qx_deleted_ids = JSON.parse(readStored("qx_deleted_ids") || "[]").filter((item: string) => item !== id);
  const editor = JSON.parse(readStored("qx_editor_autosave") || "null");
  if (editor?.editingId === id) {
    values.qx_editor_autosave = { ...editor, title: restored.title, body: restored.content?.text || "",
      images: restored.content?.images || [], metadata: { ...restored.content, projectId: restored.projectId,
        _baseRevision: Number(server.revision), syncToServer: false }, savedAt: new Date().toISOString() };
  }
  return { values, result: undefined };
  });
}

let runningSync: Promise<void> | null = null;
export async function syncNow(force = true) {
  if (runningSync) return runningSync;
  runningSync = pushPending(force, new Map()).finally(() => { runningSync = null; });
  return runningSync;
}

async function pushPending(force: boolean, memo: ContentMemo) {
  const token = readStored(TOKEN_KEY);
  if (!token) return;
    const pending = JSON.parse(readStored("qx_web_outbox") || "[]");
    const origins = new Map<string, string | null | undefined>(JSON.parse(readStored("qx_drafts") || "[]").map((item: any) => {
      const submitted = pending.find((entry: any) => entry.id === item.id);
      const matches = submitted && item.title === submitted.title && item.itemType === submitted.itemType &&
        item.projectId === submitted.projectId && Number(item.baseRevision || 0) === Number(submitted.baseRevision || 0) &&
        JSON.stringify(item.content) === JSON.stringify(submitted.content);
      return [item.id, matches ? item.editorSessionId : null];
    }));
    let batch;
    try { batch = await prepareSyncBatch(pending, API, token, memo); }
    catch (error) { if ((error as Error).message.includes("登录状态已失效")) localStorage.removeItem(TOKEN_KEY); throw error; }
    const changes = batch.changes;
    if (!changes.length) return;
    const projectChanges = changes.filter(item => item.itemType === "project");
    const projectFingerprints = new Map<string, string>(projectChanges.length ? await Promise.all(projectChanges
      .map(async item => [item.id, await projectPayloadFingerprint(item.title || "", item.content)] as [string, string])) : []);
    const response = await fetch(`${API}/v1/sync/push`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: batch.body,
    });
    if (response.status === 401) { localStorage.removeItem(TOKEN_KEY); throw new Error("登录状态已失效，请重新登录"); }
    if (!response.ok) throw new Error("同步失败");
    const result = await response.json();
    const appliedIds = new Set<string>((result.applied || []).map((item: any) => String(item.id)));
    const conflictIds = new Set<string>((result.conflicts || []).map((item: any) => String(item.id)));
    const remaining = await changeJson(() => {
    const conflicts = [...getSyncConflicts().filter((item: any) => !conflictIds.has(item.id)),
      ...(result.conflicts || []).map((item: any) => ({ ...item, local: changes.find((change: any) => change.id === item.id) }))];
    const submitted = new Map(changes.map((item: any) => [item.id, JSON.stringify(item)]));
    const drafts = JSON.parse(readStored("qx_drafts") || "[]");
    const workspaces = JSON.parse(readStored("qx_project_workspaces") || "{}");
    const projectConfirmed = confirmProjectSessions(workspaces, result.applied || [], origins, changes, projectFingerprints);
    const sameSession = (id: string) => {
      const session = drafts.find((item: any) => item.id === id)?.editorSessionId;
      const before = projectSessionEntries(workspaces[id]?.[PROJECT_SESSION_FIELD])[session];
      const after = projectSessionEntries(projectConfirmed[id]?.[PROJECT_SESSION_FIELD])[session];
      return (Boolean(origins.get(id)) && origins.get(id) === session) || (before && after && before !== after);
    };
    const remaining = JSON.parse(readStored("qx_web_outbox") || "[]").filter((item: any) =>
      !appliedIds.has(String(item.id)) || JSON.stringify(item) !== submitted.get(item.id)).map((item: any) => {
        const applied = (result.applied || []).find((entry: any) => entry.id === item.id);
        return applied && sameSession(item.id) ? { ...item, baseRevision: applied.revision } : item;
      });
    const editor = JSON.parse(readStored("qx_editor_autosave") || "null");
    const editorApplied = (result.applied || []).find((item: any) => item.id === editor?.editingId);
    const editorSent = changes.find((item: any) => item.id === editor?.editingId);
    const editorConfirmed = editorApplied && editor?.sessionId && origins.get(editor.editingId) === editor.sessionId &&
      Number(editor.metadata?._baseRevision || 0) === Number(editorSent?.baseRevision || 0);
    return { values: { ...(editorConfirmed ? { qx_editor_autosave: { ...editor,
        metadata: { ...editor.metadata, _baseRevision: editorApplied.revision } } } : {}),
      ...(projectConfirmed !== workspaces ? { qx_project_workspaces: projectConfirmed } : {}),
      qx_web_outbox: remaining, qx_sync_conflicts: conflicts, qx_drafts:
        drafts.map((item: any) => {
          const applied = (result.applied || []).find((entry: any) => entry.id === item.id);
          const sent = changes.find((entry: any) => entry.id === item.id);
          const unchanged = sent && item.title === sent.title && JSON.stringify(item.content) === JSON.stringify(sent.content);
          return applied ? { ...item, baseRevision: unchanged || sameSession(item.id) ? applied.revision : item.baseRevision,
            syncState: unchanged ? "synced" : remaining.some((entry: any) => entry.id === item.id) ? "pending" : "local" } :
            conflictIds.has(item.id) ? { ...item, syncState: "conflict" } : item;
        }) }, result: remaining };
    });
    if (conflictIds.size) throw new Error(`有 ${conflictIds.size} 篇稿件有版本冲突，请在稿件库选择保留方式，两版都已保留。`);
    if (remaining.length && appliedIds.size) await pushPending(force, memo);
    else if (remaining.length) throw new Error("云端未确认保存，待同步内容仍保留在本机，请稍后重试。");
}
