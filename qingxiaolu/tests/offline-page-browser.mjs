import {chromium} from 'playwright-core';
import {strict as assert} from 'node:assert';
const url=process.argv[2]||'http://127.0.0.1:3004/qingxiaolu/';
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const context=await browser.newContext({serviceWorkers:'allow'}),page=await context.newPage();
 await context.route('**/qingxiaolu-api/**',route=>route.abort());
 await page.goto(url);
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller,{},{timeout:30000});
 const ready=await page.evaluate(async()=>{const names=(await caches.keys()).filter(n=>n.startsWith('qingxiaolu-page-'));for(const name of names){const c=await caches.open(name);const keys=await c.keys();if(keys.some(k=>k.url.endsWith('/__offline_ready__')))return {ready:true,keys:keys.map(k=>new URL(k.url).pathname)};}return {ready:false};});
 assert.ok(ready.ready);assert.ok(ready.keys.every(path=>path==='/qingxiaolu/'||path==='/qingxiaolu/__offline_ready__'||path.startsWith('/qingxiaolu/assets/')));
 if(await page.getByRole('button',{name:'先在本机使用',exact:true}).isVisible())await page.getByRole('button',{name:'先在本机使用',exact:true}).click();
 await page.getByRole('button',{name:'创作',exact:true}).click();await page.getByPlaceholder('稿件标题（可选）').fill('真正离线写作验收');
 await page.getByPlaceholder('这一刻，想写点什么……').fill('联网写好的原稿，保留换行。\n第二段📝。');
 await page.getByRole('button',{name:'保存',exact:true}).click();await page.getByText('已保存到本机，可以继续写作',{exact:true}).waitFor();
 await context.setOffline(true);await page.reload();
 assert.equal(await page.getByPlaceholder('这一刻，想写点什么……').inputValue(),'联网写好的原稿，保留换行。\n第二段📝。');
 await page.getByPlaceholder('这一刻，想写点什么……').fill('断网后继续写的最新正文。');await page.getByRole('button',{name:'保存',exact:true}).click();
 await page.getByText('已保存到本机，可以继续写作',{exact:true}).waitFor();await page.reload();
 assert.equal(await page.getByPlaceholder('这一刻，想写点什么……').inputValue(),'断网后继续写的最新正文。');
 await page.getByRole('button',{name:'项目',exact:true}).click();await page.getByRole('button',{name:/导入本地文档/}).click();
 await page.getByRole('heading',{name:'选择本地文件',exact:true}).waitFor();
 await page.locator('input[type=file]').setInputFiles({name:'断网导入.txt',mimeType:'text/plain',buffer:Buffer.from('断网仍可解析与保存的资料')});
 await page.getByRole('heading',{name:'临时预览',exact:true}).waitFor();assert.equal(await page.locator('.candidate-list textarea').inputValue(),'断网仍可解析与保存的资料');
 await page.getByText('预览已保存在本机，刷新可恢复',{exact:true}).waitFor();await page.reload();
 assert.equal(await page.locator('.candidate-list textarea').inputValue(),'断网仍可解析与保存的资料');
 await context.setOffline(false);
 console.log(JSON.stringify({offlineShell:true,originalDraftRetained:true,offlineContinueWriting:true,offlineSaveReload:true,offlineImport:true,offlinePreviewReload:true,onlyAuthorScopeCached:true}));
}finally{await browser.close();}