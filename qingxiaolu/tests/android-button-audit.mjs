import { _android } from 'playwright-core';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const serial = 'emulator-5582', adb = path.join(process.env.LOCALAPPDATA, 'Android/Sdk/platform-tools/adb.exe');
const d = (await _android.devices()).find(d => d.serial() === serial); assert.ok(d);
async function nodes() {
  await d.shell('uiautomator dump /sdcard/qx-button-ui.xml');
  return [...(await d.shell('cat /sdcard/qx-button-ui.xml')).toString().matchAll(/<node\s+([^>]+)>/g)].map(match =>
    Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(value => [value[1], value[2]])));
}
async function systemTap(predicate) {
  let all;
  for (let i = 0; i < 5; i++) {
    all = await nodes(); const node = all.find(predicate);
    if (node) { const [x, y, right, bottom] = node.bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/).slice(1).map(Number);
      await d.shell(`input tap ${Math.round((x + right) / 2)} ${Math.round((y + bottom) / 2)}`); return; }
  }
  throw Error('系统按钮不存在：' + all.map(n => n.text || n['content-desc']).filter(Boolean).join(' | '));
}
async function saveSystemFile() {
  if ((await nodes()).some(n => /Show roots/.test(n['content-desc'] || ''))) {
    await systemTap(n => /Show roots/.test(n['content-desc'] || '')); await systemTap(n => n.text === 'Downloads');
  }
  const name = (await nodes()).find(n => n.class === 'android.widget.EditText')?.text; assert.ok(name);
  await systemTap(n => /^save$/i.test(n.text || '') && n.enabled === 'true');
  return { name, path: `/sdcard/Download/${name}` };
}
try {
  assert.equal((await d.shell('getprop ro.boot.qemu.avd_name')).toString().trim(), 'qingxiaolu-apk-release-api34');
  await d.shell('am start -n com.qingxiaolu.app/.MainActivity');
  const page = await (await d.webView({ pkg: 'com.qingxiaolu.app' })).page(); page.setDefaultTimeout(12000);
  // 保留真实原生确认窗口；没有监听时 Playwright 会替用户自动取消网页确认。
  page.on('dialog', () => {});
  await page.context().route('**/qingxiaolu-api/**', r => r.abort());
  await page.reload();
  const tap = locator => locator.click({ noWaitAfter: true });
  const data = key => page.evaluate(key => new Promise(resolve => { const r = indexedDB.open('qingxiaolu-writing', 1); r.onsuccess = () => {
    const db = r.result, get = db.transaction('values').objectStore('values').get(key); get.onsuccess = () => { db.close(); resolve(JSON.parse(get.result || '[]')); };
  }; }), key);
  await tap(page.getByRole('button', { name: '项目', exact: true }));
  const title = '项目按钮核对-' + Date.now(); await page.getByPlaceholder('新项目名称').fill(title); await tap(page.getByRole('button', { name: '新建', exact: true }));
  const card = page.locator('.project-card').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
  await page.evaluate(() => document.body.style.fontSize = '24px');
  assert.ok(await card.getByRole('button', { name: '本地删除', exact: true }).evaluate(b => { const r = b.getBoundingClientRect();
    return [.1, .5, .9].every(v => { const t = document.elementFromPoint(r.x + r.width * v, r.y + r.height / 2); return t === b || b.contains(t); }); }));
  const clickDelete = async accepted => {
    const pending = tap(card.getByRole('button', { name: '本地删除', exact: true }));
    await systemTap(n => accepted ? /^ok$/i.test(n.text || '') : /^cancel$/i.test(n.text || '')); await pending;
  };
  await clickDelete(false); assert.equal(await page.locator('.project-workspace').count(), 0); assert.equal(await card.count(), 1);
  await clickDelete(true); await card.waitFor({ state: 'detached' }); assert.equal(await page.locator('.project-workspace').count(), 0);
  await page.getByText('项目已移到本机回收站，关联记录和云端内容保持不变', { exact: true }).waitFor();
  await page.reload(); assert.equal(await card.count(), 0);
  await tap(page.getByRole('button', { name: '设置', exact: true })); await tap(page.getByRole('button', { name: /本地回收站/ }));
  const trash = page.locator('article').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
  await tap(trash.getByRole('button', { name: '恢复', exact: true })); await tap(page.getByRole('button', { name: '项目', exact: true }));
  await tap(card.getByRole('button', { name: '进入项目', exact: true }));
  const note = '项目导出与按钮核对：中文原文保持。'; await page.getByLabel('项目简介').fill(note); await tap(page.getByRole('button', { name: '保存', exact: true }));
  await tap(page.getByRole('button', { name: '导出', exact: true }));
  const exports = [];
  for (const name of ['Markdown', 'JSON', '全文 Word（文字版）', '全文 Markdown', 'OPML']) {
    await tap(page.getByRole('button', { name, exact: true })); const file = await saveSystemFile();
    await page.getByText(`已导出“${file.name}”`, { exact: true }).waitFor();
    const text = execFileSync(adb, ['-s', serial, 'exec-out', `cat '${file.path}'`], { maxBuffer: 64000000, windowsHide: true }).toString();
    if (name === 'JSON') { assert.equal(JSON.parse(text).description, note); assert.equal(JSON.parse(text).aiKey, undefined); }
    else if (name === 'OPML') assert.ok(text.includes('<opml') && text.includes(title));
    else assert.ok(text.includes(note), `${name} 导出内容必须包含项目原文，实际字节 ${text.length}`);
    exports.push(name);
  }
  await tap(page.getByRole('button', { name: 'JSON', exact: true })); await nodes(); await d.shell('input keyevent 4');
  await page.getByText('已取消文件保存，项目内容保持不变', { exact: true }).waitFor();
  const parent = (await data('qx_drafts')).find(item => item.title === title); assert.ok(parent && parent.content.description === note);
  await tap(page.getByRole('button', { name: '人物', exact: true }));
  await tap(page.getByRole('button', { name: /新增人物/ })); await page.getByPlaceholder('人物姓名').fill('待删人物');
  await tap(page.getByRole('button', { name: '删除人物', exact: true })); assert.equal(await page.getByPlaceholder('人物姓名').count(), 0);
  await tap(page.getByRole('button', { name: '大纲', exact: true })); await tap(page.getByRole('button', { name: '编辑', exact: true }));
  await tap(page.getByRole('button', { name: /新增章节/ })); await page.getByPlaceholder('第 1 章标题').fill('待删章节');
  const pending = tap(page.locator('.chapter-actions').getByRole('button', { name: '删除章节', exact: true })); await systemTap(n => /^ok$/i.test(n.text || '')); await pending;
  assert.equal(await page.getByPlaceholder('第 1 章标题').count(), 0);
  await tap(page.getByRole('button', { name: '时间轴', exact: true })); await tap(page.getByRole('button', { name: /新增事件/ }));
  await tap(page.getByRole('button', { name: '删除', exact: true }));
  await page.getByText('时间轴还是空的', { exact: true }).waitFor();
  await tap(page.locator('.global-main-nav').getByRole('button', { name: '创作', exact: true }));
  await tap(page.getByRole('button', { name: '新稿件', exact: true }));
  const selected = '手机选段导出：中文与换行\n第二行原文';
  await page.getByPlaceholder('这一刻，想写点什么……').fill(selected);
  await page.getByPlaceholder('这一刻，想写点什么……').press('Control+A');
  await tap(page.getByRole('button', { name: '导出选段', exact: true }));
  const selectionFile = await saveSystemFile(); await page.getByText('选段已导出', { exact: true }).waitFor();
  assert.equal(execFileSync(adb, ['-s', serial, 'exec-out', `cat '${selectionFile.path}'`], { windowsHide: true }).toString(), selected);
  console.log(JSON.stringify({ realAndroid: true, largeFontHitArea: true, nativeConfirmCancelAndAccept: true, deletionDoesNotEdit: true,
    reloadDeletionPersists: true, trashRestore: true, enterProject: true, actualSystemSavedProjectFormats: exports,
    cancelExportKeepsData: true, characterDelete: true, chapterDelete: true, timelineDelete: true, selectedTxtExact: true }));
} finally { await d.close(); }
