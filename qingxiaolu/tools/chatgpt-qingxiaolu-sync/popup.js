import { makeAttempt, buildChanges, acceptResult } from './syncPlan.js';
import { prepareSyncBatch } from './shared/sync-content.mjs';
const API='https://poem.timelordtty.cn/qingxiaolu-api';
const $=id=>document.getElementById(id);
let conversation=null,pending=null,busy=false,lastKey='',owner='',projectChanges=new Map();
const token=async()=>(await chrome.storage.local.get('qingxiaoluToken')).qingxiaoluToken||'';
const digest=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(v=>v.toString(16).padStart(2,'0')).join('');
const message=text=>$('message').textContent=text;
function setBusy(value){busy=value;for(const id of ['loginButton','syncButton','previewButton','refreshButton','cancelButton','logoutButton','project','category','title','includeUser'])$(id).disabled=value||Boolean(pending&&['previewButton','project','category','title','includeUser'].includes(id));}
function showPending(){ $('pending').hidden=!pending;if(pending){$('pendingText').value=pending.text;$('pendingInfo').textContent=`未完成：${pending.title} · ${pending.category}${pending.confirmed[pending.id]?'（讨论记录已保存）':''}`;}setBusy(busy);}
const pendingKey=()=> 'qingxiaoluPending-'+owner;const completionKey=()=> 'qingxiaoluLastKey-'+owner;
async function remember(){try{await chrome.storage.local.set({[pendingKey()]:pending});}catch{showPending();throw Error('未完成内容无法暂存，请先复制下方正文再重试');}showPending();}
async function api(path,options={}){
 const credential=await token(),controller=new AbortController();let timedOut=false;
 const timer=setTimeout(()=>{timedOut=true;controller.abort();},30000);
 try{
  let response;try{response=await fetch(API+path,{...options,signal:controller.signal,headers:{'content-type':'application/json',...(credential?{authorization:'Bearer '+credential}:{}),...(options.headers||{})}});}catch{if(timedOut)throw Error('等待服务器超时，未确认的内容仍在本机，请重试');throw Error('网络暂时无法连接，未确认的内容仍在本机');}
  if(response.status===401){if(await token()===credential)await chrome.storage.local.remove('qingxiaoluToken');$('login').hidden=false;$('sync').hidden=true;throw Error('登录状态已失效，请重新登录，未完成内容仍在本机');}
  let data;try{data=await response.json();}catch{throw Error(timedOut?'等待服务器超时，未确认的内容仍在本机':'服务器返回了异常响应，请稍后重试');}
  if(!response.ok)throw Error(response.status>=500?'创作云端暂时不可用，请稍后重试':data?.error||`请求失败（${response.status}）`);
  if(!data||typeof data!=='object')throw Error('服务器返回了异常响应，请稍后重试');return data;
 }finally{clearTimeout(timer);}
}
async function loadProjects(){
 let cursor=0,watermark=0,more=true;const latest=new Map();
 while(more){const page=await api(`/v1/sync/pull?cursor=${cursor}&limit=500&snapshot=1${watermark?'&watermark='+watermark:''}`);const next=Number(page.nextCursor??cursor);if(!Array.isArray(page.changes)||!Number.isSafeInteger(next)||next<cursor||(page.hasMore&&next<=cursor))throw Error('项目翻页信息异常，已停止读取，请重试');for(const change of page.changes)latest.set(change.id,change);cursor=next;watermark=Number(page.watermark||watermark);more=page.hasMore;}
 const previous=$('project').value;projectChanges=new Map([...latest.values()].filter(v=>v.operation!=='delete'&&v.payload?.itemType==='project').map(v=>[v.id,v]));
 $('project').replaceChildren();for(const change of projectChanges.values()){const option=document.createElement('option');option.value=change.id;option.textContent=change.payload.title||'未命名项目';$('project').append(option);}if(projectChanges.has(previous))$('project').value=previous;
 $('login').hidden=true;$('sync').hidden=false;
 if(!projectChanges.size)message('尚无可选项目，请先在情晓录创建项目，再刷新');
}
async function readConversation(){
 const [tab]=await chrome.tabs.query({active:true,currentWindow:true});if(!tab?.url?.startsWith('https://chatgpt.com/'))throw Error('请先打开一个 ChatGPT 讨论页面');
 const [{result}]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>({title:document.title.replace(/\s*-\s*ChatGPT\s*$/i,'').trim(),url:location.href,messages:[...document.querySelectorAll('[data-message-author-role]')].map(node=>({role:node.getAttribute('data-message-author-role'),text:(node.innerText||'').trim()})).filter(v=>v.text)})});
 if(!result?.messages?.length)throw Error('当前页面没有读取到讨论，请先打开并滚动加载对话');conversation=result;if(!$('title').dataset.edited)$('title').value=result.title;$('preview').textContent=`已读取 ${result.messages.length} 条已加载消息。图片、附件和未加载消息不在此次范围内。`;
}
const text=()=>conversation.messages.filter(v=>$('includeUser').checked||v.role!=='user').map(v=>`${v.role==='user'?'我':'ChatGPT'}：\n${v.text}`).join('\n\n');
async function run(action){if(busy)return;setBusy(true);try{await action();}catch(error){message(error.message||'操作未完成，请重试');}finally{setBusy(false);}}
$('title').addEventListener('input',()=>$('title').dataset.edited='1');
$('loginButton').addEventListener('click',()=>run(async()=>{message('正在登录…');const result=await api('/v1/auth/login',{method:'POST',body:JSON.stringify({username:$('username').value.trim(),password:$('password').value})});if(typeof result.token!=='string'||!result.token.trim())throw Error('登录服务返回了异常响应');await chrome.storage.local.set({qingxiaoluToken:result.token});$('password').value='';owner=await digest(result.token);await restorePending();await loadProjects();message('已登录，请预览并确认保存位置');}));
$('previewButton').addEventListener('click',()=>run(async()=>{if(pending)throw Error('请先完成或取消当前未完成同步，再读取新的讨论');await readConversation();message('请确认项目、标题、保存位置和是否包含自己的提问');}));
$('refreshButton').addEventListener('click',()=>run(async()=>{await loadProjects();if(pending)$('project').value=pending.projectId;message('已读取最新项目资料，未完成内容保持');}));
$('syncButton').addEventListener('click',()=>run(async()=>{
 if(!pending){if(!conversation)await readConversation();const projectId=$('project').value;if(!projectChanges.has(projectId))throw Error('请先在情晓录创建并选择项目');const options={projectId,category:$('category').value,includeUser:$('includeUser').checked,title:$('title').value.trim()||conversation.title||'ChatGPT 讨论',text:text(),url:conversation.url};if(!options.text.trim())throw Error('所选范围没有可保存的消息，请调整“包含我的提问”');const key=await digest(JSON.stringify(options));if(key===lastKey){message('这份内容已保存，无需重复同步；另存时请修改记录标题');return;}pending=makeAttempt({...options,key},owner);await remember();}
 if(pending.owner!==owner)throw Error('未完成内容属于原登录状态，请使用原账户继续');
 const changes=buildChanges(pending,projectChanges.get(pending.projectId));await remember();if(!changes.length){await finish();return;}
 message('正在保存，未完成内容已暂存在扩展本机');const batch=await prepareSyncBatch(changes,API,await token(),new Map());const wire=JSON.parse(batch.body);wire.deviceId='chatgpt-browser-helper';const result=await api('/v1/sync/push',{method:'POST',body:JSON.stringify(wire)});const complete=acceptResult(pending,result,batch.changes,projectChanges);await remember();
 if(complete)await finish();else if(result.conflicts.some(item=>item.id===pending.id))message('讨论记录已被修改，未覆盖云端原文。请先复制下方文字并在情晓录检查原记录；如需另存，取消后选择“讨论记录”保存副本。');else message(pending.confirmed[pending.id]?'讨论记录已保存，项目资料尚未完成。请刷新项目后确认重试，已保存的讨论不会重复创建。':'部分内容尚未确认保存，请重试；本机未完成内容保持。');
}));
async function finish(){lastKey=pending.key;await chrome.storage.local.set({[completionKey()]:{owner,key:lastKey}});pending=null;await chrome.storage.local.remove(pendingKey());showPending();message('讨论和所选项目资料均已确认保存，回到情晓录点击同步查看');}
async function restorePending(){const saved=await chrome.storage.local.get([pendingKey(),completionKey()]);pending=saved[pendingKey()]?.owner===owner?saved[pendingKey()]:null;lastKey=saved[completionKey()]?.owner===owner?saved[completionKey()].key:'';if(pending){$('title').value=pending.title;$('category').value=pending.category;$('includeUser').checked=pending.includeUser!==false;}showPending();}
$('cancelButton').addEventListener('click',()=>run(async()=>{if(!pending)return;if(!confirm('取消未完成的本机同步？已经保存到云端的内容不会删除。'))return;pending=null;await chrome.storage.local.remove(pendingKey());showPending();message('已取消本机未完成操作，已保存的云端内容保持');}));
$('logoutButton').addEventListener('click',()=>run(async()=>{await chrome.storage.local.remove('qingxiaoluToken');pending=null;conversation=null;owner='';showPending();$('sync').hidden=true;$('login').hidden=false;message('已退出；未完成内容仍由原登录状态保留');}));
(async()=>{const credential=await token();if(credential){owner=await digest(credential);await restorePending();$('login').hidden=true;$('sync').hidden=false;try{await loadProjects();if(pending)$('project').value=pending.projectId;message(pending?'已恢复未完成同步，请核对后继续':'已恢复登录状态');}catch(error){message(error.message);}}})();
