// 独立电脑工作台使用真实磁盘与浏览器；Word 外部修改采用合成 DOCX，不冒充真实 WPS 客户端。
import { chromium } from 'playwright-core';
import { strict as assert } from 'node:assert';
import { mkdir, mkdtemp, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import { createDesktopServer } from '../tools/desktop/server.mjs';
const base = path.resolve('work'); await mkdir(base, { recursive: true });
const root = await mkdtemp(path.join(base, 'desktop-author-'));
const instance = await createDesktopServer({ root, frontend: path.resolve('mobile-dist'), port: 0 });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
let diagnosticPage;
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.route('**/qingxiaolu-api/**', route => route.abort());
  const page = await context.newPage(), errors = []; page.on('pageerror', error => errors.push(error.message));
  diagnosticPage = page;
  await page.goto(`${instance.origin}/qingxiaolu/`); await page.getByRole('button', { name: '先在本机使用', exact: true }).click();
  const stored = key => page.evaluate(key => new Promise(resolve => {
    const req = indexedDB.open('qingxiaolu-writing', 1); req.onsuccess = () => { const db = req.result;
      const get = db.transaction('values').objectStore('values').get(key); get.onsuccess = () => { db.close(); resolve(JSON.parse(get.result || 'null')); }; };
  }), key);
  await page.getByPlaceholder('新项目名称').fill('电脑作者项目'); await page.getByRole('button', { name: '新建', exact: true }).click();
  await page.getByRole('heading', { name: '电脑作者项目', exact: true }).click();
  await page.locator('.project-workspace').evaluate(element => {
    const transfer = new DataTransfer(); transfer.items.add(new File(['第一段，保留中文📝。\n第二段。'], '拖入随笔.txt', { type: 'text/plain' }));
    element.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
  });
  await page.getByRole('heading', { name: '临时预览', exact: true }).waitFor();
  const projectId = (await stored('qx_drafts')).find(item => item.itemType === 'project').id;
  assert.equal(await page.locator('.import-destination select').first().inputValue(), projectId);
  await page.getByRole('button', { name: '正式导入已选内容（1）', exact: true }).click();
  await page.getByText('已正式导入 1 条内容', { exact: true }).waitFor();
  await page.getByRole('button', { name: '记录', exact: true }).click();
  await page.getByRole('button', { name: '继续编辑', exact: true }).click();
  const original = '第一段，保留中文📝。\n第二段。';
  assert.equal(await page.getByPlaceholder('这一刻，想写点什么……').inputValue(), original);
  const png = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 20;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#d52465'; ctx.fillRect(0, 0, 32, 20); return canvas.toDataURL('image/png'); });
  const pngBytes = Buffer.from(png.split(',')[1], 'base64');
  await page.locator('input[type=file][accept="image/*"]').setInputFiles({ name: '原图.png', mimeType: 'image/png', buffer: pngBytes });
  await page.getByText(/已自动保存/).waitFor();
  await page.getByRole('button', { name: '保存并用 WPS 编辑', exact: true }).click();
  await page.getByText('未找到 WPS。Word 文件已保存，可自行打开；安装 WPS 后重新启动电脑助手。', { exact: true }).waitFor();
  const record = (await stored('qx_drafts')).find(item => item.itemType === 'article'), link = await page.evaluate(id => JSON.parse(localStorage.getItem('qx_wps_links'))[id], record.id);
  const filePath = path.join(root, ...link.parts), bytes = await readFile(filePath), zip = await JSZip.loadAsync(bytes);
  assert.ok(zip.file('word/document.xml')); assert.equal(await zip.file('word/media/image-1.png').async('nodebuffer').then(value => value.equals(pngBytes)), true);
  assert.ok((await mammoth.extractRawText({ buffer: bytes })).value.includes(original.split('\n')[0]));
  // 图片生成在途时的磁盘修改也不能被后续 Word 写入覆盖。
  await page.evaluate(() => {
    const originalFetch = window.fetch; window.wordGenerationStarted = false;
    window.fetch = async (...args) => {
      if (String(args[0]).startsWith('data:image/')) {
        window.wordGenerationStarted = true;
        await new Promise(resolve => { window.releaseWordImage = resolve; });
      }
      return originalFetch(...args);
    };
    window.restoreWordFetch = () => { window.fetch = originalFetch; };
  });
  await page.getByRole('button', { name: '保存并用 WPS 编辑', exact: true }).click();
  await page.waitForFunction(() => window.wordGenerationStarted);
  const during = await JSZip.loadAsync(bytes); during.file('word/document.xml', (await during.file('word/document.xml').async('text')).replace('第二段。', '生成期间的外部修改。'));
  const duringBytes = await during.generateAsync({ type: 'nodebuffer' }); await writeFile(filePath, duringBytes);
  await page.evaluate(() => window.releaseWordImage());
  await page.getByText('Word 文件已有本地修改，未覆盖。请先读回后再继续。', { exact: true }).waitFor();
  assert.ok((await readFile(filePath)).equals(duringBytes));
  await page.evaluate(() => window.restoreWordFetch()); await writeFile(filePath, bytes);
  const wordChange = '作者在 Word 修改后的第二段。';
  const xml = await zip.file('word/document.xml').async('text'); zip.file('word/document.xml', xml.replace('第二段。', wordChange));
  await writeFile(filePath, await zip.generateAsync({ type: 'nodebuffer' }));
  const externalBytes = await readFile(filePath);
  await page.getByRole('button', { name: '保存并用 WPS 编辑', exact: true }).click();
  await page.getByText(/Word 文件已有本地修改，未覆盖/).waitFor(); assert.ok((await readFile(filePath)).equals(externalBytes));
  await page.getByRole('button', { name: '读回 WPS 文件', exact: true }).click(); await page.getByRole('heading', { name: 'Word 读回预览', exact: true }).waitFor();
  assert.equal((await stored('qx_drafts')).find(item => item.id === record.id).content.text, original);
  await page.getByRole('button', { name: '取消读回', exact: true }).click(); assert.equal(await page.getByPlaceholder('这一刻，想写点什么……').inputValue(), original);
  await page.getByRole('button', { name: '读回 WPS 文件', exact: true }).click();
  await page.getByRole('button', { name: '确认读回并保存', exact: true }).click();
  await page.getByText('已读回并保存到本机，原内容保留在版本中；未上传云端。', { exact: true }).waitFor();
  const updated = (await stored('qx_drafts')).find(item => item.id === record.id);
  assert.ok(updated.content.text.includes(wordChange)); assert.equal(updated.content.images[0], png);
  assert.ok((await stored('qx_item_versions'))[record.id].some(item => item.content.text === original));
  await page.reload(); assert.ok((await page.getByPlaceholder('这一刻，想写点什么……').inputValue()).includes(wordChange));
  await page.getByRole('button', { name: '项目', exact: true }).click(); await page.getByRole('heading', { name: '电脑作者项目', exact: true }).click();
  await page.getByRole('button', { name: '导出', exact: true }).click();
  await page.getByRole('button', { name: '从 App 同步到本地', exact: true }).click();
  await page.getByRole('heading', { name: '写入本地前确认', exact: true }).waitFor();
  const folderName = (await readdir(root)).find(name => name.endsWith(projectId));
  assert.equal((await readdir(path.join(root, folderName))).includes('完整备份.json'), false, '预览不能提前写入');
  await page.getByRole('button', { name: '确认本次同步', exact: true }).click(); await page.getByText(/已从 App 同步到/).waitFor();
  const articleDir = path.join(root, folderName, '正文'), mdName = (await readdir(articleDir))[0], mdPath = path.join(articleDir, mdName);
  const md = await readFile(mdPath, 'utf8'); await writeFile(mdPath, md + '\n本地 Markdown 修改。');
  await page.getByRole('button', { name: '从 App 同步到本地', exact: true }).click();
  await page.getByText(/文件夹中有未读回的修改，不能覆盖/).waitFor();
  assert.equal(await page.getByRole('button', { name: '确认本次同步', exact: true }).isDisabled(), true);
  await page.getByRole('button', { name: '取消本次同步', exact: true }).click();
  const projectInfoPath = path.join(root, folderName, '项目信息.md');
  await writeFile(projectInfoPath, (await readFile(projectInfoPath, 'utf8')).replace('# 电脑作者项目', '# 本地修改项目名称'));
  await writeFile(path.join(root, folderName, '世界观.md'), '# 世界观\n\n本地设定说明');
  await page.getByRole('button', { name: '从本地同步到 App', exact: true }).click();
  await page.getByRole('heading', { name: '读回情晓录前确认', exact: true }).waitFor();
  await page.locator('.folder-preview-list summary').filter({ hasText: '世界观.md' }).click();
  await page.getByText('本地设定说明', { exact: true }).waitFor();
  await writeFile(mdPath, md + '\n本地 Markdown 修改。\n预览后追加的正文。');
  await page.getByRole('button', { name: '确认本次同步', exact: true }).click();
  await page.getByText('预览后情晓录或文件夹内容发生变化，尚未导入，请重新预览。', { exact: true }).waitFor();
  assert.equal((await stored('qx_drafts')).find(item => item.id === record.id).content.text.includes('预览后追加的正文。'), false);
  await page.getByRole('button', { name: '取消本次同步', exact: true }).click();
  await page.getByRole('button', { name: '从本地同步到 App', exact: true }).click();
  await page.getByRole('button', { name: '确认本次同步', exact: true }).click(); await page.getByText(/同步到 App，未上传服务器/).waitFor();
  assert.ok((await stored('qx_drafts')).find(item => item.id === record.id).content.text.includes('本地 Markdown 修改。'));
  assert.equal((await stored('qx_drafts')).find(item => item.id === record.id).content.images[0], png);
  assert.equal((await stored('qx_drafts')).find(item => item.id === projectId).title, '本地修改项目名称');
  assert.equal((await stored('qx_drafts')).find(item => item.id === projectId).content.world, '本地设定说明');
  await page.getByRole('button', { name: '项目', exact: true }).first().click();
  await page.getByRole('textbox', { name: '项目名称', exact: true }).fill('项目改名后');
  await page.getByRole('button', { name: '导出', exact: true }).click();
  await page.locator('.local-word-sync small').filter({ hasText: folderName }).waitFor();
  assert.equal((await readdir(root)).filter(name => name.endsWith(projectId)).length, 1);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
  if (process.env.QX_DESKTOP_SCREENSHOT) await page.screenshot({ path: process.env.QX_DESKTOP_SCREENSHOT, fullPage: true });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ actualLocalFilesystem: true, projectDragImportPreview: true, projectDestination: true,
    docxOriginalImageExact: true, externalWordChangeProtected: true, inFlightWordChangeProtected: true, readBackPreviewCancel: true, readBackSavedAndVersioned: true,
    reloadPreservesWordTextAndImage: true, folderBothDirectionsPreview: true, localConflictBlocksOverwrite: true,
    materialChangesListed: true, postPreviewDiskChangeRejected: true, projectTitleReadBack: true,
    renamedProjectKeepsDirectory: true, wideViewport: true, realWpsClient: false, apiRequestsBlocked: true }));
} catch (error) {
  if (diagnosticPage) console.error(JSON.stringify({ failureUi: await diagnosticPage.locator('body').innerText().then(text => text.slice(0, 1800)) }));
  throw error;
} finally {
  await browser.close(); await instance.close();
  assert.ok(root.startsWith(base + path.sep) && path.basename(root).startsWith('desktop-author-'));
  await rm(root, { recursive: true, force: true });
}
