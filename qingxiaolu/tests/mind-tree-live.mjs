// 仅在明确生产验收授权下使用：只改本脚本生成的临时项目，最后清理并核对原记录哈希。
import { execFileSync } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { encodeContent, CONTENT_FORMAT } from '../work/writing-tests/sync-content.mjs';
import { newMindTree, addMindNode } from '../work/writing-tests/mindTree.mjs';
if (!process.argv.includes('--live-author-acceptance') || !process.env.QX_LIVE_SSH_KEY) throw new Error('需要显式生产验收参数及已授权密钥路径');
const base = 'https://poem.timelordtty.cn/qingxiaolu-api', id = randomUUID();
let token = '', browser;
const headers = () => ({ authorization: `Bearer ${token}`, 'content-type': 'application/json' });
async function snapshot() {
  const records = new Map(); let cursor = 0, watermark = 0;
  for (let index = 0; index < 100; index++) {
    const response = await fetch(`${base}/v1/sync/pull?cursor=${cursor}&limit=500&snapshot=1${watermark ? `&watermark=${watermark}` : ''}`, { headers: headers() });
    assert.equal(response.status, 200); const data = await response.json(); watermark = data.watermark;
    for (const record of data.changes) records.set(record.id, record);
    if (!data.hasMore) return records; assert.ok(data.nextCursor > cursor); cursor = data.nextCursor;
  }
  throw new Error('快照超出验收分页限制');
}
async function push(change) {
  assert.equal(change.id, id, '拒绝改动非临时项目');
  return fetch(`${base}/v1/sync/push`, { method: 'POST', headers: headers(), body: JSON.stringify({ deviceId: 'mind-tree-acceptance', changes: [change] }) });
}
const hash = records => createHash('sha256').update(JSON.stringify([...records.values()].filter(item => item.id !== id).sort((a, b) => a.id.localeCompare(b.id)))).digest('hex');
try {
  token = execFileSync('ssh', ['-i', process.env.QX_LIVE_SSH_KEY, '-o', 'BatchMode=yes', 'root@124.220.229.91',
    '/usr/local/bin/qingxiaolu-node --env-file=/etc/qingxiaolu-sync/qingxiaolu-sync.env -e "process.stdout.write(process.env.SYNC_TOKEN || \'\')"'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }).trim();
  assert.ok(token); const before = await snapshot(), beforeHash = hash(before); assert.ok(!before.has(id));
  try {
    let tree = newMindTree('真实同步导图'); tree = addMindNode(tree, tree.rootNodeId, '原始分支');
    const change = { id, itemType: 'project', title: `【验收临时】思维树-${id}`, baseRevision: 0,
      content: { type: '小说', world: '临时验收世界观', mindTrees: [tree] } };
    let response = await push(change); assert.equal(response.status, 200); assert.equal((await response.json()).applied[0].revision, 1);
    response = await push({ ...change, baseRevision: 1, content: { type: '小说', world: '旧客户端不应覆盖导图' } }); assert.equal(response.status, 409);
    const invalid = structuredClone(tree); invalid.nodes[1].parentId = invalid.nodes[1].id;
    response = await push({ ...change, baseRevision: 1, content: { mindTrees: [invalid] } }); assert.equal(response.status, 400);
    const note = '原样保留长备注📝\n'.repeat(7000); tree.nodes[1].note = note;
    const content = { ...change.content, mindTrees: [tree] };
    const encoded = await encodeContent(content, base, token);
    response = await push({ ...change, baseRevision: 1, contentEncoding: CONTENT_FORMAT, content: encoded }); assert.equal(response.status, 200);
    assert.equal((await response.json()).applied[0].revision, 2);
    const current = (await snapshot()).get(id); assert.equal(current.payload.content.mindTrees[0].nodes[1].note, note);
    response = await push({ ...change, baseRevision: 1, content: { ...content, world: '另一设备的修改' } }); assert.equal(response.status, 200);
    const conflict = await response.json(); assert.equal(conflict.conflicts.length, 1); assert.equal(conflict.applied.length, 0);
    assert.equal(conflict.conflicts[0].server.revision, 2);
    browser = await chromium.launch({ channel: 'msedge', headless: true }); const context = await browser.newContext();
    await context.addInitScript(value => localStorage.setItem('qx_sync_token', value), token);
    await context.route('**/qingxiaolu-api/**', async route => {
      if (route.request().url().includes('/push')) return route.abort();
      if (route.request().url().includes('/pull')) { const res = await route.fetch(), data = await res.json();
        return route.fulfill({ response: res, json: { ...data, changes: data.changes.filter(item => item.id === id) } }); }
      return route.continue();
    });
    const page = await context.newPage(); await page.goto('https://poem.timelordtty.cn/qingxiaolu/');
    await page.getByRole('heading', { name: change.title, exact: true }).click(); await page.getByRole('button', { name: '思维树', exact: true }).click();
    assert.equal(await page.getByLabel('思维树名称', { exact: true }).inputValue(), '真实同步导图');
    await page.getByRole('button', { name: '切换层级视图', exact: true }).click(); await page.locator('.mind-list button').filter({ hasText: '原始分支' }).click();
    assert.equal(await page.getByLabel('节点备注', { exact: true }).inputValue(), note);
  } finally {
    if (browser) await browser.close(); browser = undefined;
    const current = (await snapshot()).get(id);
    if (current && current.operation !== 'delete') { const response = await push({ id, itemType: 'project', title: '【验收临时】已清理', content: {}, baseRevision: current.revision, deleted: true });
      assert.equal(response.status, 200); assert.equal((await response.json()).applied.length, 1); }
    const after = await snapshot(); assert.equal(hash(after), beforeHash); if (current) assert.equal(after.get(id).operation, 'delete');
  }
  console.log(JSON.stringify({ realHttps: true, originalRecordsUnchanged: true, plainTreeSync: true, encodedLongNoteExact: true,
    oldClientMissingTreesRejected: true, parentCycleRejected: true, staleDeviceConflict: true, independentBrowserRead: true, temporaryProjectCleaned: true }));
} catch (error) { console.error(token ? String(error.message).replaceAll(token, '[redacted]') : '无法取得生产验收会话'); process.exitCode = 1; }
finally { token = ''; if (browser) await browser.close(); }
