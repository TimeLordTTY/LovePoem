import { _android } from 'playwright-core';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const serial = 'emulator-5582', adb = path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe');
const device = (await _android.devices()).find(item => item.serial() === serial); assert.ok(device);
let diagnosticPage;
const files = () => execFileSync(adb, ['-s', serial, 'exec-out', 'find /sdcard/Download -maxdepth 1 -type f -print0'], { windowsHide: true }).toString().split('\0').filter(Boolean);
async function nativeNodes() {
  await device.shell('uiautomator dump /sdcard/qx-mind-ui.xml');
  return [...(await device.shell('cat /sdcard/qx-mind-ui.xml')).toString().matchAll(/<node\s+([^>]+)>/g)].map(match => Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(item => [item[1], item[2]])));
}
async function systemTap(predicate) {
  for (let index = 0; index < 5; index++) { const node = (await nativeNodes()).find(predicate); if (!node) continue;
    const [left, top, right, bottom] = node.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/).slice(1).map(Number);
    await device.shell(`input tap ${Math.round((left + right) / 2)} ${Math.round((top + bottom) / 2)}`); return; }
  throw new Error('原生确认或保存按钮未出现');
}
try {
  assert.equal((await device.shell('getprop ro.boot.qemu.avd_name')).toString().trim(), 'qingxiaolu-apk-release-api34');
  await device.shell('am start -n com.qingxiaolu.app/.MainActivity');
  const page = await (await device.webView({ pkg: 'com.qingxiaolu.app' })).page(); diagnosticPage = page; page.setDefaultTimeout(15000);
  page.on('dialog', () => {}); await page.context().route('**/qingxiaolu-api/**', route => route.abort());
  const tap = locator => locator.click({ noWaitAfter: true });
  if (await page.getByRole('button', { name: '先在本机使用', exact: true }).isVisible()) await tap(page.getByRole('button', { name: '先在本机使用', exact: true }));
  await tap(page.getByRole('button', { name: '项目', exact: true })); const title = `安卓导图-${Date.now()}`;
  await page.getByPlaceholder('新项目名称').fill(title); await tap(page.getByRole('button', { name: '新建', exact: true }));
  await tap(page.getByRole('heading', { name: title, exact: true })); await tap(page.getByRole('button', { name: '思维树', exact: true }));
  await tap(page.getByRole('button', { name: '创建第一张思维树', exact: true })); await page.getByLabel('思维树名称', { exact: true }).fill(title);
  await page.getByLabel('节点文字', { exact: true }).fill('原始构思📝');
  await tap(page.getByRole('button', { name: '添加子节点', exact: true })); await page.getByLabel('节点文字', { exact: true }).fill('人物的秘密');
  await page.getByLabel('节点备注', { exact: true }).fill('两行备注\n  保留空格');
  // 真正的 Android 原生确认窗口，取消后原节点仍可编辑。
  const deleting = tap(page.getByRole('button', { name: '删除节点及分支', exact: true }));
  await systemTap(node => /^cancel$/i.test(node.text || '')); await deleting;
  assert.equal(await page.getByLabel('节点文字', { exact: true }).inputValue(), '人物的秘密');
  const confirmed = tap(page.getByRole('button', { name: '删除节点及分支', exact: true }));
  await systemTap(node => /^ok$/i.test(node.text || '')); await confirmed;
  await page.getByText('已删除；可撤销，也可从项目资料版本恢复。', { exact: true }).waitFor();
  await tap(page.getByRole('button', { name: '撤销', exact: true }));
  await tap(page.getByRole('button', { name: '全屏整理', exact: true })); await page.locator('.mind-workbench.is-fullscreen').waitFor();
  await device.shell('input keyevent 4'); await page.locator('.mind-workbench.is-fullscreen').waitFor({ state: 'detached' });
  await page.getByRole('heading', { name: '思维树', exact: true }).waitFor();
  await tap(page.getByRole('button', { name: '全屏整理', exact: true })); await page.getByRole('button', { name: '适配全图', exact: true }).click({ noWaitAfter: true });
  const canvas = page.locator('.mind-viewport'), before = await page.locator('.mind-world').getAttribute('style');
  const rect = await canvas.boundingBox(); assert.ok(rect);
  // CDP 触摸事件经 WebView 输入通道分发，验证单指平移和双指缩放。
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((point, id) => ({ id, x: point[0], y: point[1] })) });
  const x = rect.x + rect.width / 2, y = rect.y + 40;
  await touch('touchStart', [[x, y]]); await touch('touchMove', [[x + 35, y + 45]]); await touch('touchEnd', []);
  assert.notEqual(await page.locator('.mind-world').getAttribute('style'), before);
  const oldScale = await page.locator('.mind-camera span').innerText();
  await touch('touchStart', [[x - 30, y], [x + 30, y]]); await touch('touchMove', [[x - 70, y], [x + 70, y]]); await touch('touchEnd', []);
  await page.waitForFunction(previous => document.querySelector('.mind-camera span')?.textContent !== previous, oldScale);
  await tap(page.getByRole('button', { name: '适配全图', exact: true }));
  const nodeBox = await page.locator('.mind-node').first().boundingBox(); assert.ok(nodeBox);
  const nodeX = nodeBox.x + nodeBox.width / 2, nodeY = nodeBox.y + nodeBox.height / 2;
  const nodeScale = await page.locator('.mind-camera span').innerText();
  await touch('touchStart', [[nodeX, nodeY], [nodeX + 70, nodeY]]);
  await touch('touchMove', [[nodeX - 25, nodeY], [nodeX + 100, nodeY]]); await touch('touchEnd', []);
  await page.waitForFunction(previous => document.querySelector('.mind-camera span')?.textContent !== previous, nodeScale);
  await cdp.detach(); await tap(page.getByRole('button', { name: '退出全屏', exact: true }));
  const existing = new Set(files()); await tap(page.getByRole('button', { name: '导出导图 JSON', exact: true }));
  if ((await nativeNodes()).some(node => /Show roots/.test(node['content-desc'] || ''))) {
    await systemTap(node => /Show roots/.test(node['content-desc'] || '')); await systemTap(node => node.text === 'Downloads');
  }
  await systemTap(node => /^save$/i.test(node.text || '') && node.enabled === 'true');
  await page.getByText('导图文件已交给系统保存。', { exact: true }).waitFor();
  const added = files().filter(file => !existing.has(file)); assert.equal(added.length, 1);
  const exported = JSON.parse(execFileSync(adb, ['-s', serial, 'exec-out', `cat '${added[0]}'`], { windowsHide: true }).toString());
  assert.equal(exported.tree.nodes.length, 2); assert.equal(exported.tree.nodes.find(node => node.text === '人物的秘密').note, '两行备注\n  保留空格');
  await tap(page.locator('.save-project')); await page.getByText('项目资料已自动保存到本机', { exact: true }).waitFor();
  await page.waitForFunction(expected => new Promise(resolve => { const request = indexedDB.open('qingxiaolu-writing', 1); request.onsuccess = () => {
    const db = request.result, get = db.transaction('values').objectStore('values').get('qx_project_workspaces'); get.onsuccess = () => {
      db.close(); const projects = Object.values(JSON.parse(get.result || '{}')); resolve(projects.some(project => project.mindTrees?.some(tree => tree.title === expected && tree.nodes.length === 2))); }; }; }), title);
  await device.shell('am force-stop com.qingxiaolu.app'); await device.shell('am start -n com.qingxiaolu.app/.MainActivity');
  const reopened = await (await device.webView({ pkg: 'com.qingxiaolu.app' })).page(); reopened.setDefaultTimeout(15000);
  await reopened.context().route('**/qingxiaolu-api/**', route => route.abort());
  await tap(reopened.getByRole('button', { name: '项目', exact: true })); await tap(reopened.getByRole('heading', { name: title, exact: true }));
  await tap(reopened.getByRole('button', { name: '思维树', exact: true })); assert.equal(await reopened.getByLabel('思维树名称', { exact: true }).inputValue(), title);
  await reopened.screenshot({ path: 'D:/Project/xiao-poem/output/mind-tree/android-ready.png', fullPage: true });
  console.log(JSON.stringify({ nativeConfirmCancelDeleteUndo: true, actualBackExitsFullscreen: true, touchPan: true, twoFingerZoom: true, pinchStartingOnNode: true, nativeJsonExact: true, processRestartPreservesTree: true, noCloudUpload: true }));
} catch (error) { await diagnosticPage?.screenshot({ path: 'D:/Project/xiao-poem/output/mind-tree/android-failure.png', fullPage: true }).catch(() => {}); throw error; }
finally { await device.close(); }
