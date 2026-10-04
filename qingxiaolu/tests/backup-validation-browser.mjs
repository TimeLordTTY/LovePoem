// 独立合成作者资料：坏备份不得改变当前稿件，纠正文件后仍可恢复。
import {chromium} from 'playwright-core';import {strict as assert} from 'node:assert';
const url=process.argv[2]||'http://127.0.0.1:3004/qingxiaolu/';
const browser=await chromium.launch({channel:'msedge',headless:true});
const disk=async page=>page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('qingxiaolu-writing',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const d=r.result,q=d.transaction('values').objectStore('values').getAll();q.onsuccess=()=>{d.close();resolve(q.result);};};}));
try {
 const context=await browser.newContext(),page=await context.newPage();await context.route('**/qingxiaolu-api/**',r=>r.abort());await page.goto(url);await page.getByRole('button',{name:'先在本机使用',exact:true}).click();await page.getByRole('button',{name:'创作',exact:true}).click();await page.getByPlaceholder('稿件标题（可选）').fill('需要保留的当前稿');await page.getByPlaceholder('这一刻，想写点什么……').fill('当前正文📝\n不能被坏备份改变');await page.getByRole('button',{name:'保存',exact:true}).click();await page.getByText('已保存到本机，可以继续写作',{exact:true}).waitFor();await page.getByRole('button',{name:'设置',exact:true}).click();
 const record=text=>({id:'duplicate-record',revision:1,payload:{id:'duplicate-record',itemType:'article',title:'待恢复稿',content:{text}}});
 const base={format:'qingxiaolu-backup',version:1,createdAt:'2026-10-04T00:00:00Z',items:[],workspaces:{},versions:{},trash:[],editor:null};
 let confirmations=0;page.on('dialog',dialog=>{confirmations++;return dialog.accept();});
 const input=page.locator('input[type=file][accept=".json"]');const upload=async text=>{
  await input.setInputFiles({name:'测试完整备份.json',mimeType:'application/json',buffer:Buffer.from(text)});
  await page.waitForFunction(()=>document.querySelector('input[type=file][accept=".json"]')?.value==='');
 };
 const before=await disk(page);await upload(JSON.stringify({...base,items:[record('第一份正文'),record('不同的第二份正文')]}));
 if(process.argv.includes('--observe')) {await page.getByText(/已恢复 2 条/).waitFor();const values=await disk(page);const drafts=values.map(v=>{try{return JSON.parse(v);}catch{return null;}}).find(v=>Array.isArray(v)&&v.some(item=>item?.id==='duplicate-record'));await upload('null');await page.getByText("Cannot read properties of null (reading 'format')",{exact:true}).waitFor();console.log(JSON.stringify({duplicateStoredCount:drafts.filter(v=>v.id==='duplicate-record').length,rawEnglishNullError:true,confirmationCount:confirmations}));}
 else {
  await page.getByText('备份中存在重复的稿件 ID，尚未写入任何数据。请核对原文件。',{exact:true}).waitFor();assert.deepEqual(await disk(page),before);assert.equal(confirmations,0);
  for(const value of ['null',JSON.stringify({...base,items:[null]}),JSON.stringify({...base,trash:[null]})]){await upload(value);await page.getByText('这不是有效的情晓录完整备份文件，尚未写入任何数据。',{exact:true}).waitFor();assert.deepEqual(await disk(page),before);}
  await upload('{"format":');await page.getByText('完整备份不是有效的 JSON 文件，尚未写入任何数据。请检查文件是否完整。',{exact:true}).waitFor();assert.deepEqual(await disk(page),before);
  await upload(JSON.stringify({...base,items:[record('修正后的完整正文')]}));await page.getByText('已恢复 1 条，保留本机已有 0 条。恢复内容尚未上传云端。',{exact:true}).waitFor();assert.equal(confirmations,1);await page.getByRole('button',{name:'稿件库',exact:true}).click();await page.getByRole('heading',{name:'待恢复稿',exact:true}).waitFor();assert.equal(await page.locator('article[data-blog-month]').count(),2);const card=page.locator('article[data-blog-month]').filter({has:page.getByRole('heading',{name:'需要保留的当前稿',exact:true})});await card.getByRole('button',{name:'继续编辑',exact:true}).click();assert.equal(await page.getByPlaceholder('这一刻，想写点什么……').inputValue(),'当前正文📝\n不能被坏备份改变');
  console.log(JSON.stringify({duplicateRejectedBeforeConfirmation:true,nullAndMalformedRecordsFriendly:true,invalidJsonFriendly:true,invalidFilesLeaveDatabaseExact:true,correctedFileRestores:true,existingManuscriptExact:true}));
 }
}finally{await browser.close();}
