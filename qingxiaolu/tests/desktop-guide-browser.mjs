import { chromium } from 'playwright-core';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import JSZip from 'jszip';
const url = process.argv[2] || 'https://poem.timelordtty.cn/qingxiaolu/';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const context = await browser.newContext({ acceptDownloads: true }), page = await context.newPage();
  await context.route('**/qingxiaolu-api/**', route => route.abort());
  await page.goto(url); await page.getByRole('button', { name: '先在本机使用', exact: true }).click();
  await page.getByRole('button', { name: '设置', exact: true }).click(); const opened = context.waitForEvent('page');
  await page.getByRole('link', { name: /电脑助手与 WPS 编辑/ }).click(); const guide = await opened;
  await guide.getByRole('heading', { name: '把写作与本地文件接起来', exact: true }).waitFor();
  const downloaded = guide.waitForEvent('download'); await guide.getByRole('link', { name: '下载电脑助手', exact: true }).click();
  const bytes = await readFile(await (await downloaded).path()), local = await readFile('desktop-helper-dist/qingxiaolu-desktop.zip');
  const sha = value => createHash('sha256').update(value).digest('hex'); assert.equal(sha(bytes), sha(local));
  const zip = await JSZip.loadAsync(bytes), root = '情晓录电脑助手/';
  for (const name of ['server.mjs', 'start.ps1', 'stop.ps1', 'frontend/index.html', 'history/browser-import.mjs', 'history/loaded-history.mjs', 'node_modules/playwright-core/package.json']) assert.ok(zip.file(root + name));
  assert.ok((await zip.file(root + 'frontend/index.html').async('nodebuffer')).equals(await readFile('mobile-dist/index.html')));
  assert.equal((await zip.file(root + 'start.ps1').async('nodebuffer')).subarray(0, 3).toString('hex'), 'efbbbf');
  assert.ok(!(await zip.file(root + '启动情晓录.cmd').async('text')).includes('启动情晓录.ps1'));
  assert.ok(Object.keys(zip.files).every(name => !/\.env|\.pem|\.apk|imports\/qqzone/.test(name)));
  await guide.setViewportSize({ width: 390, height: 844 }); assert.equal(await guide.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  console.log(JSON.stringify({ settingsGuide: true, actualPublicDownloadExact: true, zipContainsRuntimeAndHistoryTools: true,
    helperAndWebSameFrontend: true, powershellBomAndAsciiLauncher: true, credentialsAndPrivateImagesExcluded: true, narrowGuide: true, zipSha256: sha(bytes) }));
} finally { await browser.close(); }
