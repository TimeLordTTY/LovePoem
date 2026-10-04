// 两份独立合成浏览器数据验收回收站、项目备份和冲突保护；所有 API 均受控模拟。
import {chromium} from 'playwright-core';import {strict as assert} from 'node:assert';import {readFile} from 'node:fs/promises';
const url=process.argv[2]||'http://127.0.0.1:3004/qingxiaolu/';
const browser=await chromium.launch({channel:'msedge',headless:true});
const project={id:'qa-trash-project',revision:1,seq:1,operation:'upsert',payload:{id:'qa-trash-project',itemType:'project',title:'回收站验收项目',content:{description:'合成资料'}}};
const article={id:'qa-trash-article',revision:6,seq:2,operation:'upsert',payload:{id:'qa-trash-article',itemType:'article',title:'待恢复的云端稿',projectId:project.id,content:{text:'第六版原稿📝\n第二段',images:[]}}};
const versions={[article.id]:[{...article.payload,title:'历史第一版',content:{text:'应该随项目备份保留的旧正文',images:[]},versionSavedAt:'2026-10-01T00:00:00Z'}]};
const disk=async(page,key)=>page.evaluate(key=>new Promise((resolve,reject)=>{const r=indexedDB.open('qingxiaolu-writing',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const d=r.result,q=d.transaction('values').objectStore('values').get(key);q.onsuccess=()=>{d.close();resolve(JSON.parse(q.result||'null'));};};}),key);
try{
 const context=await browser.newContext(),page=await context.newPage();let pushed=[];
 await context.addInitScript(versions=>{localStorage.setItem('qx_sync_token','synthetic-session-only');if(!localStorage.getItem('qx_item_versions'))localStorage.setItem('qx_item_versions',JSON.stringify(versions));},versions);
 await context.route('**/qingxiaolu-api/**',async route=>{
  const path=new URL(route.request().url());if(path.pathname.endsWith('/pull'))return route.fulfill({json:{changes:Number(path.searchParams.get('cursor'))?[]:[project,article],nextCursor:2,watermark:2,hasMore:false}});
  if(path.pathname.endsWith('/push')){pushed=route.request().postDataJSON().changes;return route.fulfill({json:{applied:[],conflicts:pushed.map(v=>({id:v.id,server:{id:v.id,revision:7,title:'另一设备第七版',content_json:JSON.stringify({text:'云端后续新正文'}),item_type:'article',project_id:project.id}}))}});}
  return route.abort();
 });
 await page.goto(url);await page.getByRole('heading',{name:project.payload.title,exact:true}).waitFor();await page.getByRole('button',{name:'稿件库',exact:true}).click();
 const card=page.locator('article[data-blog-month]').filter({has:page.getByRole('heading',{name:article.payload.title,exact:true})});page.once('dialog',d=>d.accept());await card.getByRole('button',{name:'删除',exact:true}).click();await page.getByText('稿件已从当前设备删除，服务器内容未改动',{exact:true}).waitFor();
 await page.getByRole('button',{name:'项目',exact:true}).click();await page.getByRole('heading',{name:project.payload.title,exact:true}).click();await page.locator('.project-section-tabs').getByRole('button',{name:'导出',exact:true}).click();const downloadEvent=page.waitForEvent('download').catch(()=>null);await page.getByRole('button',{name:'下载完整项目备份（含图片和版本）',exact:true}).click();const download=await downloadEvent;if(!download)throw Error('备份下载失败：'+await page.locator('.project-workspace').innerText());const backup=JSON.parse(await readFile(await download.path(),'utf8'));
 await page.locator('.global-main-nav').getByRole('button',{name:'设置',exact:true}).click();await page.getByRole('button',{name:/本地回收站/}).click();await page.getByRole('button',{name:'恢复',exact:true}).click();await page.getByRole('button',{name:'‹ 返回',exact:true}).click();await page.getByRole('button',{name:'稿件库',exact:true}).click();await page.getByRole('heading',{name:article.payload.title,exact:true}).waitFor();
 const restored=(await disk(page,'qx_drafts')).find(v=>v.id===article.id);
 if(process.argv.includes('--observe'))console.log(JSON.stringify({restoredBaseRevision:restored.baseRevision,projectBackupContainsDeletedVersions:Boolean(backup.versions[article.id]?.length)}));
 else {
  assert.equal(restored.baseRevision,6);assert.equal(restored.content.text,article.payload.content.text);assert.equal(backup.trash[0].id,article.id);assert.equal(backup.versions[article.id][0].content.text,versions[article.id][0].content.text);
  await page.getByRole('button',{name:'批量同步',exact:true}).click();await card.getByRole('checkbox').check();await page.getByRole('button',{name:'同步已选',exact:true}).click();await page.getByText(/版本冲突/).first().waitFor();assert.equal(pushed[0].baseRevision,6);const conflict=(await disk(page,'qx_sync_conflicts')).find(v=>v.id===article.id);assert.equal(conflict.local.content.text,article.payload.content.text);assert.equal(JSON.parse(conflict.server.content_json).text,'云端后续新正文');
  const empty=await browser.newContext(),target=await empty.newPage();await empty.route('**/qingxiaolu-api/**',r=>r.abort());await target.goto(url);await target.getByRole('button',{name:'先在本机使用',exact:true}).click();await target.getByRole('button',{name:'设置',exact:true}).click();target.once('dialog',d=>d.accept());await target.locator('input[type=file][accept=".json"]').setInputFiles({name:'项目完整备份.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await target.getByText(/已恢复 1 条/).waitFor();await target.getByRole('button',{name:/本地回收站/}).click();await target.getByRole('button',{name:'恢复',exact:true}).click();await target.getByRole('button',{name:'‹ 返回',exact:true}).click();await target.getByRole('button',{name:'稿件库',exact:true}).click();const recovered=target.locator('article[data-blog-month]');await recovered.getByRole('button',{name:'版本',exact:true}).click();await target.getByText('应该随项目备份保留的旧正文',{exact:true}).waitFor();assert.equal((await disk(target,'qx_drafts')).find(v=>v.id===article.id).baseRevision,6);assert.equal((await disk(target,'qx_web_outbox'))?.length||0,0);
  // 已有新版项目没有本机工作区时，旧备份也不能遮住它；旧删除标记不能隐藏已恢复的稿件。
  const existing=await browser.newContext(),keptPage=await existing.newPage();
  const currentProject={...project,payload:{...project.payload,content:{description:'另一设备已经更新的项目资料'}}};
  const currentArticle={...article,payload:{...article.payload,title:'恢复后继续写的稿',content:{text:'当前完整新正文📝',images:[]}}};
  await existing.addInitScript(records=>{localStorage.setItem('qx_local_mode','1');localStorage.setItem('qx_drafts',JSON.stringify(records.map(v=>({...v.payload,baseRevision:v.revision,syncState:'local'}))));},[currentProject,currentArticle]);
  await existing.route('**/qingxiaolu-api/**',r=>r.abort());
  await keptPage.goto(url);await keptPage.getByRole('heading',{name:project.payload.title,exact:true}).waitFor();
  await keptPage.getByRole('button',{name:'设置',exact:true}).click();keptPage.once('dialog',d=>d.accept());await keptPage.locator('input[type=file][accept=".json"]').setInputFiles({name:'旧项目备份.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await keptPage.getByText(/已恢复 0 条，保留本机已有 1 条/).waitFor();
  await keptPage.getByRole('button',{name:'稿件库',exact:true}).click();
  const visible=await keptPage.getByRole('heading',{name:currentArticle.payload.title,exact:true}).count();
  await keptPage.getByRole('button',{name:'项目',exact:true}).click();await keptPage.getByRole('heading',{name:project.payload.title,exact:true}).click();const description=await keptPage.getByLabel('项目简介',{exact:true}).inputValue();
  if(process.argv.includes('--observe-preserve'))console.log(JSON.stringify({currentArticleStillVisible:Boolean(visible),displayedProjectDescription:description}));
  else {assert.equal(visible,1);assert.equal(description,currentProject.payload.content.description);assert.equal((await disk(keptPage,'qx_deleted_ids')).includes(article.id),false);assert.equal((await disk(keptPage,'qx_local_trash')).some(v=>v.id===article.id),false);console.log(JSON.stringify({restoreRetainsKnownCloudRevision:true,restoredBodyExact:true,newCloudConflictRetainsBoth:true,projectBackupIncludesTrashVersions:true,emptyDeviceRestore:true,historyAvailableAfterRestore:true,restoreDoesNotUpload:true,existingArticleNotHidden:true,currentProjectNotShadowed:true,simulatedSync:true}));}
  await existing.unrouteAll({behavior:'wait'});
 }
 await context.unrouteAll({behavior:'wait'});
}finally{await browser.close();}
