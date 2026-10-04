// 必须显式授权真实节点；复用只生成临时 ID、清理及原记录哈希保护的既有验收。
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { createDesktopServer } from '../tools/desktop/server.mjs';
if(!process.argv.includes('--live-author-acceptance') || !process.env.QX_LIVE_SSH_KEY) throw new Error('电脑助手云端验收需要显式真实服务器授权和已授权密钥文件路径');
const base=path.resolve('work');await mkdir(base,{recursive:true});
const root=await mkdtemp(path.join(base,'desktop-live-'));
const instance=await createDesktopServer({root,frontend:path.resolve('mobile-dist'),port:0});
try {
  const code=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['tests/author-real-cloud.mjs','--live-author-acceptance','--desktop-local'],{
      env:{...process.env,QX_LIVE_PAGE_URL:instance.origin+'/qingxiaolu/'},stdio:'inherit',windowsHide:true});
    child.once('error',reject);child.once('exit',resolve);
  });
  if(code!==0)throw new Error('电脑助手真实云端验收失败，请检查已脱敏的阶段信息');
} finally {
  await instance.close();
  if(!root.startsWith(base+path.sep)||!path.basename(root).startsWith('desktop-live-'))throw new Error('测试目录边界不符，未清理');
  await rm(root,{recursive:true,force:true});
}
