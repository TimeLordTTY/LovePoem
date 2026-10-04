// 独立合成同步服务：异常读取和确认必须保留本机副本与待上传队列。
import {chromium} from 'playwright-core';import {strict as assert} from 'node:assert';
const url=process.argv[2]||'http://127.0.0.1:3004/qingxiaolu/';const browser=await chromium.launch({channel:'msedge',headless:true});
const read=async(page,key)=>page.evaluate(key=>new Promise(resolve=>{const r=indexedDB.open('qingxiaolu-writing',1);r.onsuccess=()=>{const d=r.result,q=d.transaction('values').objectStore('values').get(key);q.onsuccess=()=>{d.close();resolve(JSON.parse(q.result||'null'));};};}),key);
try {
 const context=await browser.newContext(),page=await context.newPage();let mode='valid',loopCalls=0,pushCalls=0,stored;
 const cloud={id:'synthetic-cloud',revision:1,seq:1,operation:'upsert',payload:{id:'synthetic-cloud',itemType:'article',title:'已有云端稿',content:{text:'必须保持的云端副本'}}};
 const cors={'access-control-allow-origin':'*','access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'GET,POST,OPTIONS'};
 await context.addInitScript(()=>localStorage.setItem('qx_sync_token','synthetic-session-only'));
 await context.route('**/qingxiaolu-api/**',async route=>{
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
  const path=new URL(route.request().url()).pathname,json=(data,status=200)=>route.fulfill({status,headers:cors,json:data});
  if(path.endsWith('/pull')){
   if(mode==='html')return route.fulfill({status:200,headers:cors,contentType:'text/html',body:'<html>synthetic error</html>'});
   if(mode==='loop'){if(++loopCalls>=3)return json({error:'fixture guard'},503);return json({changes:[],nextCursor:0,hasMore:true,watermark:1});}
   return json({changes:[cloud,...(stored?[stored]:[])],nextCursor:stored?2:1,hasMore:false,watermark:stored?2:1});
  }
  if(path.endsWith('/push')){pushCalls++;const change=route.request().postDataJSON().changes[0];if(mode==='bad-ack')return json({applied:[{id:change.id}],conflicts:[]});stored={id:change.id,revision:1,seq:2,operation:'upsert',payload:{...change}};return json({applied:[{id:change.id,revision:1}],conflicts:[]});}
  return route.abort();
 });
 await page.goto(url);await page.getByText('已读取情晓录云端数据',{exact:true}).waitFor();const cached=await read(page,'qx_server_cache');
 mode='loop';await page.getByRole('button',{name:'同步',exact:true}).click();
 if(process.argv.includes('--observe')){await page.getByText('读取服务器数据失败。本机稿件仍可查看和编辑。',{exact:true}).waitFor();}
 else {await page.getByText(/翻页信息异常/).waitFor();assert.equal(loopCalls,1);assert.deepEqual(await read(page,'qx_server_cache'),cached);mode='html';await page.getByRole('button',{name:'同步',exact:true}).click();await page.getByText(/创作云端返回了异常响应/).waitFor();assert.deepEqual(await read(page,'qx_server_cache'),cached);}
 mode='valid';await page.getByRole('button',{name:'创作',exact:true}).click();await page.getByPlaceholder('稿件标题（可选）').fill('待上传的原稿');await page.getByPlaceholder('这一刻，想写点什么……').fill('原稿不能被无效确认丢弃📝');await page.getByRole('button',{name:'保存',exact:true}).click();await page.getByText('已保存到本机，可以继续写作',{exact:true}).waitFor();const original=(await read(page,'qx_drafts')).find(v=>v.title==='待上传的原稿');await page.getByRole('button',{name:'稿件库',exact:true}).click();const card=page.locator('article[data-blog-month]').filter({has:page.getByRole('heading',{name:'待上传的原稿',exact:true})});await card.waitFor();await page.getByRole('button',{name:'批量同步',exact:true}).click();await card.getByRole('checkbox').check();mode='bad-ack';await page.getByRole('button',{name:'同步已选',exact:true}).click();
 if(process.argv.includes('--observe')){await page.getByText('已同步所选 1 篇稿件',{exact:true}).waitFor();console.log(JSON.stringify({repeatedCursorRequests:loopCalls,invalidAckReportedSuccess:true,writerRecordDisappeared:!(await read(page,'qx_drafts')).some(v=>v.id===original.id),pendingQueueRemoved:(await read(page,'qx_web_outbox')).length===0}));}
 else {
  await page.getByText(/异常保存确认/).waitFor();assert.equal(pushCalls,1);const pending=(await read(page,'qx_web_outbox')).find(v=>v.id===original.id);assert.equal(pending.content.text,original.content.text);assert.equal((await read(page,'qx_drafts')).find(v=>v.id===original.id).syncState,'pending');assert.deepEqual(await read(page,'qx_server_cache'),cached);await card.getByText('等待同步',{exact:true}).waitFor();
  mode='valid';await page.getByRole('button',{name:'同步已选',exact:true}).click();await page.getByText('已同步所选 1 篇稿件',{exact:true}).waitFor();assert.equal((await read(page,'qx_web_outbox')).length,0);await card.getByText('云端已保存 · 本机可离线查看',{exact:true}).waitFor();await card.getByRole('button',{name:'继续编辑',exact:true}).click();assert.equal(await page.getByPlaceholder('这一刻，想写点什么……').inputValue(),original.content.text);
  console.log(JSON.stringify({badPaginationStopsAfterOneRequest:true,malformedReadKeepsCache:true,invalidAckKeepsQueueAndDraft:true,noFalseSuccess:true,manualRetryCorrect:true,bodyExact:true,simulatedSyncOnly:true}));
 }
 await context.unrouteAll({behavior:'wait'});
}finally{await browser.close();}