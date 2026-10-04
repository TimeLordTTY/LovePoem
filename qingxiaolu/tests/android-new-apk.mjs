// 独立新签名模拟器：实际 Android 分享接收器和系统文件保存；不连接真实第三方或修改手机。
import { _android } from 'playwright-core';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import JSZip from 'jszip';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const serial = process.env.QX_ANDROID_SERIAL || 'emulator-5582';
assert.match(serial, /^emulator-\d+$/);
const device = (await _android.devices()).find(device => device.serial() === serial);
assert.ok(device, '独立 APK 模拟器未连接');
const digest = value => createHash('sha256').update(value).digest('hex');
const adb = path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe');
const readDeviceFile = name => execFileSync(adb, ['-s', serial, 'exec-out', `cat '${name}'`], { maxBuffer: 64 * 1024 * 1024, windowsHide: true });
let installedReceiver = false;
async function nodes() {
  await device.shell('uiautomator dump /sdcard/qx-new-apk-ui.xml');
  const xml = (await device.shell('cat /sdcard/qx-new-apk-ui.xml')).toString();
  return [...xml.matchAll(/<node\s+([^>]+)>/g)].map(match => Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(value => [value[1], value[2].replace(/&amp;/g, '&').replace(/&quot;/g, '"')])));
}
async function nativeTap(match) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const all = await nodes(), node = all.find(match);
    if (node) {
      const bounds = node.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/).slice(1).map(Number);
      await device.shell(`input tap ${Math.round((bounds[0] + bounds[2]) / 2)} ${Math.round((bounds[1] + bounds[3]) / 2)}`);
      return node;
    }
    if (attempt === 4) throw new Error('未找到系统操作入口：' + all.map(node => node.text || node['content-desc']).filter(Boolean).slice(0, 25).join(' | '));
  }
}
async function saveDocument() {
  let all = await nodes();
  // 选定系统 Downloads，不依赖上次保存位置。
  const menu = all.find(node => /Show roots|显示根目录/.test(node['content-desc'] || ''));
  if (menu) { await nativeTap(node => /Show roots|显示根目录/.test(node['content-desc'] || '')); await nativeTap(node => /^(Downloads|下载)$/.test(node.text || '')); }
  all = await nodes();
  const name = all.find(node => node.class === 'android.widget.EditText')?.text;
  assert.ok(name, '系统保存窗口未显示文件名');
  await nativeTap(node => /^(SAVE|Save|保存)$/.test(node.text || '') && node.enabled === 'true');
  return `/sdcard/Download/${name}`;
}
try {
  assert.equal((await device.shell('getprop ro.boot.qemu.avd_name')).toString().trim(), 'qingxiaolu-apk-release-api34');
  await device.shell('am start -n com.qingxiaolu.app/.MainActivity');
  const page = await (await device.webView({ pkg: 'com.qingxiaolu.app' })).page(); page.setDefaultTimeout(15000);
  await page.context().route('**/qingxiaolu-api/**', route => route.abort());
  const tap = async locator => { await page.evaluate(() => document.activeElement?.blur()); await locator.click({ noWaitAfter: true }); };
  if (await page.getByRole('button', { name: '先在本机使用', exact: true }).isVisible()) await tap(page.getByRole('button', { name: '先在本机使用', exact: true }));
  await tap(page.getByRole('button', { name: '创作', exact: true }));
  await tap(page.getByRole('button', { name: '新稿件', exact: true }));
  const title = `安卓图片验收-${Date.now()}`, body = Array.from({ length: 60 }, (_, i) => `第 ${i + 1} 段，中文📝和原始换行。`).join('\n');
  await page.getByPlaceholder('稿件标题（可选）').fill(title); await page.getByPlaceholder('这一刻，想写点什么……').fill(body);
  const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 40; c.height = 30; const ctx = c.getContext('2d'); ctx.fillStyle = '#a65a7d'; ctx.fillRect(0, 0, 40, 30); return c.toDataURL(); });
  await page.locator('input[type=file][accept="image/*"]').setInputFiles({ name: '原图.png', mimeType: 'image/png', buffer: Buffer.from(png.split(',')[1], 'base64') });
  await tap(page.getByRole('button', { name: '保存', exact: true })); await page.getByText('已保存到本机，可以继续写作', { exact: true }).waitFor();
  await tap(page.getByRole('button', { name: '记录', exact: true }));
  const storage = () => page.evaluate(() => new Promise(resolve => { const request = indexedDB.open('qingxiaolu-writing', 1); request.onsuccess = () => {
    const db = request.result, get = db.transaction('values').objectStore('values').get('qx_drafts'); get.onsuccess = () => { db.close(); resolve(get.result); };
  }; }));
  const original = await storage();
  const card = page.locator('article[data-blog-month]').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
  await tap(card.getByRole('button', { name: '分享成图片', exact: true })); await page.getByText(/已生成 \d+ 张图片/).waitFor();
  const hashes = await page.locator('.image-share-preview img').evaluateAll(async images => Promise.all(images.map(async image =>
    Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await (await fetch(image.src)).arrayBuffer()))).map(value => value.toString(16).padStart(2, '0')).join(''))));
  assert.ok(hashes.length >= 3);
  const badToken = await page.evaluate(async () => { try { await window.Capacitor.nativePromise('WritingFiles', 'save', { token: '../private' }); return false; } catch { return true; } });
  assert.equal(badToken, true);
  await tap(page.getByRole('button', { name: '下载第 1 张', exact: true }));
  const pngPath = await saveDocument(); await page.getByText('第 1 张图片已保存。', { exact: true }).waitFor();
  assert.equal(digest(readDeviceFile(pngPath)), hashes[0]);
  await tap(page.getByRole('button', { name: '下载第 1 张', exact: true })); await nodes(); await device.shell('input keyevent 4');
  await page.getByText('已取消保存，图片仍可预览或分享。', { exact: true }).waitFor();
  await tap(page.getByRole('button', { name: '下载全部图片（压缩包）', exact: true }));
  const zipPath = await saveDocument(); await page.getByText('图片压缩包已保存，解压后可按页码发送。', { exact: true }).waitFor();
  const zip = await JSZip.loadAsync(readDeviceFile(zipPath)); const files = Object.values(zip.files).filter(entry => !entry.dir);
  assert.equal(files.length, hashes.length);
  for (const [i, entry] of files.entries()) assert.equal(digest(await entry.async('nodebuffer')), hashes[i]);
  assert.equal((await device.shell('pm path com.sina.weibo')).toString().trim(), '');
  await device.installApk(await readFile('D:/Project/xiao-poem/output/android-share-receiver-portable/receiver.apk')); installedReceiver = true;
  await tap(page.getByRole('button', { name: '分享图片', exact: true }));
  await nodes();
  await device.shell('input swipe 540 1750 540 500 500');
  await nativeTap(node => (node.text || '').includes('情晓录转发验收接收器'));
  let receipt;
  for (let i = 0; i < 5; i++) { try { receipt = JSON.parse((await device.shell('run-as com.sina.weibo cat files/result.json')).toString()); break; } catch { await nodes(); } }
  assert.ok(receipt); assert.equal(receipt.error, undefined); assert.equal(receipt.action, 'android.intent.action.SEND_MULTIPLE');
  assert.deepEqual(receipt.images.map(image => image.hash), hashes); assert.ok(receipt.images.every(image => image.mime === 'image/png'));
  await device.shell('am start -n com.qingxiaolu.app/.MainActivity'); await page.getByRole('heading', { name: '分享成图片', exact: true }).waitFor();
  assert.equal(await storage(), original);
  await tap(page.getByRole('button', { name: '返回记录', exact: true })); await tap(page.getByRole('button', { name: '设置', exact: true }));
  await tap(page.getByRole('button', { name: /下载完整备份/ })); const backupPath = await saveDocument();
  await page.getByText('完整备份已生成，包含稿件、资料、图片和版本记录。', { exact: true }).waitFor();
  const backup = JSON.parse(readDeviceFile(backupPath).toString());
  const saved = backup.items.find(item => item.payload.title === title); assert.equal(saved.payload.content.text, body); assert.equal(saved.payload.content.images[0], png);
  await tap(page.getByRole('button', { name: '记录', exact: true })); await tap(card.getByRole('button', { name: '继续编辑', exact: true }));
  assert.equal(await page.getByPlaceholder('这一刻，想写点什么……').inputValue(), body);
  console.log(JSON.stringify({ nativePlatform: true, generatedPages: hashes.length, systemPngSaveExact: true, cancelSaveKeepsPreview: true,
    systemZipContainsEveryPngExact: true, actualAndroidReceiverHasAllImages: true, mimeAndUriReadPermissions: true, invalidTokenRejected: true,
    originalRecordUnchanged: true, nativeCompleteBackupTextAndImage: true, releaseSeedTitle: title, releaseSeedBody: body.split('\n')[0], realThirdPartyApps: false }));
} finally {
  if (installedReceiver) await device.shell('pm uninstall com.sina.weibo');
  await device.close();
}
