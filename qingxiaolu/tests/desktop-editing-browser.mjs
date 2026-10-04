import { chromium } from 'playwright-core';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { collectLoadedHistory, mergeLoadedHistory } from '../tools/history-importers/loaded-history.mjs';
const url = process.argv[2] || 'http://127.0.0.1:3004/qingxiaolu/';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
let diagnosticPage;
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  await context.route('**/qingxiaolu-api/**', r => r.abort()); const page = await context.newPage();
  diagnosticPage = page;
  await page.addInitScript(() => { window.clipboardMode = 'denied'; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
    writeText: async text => { if (window.clipboardMode === 'denied') throw new Error('denied'); window.copiedSelection = text; }
  } }); });
  await page.goto(url); await page.getByRole('button', { name: '先在本机使用', exact: true }).click();
  await page.getByRole('button', { name: '创作', exact: true }).click(); const editor = page.getByPlaceholder('这一刻，想写点什么……');
  const original = '没有标题的随笔📝。\n保留作者原文。'; await editor.fill(original);
  await page.getByRole('button', { name: '保存', exact: true }).click(); await page.getByText('已保存到本机，可以继续写作', { exact: true }).waitFor();
  await page.getByRole('button', { name: '记录', exact: true }).click(); assert.equal(await page.locator('article[data-blog-month] h2').count(), 0);
  await page.getByRole('button', { name: '继续编辑', exact: true }).click(); assert.equal(await page.getByPlaceholder('稿件标题（可选）').inputValue(), '');
  await editor.press('Control+A'); await page.getByRole('button', { name: '复制选段', exact: true }).click();
  await page.getByText(/选段未能复制/).waitFor(); await page.evaluate(() => { window.clipboardMode = 'allowed'; });
  await page.getByRole('button', { name: '复制选段', exact: true }).click(); assert.equal(await page.evaluate(() => window.copiedSelection), original);
  const exported = page.waitForEvent('download'); await page.getByRole('button', { name: '导出选段', exact: true }).click();
  assert.equal(await readFile(await (await exported).path(), 'utf8'), original);
  await page.getByRole('button', { name: '更多编辑', exact: true }).click(); const document = page.getByPlaceholder('开始编辑文档正文……');
  await document.click(); await document.press('Control+Home'); await page.getByRole('button', { name: '注释', exact: true }).click();
  await document.press('Control+Home'); await page.getByRole('button', { name: '注释', exact: true }).click();
  const annotated = await document.inputValue(); assert.ok(annotated.includes('[^注释1]: ')); assert.ok(annotated.includes('[^注释2]: '));
  await page.getByRole('button', { name: '排版预览', exact: true }).click(); assert.equal(await page.locator('.writing-footnotes p').count(), 2);
  for (const link of await page.locator('.writing-preview sup a').all()) {
    const href = await link.getAttribute('href'); assert.equal(await page.locator('.writing-footnotes p').evaluateAll((nodes, id) => nodes.some(node => node.id === id), href.slice(1)), true);
  }
  await page.getByRole('button', { name: '记录', exact: true }).click();
  await page.getByRole('button', { name: '项目', exact: true }).click(); await page.getByRole('button', { name: /导入本地文档/ }).click();
  const records = Array.from({ length: 130 }, (_, i) => ({ title: `记录${i}`, text: `原始内容-${i}`, publishedAt: `${1900 + i}-01-02` }));
  await page.locator('input[type=file]').setInputFiles({ name: '历史130条.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(records)) });
  await page.getByRole('button', { name: '正式导入已选内容（130）', exact: true }).click(); await page.getByText('已正式导入 130 条内容', { exact: true }).waitFor();
  await page.getByRole('button', { name: '记录', exact: true }).click(); assert.equal(await page.locator('article[data-blog-month]').count(), 60);
  await page.getByRole('button', { name: /继续加载记录/ }).click(); assert.equal(await page.locator('article[data-blog-month]').count(), 120);
  await page.locator('.blog-date-archive button').filter({ hasText: '1900' }).click();
  await page.getByRole('heading', { name: '记录0', exact: true }).waitFor();
  await page.getByLabel('搜索历史内容').fill('原始内容-0'); assert.equal(await page.locator('article[data-blog-month]').count(), 1);
  await page.getByRole('button', { name: '清除', exact: true }).click(); assert.equal(await page.locator('article[data-blog-month]').count(), 60);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  await page.setViewportSize({ width: 390, height: 844 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  // 社交平台 DOM 为明确标注的合成夹具，验证采集逻辑，再走真实导入预览和去重。
  const fixture = await context.newPage(); await fixture.setContent('<article><div mid="a"><div data-post-body>共同前缀，第一条</div><time datetime="2020-01-01"></time><span class="avatar"><img src="https://example.invalid/avatar.png"></span></div><div mid="b"><div data-post-body>共同前缀，第二条</div></div><div class="f-single" data-tid="photo"><div class="f-info"></div><img src="data:image/png;base64,AA=="></div></article>');
  const rows = await fixture.evaluate(collectLoadedHistory, 'qqzone'); assert.equal(rows.length, 3); assert.equal(rows[0].images.length, 0);
  assert.equal(rows[2].text, ''); assert.equal(rows[2].images.length, 1); assert.ok(rows[1].warnings.length);
  const merged = new Map(); mergeLoadedHistory(merged, rows); mergeLoadedHistory(merged, rows); assert.equal(merged.size, 3);
  assert.ok(rows.every(row => row.title === ''));
  await page.getByRole('button', { name: '设置', exact: true }).click(); await page.getByRole('button', { name: /历史导入/ }).click();
  await page.getByRole('heading', { name: '选择内容来源', exact: true }).waitFor();
  await page.locator('input[type=file]').setInputFiles({ name: '采集夹具.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(rows)) });
  await page.getByRole('heading', { name: '临时预览', exact: true }).waitFor(); await page.getByText('未识别原发布时间，请在正式导入前补全。', { exact: true }).first().waitFor();
  await page.getByRole('button', { name: '正式导入已选内容（3）', exact: true }).click(); await page.getByText('已正式导入 3 条内容', { exact: true }).waitFor();
  await page.getByRole('button', { name: '设置', exact: true }).click(); await page.getByRole('button', { name: /历史导入/ }).click();
  await page.getByRole('heading', { name: '选择内容来源', exact: true }).waitFor();
  await page.locator('input[type=file]').setInputFiles({ name: '重复采集夹具.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(rows)) });
  await page.getByText('已隐藏 3 条已导入的相同内容，无需重复导入。', { exact: true }).waitFor();
  assert.equal(await page.locator('.candidate-list article').count(), 0);
  assert.equal(await page.getByRole('button', { name: '正式导入已选内容（0）', exact: true }).isDisabled(), true);
  console.log(JSON.stringify({ untitledSaveEditExact: true, selectedTextCopyExport: true, clipboardFailureRetry: 'controlled interface', uniqueFootnotesAndPreview: true,
    recordBatchLoading: true, earliestDateLoadsMissingRows: true, searchResetsBatch: true, wideAndNarrow: true,
    syntheticHistoryCardsOnly: true, photoOnlyRetained: true, avatarsExcluded: true, sourceWarningsInPreview: true, duplicateImportSkipped: true }));
} catch (error) {
  if (diagnosticPage) console.error(JSON.stringify({ failureUi: await diagnosticPage.locator('body').innerText().then(text => text.slice(0, 1800)),
    previewCount: await diagnosticPage.locator('.candidate-list article').count() }));
  throw error;
} finally { await browser.close(); }
