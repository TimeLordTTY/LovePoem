// 使用独立时区环境和合成 CSV，不修改作者数据或云端作品。
async page => {
  const results = [];
  for (const timezoneId of ['America/Los_Angeles', 'Asia/Hong_Kong']) {
    const context = await page.context().browser().newContext({ timezoneId });
    const target = await context.newPage();
    try {
      await context.route('**/qingxiaolu-api/**', route => route.abort());
      await target.goto(page.url());
      await target.getByRole('button', { name: '先在本机使用', exact: true }).click();
      await target.getByRole('button', { name: /导入本地文档/ }).click();
      await target.locator('input[type=file]').setInputFiles({ name: 'dates.csv', mimeType: 'text/csv',
        buffer: Buffer.from('标题,正文,日期\n月初日记,日历日期,2026-10-01\n原始时间,带时区时间,2026-10-01T00:00:00Z\n待核对日记,无效日期,2026-02-30') });
      await target.getByRole('heading', { name: '临时预览', exact: true }).waitFor();
      await target.getByRole('note').getByText('发布时间无法识别，保留了原始日期，请在导入前核对。', { exact: true }).waitFor();
      await target.getByRole('button', { name: '正式导入已选内容（3）', exact: true }).click();
      await target.getByText('已正式导入 3 条内容', { exact: true }).waitFor();
      await target.getByRole('button', { name: '稿件库', exact: true }).click();
      const day = target.getByRole('heading', { name: '月初日记', exact: true }).locator('..');
      await day.getByText('2026年10月1日 · 待修改', { exact: true }).waitFor();
      if (await day.getAttribute('data-blog-month') !== '2026-10') throw new Error('日历日期归档月偏移');
      const instant = target.getByRole('heading', { name: '原始时间', exact: true }).locator('..');
      if (await instant.getAttribute('data-blog-month') !== (timezoneId === 'America/Los_Angeles' ? '2026-09' : '2026-10')) throw new Error('真实时刻未按时区归档');
      const invalid = target.getByRole('heading', { name: '待核对日记', exact: true }).locator('..');
      await invalid.getByText('原日期：2026-02-30（待核对） · 待修改', { exact: true }).waitFor();
      if (await invalid.getAttribute('data-blog-month') !== 'date-review') throw new Error('无效日期被静默归档为有效日期');
      results.push({ timezoneId, calendarDay: true, actualTimestamp: true, invalidDatePreserved: true });
    } finally { await context.close(); }
  }
  return results;
}
