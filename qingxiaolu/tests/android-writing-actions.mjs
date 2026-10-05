import { _android } from 'playwright-core';
import assert from 'node:assert/strict';
const device = (await _android.devices()).find(d => d.serial() === 'emulator-5582'); assert.ok(device);
let mode;
try {
  assert.equal((await device.shell('getprop ro.boot.qemu.avd_name')).toString().trim(), 'qingxiaolu-apk-release-api34');
  await device.shell('am start -n com.qingxiaolu.app/.MainActivity');
  const page = await (await device.webView({ pkg: 'com.qingxiaolu.app' })).page(); page.setDefaultTimeout(12000);
  await page.context().route('**/qingxiaolu-api/**', r => r.abort()); await page.reload();
  const tap = locator => locator.click({ noWaitAfter: true });
  await tap(page.getByRole('button', { name: '创作', exact: true })); await tap(page.getByRole('button', { name: '新稿件', exact: true }));
  const text = '  首行📝目标\n第二行📝目标  ', field = page.getByPlaceholder('这一刻，想写点什么……');
  await field.fill(text); await field.press('Control+A'); await tap(page.getByRole('button', { name: '复制选段', exact: true }));
  await page.getByText('选段已复制', { exact: true }).waitFor();
  const paste = async () => {
    await page.evaluate(() => { const e = document.createElement('textarea'); e.id = 'qx-paste-proof'; e.style.cssText = 'position:fixed;top:120px;left:20px;z-index:99999'; document.body.append(e); e.focus(); });
    await device.shell('input keyevent 279'); await page.waitForFunction(() => document.querySelector('#qx-paste-proof').value.length > 0);
    const value = await page.locator('#qx-paste-proof').inputValue();
    await page.evaluate(() => document.querySelector('#qx-paste-proof').remove()); return value;
  };
  assert.equal(await paste(), text, '真实系统粘贴必须保留空格、中文和换行');
  const settings = (await device.shell('cmd appops get com.qingxiaolu.app WRITE_CLIPBOARD')).toString();
  mode = settings.match(/WRITE_CLIPBOARD:\s*(\w+)/)?.[1] || settings.match(/Default mode:\s*(\w+)/)?.[1] || 'default';
  assert.ok(['default', 'allow'].includes(mode));
  await device.shell('cmd appops set com.qingxiaolu.app WRITE_CLIPBOARD deny');
  await tap(page.getByRole('button', { name: '复制选段', exact: true })); await page.getByText(/选段未能复制/).waitFor();
  await device.shell(`cmd appops set com.qingxiaolu.app WRITE_CLIPBOARD ${mode}`);
  await tap(page.getByRole('button', { name: '复制选段', exact: true })); await page.getByText('选段已复制', { exact: true }).waitFor();
  await field.evaluate(e => e.setSelectionRange(0, 0)); await page.getByLabel('正文查找').fill('📝目标');
  await tap(page.getByRole('button', { name: '下一处', exact: true })); await page.getByText('第 1 / 2 处', { exact: true }).waitFor();
  await tap(page.getByRole('button', { name: '排版预览', exact: true })); await tap(page.getByRole('button', { name: '下一处', exact: true }));
  await page.getByText('已返回编辑。第 2 / 2 处', { exact: true }).waitFor();
  assert.equal(await field.inputValue(), text); await page.getByLabel('正文查找').fill('没有的字');
  await tap(page.getByRole('button', { name: '下一处', exact: true })); await page.getByText('正文中未找到这段文字', { exact: true }).waitFor();
  await tap(page.getByRole('button', { name: '项目', exact: true }));
  const projectName = '资料选段复制-' + Date.now(); await page.getByPlaceholder('新项目名称').fill(projectName);
  await tap(page.getByRole('button', { name: '新建', exact: true })); await tap(page.getByRole('heading', { name: projectName, exact: true }));
  await tap(page.getByRole('button', { name: '情节', exact: true })); await tap(page.getByRole('button', { name: '编辑', exact: true }));
  const material = '  资料选段保留空格📝\n第二行  ';
  await page.getByPlaceholder('记录主线、支线、冲突、伏笔及回收方式……').fill(material);
  await tap(page.getByRole('button', { name: '完成编辑', exact: true }));
  await page.locator('.book-reader-page p').evaluate(node => { const range = document.createRange(); range.selectNodeContents(node);
    const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range); document.dispatchEvent(new Event('selectionchange')); });
  await tap(page.locator('.selection-action-menu').getByRole('button', { name: '复制', exact: true }));
  await page.getByText('已复制选中文字', { exact: true }).waitFor();
  assert.equal(await paste(), material);
  console.log(JSON.stringify({ realAndroidClipboard: true, exactSpacesUnicodeNewline: true, deniedClipboardNoFalseSuccess: true,
    permissionRestoredRetry: true, nativeFindAndPreview: true, noMatchFeedback: true, originalTextUnchanged: true, projectSelectionWhitespaceExact: true }));
} finally { if (mode) await device.shell(`cmd appops set com.qingxiaolu.app WRITE_CLIPBOARD ${mode}`); await device.close(); }
