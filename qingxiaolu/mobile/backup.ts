import { getLocalItems } from "./sync";
import { nativeFileAvailable, saveNativeFile } from "./nativeFile";
import { readJson, readStored, changeJson } from "./storage";

export type WritingBackup = {
  format: "qingxiaolu-backup";
  version: 1;
  createdAt: string;
  items: any[];
  workspaces: Record<string, any>;
  versions: Record<string, any[]>;
  trash: any[];
  editor: any;
  deletedIds?: string[];
};

// 备份只有创作内容；账号、令牌和 AI 密钥不随文件带出。
function clean(value: any): any {
  if (Array.isArray(value)) return value.map(clean);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !["aiKey", "token", "password", "_qxEditingSession", "__proto__", "constructor", "prototype"].includes(key))
    .map(([key, item]) => [key, clean(item)]));
}

async function embedImage(source: string): Promise<string> {
  if (!source || source.startsWith("data:")) return source;
  try {
    const response = await fetch(source);
    if (!response.ok) throw new Error("image unavailable");
    const blob = await response.blob();
    if (!blob.type.startsWith("image/")) throw new Error("not an image");
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch { throw new Error("有图片无法读取，完整备份未生成。请联网或重新导入该图片后再备份。"); }
}

async function embed(value: any, memo: Map<string, Promise<string>>): Promise<any> {
  if (Array.isArray(value)) return Promise.all(value.map((item) => embed(item, memo)));
  if (!value || typeof value !== "object") return value;
  const result: any = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === "cover" && typeof item === "string" && item) {
      if (!memo.has(item)) memo.set(item, embedImage(item));
      result[key] = await memo.get(item);
    } else if (key === "images" && Array.isArray(item)) {
      result[key] = await Promise.all(item.map((source: string) => {
        if (!memo.has(source)) memo.set(source, embedImage(source));
        return memo.get(source);
      }));
    } else result[key] = await embed(item, memo);
  }
  return result;
}

export async function createBackup(projectId?: string, currentDraft?: any): Promise<WritingBackup> {
  const belongs = (item: any) => !projectId || item.id === projectId ||
    (item.payload || item).projectId === projectId || (item.payload || item).content?.projectId === projectId;
  const savedItems = getLocalItems();
  const items = (currentDraft ? [currentDraft, ...savedItems.filter((item) => item.id !== currentDraft.id)] : savedItems).filter(belongs);
  const trash = readJson<any[]>("qx_local_trash", []).filter(belongs);
  const ids = new Set([...items, ...trash].map((item) => item.id));
  const workspaces = readJson<Record<string, any>>("qx_project_workspaces", {});
  if (currentDraft?.payload?.itemType === "project") workspaces[currentDraft.id] = currentDraft.payload.content;
  const versions = readJson<Record<string, any[]>>("qx_item_versions", {});
  return embed(clean({ format: "qingxiaolu-backup", version: 1, createdAt: new Date().toISOString(), items,
    workspaces: Object.fromEntries(Object.entries(workspaces).filter(([id]) => !projectId || id === projectId)),
    versions: Object.fromEntries(Object.entries(versions).filter(([id]) => !projectId || ids.has(id))),
    trash,
    deletedIds: readJson<string[]>("qx_deleted_ids", []).filter((id) => !projectId || id === projectId ||
      readJson<any[]>("qx_local_trash", []).some((item) => item.id === id && belongs(item))),
    editor: (() => {
      const previous = readJson<any>("qx_editor_autosave", null);
      const draft = currentDraft && currentDraft.payload.itemType !== "project" ? {
        ...previous, title: currentDraft.payload.title, body: currentDraft.payload.content.text || "", images: currentDraft.payload.content.images || [],
        creationType: currentDraft.payload.itemType, editingId: currentDraft.id, projectId: currentDraft.payload.projectId,
        metadata: { ...currentDraft.payload.content, projectId: currentDraft.payload.projectId, _baseRevision: currentDraft.revision || 0 },
        position: currentDraft.position || previous?.position, savedAt: new Date().toISOString(),
      } : previous;
      return !projectId || draft?.projectId === projectId ? draft : null;
    })(),
  }), new Map());
}

export async function createSnapshotBackup(source: Record<string, string>): Promise<WritingBackup> {
  const get = (key: string, fallback: any) => source[key] ? JSON.parse(source[key]) : fallback;
  const drafts = get("qx_drafts", []);
  const ids = new Set(drafts.map((item: any) => item.id));
  return embed(clean({ format: "qingxiaolu-backup", version: 1, createdAt: new Date().toISOString(),
    items: [...drafts.map((item: any) => ({ id: item.id, revision: item.baseRevision || 0, payload: item })),
      ...get("qx_server_cache", []).filter((item: any) => !ids.has(item.id))],
    workspaces: get("qx_project_workspaces", {}), versions: get("qx_item_versions", {}),
    trash: get("qx_local_trash", []), editor: get("qx_editor_autosave", null), deletedIds: get("qx_deleted_ids", []),
  }), new Map());
}

export function parseBackup(text: string): WritingBackup {
  let parsed;
  try { parsed = JSON.parse(text); }
  catch { throw new Error("完整备份不是有效的 JSON 文件，尚未写入任何数据。请检查文件是否完整。"); }
  return validateBackup(clean(parsed));
}

function validateBackup(data: any): WritingBackup {
  if (!data || typeof data !== "object" || Array.isArray(data) || data.format !== "qingxiaolu-backup" || data.version !== 1 || !Array.isArray(data.items) ||
    !data.workspaces || Array.isArray(data.workspaces) || typeof data.workspaces !== "object" ||
    !data.versions || Array.isArray(data.versions) || typeof data.versions !== "object" || !Array.isArray(data.trash) ||
    Object.values(data.versions).some((value) => !Array.isArray(value)) ||
    Object.values(data.workspaces).some((value) => !value || typeof value !== "object" || Array.isArray(value)) ||
    data.trash.some((item: any) => !item || typeof item.id !== "string") ||
    (data.deletedIds && (!Array.isArray(data.deletedIds) || data.deletedIds.some((id: any) => typeof id !== "string"))) ||
    data.items.some((item: any) => !item || typeof item.id !== "string" || !["project", "article", "idea"].includes(item.payload?.itemType) || !item.payload?.content)) {
    throw new Error("这不是有效的情晓录完整备份文件，尚未写入任何数据。");
  }
  if (new Set(data.items.map((item: any) => item.id)).size !== data.items.length)
    throw new Error("备份中存在重复的稿件 ID，尚未写入任何数据。请核对原文件。");
  return data;
}

export function restoreBackup(data: WritingBackup) {
  validateBackup(data);
  return changeJson(() => {
  // 相同 ID 的现有稿件优先保留；恢复不加入同步队列。
  const current = getLocalItems();
  const ids = new Set(current.map((item) => item.id));
  const incoming = data.items.filter((item) => !ids.has(item.id));
  const values: Record<string, unknown> = {
    qx_drafts: [...incoming.map((item) => ({ ...item.payload, id: item.id, baseRevision: item.revision || item.payload.baseRevision || 0, syncState: "local", savedAt: new Date().toISOString() })),
      ...readJson<any[]>("qx_drafts", []).filter((item) => !incoming.some((entry) => entry.id === item.id))],
    qx_project_workspaces: { ...Object.fromEntries(Object.entries(data.workspaces).filter(([id]) => !ids.has(id))), ...readJson("qx_project_workspaces", {}) },
    qx_item_versions: { ...data.versions, ...readJson("qx_item_versions", {}) },
  };
    const trash = readJson<any[]>("qx_local_trash", []);
    const trashIds = new Set(trash.map((item) => item.id));
    values.qx_local_trash = [...trash, ...data.trash.filter((item) => !trashIds.has(item.id) && !ids.has(item.id))];
    if (!readStored("qx_editor_autosave") && data.editor) values.qx_editor_autosave = data.editor;
    values.qx_deleted_ids = [...new Set([...readJson<string[]>("qx_deleted_ids", []), ...(data.deletedIds || [])])]
      .filter((id) => !ids.has(id) && !incoming.some((item) => item.id === id));
  return { values, result: { restored: incoming.length, skipped: data.items.length - incoming.length } };
  });
}

export function backupDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export async function downloadBackup(data: WritingBackup, name: string) {
  const fileName = `${name}-完整备份-${backupDate()}.json`;
  if (nativeFileAvailable()) return (await saveNativeFile(new File([JSON.stringify(data)], fileName, { type: "application/json" }))).saved;
  const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
