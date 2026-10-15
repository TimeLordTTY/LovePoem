// 网页与同步服务共用结构校验；引用失效不会导致树被删除。
export const TREE_LIMIT = 2000;
const sections = new Set(['world', 'plot', 'characters', 'outline', 'timeline', 'privateNotes']);
const kinds = new Set(['record', 'character', 'chapter', 'event']);
export function validateMindTrees(trees) {
  if (trees === undefined) return;
  const fail = () => { throw new Error('思维树结构无效或版本不支持，尚未覆盖原资料。请保留文件并检查节点、父子关系与版本。'); };
  const id = value => typeof value === 'string' && value.length > 0 && value.length <= 100;
  const text = (value, max) => typeof value === 'string' && value.length <= max;
  if (!Array.isArray(trees) || trees.length > 100) fail();
  if (JSON.stringify(trees).length > 8_000_000) throw new Error('项目思维树超过保存上限，请拆分到其他项目。');
  const treeIds = new Set();
  for (const tree of trees) {
    if (!tree || tree.schemaVersion !== 1 || !id(tree.id) || treeIds.has(tree.id) || !text(tree.title, 500) ||
        !Array.isArray(tree.nodes) || !tree.nodes.length || tree.nodes.length > TREE_LIMIT || !id(tree.rootNodeId)) fail();
    treeIds.add(tree.id);
    const nodes = new Map();
    for (const node of tree.nodes) {
      if (!node || !id(node.id) || nodes.has(node.id) || !text(node.text, 2000) || !text(node.note, 100000) ||
          typeof node.collapsed !== 'boolean' || !Number.isSafeInteger(node.order) || node.order < 0 ||
          !(node.parentId === null || id(node.parentId))) fail();
      if (node.ref !== undefined && (!node.ref || (node.ref.kind === 'projectSection' ? !sections.has(node.ref.section) :
        !kinds.has(node.ref.kind) || !id(node.ref.id)))) fail();
      nodes.set(node.id, node);
    }
    if (!nodes.has(tree.rootNodeId) || nodes.get(tree.rootNodeId).parentId !== null) fail();
    const children = new Map();
    for (const node of tree.nodes) {
      if (node.id === tree.rootNodeId) continue;
      if (node.parentId === null || !nodes.has(node.parentId)) fail();
      const siblings = children.get(node.parentId) || [];
      siblings.push(node.id); children.set(node.parentId, siblings);
    }
    const visited = new Set(); const pending = [tree.rootNodeId];
    while (pending.length) {
      const current = pending.pop(); if (visited.has(current)) fail();
      visited.add(current); pending.push(...(children.get(current) || []));
    }
    if (visited.size !== nodes.size) fail();
  }
}

// 只解码导图字段，不把带大量原图的项目整体装入内存。
export async function projectMindTrees(content, encoded, store) {
  if (!encoded) return content?.mindTrees;
  if (content?.[0] !== 'o') return undefined;
  let found = false, result;
  for (const [key, value] of content[1]) {
    let name = key[0] === 's' ? key[1] : undefined;
    if (name === undefined && key[0] === 'b' && key[2] === 'string' && key[4] < 100) name = await decode(key, 100);
    if (name !== 'mindTrees') continue;
    if (found) throw new Error('项目包含重复的思维树字段，尚未保存');
    found = true; result = await decode(value, 32 * 1024 * 1024);
  }
  return result;
  async function decode(value, limit) {
    let bytes = 0; const chunks = [];
    await store.stream({ write(text) { bytes += Buffer.byteLength(text); if (bytes > limit) throw new Error('思维树内容过大，尚未保存'); chunks.push(text); } }, value);
    return JSON.parse(chunks.join(''));
  }
}
