import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
const url = process.argv[2] || 'http://127.0.0.1:3004/qingxiaolu/';
const output = 'D:/Project/xiao-poem/output/mind-tree'; await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
let diagnosticPage;
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, acceptDownloads: true });
    await context.route('**/qingxiaolu-api/**', route => route.abort());
    const page = await context.newPage(); diagnosticPage = page; page.setDefaultTimeout(12000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const stored = key => page.evaluate(key => new Promise((resolve, reject) => {
      const req = indexedDB.open('qingxiaolu-writing', 1); req.onerror = () => reject(req.error);
      req.onsuccess = () => { const db = req.result, get = db.transaction('values').objectStore('values').get(key);
        get.onsuccess = () => { db.close(); resolve(JSON.parse(get.result || 'null')); }; };
    }), key);
    const openProject = async () => {
      if (!await page.locator('.project-workspace').count()) {
        await page.getByRole('button', { name: '项目', exact: true }).click();
        await page.getByRole('heading', { name: '导图验收项目', exact: true }).click();
      }
    };
    const save = async () => { await page.locator('.save-project').click(); await page.getByText('项目资料已自动保存到本机', { exact: true }).waitFor(); };
    await page.goto(url); await page.getByRole('button', { name: '先在本机使用', exact: true }).click();
    await page.getByPlaceholder('新项目名称').fill('导图验收项目'); await page.getByRole('button', { name: '新建', exact: true }).click();
    await openProject(); await page.getByRole('button', { name: '人物', exact: true }).click();
    await page.getByRole('button', { name: /新增人物/ }).click(); await page.getByPlaceholder('人物姓名').fill('原人物甲');
    await page.getByRole('button', { name: '世界观', exact: true }).click(); await page.locator('.project-material-editor textarea').fill('原世界观不应因整理导图改变。'); await save();
    await page.getByRole('button', { name: '项目', exact: true }).first().click(); await page.getByRole('button', { name: '继续写作', exact: true }).click();
    await page.getByPlaceholder('稿件标题（可选）').fill('原章节正文'); await page.getByPlaceholder('这一刻，想写点什么……').fill('正文原文📝，只整理导图不能改掉我。');
    await page.getByRole('button', { name: '保存', exact: true }).click(); await page.getByText('已保存到本机，可以继续写作', { exact: true }).waitFor();
    await page.getByRole('button', { name: '新灵感', exact: true }).click();
    await page.getByPlaceholder('稿件标题（可选）').fill('原灵感'); await page.getByPlaceholder('这一刻，想写点什么……').fill('灵感原文也要保持📝');
    await page.getByRole('button', { name: '保存', exact: true }).click(); await page.getByText('已保存到本机，可以继续写作', { exact: true }).waitFor();
    await openProject(); const before = await stored('qx_project_workspaces'); const projectId = Object.keys(before)[0];
    const originalRecords = (await stored('qx_drafts')).filter(item => item.itemType !== 'project');
    await page.getByRole('button', { name: '思维树', exact: true }).click(); await page.getByRole('button', { name: '创建第一张思维树', exact: true }).click();
    await page.getByLabel('思维树名称', { exact: true }).fill('人物与转折'); await page.getByLabel('节点文字', { exact: true }).fill('故事起点');
    await page.getByRole('button', { name: '添加子节点', exact: true }).click(); await page.getByLabel('节点文字', { exact: true }).fill('人物动机');
    await page.getByLabel('节点备注', { exact: true }).fill('保留空格与换行\n  转折📝');
    await page.getByRole('button', { name: '添加子节点', exact: true }).click(); await page.getByLabel('节点文字', { exact: true }).fill('深层伏笔');
    await page.getByRole('button', { name: '切换层级视图', exact: true }).click();
    await page.locator('.mind-list button').filter({ hasText: '人物动机' }).click();
    await page.getByLabel('关联原内容', { exact: true }).selectOption({ label: '人物 · 原人物甲' }); await page.getByRole('button', { name: '关联所选内容', exact: true }).click();
    await page.getByLabel('节点文字', { exact: true }).fill(''); await page.getByRole('button', { name: '打开原内容', exact: true }).click();
    await page.getByPlaceholder('人物姓名').waitFor(); await page.getByPlaceholder('人物姓名').fill('原人物改名'); await save();
    await page.getByRole('button', { name: '思维树', exact: true }).click(); await page.locator('.mind-reference').getByText('人物 · 原人物改名', { exact: true }).waitFor();
    await page.getByRole('button', { name: '折叠分支', exact: true }).click();
    await page.getByPlaceholder('搜索文字、备注或资料名称').fill('深层伏笔'); await page.getByRole('button', { name: '定位下一处', exact: true }).click();
    assert.equal(await page.getByLabel('节点文字', { exact: true }).inputValue(), '深层伏笔');
    await page.getByPlaceholder('搜索文字、备注或资料名称').fill('');
    await page.getByLabel('移动到父节点', { exact: true }).selectOption({ label: '故事起点' }); await page.getByRole('button', { name: '移动分支', exact: true }).click();
    await page.getByRole('button', { name: '上移', exact: true }).click();
    await page.getByRole('button', { name: '撤销', exact: true }).click(); await page.getByRole('button', { name: '重做', exact: true }).click();
    await save();
    await page.evaluate(() => { window.__qxTransaction = IDBDatabase.prototype.transaction;
      IDBDatabase.prototype.transaction = function(stores, mode, ...options) { if (mode === 'readwrite') throw new DOMException('验收模拟存储失败', 'QuotaExceededError'); return window.__qxTransaction.call(this, stores, mode, ...options); }; });
    page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: '删除节点及分支', exact: true }).click();
    await page.getByText('恢复版本未能保存，尚未删除。请保留当前内容后重试。', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('节点文字', { exact: true }).inputValue(), '深层伏笔');
    await page.evaluate(() => { IDBDatabase.prototype.transaction = window.__qxTransaction; delete window.__qxTransaction; });
    page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: '删除节点及分支', exact: true }).click();
    await page.getByText('已删除；可撤销，也可从项目资料版本恢复。', { exact: true }).waitFor();
    await page.getByRole('button', { name: '撤销', exact: true }).click();
    await save(); const project = (await stored('qx_project_workspaces'))[projectId];
    assert.equal(project.mindTrees[0].nodes.length, 3); assert.equal(project.world, before[projectId].world);
    assert.equal(project.characterCards[0].name, '原人物改名');
    assert.deepEqual((await stored('qx_drafts')).filter(item => item.itemType !== 'project'), originalRecords);
    assert.ok((await stored('qx_item_versions'))[projectId].some(version => version.content?.mindTrees?.[0]?.nodes.length === 3));
    const downloadPromise = page.waitForEvent('download'); await page.getByRole('button', { name: '导出导图 JSON', exact: true }).click();
    const download = await downloadPromise, file = await readFile(await download.path()); const exported = JSON.parse(file);
    assert.equal(exported.tree.nodes.length, 3);
    await page.locator('.mind-controls input[type=file]').setInputFiles({ name: '导图.json', mimeType: 'application/json', buffer: file });
    await page.getByLabel('导图导入预览').waitFor(); assert.equal((await stored('qx_project_workspaces'))[projectId].mindTrees.length, 1);
    await page.getByRole('button', { name: '确认添加导图', exact: true }).click(); await save();
    const copied = (await stored('qx_project_workspaces'))[projectId].mindTrees; assert.equal(copied.length, 2);
    assert.notEqual(copied[0].id, copied[1].id); assert.notEqual(copied[0].rootNodeId, copied[1].rootNodeId);
    await page.reload(); await openProject(); await page.getByRole('button', { name: '思维树', exact: true }).click();
    assert.equal(await page.getByLabel('当前思维树', { exact: true }).locator('option').count(), 2);
    await page.getByRole('button', { name: '适配全图', exact: true }).click();
    await page.getByRole('button', { name: '全屏整理', exact: true }).click(); await page.locator('.mind-workbench.is-fullscreen').waitFor();
    await page.screenshot({ path: `${output}/fullscreen-${width}.png` });
    await page.evaluate(() => window.dispatchEvent(new Event('qx-project-back')));
    assert.equal(await page.locator('.mind-workbench.is-fullscreen').count(), 0); assert.equal(await page.locator('.project-workspace').count(), 1);
    assert.ok(await page.locator('.mind-node').count() >= 3); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await page.screenshot({ path: `${output}/tree-${width}.png`, fullPage: true });
    // 文章引用必须真正打开现有编辑器，不被保存/导航锁拦截。
    await page.getByLabel('关联原内容', { exact: true }).selectOption({ label: '记录 · 原灵感' }); await page.getByRole('button', { name: '关联所选内容', exact: true }).click();
    await page.getByRole('button', { name: '打开原内容', exact: true }).click(); await page.getByPlaceholder('稿件标题（可选）').waitFor();
    assert.equal(await page.getByPlaceholder('这一刻，想写点什么……').inputValue(), '灵感原文也要保持📝');
    assert.ok((await page.locator('.creation-switch').getByRole('button', { name: '灵感', exact: true }).getAttribute('class')).includes('active'));
    await openProject(); await page.getByRole('button', { name: '思维树', exact: true }).click();
    await page.getByLabel('关联原内容', { exact: true }).selectOption({ label: '记录 · 原章节正文' }); await page.getByRole('button', { name: '关联所选内容', exact: true }).click();
    await page.getByRole('button', { name: '打开原内容', exact: true }).click(); await page.getByPlaceholder('稿件标题（可选）').waitFor();
    assert.equal(await page.getByPlaceholder('这一刻，想写点什么……').inputValue(), '正文原文📝，只整理导图不能改掉我。');
    assert.deepEqual(errors, []); console.log(JSON.stringify({ width, createEdit: true, referenceRename: true, searchExpands: true, moveUndoRedo: true,
      deleteVersionAndUndo: true, failedCheckpointCannotDelete: true, exactExportAndImport: true, reload: true, fullscreenBackKeepsProject: true, originalContentUnchanged: true, realRecordNavigation: true, ideaNavigationAndType: true, noCloudUpload: true }));
    await context.close();
  }
} catch (error) { await diagnosticPage?.screenshot({ path: `${output}/failure.png`, fullPage: true }).catch(() => {}); throw error; }
finally { await browser.close(); }
