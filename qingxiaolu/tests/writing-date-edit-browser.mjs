import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const url = process.argv[2] || 'http://127.0.0.1:3004/qingxiaolu/';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const context = await browser.newContext(), page = await context.newPage(); await context.route('**/qingxiaolu-api/**', r => r.abort());
  await page.goto(url); await page.getByRole('button', { name: '先在本机使用', exact: true }).click();
  await page.getByRole('button', { name: '创作', exact: true }).click();
  await page.getByPlaceholder('稿件标题（可选）').fill('旧随笔日期修正'); const text = '记录真实日期，原正文📝不变';
  await page.getByPlaceholder('这一刻，想写点什么……').fill(text);
  const date = page.getByLabel('创作/原发布时间'); await date.fill('2000-02-29');
  await page.getByRole('button', { name: '保存', exact: true }).click(); await page.getByText('已保存到本机，可以继续写作', { exact: true }).waitFor();
  await page.reload(); assert.equal(await date.inputValue(), '2000-02-29');
  await page.getByRole('button', { name: '记录', exact: true }).click();
  await page.locator('.blog-date-archive').getByText('2000年2月', { exact: true }).waitFor();
  await page.getByRole('button', { name: '继续编辑', exact: true }).click(); await date.fill('2020-03-04T10:15:00+08:00');
  await page.getByPlaceholder('这一刻，想写点什么……').press('Control+s'); await page.getByText('已保存到本机，可以继续写作', { exact: true }).waitFor();
  await page.reload(); assert.equal(await date.inputValue(), '2020-03-04T10:15:00+08:00');
  await date.fill('2026-02-30'); await page.getByText(/日期暂无法识别，将保留原值/).waitFor();
  await page.getByRole('button', { name: '保存', exact: true }).click(); await page.getByText('已保存到本机，可以继续写作', { exact: true }).waitFor();
  await page.getByRole('button', { name: '记录', exact: true }).click(); await page.getByText('日期待核对', { exact: true }).waitFor();
  await page.getByRole('button', { name: '继续编辑', exact: true }).click(); assert.equal(await date.inputValue(), '2026-02-30');
  await date.fill('1999年12月31日'); await page.getByRole('button', { name: '项目', exact: true }).click();
  await page.getByRole('button', { name: '记录', exact: true }).click(); await page.locator('.blog-date-archive').getByText('1999年12月', { exact: true }).waitFor();
  await page.getByRole('button', { name: '继续编辑', exact: true }).click(); assert.equal(await page.getByPlaceholder('这一刻，想写点什么……').inputValue(), text);
  assert.equal(await date.inputValue(), '1999年12月31日');
  console.log(JSON.stringify({ calendarAndLeapDay: true, originalTimezoneStringExact: true, keyboardSaveRetainsDate: true,
    invalidCalendarNotRolled: true, reviewGroup: true, autosaveOnNavigation: true, chineseCalendarFormat: true, originalBodyExact: true, noCloudUpload: true }));
} finally { await browser.close(); }
