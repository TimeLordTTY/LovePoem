import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const url = process.argv[2] || 'http://127.0.0.1:3004/qingxiaolu/';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } }), page = await context.newPage();
  await context.route('**/qingxiaolu-api/**', r => r.abort()); await page.goto(url);
  await page.getByRole('button', { name: '先在本机使用', exact: true }).click(); await page.getByRole('button', { name: '创作', exact: true }).click();
  const text = '开头📝目标\n第二段\n再一次📝目标\n末尾';
  const body = page.getByPlaceholder('这一刻，想写点什么……'); await body.fill(text);
  await body.evaluate(element => element.setSelectionRange(0, 0));
  const search = page.getByLabel('正文查找'), next = page.getByRole('button', { name: '下一处', exact: true });
  assert.equal(await next.isDisabled(), true); await search.fill('📝目标');
  const selected = () => body.evaluate(e => [e.selectionStart, e.selectionEnd, e.value.slice(e.selectionStart, e.selectionEnd)]);
  await next.click(); await page.getByText('第 1 / 2 处', { exact: true }).waitFor();
  assert.deepEqual(await selected(), [text.indexOf('📝目标'), text.indexOf('📝目标') + 4, '📝目标']);
  await next.click(); await page.getByText('第 2 / 2 处', { exact: true }).waitFor();
  assert.equal((await selected())[0], text.lastIndexOf('📝目标'));
  await next.click(); await page.getByText('已循环到开头。第 1 / 2 处', { exact: true }).waitFor();
  await page.getByRole('button', { name: '排版预览', exact: true }).click(); await next.click();
  await page.getByText('已返回编辑。第 2 / 2 处', { exact: true }).waitFor(); assert.equal((await selected())[0], text.lastIndexOf('📝目标'));
  await search.fill('没有的词'); await next.click(); await page.getByText('正文中未找到这段文字', { exact: true }).waitFor();
  assert.equal(await body.inputValue(), text);
  await page.getByRole('button', { name: '保存', exact: true }).click(); await page.getByText('已保存到本机，可以继续写作', { exact: true }).waitFor();
  await page.reload(); assert.equal(await page.getByPlaceholder('这一刻，想写点什么……').inputValue(), text);
  console.log(JSON.stringify({ emptyQueryDisabled: true, unicodeOffsetsExact: true, firstNextAndWrap: true, previewFindReturnsToEditor: true, noMatchFeedback: true, originalTextExactAfterReload: true }));
} finally { await browser.close(); }
