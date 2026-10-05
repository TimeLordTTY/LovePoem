import { _android } from 'playwright-core';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import JSZip from 'jszip';
const serial = 'emulator-5582', adb = path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe');
const device = (await _android.devices()).find(d => d.serial() === serial); assert.ok(device);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const downloadFiles = () => execFileSync(adb, ['-s', serial, 'exec-out', 'find /sdcard/Download -maxdepth 1 -type f -print0'], { windowsHide: true }).toString().split('\0').filter(Boolean);
async function nodes() {
  await device.shell('uiautomator dump /sdcard/qx-original-ui.xml');
  return [...(await device.shell('cat /sdcard/qx-original-ui.xml')).toString().matchAll(/<node\s+([^>]+)>/g)].map(match => Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(v => [v[1], v[2]])));
}
async function systemTap(test) {
  for (let i = 0; i < 5; i++) { const node = (await nodes()).find(test); if (node) {
    const [x, y, right, bottom] = node.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/).slice(1).map(Number);
    await device.shell(`input tap ${Math.round((x + right) / 2)} ${Math.round((y + bottom) / 2)}`); return;
  } }
  throw Error('系统保存入口未出现');
}
async function saveOriginal(page, link, expected) {
  const before = new Set(downloadFiles());
  await link.click({ noWaitAfter: true });
  if ((await nodes()).some(n => /Show roots/.test(n['content-desc'] || ''))) {
    await systemTap(n => /Show roots/.test(n['content-desc'] || '')); await systemTap(n => n.text === 'Downloads');
  }
  const name = (await nodes()).find(n => n.class === 'android.widget.EditText')?.text; assert.ok(name);
  await systemTap(n => /^save$/i.test(n.text || '') && n.enabled === 'true');
  await page.getByText(`原始文件已保存：${name}`, { exact: true }).waitFor();
  const added = downloadFiles().filter(file => !before.has(file));
  assert.equal(added.length, 1, '系统应新建本次实际保存的文件，不能读取上次同名文件作为证据');
  const bytes = execFileSync(adb, ['-s', serial, 'exec-out', `cat '${added[0]}'`], { maxBuffer: 64000000, windowsHide: true });
  assert.equal(hash(bytes), hash(expected), `实际保存文件 ${added[0]}，窗口名称 ${name}，字节 ${bytes.length}/${expected.length}`);
}
try {
  assert.equal((await device.shell('getprop ro.boot.qemu.avd_name')).toString().trim(), 'qingxiaolu-apk-release-api34');
  await device.shell('am start -n com.qingxiaolu.app/.MainActivity');
  const page = await (await device.webView({ pkg: 'com.qingxiaolu.app' })).page(); page.setDefaultTimeout(15000);
  await page.context().route('**/qingxiaolu-api/**', r => r.abort()); await page.reload();
  const suffix = Date.now(), pdfName = `原件PDF-${suffix}`, mindName = `原件XMind-${suffix}`;
  const pdf = await readFile('D:/Project/xiao-poem/output/playwright/author-fixtures/chinese-poetry.pdf');
  const zip = new JSZip(); zip.file('content.json', JSON.stringify([{ id: 's', rootTopic: { id: 'r', title: mindName, notes: { plain: { content: '核对原始压缩包与备注' } } } }]));
  const mind = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  await page.getByRole('button', { name: '项目', exact: true }).click({ noWaitAfter: true });
  await page.getByRole('button', { name: /导入本地文档/ }).click({ noWaitAfter: true });
  if (await page.getByRole('button', { name: '重新选择', exact: true }).isVisible()) await page.getByRole('button', { name: '重新选择', exact: true }).click({ noWaitAfter: true });
  await page.getByRole('heading', { name: '选择本地文件', exact: true }).waitFor();
  await page.locator('input[type=file]').setInputFiles([{ name: `${pdfName}.pdf`, mimeType: 'application/pdf', buffer: pdf }, { name: `${mindName}.xmind`, mimeType: 'application/x-xmind', buffer: mind }]);
  await page.getByRole('heading', { name: '临时预览', exact: true }).waitFor();
  await saveOriginal(page, page.getByRole('link', { name: '下载原始 PDF 核对', exact: true }), pdf);
  await saveOriginal(page, page.getByRole('link', { name: '下载原始 XMind 核对', exact: true }), mind);
  await page.getByRole('link', { name: '下载原始 XMind 核对', exact: true }).click({ noWaitAfter: true }); await nodes(); await device.shell('input keyevent 4');
  await page.getByText('已取消原文件保存，导入内容保持不变', { exact: true }).waitFor();
  await page.getByRole('button', { name: '正式导入已选内容（2）', exact: true }).click({ noWaitAfter: true });
  await page.getByText('已正式导入 2 条内容', { exact: true }).waitFor();
  await page.getByRole('button', { name: '记录', exact: true }).click({ noWaitAfter: true });
  const pdfCard = page.locator('article[data-blog-month]').filter({ has: page.getByRole('heading', { name: pdfName, exact: true }) });
  const mindCard = page.locator('article[data-blog-month]').filter({ has: page.getByRole('heading', { name: mindName, exact: true }) });
  await saveOriginal(page, pdfCard.getByRole('link', { name: '下载原始 PDF', exact: true }), pdf);
  await saveOriginal(page, mindCard.getByRole('link', { name: '下载原始 XMind', exact: true }), mind);
  await page.reload(); await page.getByRole('button', { name: '记录', exact: true }).click({ noWaitAfter: true });
  await mindCard.waitFor(); await pdfCard.waitFor();
  assert.equal(await mindCard.count(), 1); assert.equal(await pdfCard.count(), 1);
  await page.getByRole('button', { name: '项目', exact: true }).click({ noWaitAfter: true });
  const projectTitle = `原件项目-${suffix}`; await page.getByPlaceholder('新项目名称').fill(projectTitle);
  await page.getByRole('button', { name: '新建', exact: true }).click({ noWaitAfter: true });
  await page.getByRole('heading', { name: projectTitle, exact: true }).click({ noWaitAfter: true });
  await page.getByRole('button', { name: '导入文件到此项目', exact: true }).click({ noWaitAfter: true });
  await page.getByRole('heading', { name: '选择本地文件', exact: true }).waitFor();
  await page.locator('input[type=file]').setInputFiles({ name: `${mindName}.xmind`, mimeType: 'application/x-xmind', buffer: mind });
  await page.locator('.import-destination select').nth(1).selectOption('大纲');
  await page.getByRole('button', { name: '正式导入已选内容（1）', exact: true }).click({ noWaitAfter: true });
  await page.getByText('已正式导入 1 条内容', { exact: true }).waitFor();
  await page.getByRole('button', { name: '项目', exact: true }).click({ noWaitAfter: true });
  await page.getByRole('heading', { name: projectTitle, exact: true }).click({ noWaitAfter: true });
  await page.getByRole('button', { name: '导出', exact: true }).click({ noWaitAfter: true });
  await page.getByText('导入原文件（1）', { exact: true }).click();
  await saveOriginal(page, page.getByRole('link', { name: `下载原始 XMind：${mindName}.xmind`, exact: true }), mind);
  console.log(JSON.stringify({ nativePdfPreviewOriginalExact: true, nativeXmindPreviewOriginalExact: true, cancelPreservesPreview: true,
    formalImportAfterSave: true, nativeRecordOriginalFilesExact: true, reloadKeepsBoth: true, nativeProjectOriginalExact: true, apiBlocked: true }));
} finally { await device.close(); }
