import { readStored } from "./storage";

export const PROJECT_SESSION_FIELD = "_qxEditingSession";
export function projectDataWithoutSession(value: Record<string, any> = {}) {
  const { [PROJECT_SESSION_FIELD]: ignored, ...data } = value;
  return data;
}
export function projectSessionRevision(id: string, session: string, fallback: number) {
  const saved = JSON.parse(readStored("qx_project_workspaces") || "{}")[id]?.[PROJECT_SESSION_FIELD];
  const slot = projectSessionEntries(saved)[session];
  return slot ? Math.max(fallback, Number(slot.baseRevision || 0)) : fallback;
}
export function projectSessionEntries(value: any): Record<string, any> {
  return value?.sessions && typeof value.sessions === "object" ? value.sessions
    : value?.id ? { [value.id]: { baseRevision: value.baseRevision } } : {};
}
export function bindProjectSession(saved: any, id: string, baseRevision: number, observedFingerprint: string, parentFingerprint: string) {
  return { sessions: { ...projectSessionEntries(saved), [id]: { baseRevision, observedFingerprint, parentFingerprint } } };
}
export function projectSnapshotSignature(title: string, data: Record<string, any>) {
  const sorted = (value: any): any => Array.isArray(value) ? value.map(sorted) : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])])) : value;
  return JSON.stringify([title, sorted(projectDataWithoutSession(data))]);
}
export async function projectPayloadFingerprint(title: string, content: Record<string, any>) {
  const { aiKey, ...data } = projectDataWithoutSession(content);
  const bytes = new TextEncoder().encode(projectSnapshotSignature(title, data));
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map(value => value.toString(16).padStart(2, "0")).join("");
}
export function confirmProjectSessions(workspaces: Record<string, any>, confirmations: any[], origins: Map<string, string | null | undefined>, submitted: any[], fingerprints = new Map<string, string>()) {
  let next = workspaces;
  for (const applied of confirmations) {
    const sent = submitted.find(item => item.id === applied.id && item.itemType === "project");
    if (!sent) continue;
    const sessions = projectSessionEntries(next[applied.id]?.[PROJECT_SESSION_FIELD]);
    const updated = { ...sessions }; let changed = false;
    for (const [id, saved] of Object.entries(sessions)) {
      const seenSubmitted = fingerprints.has(applied.id) && [saved.observedFingerprint, saved.parentFingerprint].includes(fingerprints.get(applied.id));
      if (Number(saved.baseRevision || 0) !== Number(sent.baseRevision || 0) || (origins.get(applied.id) !== id && !seenSubmitted)) continue;
      updated[id] = { ...saved, baseRevision: applied.revision }; changed = true;
    }
    if (changed) {
      if (next === workspaces) next = { ...workspaces };
      next[applied.id] = { ...next[applied.id], [PROJECT_SESSION_FIELD]: { sessions: updated } };
    }
  }
  return next;
}
