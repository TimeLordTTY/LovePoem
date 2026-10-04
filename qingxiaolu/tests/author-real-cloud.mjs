import {chromium} from 'playwright-core';
if(!process.argv.includes('--live-author-acceptance') || !process.env.QX_LIVE_SSH_KEY) { console.error('真实云端验收需显式 --live-author-acceptance 与 QX_LIVE_SSH_KEY，仅生成并清理临时作品。'); process.exit(2); }
let secret='', phase='会话准备';
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext();const page=await context.newPage();await page.goto('https://poem.timelordtty.cn/qingxiaolu/');
const run=async page => {
 const {execFileSync}=await import('node:child_process'); const {randomUUID,createHash}=await import('node:crypto');
 let token;
 try {token=execFileSync('ssh',['-i',process.env.QX_LIVE_SSH_KEY,'-o','BatchMode=yes','root@124.220.229.91','/usr/local/bin/qingxiaolu-node --env-file=/etc/qingxiaolu-sync/qingxiaolu-sync.env -e "process.stdout.write(process.env.SYNC_TOKEN || \'\')"'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();}
 catch {throw new Error('无法取得验收会话，未执行云端写入');}
 if(!token)throw new Error('验收会话不可用'); secret=token;
 const base='https://poem.timelordtty.cn/qingxiaolu-api', allowed=new Set(),title='【验收临时】云端项目-'+randomUUID(),headers={authorization:'Bearer '+token};
 const snapshot=async()=>{let cursor=0,watermark=0;const records=new Map();for(let n=0;n<100;n++){const r=await page.request.get(base+`/v1/sync/pull?cursor=${cursor}&limit=500&snapshot=1${watermark?'&watermark='+watermark:''}`,{headers});if(!r.ok())throw new Error('真实云端读取失败 '+r.status());const data=await r.json();watermark=data.watermark;for(const item of data.changes)records.set(item.id,item);if(!data.hasMore)return records;if(data.nextCursor<=cursor)throw new Error('真实游标没有前进');cursor=data.nextCursor;}throw new Error('真实快照超过验收分页限制');};
 const before=await snapshot(), originalHash=records=>createHash('sha256').update(JSON.stringify([...records.values()].filter(item=>!allowed.has(item.id)).sort((a,b)=>a.id.localeCompare(b.id)))).digest('hex');
 const beforeHash=originalHash(before);let otherContext;
 const install=async context=>{
  await context.addInitScript(token=>{localStorage.setItem('qx_sync_token',token);},token);
  await context.route('**/qingxiaolu-api/**',async route=>{
   try { const url=route.request().url();
   if(url.includes('/push')){const data=route.request().postDataJSON();if(data.changes.some(item=>!allowed.has(item.id))){await route.abort();throw new Error('拒绝发送非验收作品');}return route.continue();}
   if(url.includes('/pull')){const response=await route.fetch();if(!response.ok())return route.fulfill({response});const data=await response.json();return route.fulfill({response,json:{...data,changes:data.changes.filter(item=>allowed.has(item.id))}});}
   return route.continue(); } catch { /* 关闭或离线切换时可能有未完成拉取；不打印包含凭据的请求诊断。主流程检查数据结果。 */ }
  });
 };
 const read=async(p,key)=>p.evaluate(key=>new Promise((resolve,reject)=>{const r=indexedDB.open('qingxiaolu-writing',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const d=r.result,q=d.transaction('values').objectStore('values').get(key);q.onsuccess=()=>{d.close();resolve(JSON.parse(q.result||'null'));};};}),key);
 try {
  await install(page.context());await page.reload();
  phase='设备甲新建';await page.getByPlaceholder('新项目名称').fill(title);await page.getByRole('button',{name:'新建',exact:true}).click();
  phase=phase==='设备甲新建'?'设备甲打开本机新项目':'设备甲再次打开云端项目';await page.getByRole('heading',{name:title,exact:true}).click();
  const first=(await read(page,'qx_drafts')).find(item=>item.title===title);if(!first)throw new Error('未找到独立验收项目');allowed.add(first.id);
  await page.getByLabel('项目简介',{exact:true}).fill('真实云端第一版：中文、换行与📝。');
  await page.getByRole('checkbox',{name:'同步本项目资料到服务器',exact:true}).check();
  await page.locator('.project-workspace > header').getByRole('button',{name:'保存',exact:true}).click();
  await page.locator('.global-main-nav').getByRole('button',{name:'项目',exact:true}).click();
  await page.getByRole('button',{name:'同步',exact:true}).click();
  await page.waitForFunction(()=>new Promise(resolve=>{const r=indexedDB.open('qingxiaolu-writing',1);r.onsuccess=()=>{const d=r.result,q=d.transaction('values').objectStore('values').get('qx_server_cache');q.onsuccess=()=>{d.close();resolve(JSON.parse(q.result||'[]').some(item=>item.revision===1));};};}));
  otherContext=await page.context().browser().newContext();await install(otherContext);const other=await otherContext.newPage();await other.goto(page.url());
  phase='设备乙读取第一版';await other.getByRole('heading',{name:title,exact:true}).click();
  if(await other.getByLabel('项目简介',{exact:true}).inputValue()!=='真实云端第一版：中文、换行与📝。')throw new Error('独立设备未读取真实项目');
  phase=phase==='设备甲新建'?'设备甲打开本机新项目':'设备甲再次打开云端项目';await page.getByRole('heading',{name:title,exact:true}).click();
  await page.getByLabel('项目简介',{exact:true}).fill('设备甲的第二版项目资料');
  await page.getByRole('checkbox',{name:'同步本项目资料到服务器',exact:true}).check();
  await page.locator('.project-workspace > header').getByRole('button',{name:'保存',exact:true}).click();
  await page.locator('.global-main-nav').getByRole('button',{name:'项目',exact:true}).click();await page.getByRole('button',{name:'同步',exact:true}).click();
  await page.waitForFunction(()=>new Promise(resolve=>{const r=indexedDB.open('qingxiaolu-writing',1);r.onsuccess=()=>{const d=r.result,q=d.transaction('values').objectStore('values').get('qx_server_cache');q.onsuccess=()=>{d.close();resolve(JSON.parse(q.result||'[]').some(item=>item.revision===2));};};}));
  await other.getByLabel('项目简介',{exact:true}).fill('设备乙仍基于第一版的修改');
  await other.getByRole('checkbox',{name:'同步本项目资料到服务器',exact:true}).check();
  await other.locator('.project-workspace > header').getByRole('button',{name:'保存',exact:true}).click();
  await other.locator('.global-main-nav').getByRole('button',{name:'项目',exact:true}).click();await other.getByRole('button',{name:'同步',exact:true}).click();
  await other.getByText(/版本冲突/).first().waitFor();
  const conflicts=await read(other,'qx_sync_conflicts'), own=conflicts.find(item=>item.id===first.id);
  if(!own||own.local.content.description!=='设备乙仍基于第一版的修改'||JSON.parse(own.server.content_json).description!=='设备甲的第二版项目资料')throw new Error('真实冲突没有保留双方资料');
  const stored=(await snapshot()).get(first.id);if(stored?.payload.content.description!=='设备甲的第二版项目资料')throw new Error('旧设备覆盖了真实云端新资料');
  phase='设备乙选择云端项目版';
  await other.getByRole('button',{name:'稿件库',exact:true}).click();
  other.once('dialog',dialog=>dialog.accept());
  await other.locator('.conflict-list article').getByRole('button',{name:'使用云端版',exact:true}).click();
  await other.getByText('已处理冲突，保留的稿件可在稿件库查看',{exact:true}).waitFor();
  await other.getByRole('button',{name:'项目',exact:true}).click();await other.getByRole('heading',{name:title,exact:true}).click();
  if(await other.getByLabel('项目简介',{exact:true}).inputValue()!=='设备甲的第二版项目资料')throw new Error('选云端项目版后没有显示正确资料');
  await other.getByRole('button',{name:'项目版本',exact:true}).click();
  if(!await other.locator('.project-version-panel article').filter({hasText:'设备乙仍基于第一版的修改'}).count())throw new Error('选择云端版丢失本机项目版本');
  await other.getByRole('button',{name:'关闭项目版本',exact:true}).click();
  phase='设备甲创建关联稿件';
  await page.getByRole('button',{name:'创作',exact:true}).click();await page.getByRole('button',{name:'新稿件',exact:true}).click();
  const articleTitle=title+'-稿件', text='真实稿件第一段：中文与📝。\n第二段保留换行。';
  await page.getByPlaceholder('稿件标题（可选）').fill(articleTitle);await page.getByPlaceholder('这一刻，想写点什么……').fill(text);
  await page.getByRole('button',{name:'保存',exact:true}).click();await page.getByText('已保存到本机，可以继续写作',{exact:true}).waitFor();
  const article=(await read(page,'qx_drafts')).find(item=>item.title===articleTitle);if(!article)throw new Error('独立验收稿件没有保存');allowed.add(article.id);
  await page.getByRole('button',{name:'稿件库',exact:true}).click();
  await page.getByRole('button',{name:'批量同步',exact:true}).click();
  await page.locator('article[data-blog-month]').filter({has:page.getByRole('heading',{name:articleTitle,exact:true})}).getByRole('checkbox').check();
  await page.getByRole('button',{name:'同步已选',exact:true}).click();await page.getByText('已同步所选 1 篇稿件',{exact:true}).waitFor();
  phase='设备乙读取关联稿件';
  await other.locator('.global-main-nav').getByRole('button',{name:'稿件库',exact:true}).click();await other.getByRole('button',{name:'同步',exact:true}).click();
  const otherCard=other.locator('article[data-blog-month]').filter({has:other.getByRole('heading',{name:articleTitle,exact:true})});
  await otherCard.getByRole('button',{name:'继续编辑',exact:true}).click();
  if(await other.getByPlaceholder('这一刻，想写点什么……').inputValue()!==text)throw new Error('真实稿件读取改变正文');
  phase='设备乙离线刷新';
  await other.waitForFunction(async()=>{if(!navigator.serviceWorker.controller)return false;for(const name of await caches.keys()){if(name.startsWith('qingxiaolu-page-') && await (await caches.open(name)).match(new URL('__offline_ready__',location.href).href))return true;}return false;},{},{timeout:60000});
  await other.context().setOffline(true);await other.reload();await other.getByPlaceholder('这一刻，想写点什么……').waitFor();
  if(await other.getByPlaceholder('这一刻，想写点什么……').inputValue()!==text)throw new Error('离线刷新丢失真实同步稿件');
  await other.context().setOffline(false);
  return {realHttpsApi:true,independentBrowserDatabases:true,firstProjectRead:true,secondRevision:stored.revision,trueConflictRetainsBoth:true,
    projectCloudChoiceCorrect:true,localProjectVersionRetained:true,articleExactText:true,offlineRefresh:true,originalRecordsUnchanged:true,passwordLoginTested:false};
 }finally{
  if(otherContext){await otherContext.unrouteAll({behavior:"wait"});await otherContext.close();}
  const current=await snapshot();
  for(const id of allowed){const item=current.get(id);if(!item||item.operation==='delete')continue;const r=await page.request.post(base+'/v1/sync/push',{headers,data:{deviceId:'author-live-cleanup',changes:[{id,itemType:item.payload.itemType,projectId:item.payload.projectId,title:item.payload.title,content:{text:'验收临时记录已清理'},baseRevision:item.revision,deleted:true}]}});if(!r.ok()||!(await r.json()).applied.some(value=>value.id===id))throw new Error('验收记录清理失败');}
  const after=await snapshot();if(originalHash(after)!==beforeHash)throw new Error('既有云端记录发生变化，需核对来源');
  if([...allowed].some(id=>after.get(id)?.operation!=='delete'))throw new Error('验收记录没有完成清理');
  token='';
 }
};
try {console.log(JSON.stringify(await run(page)));}catch(error){const message=String(error.message);console.error(phase+': '+(secret?message.replaceAll(secret,'[redacted]'):message));process.exitCode=1;}finally{await context.unrouteAll({behavior:"ignoreErrors"});await browser.close();secret='';}