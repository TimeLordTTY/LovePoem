// 使用独立合成记录验证真实 PNG 生成与下载；系统分享接口受控，不能代替手机第三方应用验收。
import { chromium } from 'playwright-core';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
const url = process.argv[2] || 'http://127.0.0.1:3004/qingxiaolu/';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  await context.route('**/qingxiaolu-api/**', route => route.abort());
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.shareMode = 'cancel'; window.shareCalls = [];
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: ({ files }) => files.length > 0 });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async ({ files, title }) => {
      window.shareCalls.push({ count: files.length, title, active: navigator.userActivation.isActive });
      if (window.shareMode === 'cancel') throw new DOMException('cancelled', 'AbortError');
      if (window.shareMode === 'fail') throw new Error('sharing failed');
    } });
  });
  await page.goto(url); await page.getByRole('button', { name: '先在本机使用', exact: true }).click();
  await page.getByRole('button', { name: '创作', exact: true }).click();
  const title = '随笔：春日记录📝';
  const body = Array.from({ length: 100 }, (_, i) => `第 ${i + 1} 段，保留完整中文、换行和作者的文字。`).join('\n');
  await page.getByPlaceholder('稿件标题（可选）').fill(title);
  await page.getByPlaceholder('这一刻，想写点什么……').fill(body);
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await page.getByText('已保存到本机，可以继续写作', { exact: true }).waitFor();
  await page.getByRole('button', { name: '记录', exact: true }).click();
  // 合成超过编辑器单次添加上限的历史记录，检验分享不会截掉导入附图。
  const png = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 24; c.height = 24;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#ee3366'; ctx.fillRect(0, 0, 24, 24);
    return c.toDataURL('image/png');
  });
  await page.evaluate(({ title, png }) => new Promise((resolve, reject) => {
    const request = indexedDB.open('qingxiaolu-writing', 1);
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('values', 'readwrite'), store = tx.objectStore('values');
      const get = store.get('qx_drafts'); get.onsuccess = () => {
        const records = JSON.parse(get.result); records.find(r => r.title === title).content.images = Array(10).fill(png);
        store.put(JSON.stringify(records), 'qx_drafts');
        store.delete('qx_editor_autosave');
      };
      tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error);
    };
  }), { title, png });
  await page.reload(); await page.getByRole('button', { name: '记录', exact: true }).click();
  const readDrafts = () => page.evaluate(() => new Promise(resolve => {
    const request = indexedDB.open('qingxiaolu-writing', 1); request.onsuccess = () => {
      const db = request.result, get = db.transaction('values').objectStore('values').get('qx_drafts');
      get.onsuccess = () => { db.close(); resolve(get.result); };
    };
  }));
  const original = await readDrafts();
  const card = page.locator('article[data-blog-month]').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
  await card.getByRole('button', { name: '分享成图片', exact: true }).click();
  await page.getByText(/已生成 \d+ 张图片/).waitFor();
  const previews = page.locator('.image-share-preview img'), count = await previews.count();
  assert.ok(count > 11, '长正文应分页，另有全部十张附图');
  const dimensions = await previews.evaluateAll(async imgs => Promise.all(imgs.map(async img => {
    const blob = await (await fetch(img.src)).blob(), bitmap = await createImageBitmap(blob);
    const dimensions = [bitmap.width, bitmap.height, blob.type]; bitmap.close(); return dimensions;
  })));
  assert.ok(dimensions.every(v => v[0] === 1080 && v[1] === 1800 && v[2] === 'image/png'));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  await page.getByRole('button', { name: '分享图片', exact: true }).click();
  await page.getByText('已取消分享，图片仍可预览或下载。', { exact: true }).waitFor();
  await page.evaluate(() => { window.shareMode = 'fail'; });
  await page.getByRole('button', { name: '分享图片', exact: true }).click();
  await page.getByText('系统分享未完成，可以重试或下载图片后发送。', { exact: true }).waitFor();
  await page.evaluate(() => { window.shareMode = 'success'; });
  await page.getByRole('button', { name: '分享图片', exact: true }).click();
  await page.getByText('图片已交给系统分享，请在目标应用中确认发送。', { exact: true }).waitFor();
  assert.ok((await page.evaluate(() => window.shareCalls)).every(call => call.active && call.count === count && call.title === title));
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载第 1 张', exact: true }).click();
  const download = await downloadPromise, bytes = await readFile(await download.path());
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(bytes.readUInt32BE(16), 1080); assert.equal(bytes.readUInt32BE(20), 1800);
  if (process.env.QX_SHARE_PNG) await download.saveAs(process.env.QX_SHARE_PNG);
  const archivePromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载全部图片（压缩包）', exact: true }).click();
  const archive = await archivePromise;
  const zip = await JSZip.loadAsync(await readFile(await archive.path()));
  const entries = Object.values(zip.files).filter(entry => !entry.dir);
  assert.equal(entries.length, count);
  for (const [i, entry] of entries.entries()) {
    assert.equal(entry.name, `${title}-${i + 1}.png`);
    const contents = await entry.async('nodebuffer');
    assert.equal(contents.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(contents.readUInt32BE(16), 1080); assert.equal(contents.readUInt32BE(20), 1800);
  }
  const oldUrl = await previews.first().getAttribute('src');
  await page.getByRole('button', { name: '返回记录', exact: true }).click();
  assert.equal(await readDrafts(), original, '生成、取消、失败和下载均不能改动原记录');
  assert.equal(await page.evaluate(async url => { try { await fetch(url); return false; } catch { return true; } }, oldUrl), true);
  await card.getByRole('button', { name: '分享成图片', exact: true }).click();
  await page.getByText(/已生成 \d+ 张图片/).waitFor(); await page.keyboard.press('Escape');
  await page.getByRole('heading', { name: '记录', exact: true }).waitFor();
  const fallbackContext = await browser.newContext();
  await fallbackContext.route('**/qingxiaolu-api/**', route => route.abort());
  const fallback = await fallbackContext.newPage();
  await fallback.addInitScript(() => Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false }));
  let broken = true;
  const fixtureUrl = `${url}share-fixture.png`;
  await fallback.route(fixtureUrl, route => broken ? route.abort() : route.fulfill({ contentType: 'image/png', body: Buffer.from(png.split(',')[1], 'base64') }));
  await fallback.goto(url); await fallback.getByRole('button', { name: '先在本机使用', exact: true }).click();
  await fallback.getByRole('button', { name: /导入本地文档/ }).click();
  await fallback.locator('input[type=file]').setInputFiles({ name: 'image-share-retry.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify([{ title: '图片失败重试', text: '不丢失正文', images: [fixtureUrl] }])) });
  await fallback.getByRole('button', { name: '正式导入已选内容（1）', exact: true }).click();
  await fallback.getByText('已正式导入 1 条内容', { exact: true }).waitFor();
  await fallback.getByRole('button', { name: '记录', exact: true }).click();
  await fallback.getByRole('button', { name: '分享成图片', exact: true }).click();
  await fallback.getByText('文章图片读取失败，请检查链接或先保存到本机后重试', { exact: true }).waitFor();
  assert.equal(await fallback.locator('.image-share-preview img').count(), 0, '失败不能分享遗漏附图的半成品');
  broken = false; await fallback.getByRole('button', { name: '重新生成', exact: true }).click();
  await fallback.getByText('已生成 2 张图片，正文和附图按顺序排列。', { exact: true }).waitFor();
  await fallback.getByText('当前浏览器不支持直接分享文件，请下载图片后发送。', { exact: true }).waitFor();
  assert.equal(await fallback.getByRole('button', { name: '分享图片', exact: true }).count(), 0);
  await fallback.getByRole('button', { name: '项目', exact: true }).click();
  assert.equal(await fallback.getByRole('heading', { name: '分享成图片', exact: true }).count(), 0);
  console.log(JSON.stringify({ recordNavigation: true, longTextPages: count - 10, allTenImages: true, pngDownload: true,
    allDownloads: count, freshClickActivation: true, shareCancelFailureRetry: 'controlled browser interface', originalUnchanged: true,
    releasedPreviewUrls: true, escapeReturnsToRecords: true, narrowViewport: true, incompleteImagesRejected: true,
    generationRetry: true, unsupportedSharingKeepsDownloads: true, mainNavigationClosesPreview: true }));
} finally { await browser.close(); }
