// 专用模拟器中验证旧 WebView 的等待期限；合成 fetch，不连接真实账号。
import {_android} from 'playwright-core';import {strict as assert} from 'node:assert';
const device=(await _android.devices()).find(v=>v.serial()==='emulator-5580');assert.ok(device);
let page,oldToken;
try {
 assert.equal((await device.shell('getprop ro.boot.qemu.avd_name')).toString().trim(),'qingxiaolu-author-api34');
 await device.shell('am start -n com.qingxiaolu.app/.MainActivity');page=await(await device.webView({pkg:'com.qingxiaolu.app'})).page();page.setDefaultTimeout(15000);await page.context().route('**/qingxiaolu-api/**',r=>r.abort());
 oldToken=await page.evaluate(()=>localStorage.getItem('qx_sync_token'));if(oldToken==='native-synthetic-session')oldToken=null;await page.evaluate(()=>localStorage.setItem('qx_sync_token','native-synthetic-session'));await page.reload();await page.getByRole('button',{name:'项目',exact:true}).click({noWaitAfter:true});await page.getByRole('heading',{name:'创作项目',exact:true}).waitFor();
 const hash=()=>page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('qingxiaolu-writing',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const d=r.result,list=[],q=d.transaction('values').objectStore('values').openCursor();q.onsuccess=()=>{const c=q.result;if(!c){d.close();Promise.all(list).then(values=>resolve(JSON.stringify(values))).catch(reject);return;}const key=c.key;list.push(crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(c.value))).then(bytes=>({key,hash:[...new Uint8Array(bytes)].join(',')})));c.continue();};};}));
 const before=await hash();
 await page.evaluate(()=>{window.__qxOriginalFetch=window.fetch;window.__qxAborted=false;window.__qxCalls=0;window.fetch=(url,options)=>{if(String(url).includes('/qingxiaolu-api/')){window.__qxCalls++;return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>{window.__qxAborted=true;reject(new DOMException('fixture','AbortError'));},{once:true}));}return window.__qxOriginalFetch(url,options);};});
 const started=Date.now();await page.getByRole('button',{name:'同步',exact:true}).click({noWaitAfter:true});await page.getByText(/同步等待超时/).first().waitFor({timeout:35000});assert.ok(Date.now()-started>=28000);assert.equal(await page.evaluate(()=>window.__qxAborted),true);assert.equal(await page.evaluate(()=>window.__qxCalls),1);assert.equal(await hash(),before);assert.equal(await page.getByRole('button',{name:'同步',exact:true}).isEnabled(),true);
 console.log(JSON.stringify({nativeOldWebViewTimeout:true,actualThirtySecondWait:true,abortSignalSupported:true,singleRequest:true,writingDatabaseUnchanged:true,retryButtonAvailable:true,syntheticNetworkOnly:true}));
}finally{
 if(page)try{await page.evaluate(token=>{if(window.__qxOriginalFetch)window.fetch=window.__qxOriginalFetch;if(token===null)localStorage.removeItem('qx_sync_token');else if(token!==undefined)localStorage.setItem('qx_sync_token',token);},oldToken);}catch{}
 await device.close();
}