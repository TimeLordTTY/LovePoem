import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.route('**/qingxiaolu-api/**', route => route.abort()); const page = await context.newPage();
  await page.goto(process.argv[2] || 'http://127.0.0.1:3004/qingxiaolu/'); await page.getByRole('button', { name: '先在本机使用', exact: true }).click();
  await page.getByPlaceholder('新项目名称').fill('五百节点验收'); await page.getByRole('button', { name: '新建', exact: true }).click();
  await page.getByRole('heading', { name: '五百节点验收', exact: true }).click(); await page.getByRole('button', { name: '思维树', exact: true }).click();
  const nodes = Array.from({ length: 500 }, (_, index) => ({ id: `node-${index}`, parentId: index ? `node-${Math.floor((index - 1) / 4)}` : null,
    order: index ? (index - 1) % 4 : 0, text: index === 499 ? '末端长标题📝'.repeat(100) : `想法 ${index}`, note: '', collapsed: false }));
  const data = { format: 'qingxiaolu-mind-tree', version: 1, projectId: 'another-project', tree: { schemaVersion: 1, id: 'large-tree', title: '五百节点', rootNodeId: 'node-0', nodes } };
  await page.locator('.mind-controls input[type=file]').setInputFiles({ name: 'large.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
  await page.getByLabel('导图导入预览').waitFor(); const start = performance.now();
  await page.getByRole('button', { name: '确认添加导图', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('.mind-node').length === 500);
  const renderMs = Math.round(performance.now() - start);
  await page.getByRole('button', { name: '适配全图', exact: true }).click();
  const world = await page.locator('.mind-world').boundingBox(), viewport = await page.locator('.mind-viewport').boundingBox();
  assert.ok(world.height <= viewport.height + 1 && world.width <= viewport.width + 1, '适配全图必须包含整张图');
  const zoomStart = performance.now(); for (let index = 0; index < 10; index++) await page.getByRole('button', { name: '放大导图', exact: true }).click();
  const tenZoomMs = Math.round(performance.now() - zoomStart);
  await page.getByPlaceholder('搜索文字、备注或资料名称').fill('末端长标题'); await page.getByRole('button', { name: '定位下一处', exact: true }).click();
  assert.equal(await page.getByLabel('节点文字', { exact: true }).inputValue(), nodes[499].text);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  console.log(JSON.stringify({ nodes: 500, renderMs, tenZoomMs, fullTreeFitsViewport: true, longTitleSearch: true, environment: 'local Windows Edge headless; not a physical low-end phone benchmark' }));
} finally { await browser.close(); }
