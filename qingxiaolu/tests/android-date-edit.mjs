import { _android } from 'playwright-core';
import assert from 'node:assert/strict';
const d = (await _android.devices()).find(d => d.serial() === 'emulator-5582'); assert.ok(d);
try {
  assert.equal((await d.shell('getprop ro.boot.qemu.avd_name')).toString().trim(), 'qingxiaolu-apk-release-api34');
  await d.shell('am start -n com.qingxiaolu.app/.MainActivity');
  const page = await (await d.webView({ pkg: 'com.qingxiaolu.app' })).page(); page.setDefaultTimeout(12000);
  await page.context().route('**/qingxiaolu-api/**', r => r.abort()); await page.reload();
  const tap = locator => locator.click({ noWaitAfter: true });
  await tap(page.getByRole('button', { name: '创作', exact: true })); await tap(page.getByRole('button', { name: '新稿件', exact: true }));
  const title = '手机日期编辑-' + Date.now(), text = '原始随笔正文📝，修正日期不改原文';
  await page.getByPlaceholder('稿件标题（可选）').fill(title); await page.getByPlaceholder('这一刻，想写点什么……').fill(text);
  const date = page.getByLabel('创作/原发布时间'); await date.fill('2000-02-29');
  await page.evaluate(() => { const button = document.querySelector('.editor-publish'); button.click(); button.click(); });
  await page.getByText('已保存到本机，可以继续写作', { exact: true }).waitFor();
  await page.reload(); assert.equal(await date.inputValue(), '2000-02-29');
  await tap(page.getByRole('button', { name: '记录', exact: true }));
  const card = page.locator('article[data-blog-month]').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
  await card.waitFor(); assert.equal(await card.getAttribute('data-blog-month'), '2000-02');
  assert.equal(await card.count(), 1, '同一次新写作的自动保存/连续手动保存/刷新不能生成重复记录');
  await tap(card.getByRole('button', { name: '继续编辑', exact: true })); await date.fill('2026-02-30');
  await page.getByText(/日期暂无法识别，将保留原值/).waitFor();
  await tap(page.getByRole('button', { name: '保存', exact: true })); await page.getByText('已保存到本机，可以继续写作', { exact: true }).waitFor();
  await tap(page.getByRole('button', { name: '记录', exact: true })); await card.waitFor(); assert.equal(await card.getAttribute('data-blog-month'), 'date-review');
  await tap(card.getByRole('button', { name: '继续编辑', exact: true })); await date.fill('2020-03-04T10:15:00+08:00');
  await tap(page.getByRole('button', { name: '项目', exact: true })); await tap(page.getByRole('button', { name: '记录', exact: true }));
  await card.waitFor(); await tap(card.getByRole('button', { name: '继续编辑', exact: true }));
  assert.equal(await date.inputValue(), '2020-03-04T10:15:00+08:00'); assert.equal(await page.getByPlaceholder('这一刻，想写点什么……').inputValue(), text);
  console.log(JSON.stringify({ nativeDateEdit: true, exactAfterReload: true, leapCalendarGroup: true, invalidDayReviewedNotRolled: true,
    timezoneOriginalStringExact: true, navigationSavesDate: true, originalBodyUnchanged: true, overlappingSaveCreatesOneRecord: true, noCloudUpload: true }));
} finally { await d.close(); }
