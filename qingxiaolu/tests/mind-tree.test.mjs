import test from 'node:test';
import assert from 'node:assert/strict';
import { newMindTree, addMindNode, moveMindNode, removeMindBranch, branchIds, childrenOf, layoutMindTree, parseMindTreeFile, validateMindTrees, MIND_TREE_FILE_BYTES } from '../work/writing-tests/mindTree.mjs';
import { projectMindTrees } from '../sync-server/mind-tree-schema.mjs';
import { createContentStore } from '../sync-server/content-store.mjs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createBackup, parseBackup, restoreBackup } from '../work/writing-tests/backup.mjs';
test('分支换父节点保留稳定 ID 和整个子树，拒绝自环及后代环', () => {
  let tree = newMindTree('构思'); const root = tree.rootNodeId;
  tree = addMindNode(tree, root, '人物'); const first = tree.nodes.at(-1).id;
  tree = addMindNode(tree, first, '动机'); const child = tree.nodes.at(-1).id;
  tree = addMindNode(tree, root, '章节'); const second = tree.nodes.at(-1).id;
  assert.throws(() => moveMindNode(tree, first, child)); assert.throws(() => moveMindNode(tree, first, first));
  assert.throws(() => moveMindNode(tree, root, second));
  const moved = moveMindNode(tree, first, second); validateMindTrees([moved]);
  assert.equal(moved.nodes.find(n => n.id === first).parentId, second);
  assert.equal(moved.nodes.find(n => n.id === child).parentId, first);
  assert.deepEqual([...branchIds(moved, second)], [second, first, child]);
  const removed = removeMindBranch(moved, first); assert.equal(removed.nodes.length, 2);
  assert.equal(tree.nodes.length, 4, '原快照可恢复，操作不能就地改写');
});
test('新树和复制独立分配身份，同项目文件保留引用，跨项目不猜同名', () => {
  const tree = newMindTree(); tree.nodes[0].ref = { kind: 'character', id: 'original-person' };
  const json = JSON.stringify({ format: 'qingxiaolu-mind-tree', version: 1, projectId: 'project-a', tree });
  const same = parseMindTreeFile(json, 'project-a'); const other = parseMindTreeFile(json, 'project-b');
  assert.notEqual(same.id, tree.id); assert.notEqual(same.rootNodeId, tree.rootNodeId);
  assert.deepEqual(same.nodes[0].ref, tree.nodes[0].ref); assert.equal(other.nodes[0].ref, undefined);
  assert.equal(tree.nodes[0].ref.id, 'original-person');
  assert.throws(() => parseMindTreeFile(JSON.stringify({ format: 'qingxiaolu-mind-tree', version: 2, tree }), 'a'));
});
test('删除中间同级节点后新增仍排在末尾，重复移动保持确定顺序', () => {
  let tree = newMindTree();
  for (const text of ['甲', '乙', '丙']) tree = addMindNode(tree, tree.rootNodeId, text);
  tree = removeMindBranch(tree, tree.nodes.find(node => node.text === '乙').id); tree = addMindNode(tree, tree.rootNodeId, '丁');
  assert.deepEqual(childrenOf(tree, tree.rootNodeId).map(node => node.text), ['甲', '丙', '丁']);
  tree = moveMindNode(tree, tree.nodes.find(node => node.text === '丁').id, tree.rootNodeId, 0);
  assert.deepEqual(childrenOf(tree, tree.rootNodeId).map(node => node.text), ['丁', '甲', '丙']);
  assert.deepEqual(childrenOf(tree, tree.rootNodeId).map(node => node.order), [0, 1, 2]);
});
test('破损父节点、重复身份、未知版本及不可达环拒绝；失效资料引用保留', () => {
  const tree = newMindTree(); validateMindTrees(undefined); validateMindTrees([]);
  tree.nodes[0].ref = { kind: 'record', id: 'missing-record' }; validateMindTrees([tree]);
  assert.throws(() => validateMindTrees([{ ...tree, schemaVersion: 2 }]));
  assert.throws(() => validateMindTrees([tree, tree]));
  assert.throws(() => validateMindTrees([{ ...tree, nodes: [...tree.nodes, { ...tree.nodes[0] }] }]));
  assert.throws(() => validateMindTrees([{ ...tree, nodes: [...tree.nodes, { ...tree.nodes[0], id: 'orphan', parentId: 'missing' }] }]));
  assert.throws(() => validateMindTrees([{ ...tree, nodes: [...tree.nodes,
    { ...tree.nodes[0], id: 'a', parentId: 'b' }, { ...tree.nodes[0], id: 'b', parentId: 'a' }] }]));
});
test('2000 层校验与布局无递归溢出，折叠后原节点仍完整', () => {
  const tree = newMindTree(); let parentId = tree.rootNodeId;
  for (let index = 1; index < 2000; index++) { const id = `node-${index}`;
    tree.nodes.push({ id, parentId, order: 0, text: `节点${index}`, note: '', collapsed: false }); parentId = id; }
  validateMindTrees([tree]); assert.equal(layoutMindTree(tree).length, 2000);
  assert.throws(() => addMindNode(tree, parentId));
  tree.nodes[0].collapsed = true; assert.equal(layoutMindTree(tree).length, 1); assert.equal(tree.nodes.length, 2000);
});
test('服务器校验普通与分块项目仅提取导图字段，并拒绝重复字段', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'qx-mind-'));
  try {
    const store = createContentStore(folder, 'test'); const trees = [newMindTree()];
    const encode = value => typeof value === 'string' ? ['s', value] : value === null || typeof value !== 'object' ? ['v', value] :
      Array.isArray(value) ? ['a', value.map(encode)] : ['o', Object.entries(value).map(([k, v]) => [encode(k), encode(v)])];
    const content = { world: '原世界观', mindTrees: trees };
    assert.deepEqual(await projectMindTrees(content, false, store), trees);
    const encoded = encode(content); await store.validate(encoded);
    assert.deepEqual(await projectMindTrees(encoded, true, store), trees);
    assert.equal(await projectMindTrees(encode({ world: '旧项目' }), true, store), undefined);
    encoded[1].push(encoded[1][1]); await assert.rejects(projectMindTrees(encoded, true, store));
  } finally { await rm(folder, { recursive: true, force: true }); }
});
test('完整备份恢复保留树身份和引用，未知版本导图拒绝导入', async () => {
  const values = new Map(); globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: key => values.delete(key) };
  const tree = newMindTree('备份构思'); tree.nodes[0].ref = { kind: 'character', id: 'character-a' };
  const content = { world: '原世界观', mindTrees: [tree] };
  values.set('qx_drafts', JSON.stringify([{ id: 'project-a', itemType: 'project', title: '原项目', content }]));
  values.set('qx_project_workspaces', JSON.stringify({ 'project-a': content }));
  const backup = parseBackup(JSON.stringify(await createBackup('project-a')));
  values.clear(); await restoreBackup(backup);
  assert.deepEqual(JSON.parse(values.get('qx_project_workspaces'))['project-a'].mindTrees, [tree]);
  backup.workspaces['project-a'].mindTrees[0].schemaVersion = 99;
  assert.throws(() => parseBackup(JSON.stringify(backup))); assert.equal(JSON.parse(values.get('qx_project_workspaces'))['project-a'].mindTrees[0].schemaVersion, 1);
});
test('大段中文的可保存导图在文件字节上限内仍能重新导入', () => {
  const tree = newMindTree('中文往返'); const note = '文'.repeat(99000);
  for (let index = 0; index < 60; index++) tree.nodes.push({ id: `note-${index}`, parentId: tree.rootNodeId, order: index,
    text: `备注${index}`, note, collapsed: false });
  validateMindTrees([tree]); const text = JSON.stringify({ format: 'qingxiaolu-mind-tree', version: 1, projectId: 'same', tree }, null, 2);
  assert.ok(Buffer.byteLength(text) > 16 * 1024 * 1024); assert.ok(Buffer.byteLength(text) < MIND_TREE_FILE_BYTES);
  const restored = parseMindTreeFile(text, 'same'); assert.equal(restored.nodes[60].note, note); assert.equal(restored.nodes.length, 61);
});
