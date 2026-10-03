// 使用独立 Playwright CLI 页面验收，所有图片和稿件均为合成数据。
async page => {
  await page.context().route('**/qingxiaolu-api/**', route => route.abort());
  await page.getByRole('button', { name: '先在本机使用', exact: true }).click();
  const originals = await page.evaluate(() => Array.from({ length: 10 }, (_, i) => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 16;
    const context = canvas.getContext('2d'); context.fillStyle = `rgb(${i * 23},120,${255 - i * 23})`;
    context.fillRect(0, 0, 16, 16); return canvas.toDataURL('image/png');
  }));
  await page.getByRole('button', { name: /导入本地文档/ }).click();
  await page.locator('input[type=file]').setInputFiles({ name: 'image-regression.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify([{ title: '多图继续编辑验收', text: '保留原有全部插图', images: originals }])) });
  await page.getByRole('heading', { name: '临时预览', exact: true }).waitFor();
  await page.getByRole('button', { name: '正式导入已选内容（1）', exact: true }).click();
  await page.getByText('已正式导入 1 条内容', { exact: true }).waitFor();
  await page.getByRole('button', { name: '稿件库', exact: true }).click();
  await page.getByText('共 10 张插图，继续编辑可查看全部', { exact: true }).waitFor();
  await page.getByRole('button', { name: '继续编辑', exact: true }).click();
  await page.getByText(/已自动保存/).waitFor();
  const picker = page.locator('input[type=file][accept="image/*"]');
  const upload = i => ({ name: `new-${i}.png`, mimeType: 'image/png', buffer: Buffer.from(originals[i].split(',')[1], 'base64') });
  await picker.setInputFiles(upload(0));
  await page.getByText('已达到新增图片上限，原有 10 张图片均保留。', { exact: true }).waitFor();
  if (await picker.inputValue() !== '') throw new Error('选图后未清空输入，无法再次选择同一文件');
  await page.reload(); await page.getByPlaceholder('这一刻，想写点什么……').waitFor();
  const readImages = () => page.locator('.qzone-images img').evaluateAll(images => images.map(image => image.src));
  if (JSON.stringify(await readImages()) !== JSON.stringify(originals)) throw new Error('原有超过九张的图片被截断或替换');
  for (let i = 0; i < 3; i++) await page.locator('.qzone-images figure').last().getByRole('button', { name: '×', exact: true }).click();
  await picker.setInputFiles([upload(0), upload(1), upload(2)]);
  await page.getByText('最多加入 9 张图片，每张不超过 4 MB；超出限制的图片没有加入。', { exact: true }).waitFor();
  await page.getByText(/已自动保存/).waitFor();
  const expected = [...originals.slice(0, 7), originals[0], originals[1]];
  if (JSON.stringify(await readImages()) !== JSON.stringify(expected)) throw new Error('新增图片未按剩余名额处理，或损坏原有图片');
  await page.reload(); await page.getByPlaceholder('这一刻，想写点什么……').waitFor();
  if (JSON.stringify(await readImages()) !== JSON.stringify(expected)) throw new Error('普通九张限制的保存或刷新错误');
  return { importedTenRetained: true, sourceOrderUnchanged: true, sameFileCanBeSelectedAgain: true,
    existingNineLimitPreserved: true, onlyNewOverflowRejected: true, reload: true };
}
