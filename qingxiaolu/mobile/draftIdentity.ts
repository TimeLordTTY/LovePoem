// 在 React 状态尚未提交、自动保存和手动保存相交时，仍给同一写作会话分配同一个 ID。
export function draftIdForSession(ids: Map<string, string>, session: string, existingId: string, create = () => crypto.randomUUID()): string {
  const known = ids.get(session);
  if (known) return known;
  const id = existingId || create();
  ids.set(session, id);
  return id;
}
