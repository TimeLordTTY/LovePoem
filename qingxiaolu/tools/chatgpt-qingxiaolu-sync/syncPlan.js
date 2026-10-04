export function makeAttempt(options, owner) {
  return { ...options, owner, id: crypto.randomUUID(), materialId: crypto.randomUUID(),
    createdAt: new Date().toISOString(), confirmed: {} };
}

export function buildChanges(attempt, project) {
  if (!project || project.id !== attempt.projectId) throw new Error("请先选择一个有效的情晓录项目");
  const changes = [];
  if (attempt.category !== "讨论记录" && !attempt.confirmed[attempt.projectId]) {
    const content = structuredClone(project.payload.content || {});
    const receipts = Array.isArray(content.chatgptImportIds) ? content.chatgptImportIds : [];
    if (receipts.includes(attempt.id)) attempt.confirmed[attempt.projectId] = Number(project.revision);
    else {
      const block = `## ${attempt.title}\n${attempt.text}`;
      if (attempt.category === "人物") content.characterCards = [...(content.characterCards || []), { id: attempt.materialId, name: attempt.title, role: "ChatGPT 讨论整理", description: attempt.text }];
      else if (attempt.category === "世界观") content.world = `${content.world || ""}${content.world ? "\n\n" : ""}${block}`;
      else if (attempt.category === "大纲") content.chapters = [...(content.chapters || []), { id: attempt.materialId, title: attempt.title, summary: attempt.text, status: "待修改" }];
      else if (attempt.category === "情节") content.plot = `${content.plot || ""}${content.plot ? "\n\n" : ""}${block}`;
      else if (attempt.category === "时间轴") content.timelineEvents = [...(content.timelineEvents || []), { id: attempt.materialId, time: "", title: attempt.title, detail: attempt.text }];
      else throw new Error("无法识别保存位置，尚未发送任何内容");
      content.chatgptImportIds = [...receipts, attempt.id];
      changes.push({ id: project.id, itemType: "project", title: project.payload.title, content, baseRevision: Number(project.revision) });
    }
  }
  if (!attempt.confirmed[attempt.id]) changes.push({ id: attempt.id, itemType: "article", projectId: attempt.projectId, title: attempt.title, baseRevision: 0,
    content: { text: attempt.text, status: "draft", visibility: "qingxiaolu", publicationState: "editing", imported: true,
      sourceLabel: "ChatGPT", sourceUrl: attempt.url, category: attempt.category, importedAt: attempt.createdAt } });
  return changes;
}

export function acceptResult(attempt, result, changes, projects) {
  const sent = new Map(changes.map(change => [change.id, change]));
  if (!Array.isArray(result?.applied) || !Array.isArray(result?.conflicts) ||
    result.applied.some(item => !sent.has(item?.id) || !Number.isSafeInteger(item.revision) || item.revision <= 0) ||
    result.conflicts.some(item => !sent.has(item?.id) || !item.server || !Number.isSafeInteger(Number(item.server.revision)) || Number(item.server.revision) <= 0) ||
    new Set([...result.applied, ...result.conflicts].map(item => item.id)).size !== result.applied.length + result.conflicts.length)
    throw new Error("服务器返回了异常保存确认，未确认内容仍保存在本机，请重试");
  for (const item of result.applied) {
    attempt.confirmed[item.id] = item.revision;
    const change = sent.get(item.id);
    if (change.itemType === "project") projects.set(item.id, { id: item.id, revision: item.revision, payload: change });
  }
  for (const item of result.conflicts) {
    if (item.id !== attempt.projectId) continue;
    const server = item.server;
    let content;
    try { content = typeof server.content_json === "string" ? JSON.parse(server.content_json) : server.content_json; }
    catch { continue; }
    if (content && typeof content === "object") projects.set(item.id, { id: item.id, revision: Number(server.revision), payload: { itemType: "project", title: server.title || projects.get(item.id)?.payload.title, content } });
  }
  return Boolean(attempt.confirmed[attempt.id] && (attempt.category === "讨论记录" || attempt.confirmed[attempt.projectId]));
}
