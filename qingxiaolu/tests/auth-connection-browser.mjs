// 独立合成账号与稿件，所有认证和同步请求均受控模拟，不访问作者账号。
import {chromium} from 'playwright-core';import {strict as assert} from 'node:assert';
const url=process.argv[2]||'http://127.0.0.1:3004/qingxiaolu/';
const browser=await chromium.launch({channel:'msedge',headless:true});
const disk=async page=>page.evaluate(()=>new Promise(resolve=>{const r=indexedDB.open('qingxiaolu-writing',1);r.onsuccess=()=>{const d=r.result,q=d.transaction('values').objectStore('values').getAll();q.onsuccess=()=>{d.close();resolve(q.result);};};}));
try{
 const context=await browser.newContext(),page=await context.newPage();let mode='unavailable',loginCalls=0,pushCalls=0,expired=false,release,handled,markStarted;
 const cors={'access-control-allow-origin':'*','access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'GET,POST,OPTIONS'};
 await context.route('**/qingxiaolu-api/**',async route=>{
  if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
  const path=new URL(route.request().url()).pathname;
  const json=(data,status=200)=>route.fulfill({status,headers:cors,json:data});
  if(path.endsWith('/auth/login')){
   loginCalls++;
   if(mode==='unavailable')return json({error:'fixture'},503);
   if(mode==='wrong')return json({error:'fixture'},401);
   if(mode==='network')return route.abort();
   if(mode==='html')return route.fulfill({status:200,headers:cors,contentType:'text/html',body:'<html>synthetic upstream failure</html>'});
   if(mode==='missing')return json({});
   if(mode==='delayed') {let done;handled=new Promise(resolve=>done=resolve);await new Promise(resolve=>{release=resolve;markStarted();});try{await json({token:'cancelled-synthetic-session'});}catch{/* 已取消的请求不打印诊断。 */}finally{done();}return;}
   return json({token:'valid-synthetic-session'});
  }
  if(path.endsWith('/push')){pushCalls++;return json({applied:[],conflicts:[]});}
  if(path.endsWith('/pull'))return expired?json({error:'fixture'},401):json({changes:[],nextCursor:0,watermark:0,hasMore:false});
  return route.abort();
 });
 await page.goto(url);await page.getByRole('button',{name:'先在本机使用',exact:true}).click();await page.getByRole('button',{name:'创作',exact:true}).click();await page.getByPlaceholder('稿件标题（可选）').fill('登录故障期间的原稿');await page.getByPlaceholder('这一刻，想写点什么……').fill('当前文字📝\n登录失败也不能丢');await page.getByRole('button',{name:'保存',exact:true}).click();await page.getByText('已保存到本机，可以继续写作',{exact:true}).waitFor();await page.getByRole('button',{name:'设置',exact:true}).click();await page.getByRole('button',{name:'断开并重新登录',exact:true}).click();await page.getByPlaceholder('账户').fill('synthetic-author');await page.getByPlaceholder('密码').fill('synthetic-not-a-real-password');
 const panel=page.locator('.sync-login-card');const login=()=>panel.getByRole('button',{name:'登录并连接',exact:true}).click();const before=await disk(page);
 if(process.argv.includes('--observe')){await login();await panel.getByRole('status').getByText('用户名或密码错误',{exact:true}).waitFor();mode='html';await login();await panel.getByRole('status').filter({hasText:/Unexpected token/}).waitFor();console.log(JSON.stringify({serviceFailureMisreportedAsPassword:true,rawJsonErrorShown:true}));}
 else {
  const failures=[['unavailable','创作云端暂时不可用，请稍后重试，也可以先在本机写作'],['wrong','用户名或密码错误'],['network','网络暂时无法连接，请检查网络，也可以先在本机写作'],['html','登录服务返回了异常响应，请稍后重试'],['missing','登录服务返回了异常响应，请稍后重试']];
  for(const [next,expected] of failures){mode=next;await login();await panel.getByRole('status').getByText(expected,{exact:true}).waitFor();await panel.getByRole('button',{name:'登录并连接',exact:true}).waitFor();assert.deepEqual(await disk(page),before);assert.equal(await page.evaluate(()=>localStorage.getItem('qx_sync_token')),null);}
  mode='delayed';let requestStarted=new Promise(resolve=>markStarted=resolve);const callsBefore=loginCalls;await panel.getByRole('button',{name:'登录并连接',exact:true}).evaluate(button=>{button.click();button.click();});await panel.getByRole('button',{name:'正在连接…',exact:true}).waitFor();await requestStarted;assert.equal(loginCalls,callsBefore+1);await panel.getByRole('button',{name:'先在本机使用',exact:true}).click();release();await handled;assert.equal(await page.evaluate(()=>localStorage.getItem('qx_sync_token')),null);assert.deepEqual(await disk(page),before);
  await page.getByRole('button',{name:'断开并重新登录',exact:true}).click();mode='delayed';requestStarted=new Promise(resolve=>markStarted=resolve);const started=Date.now();await login();await requestStarted;await panel.getByRole('status').getByText('连接超时，请检查网络后重试，也可以先在本机写作',{exact:true}).waitFor({timeout:20000});assert.ok(Date.now()-started>=14000);release();await handled;assert.equal(await page.evaluate(()=>localStorage.getItem('qx_sync_token')),null);
  mode='success';await login();await page.locator('.sync-login-mask').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>localStorage.getItem('qx_sync_token')),'valid-synthetic-session');await page.getByText('已读取情晓录云端数据',{exact:true}).waitFor();assert.equal(pushCalls,0);
  expired=true;await page.getByRole('button',{name:'同步',exact:true}).click();await page.getByRole('heading',{name:'连接创作云端',exact:true}).waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('qx_sync_token')),null);await panel.getByRole('button',{name:'先在本机使用',exact:true}).click();await page.getByRole('button',{name:'创作',exact:true}).click();assert.equal(await page.getByPlaceholder('这一刻，想写点什么……').inputValue(),'当前文字📝\n登录失败也不能丢');
  console.log(JSON.stringify({serviceAndCredentialsDistinguished:true,networkAndMalformedResponsesFriendly:true,noFalseSession:true,errorKeepsDatabaseExact:true,singleLoginRequest:true,cancelledLoginDoesNotConnect:true,realTimeout:true,retrySuccess:true,noAutomaticUpload:true,expiredSessionReturnsToLogin:true,originalWritingExact:true,simulatedAuthenticationOnly:true}));
 }
 await context.unrouteAll({behavior:'wait'});
}finally{await browser.close();}
