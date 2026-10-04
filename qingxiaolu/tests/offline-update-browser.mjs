import {chromium} from 'playwright-core';
import {createServer} from 'node:http';import {readFile,readdir} from 'node:fs/promises';import {createHash,randomUUID} from 'node:crypto';import {strict as assert} from 'node:assert';
const { fileURLToPath } = await import('node:url');
const root=fileURLToPath(new URL('../mobile-dist/',import.meta.url));
const files=new Map([['index.html',await readFile(root+'index.html')],['offline-sw.js',await readFile(root+'offline-sw.js')]]);
for(const name of await readdir(root+'assets'))files.set('assets/'+name,await readFile(root+'assets/'+name));
const originalWorker=files.get('offline-sw.js').toString(),originalManifest=JSON.parse(originalWorker.match(/const MANIFEST = (.*);/)[1]);
const version2=randomUUID(),html1=files.get('index.html').toString(),entry1=html1.match(/src="\.\/(assets\/[^\"]+\.js)"/)[1],entry2='assets/index-offline-update-test.js';
const files2=new Map(files);files2.set(entry2,Buffer.from(files.get(entry1).toString().replaceAll(originalManifest.version,version2)));
const html2=html1.replace(entry1,entry2);files2.set('index.html',Buffer.from(html2));
const assets2=originalManifest.assets.map(name=>name===entry1?entry2:name);assets2.push('assets/offline-failure-fixture.js');files2.set('assets/offline-failure-fixture.js',Buffer.from('export {};'));
files2.set('offline-sw.js',Buffer.from(originalWorker.replace(/const MANIFEST = .*;/, 'const MANIFEST = '+JSON.stringify({version:version2,indexHash:createHash('sha256').update(html2).digest('hex'),assets:assets2})+';')));
let current=files, fail=false;
const server=createServer((req,res)=>{const path=new URL(req.url,'http://127.0.0.1:3005').pathname;if(!path.startsWith('/qingxiaolu/')){res.writeHead(404);return res.end();}const name=path.slice('/qingxiaolu/'.length)||'index.html';const bytes=current.get(name);if(!bytes||(fail&&name==='assets/offline-failure-fixture.js')){res.writeHead(404);return res.end();}res.writeHead(200,{'content-type':name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':'text/html','cache-control':'no-store'});res.end(bytes);});
await new Promise(resolve=>server.listen(3005,'127.0.0.1',resolve));const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const context=await browser.newContext({serviceWorkers:'allow'}),page=await context.newPage(),url='http://127.0.0.1:3005/qingxiaolu/';await context.route('**/qingxiaolu-api/**',route=>route.abort());await page.goto(url);
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await page.getByRole('button',{name:'先在本机使用',exact:true}).click();
 await page.getByRole('button',{name:'创作',exact:true}).click();await page.getByPlaceholder('稿件标题（可选）').fill('离线更新边界');await page.getByPlaceholder('这一刻，想写点什么……').fill('跨版本保留的原稿');await page.getByRole('button',{name:'保存',exact:true}).click();await page.getByText('已保存到本机，可以继续写作',{exact:true}).waitFor();
 current=files2;fail=true;await page.reload();await page.getByRole('status').filter({hasText:'离线页面暂未准备完成。当前仍可写作，请联网后重试。'}).waitFor();
 await context.setOffline(true);await page.reload();assert.equal(await page.getByPlaceholder('这一刻，想写点什么……').inputValue(),'跨版本保留的原稿');
 await context.setOffline(false);fail=false;await page.reload();
 await page.waitForFunction(async version=>{const c=await caches.open('qingxiaolu-page-'+version);return !!await c.match(new URL('__offline_ready__',location.href));},version2);
 const beforeText=await page.getByPlaceholder('这一刻，想写点什么……').inputValue();await page.getByPlaceholder('这一刻，想写点什么……').fill('等待新版时仍可写作');await page.getByRole('button',{name:'保存',exact:true}).click();await page.getByText('已保存到本机，可以继续写作',{exact:true}).waitFor();
 await context.setOffline(true);await page.reload();assert.equal(await page.getByPlaceholder('这一刻，想写点什么……').inputValue(),'等待新版时仍可写作');
 assert.equal(beforeText,'跨版本保留的原稿');console.log(JSON.stringify({failedUpdateKeepsOldOfflineShell:true,retryPreparesNewVersion:true,newVersionOffline:true,writingNotReloadedByWorker:true,draftPreserved:true}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
