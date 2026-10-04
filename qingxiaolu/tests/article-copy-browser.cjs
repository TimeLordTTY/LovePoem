// Playwright CLI：独立验收浏览器中的全文复制、权限失败与重试。
async page => {
  await page.route('**/qingxiaolu-api/**', route => route.abort());
  if (await page.getByRole('button', { name: '先在本机使用', exact: true }).isVisible())
    await page.getByRole('button', { name: '先在本机使用', exact: true }).click();
  const title = `复制完整正文验收-${Date.now()}`;
  const body = Array.from({ length: 200 }, (_, index) => `${index + 1}. 中文、标点与 emoji 📝，保留换行。`).join('\n');
  await page.getByRole('button', { name: '创作', exact: true }).click();
  await page.getByPlaceholder('稿件标题（可选）').fill(title);
  await page.getByPlaceholder('这一刻，想写点什么……').fill(body);
  await page.getByRole('button', { name: '记录', exact: true }).click();
  const card = page.locator('article[data-blog-month]').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
  const copy = card.getByRole('button', { name: '复制正文', exact: true });
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined }));
  await copy.click();
  await page.getByText('复制未成功，请打开稿件后手动选中正文复制。原稿仍保留。', { exact: true }).waitFor();
  await page.evaluate(() => {
    window.qxCopied = null;
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.qxCopied = text; } } });
  });
  await copy.click();
  await page.getByText('已复制完整正文，图片和原稿保持不变。', { exact: true }).waitFor();
  if (await page.evaluate(() => window.qxCopied) !== body) throw new Error('复制正文被截断或改变换行');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new DOMException('test-only', 'NotAllowedError'); } } }));
  await copy.click();
  await page.getByText('复制未成功，请打开稿件后手动选中正文复制。原稿仍保留。', { exact: true }).waitFor();
  await card.getByRole('button', { name: '继续编辑', exact: true }).click();
  if (await page.getByPlaceholder('这一刻，想写点什么……').inputValue() !== body) throw new Error('复制操作修改了原稿');
  await page.getByRole('button', { name: '新稿件', exact: true }).click();
  const emptyTitle = `${title}-无正文`;
  await page.getByPlaceholder('稿件标题（可选）').fill(emptyTitle);
  await page.getByRole('button', { name: '记录', exact: true }).click();
  const empty = page.locator('article[data-blog-month]').filter({ has: page.getByRole('heading', { name: emptyTitle, exact: true }) });
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.qxCopied = text; } } }));
  await empty.getByRole('button', { name: '复制正文', exact: true }).click();
  await page.getByText('这篇稿件没有可复制的正文；原稿和剪贴板保持不变。', { exact: true }).waitFor();
  if (await page.evaluate(() => window.qxCopied) !== body) throw new Error('无正文稿件清空了剪贴板');
  return { wholeText: true, unicodeAndNewlines: true, unavailableHandled: true, deniedHandled: true, retry: true, originalPreserved: true, emptyBodyKeepsClipboard: true, simulatedBrowserClipboard: true };
}
