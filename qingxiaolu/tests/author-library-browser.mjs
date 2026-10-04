// 独立合成资料验证稿件搜索、日期导航、批量选择和长正文；阻止云端访问。
import {chromium} from 'playwright-core';
import {strict as assert} from 'node:assert';
const url=process.argv[2]||'http://127.0.0.1:3004/qingxiaolu/';
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const context=await browser.newContext(),page=await context.newPage();
 await context.route('**/qingxiaolu-api/**',route=>route.abort());
 await page.goto(url);await page.getByRole('button',{name:'先在本机使用',exact:true}).click();
 await page.getByRole('button',{name:/导入本地文档/}).click();
 await page.locator('input[type=file]').setInputFiles({name:'作者查稿.csv',mimeType:'text/csv',buffer:Buffer.from('标题,正文,日期\n九月旧稿,另一个月的故事,2026-09-15\n十月目标稿,检索标记📝,2026-10-01\n十月另一稿,不应被目标搜索选中,2026-10-02')});
 await page.getByRole('button',{name:'正式导入已选内容（3）',exact:true}).click();await page.getByText('已正式导入 3 条内容',{exact:true}).waitFor();
 await page.getByRole('button',{name:'记录',exact:true}).click();
 assert.equal(await page.locator('article[data-blog-month]').count(),3);
 await page.getByLabel('搜索历史内容').fill('检索标记📝');
 assert.equal(await page.locator('article[data-blog-month]').count(),1);
 const buttons=page.locator('.blog-date-archive button');
 const observed={visibleCards:await page.locator('article[data-blog-month]').count(),dateButtons:await buttons.allTextContents()};
 if(process.argv.includes('--observe')){console.log(JSON.stringify(observed));}
 else {
  assert.equal(await buttons.count(),1,'日期导航应仅包含筛选后的月份');assert.equal(await buttons.locator('small').innerText(),'1');
  await page.getByRole('button',{name:'批量同步',exact:true}).click();await page.getByRole('button',{name:'全选当前结果',exact:true}).click();
  assert.equal(await page.locator('article[data-blog-month] input:checked').count(),1);await page.getByText('已选择 1 篇',{exact:true}).waitFor();await page.locator('.batch-sync-bar').getByRole('button',{name:'取消',exact:true}).click();
  await page.getByLabel('搜索历史内容').fill('不存在的内容');await page.getByText('没有符合条件的内容。',{exact:true}).waitFor();assert.equal(await buttons.count(),0);
  await page.getByRole('button',{name:'清除',exact:true}).click();assert.equal(await page.locator('article[data-blog-month]').count(),3);assert.equal(await buttons.count(),2);
  const body=Array.from({length:2000},(_,i)=>`第${i+1}段：作者长稿，中文、标点和📝。`).join('\n');
  await page.getByRole('button',{name:'创作',exact:true}).click();await page.getByPlaceholder('稿件标题（可选）').fill('长正文验收');await page.getByPlaceholder('这一刻，想写点什么……').fill(body);await page.getByRole('button',{name:'保存',exact:true}).click();await page.getByText('已保存到本机，可以继续写作',{exact:true}).waitFor();
  await page.reload();assert.equal(await page.getByPlaceholder('这一刻，想写点什么……').inputValue(),body);
  await page.getByRole('button',{name:'记录',exact:true}).click();await page.getByLabel('搜索历史内容').fill('第2000段');const card=page.locator('article[data-blog-month]');assert.equal(await card.count(),1);
  if(process.argv.includes('--observe-snippet'))console.log(JSON.stringify({matchingCardFound:true,excerptShowsMatch:(await card.locator('summary').textContent()).includes('第2000段')}));
  else {assert.ok((await card.locator('summary').textContent()).includes('第2000段'));assert.equal(await card.locator('summary mark').textContent(),'第2000段');}
  await card.locator('summary').click();assert.equal(await card.locator('.manuscript-excerpt p').textContent(),body);
  if(!process.argv.includes('--observe-snippet')) {
    await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
    await page.getByLabel('搜索历史内容').fill('长正文验收');assert.equal(await card.locator('summary mark').count(),0);assert.ok((await card.locator('summary').textContent()).startsWith('第1段'));
    await page.getByLabel('搜索历史内容').fill('第2000段');assert.equal(await card.locator('summary mark').textContent(),'第2000段');
    if(process.env.QX_SEARCH_SCREENSHOT){if(await card.locator('details').getAttribute('open')!==null)await card.locator('summary').click();await card.screenshot({path:process.env.QX_SEARCH_SCREENSHOT});}
  }
  await card.getByRole('button',{name:'继续编辑',exact:true}).click();assert.equal(await page.getByPlaceholder('这一刻，想写点什么……').inputValue(),body);
  console.log(JSON.stringify({filteredDatesAndCounts:true,noDeadDateNavigation:true,clearRestoresAll:true,batchOnlyCurrentResult:true,longTextReload:true,searchEndOfLongText:true,searchContextAndHighlight:!process.argv.includes('--observe-snippet'),titleSearchKeepsDefaultExcerpt:!process.argv.includes('--observe-snippet'),narrowViewport:!process.argv.includes('--observe-snippet'),expandedFullText:true,editPreservesText:true}));
 }
}finally{await browser.close();}
