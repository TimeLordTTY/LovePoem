import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const url = process.argv[2] || 'https://poem.timelordtty.cn/qingxiaolu/';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  for (const width of [280, 320, 390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.route('**/qingxiaolu-api/**', r => r.abort()); const page = await context.newPage();
    await page.goto(url); await page.getByRole('button', { name: '先在本机使用', exact: true }).click();
    const title = '删除点击验收'; await page.getByPlaceholder('新项目名称').fill(title); await page.getByRole('button', { name: '新建', exact: true }).click();
    const card = page.locator('.project-card').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
    await page.evaluate(() => { document.body.style.fontSize = '24px'; });
    const hits = await card.getByRole('button', { name: '本地删除', exact: true }).evaluate(button => {
      const rect = button.getBoundingClientRect();
      return [.2, .5, .8].map(ratio => { const x = rect.left + rect.width * ratio, y = rect.top + rect.height / 2;
        const target = document.elementFromPoint(x, y); return { x, y, hitsButton: target === button || button.contains(target), target: target?.className }; });
    });
    if (process.argv.includes('--observe')) {
      const middle = hits[1]; page.once('dialog', dialog => dialog.dismiss()); await page.mouse.click(middle.x, middle.y);
      console.log(JSON.stringify({ width, hits, enteredEditor: await page.locator('.project-workspace').count() > 0 }));
    } else {
      assert.ok(hits.every(hit => hit.hitsButton), '可见按钮整个点击区不能被装饰层挡住');
      page.once('dialog', dialog => dialog.dismiss()); await card.getByRole('button', { name: '本地删除', exact: true }).click();
      assert.equal(await page.locator('.project-workspace').count(), 0); assert.equal(await card.count(), 1);
      page.once('dialog', dialog => dialog.accept()); await card.getByRole('button', { name: '本地删除', exact: true }).click();
      await card.waitFor({ state: 'detached' }); assert.equal(await page.locator('.project-workspace').count(), 0);
      await page.reload(); assert.equal(await page.locator('.project-card').count(), 0);
      await page.getByRole('button', { name: '设置', exact: true }).click(); await page.getByRole('button', { name: /本地回收站/ }).click();
      await page.getByRole('heading', { name: title, exact: true }).waitFor();
      await page.getByRole('button', { name: /恢复/ }).click(); await page.getByRole('button', { name: '项目', exact: true }).click();
      const restored = page.locator('.project-card').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
      await restored.getByRole('button', { name: '进入项目', exact: true }).click(); await page.getByRole('textbox', { name: '项目名称', exact: true }).waitFor();
      console.log(JSON.stringify({ width, hitAreaClear: true, cancelKeepsProject: true, deleteDoesNotEdit: true, reloadDeleted: true, trashRestore: true, enterStillWorks: true }));
    }
    await context.close();
  }
} finally { await browser.close(); }
