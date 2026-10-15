import { validateMindTrees, TREE_LIMIT } from '../sync-server/mind-tree-schema.mjs';
export { validateMindTrees, TREE_LIMIT };
export const MIND_TREE_FILE_BYTES = 32 * 1024 * 1024;
export type MindRef = { kind: 'record' | 'character' | 'chapter' | 'event'; id: string } |
  { kind: 'projectSection'; section: 'world' | 'plot' | 'characters' | 'outline' | 'timeline' | 'privateNotes' };
export type MindNode = { id: string; parentId: string | null; order: number; text: string; note: string; collapsed: boolean; ref?: MindRef };
export type MindTree = { schemaVersion: 1; id: string; title: string; rootNodeId: string; nodes: MindNode[] };
export function newMindTree(title = '新的构思'): MindTree {
  const rootNodeId = crypto.randomUUID();
  return { schemaVersion: 1, id: crypto.randomUUID(), title, rootNodeId,
    nodes: [{ id: rootNodeId, parentId: null, order: 0, text: title, note: '', collapsed: false }] };
}
export function childrenOf(tree: MindTree, parentId: string) {
  return tree.nodes.filter(node => node.parentId === parentId).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}
function normalizeOrder(tree: MindTree): MindTree {
  const groups = new Map<string | null, MindNode[]>();
  for (const node of tree.nodes) groups.set(node.parentId, [...(groups.get(node.parentId) || []), node]);
  const order = new Map<string, number>();
  for (const siblings of groups.values()) siblings.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)).forEach((node, index) => order.set(node.id, index));
  return { ...tree, nodes: tree.nodes.map(node => ({ ...node, order: order.get(node.id)! })) };
}
export function branchIds(tree: MindTree, id: string) {
  const children = new Map<string, string[]>();
  for (const node of tree.nodes) { if (node.parentId !== null) children.set(node.parentId, [...(children.get(node.parentId) || []), node.id]); }
  const result = new Set<string>(); const pending = [id];
  while (pending.length) { const next = pending.pop()!; if (result.has(next)) continue; result.add(next); pending.push(...(children.get(next) || [])); }
  return result;
}
export function addMindNode(tree: MindTree, parentId: string, text = '新的想法'): MindTree {
  if (tree.nodes.length >= TREE_LIMIT) throw new Error(`每张树最多 ${TREE_LIMIT} 个节点，请拆成多张树。`);
  if (!tree.nodes.some(node => node.id === parentId)) throw new Error('父节点不存在');
  const siblings = childrenOf(tree, parentId);
  return normalizeOrder({ ...tree, nodes: [...tree.nodes.map(node => node.id === parentId ? { ...node, collapsed: false } : node),
    { id: crypto.randomUUID(), parentId, order: Math.max(-1, ...siblings.map(node => node.order)) + 1, text, note: '', collapsed: false }] });
}
export function moveMindNode(tree: MindTree, id: string, parentId: string, index?: number): MindTree {
  const original = tree.nodes.find(node => node.id === id);
  if (!original || id === tree.rootNodeId || !tree.nodes.some(node => node.id === parentId) || branchIds(tree, id).has(parentId))
    throw new Error('不能将根节点、节点本身或其后代作为此移动的目标');
  const siblings = childrenOf(tree, parentId).filter(node => node.id !== id);
  siblings.splice(Math.max(0, Math.min(index ?? siblings.length, siblings.length)), 0, original);
  const orders = new Map(siblings.map((node, order) => [node.id, order]));
  const next = { ...tree, nodes: tree.nodes.map(node => ({ ...node,
    ...(orders.has(node.id) ? { parentId, order: orders.get(node.id)! } : {}), ...(node.id === parentId ? { collapsed: false } : {}) })) };
  validateMindTrees([next]); return normalizeOrder(next);
}
export function removeMindBranch(tree: MindTree, id: string): MindTree {
  if (id === tree.rootNodeId) throw new Error('根节点请使用删除整张树');
  const ids = branchIds(tree, id); return normalizeOrder({ ...tree, nodes: tree.nodes.filter(node => !ids.has(node.id)) });
}
// 不递归遍历，深层树也不会耗尽调用栈；布局不写入作品数据。
export function layoutMindTree(tree: MindTree) {
  const groups = new Map<string, MindNode[]>();
  for (const node of tree.nodes) if (node.parentId !== null) groups.set(node.parentId, [...(groups.get(node.parentId) || []), node]);
  for (const group of groups.values()) group.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const map = new Map(tree.nodes.map(node => [node.id, node]));
  const result: Array<{ node: MindNode; x: number; y: number; depth: number }> = [];
  const pending = [{ id: tree.rootNodeId, depth: 0 }];
  while (pending.length) {
    const { id, depth } = pending.pop()!; const node = map.get(id); if (!node) continue;
    result.push({ node, x: depth * 250 + 30, y: result.length * 94 + 30, depth });
    if (!node.collapsed) for (const child of [...(groups.get(id) || [])].reverse()) pending.push({ id: child.id, depth: depth + 1 });
  }
  // 让父节点位于可见直接子节点之间，保持分支留白。
  const placed = new Map(result.map(item => [item.node.id, item]));
  for (const item of [...result].reverse()) {
    const visible = item.node.collapsed ? [] : (groups.get(item.node.id) || []).map(n => placed.get(n.id)!).filter(Boolean);
    if (visible.length) item.y = (visible[0].y + visible[visible.length - 1].y) / 2;
  }
  return result;
}
export function parseMindTreeFile(text: string, projectId: string): MindTree {
  if (new TextEncoder().encode(text).byteLength > MIND_TREE_FILE_BYTES) throw new Error('导图文件超过 32MB，请拆分后导入');
  const file = JSON.parse(text);
  if (file?.format !== 'qingxiaolu-mind-tree' || file.version !== 1) throw new Error('不是支持的情晓录思维树文件');
  validateMindTrees([file.tree]);
  const tree: MindTree = file.tree; const ids = new Map(tree.nodes.map(node => [node.id, crypto.randomUUID()]));
  return { ...tree, id: crypto.randomUUID(), rootNodeId: ids.get(tree.rootNodeId)!, nodes: tree.nodes.map(node => ({ ...node,
    id: ids.get(node.id)!, parentId: node.parentId === null ? null : ids.get(node.parentId)!,
    // 跨项目复制保留自由文字与备注，不按同名资料猜测关联。
    ...(file.projectId !== projectId ? { ref: undefined, text: node.text || '原项目引用（请重新关联）' } : {}) })) };
}
