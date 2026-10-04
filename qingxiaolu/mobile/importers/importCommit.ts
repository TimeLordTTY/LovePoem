import { readJson, changeJson } from "../storage";
import type { ImportCandidate } from "./types";
import { readItemSnapshot } from "../itemSnapshot";

const titleFor = (item: ImportCandidate) => item.source === "qqzone" ? "" : ["weibo", "wechat", "yiyan"].includes(item.source) ? item.title : item.title || item.text.slice(0, 20);
const signature = (title: string, content: any) => JSON.stringify([
  title, content.text, content.importSource, content.publishedAt || "", content.originalUrl || "", content.images || [],
]);
function currentImportRecords() {
  const drafts = readItemSnapshot("qx_drafts"), cache = readItemSnapshot("qx_server_cache");
  const deleted = new Set(readJson<string[]>("qx_deleted_ids", []));
  return [...drafts, ...cache.filter(entry => !drafts.some(draft => draft.id === entry.id)).map(entry => ({ ...entry.payload, baseRevision: Number(entry.revision || entry.payload?.baseRevision || 0) }))]
    .filter(entry => !deleted.has(entry.id));
}
export function filterPreviouslyImported(items: ImportCandidate[], projectId?: string, category = "正文") {
  const material = Boolean(projectId && category !== "正文");
  const current = currentImportRecords();
  const workspace = { ...current.find(entry => entry.id === projectId)?.content,
    ...readJson<Record<string, any>>("qx_project_workspaces", {})[projectId || ""] };
  const known = new Set<string>(material ? workspace?.importSignatures || [] : current
    .filter(entry => entry.itemType === "article" && entry.projectId === (projectId || undefined) && entry.content?.imported)
    .map(entry => signature(entry.title, entry.content)));
  return items.filter(item => {
    const key = signature(titleFor(item), { text: item.text, importSource: item.source, publishedAt: item.publishedAt, originalUrl: item.originalUrl, images: item.images });
    return !known.has(material ? JSON.stringify([category, key]) : key);
  });
}

// 先准备整个批次再统一保存；存储失败时不会留下半批稿件。
export function commitImport(items: ImportCandidate[], options: {
  projectId?: string; category?: string; skipDuplicates?: boolean;
} = {}) {
  return changeJson(() => {
  const projectId = options.projectId || undefined;
  const category = options.category || "正文";
  const material = Boolean(projectId && category !== "正文");
  const drafts = readJson<any[]>("qx_drafts", []);
  const current = currentImportRecords();
  const known = new Set(current.filter(entry => entry.itemType === "article" && entry.projectId === projectId && entry.content?.imported)
    .map(entry => signature(entry.title, entry.content)));
  const workspaces = readJson<Record<string, any>>("qx_project_workspaces", {});
  const project = current.find(entry => entry.id === projectId && entry.itemType === "project");
  if (projectId && !project) throw new Error("目标项目已不存在，请重新选择项目。");
  const workspace = material ? structuredClone({ ...project?.content, ...workspaces[projectId!] }) : null;
  const materialKnown = new Set<string>(workspace?.importSignatures || []);
  const now = new Date().toISOString();
  const additions: any[] = [];
  let skipped = 0;
  for (const item of items.filter(item => item.selected)) {
    const title = titleFor(item);
    const content = { text: item.text, imported: true, importSource: item.source, sourceLabel: item.sourceLabel,
      publishedAt: item.publishedAt, images: item.images, originalUrl: item.originalUrl, importRaw: item.raw,
      projectId, materialCategory: category };
    const key = signature(title, content);
    const materialKey = JSON.stringify([category, key]);
    if (options.skipDuplicates !== false && (material ? materialKnown.has(materialKey) : known.has(key))) { skipped++; continue; }
    if (material) {
      const original = (item.raw as any)?.originalXmind;
      if (typeof original === "string" && original.startsWith("data:application/x-xmind;base64,")) {
        const documents = workspace.importDocuments || [];
        if (!documents.some((document: any) => document.dataUrl === original)) workspace.importDocuments = [
          ...documents, { fileName: (item.raw as any)?.fileName || `${item.title}.xmind`, dataUrl: original },
        ];
      }
      if (category === "人物") workspace.characterCards = [...(workspace.characterCards || []), { id: item.id, name: title, role: "导入资料", description: item.text, importSource: content }];
      else if (category === "大纲") workspace.chapters = [...(workspace.chapters || []), { id: item.id, title, summary: item.text, status: "待修改", importSource: content }];
      else if (category === "时间轴") workspace.timelineEvents = [...(workspace.timelineEvents || []), { id: item.id, time: item.publishedAt || "", title, detail: item.text, importSource: content }];
      else { const field = category === "背景" ? "world" : "privateNotes"; workspace[field] = `${workspace[field] || ""}${workspace[field] ? "\n\n" : ""}## ${title}\n${item.text}`; }
      materialKnown.add(materialKey);
    } else {
      additions.push({ id: item.id, itemType: "article", projectId, title, content, baseRevision: 0,
        deleted: false, savedAt: now, syncState: "local" });
      known.add(key);
    }
  }
  const added = items.filter(item => item.selected).length - skipped;
  if (!added) return { values: {}, result: { added, skipped } };
  const values: Record<string, unknown> = {};
  if (material) {
    workspace.importSignatures = [...materialKnown];
    const { aiKey, ...content } = workspace;
    const versions = readJson<Record<string, any[]>>("qx_item_versions", {});
    versions[projectId!] = [{ ...project, versionSavedAt: now }, ...(versions[projectId!] || [])].slice(0, 30);
    values.qx_item_versions = versions;
    values.qx_project_workspaces = { ...workspaces, [projectId!]: workspace };
    additions.push({ ...project, content, savedAt: now, syncState: "local" });
    values.qx_web_outbox = readJson<any[]>("qx_web_outbox", []).filter(entry => entry.id !== projectId);
  }
  const ids = new Set(additions.map(entry => entry.id));
  values.qx_drafts = [...additions, ...drafts.filter(entry => !ids.has(entry.id))];
  return { values, result: { added, skipped } };
  });
}
