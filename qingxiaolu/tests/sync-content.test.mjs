import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { createContentStore, ContentError, CHUNK_BYTES, StreamContent, streamJson } from "../sync-server/content-store.mjs";
import { encodeContent, prepareSyncBatch, SYNC_BATCH_BYTES } from "../work/writing-tests/sync-content.mjs";

async function fixture(t) {
  const parent=resolve("work");await mkdir(parent,{recursive:true});
  const root=resolve(parent,`content-tests-${randomUUID()}`);await mkdir(root);
  const store=createContentStore(root,"test-author");const requests=[];let failChunk=-1;
  const server=http.createServer(async(req,res)=>{
    try {
      if(req.headers.authorization!=="Bearer test-only"){res.writeHead(401);return res.end(JSON.stringify({error:"未授权"}));}
      const url=new URL(req.url,"http://localhost");const path=url.pathname.split("/");
      if(url.pathname==="/render"){
        const chunks=[];for await(const data of req)chunks.push(data);const {tree}=JSON.parse(Buffer.concat(chunks));
        await store.validate(tree);res.writeHead(200,{"content-type":"application/json"});
        return await streamJson(res,{payload:new StreamContent(store,tree),server:{content_json:new StreamContent(store,tree,true)},changedAt:new Date("2026-10-03T01:00:00Z")});
      }
      const hash=path[4],kind=url.searchParams.get("kind");
      requests.push({method:req.method,index:path[6],kind});
      let result;
      if(req.method==="GET"){const value=await store.info(hash,kind);result=value?{present:true,...value}:{present:false};}
      else if(req.method==="PUT"){
        const index=Number(path[6]);const chunks=[];for await(const data of req)chunks.push(data);const data=Buffer.concat(chunks);
        assert.ok(data.length<=CHUNK_BYTES);
        if(index===failChunk){failChunk=-1;throw new ContentError(503,"测试中断，请重试");}
        result=await store.chunk(hash,kind,index,Number(url.searchParams.get("total")),Number(url.searchParams.get("bytes")),data);
      } else result=await store.finish(hash,kind,Number(url.searchParams.get("bytes")));
      res.writeHead(200,{"content-type":"application/json"});res.end(JSON.stringify(result));
    }catch(error){res.writeHead(error.status||500,{"content-type":"application/json"});res.end(JSON.stringify({error:error.message}));}
  });
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  t.after(async()=>{await new Promise(resolve=>server.close(resolve));assert.ok(root.startsWith(parent+sep+"content-tests-"));await rm(root,{recursive:true,force:true});});
  return {store,root,requests,api:`http://127.0.0.1:${server.address().port}`,fail:at=>{failChunk=at;}};
}

test("大图片和长文字分块往返保留全部原值，重复图片只存一份，冲突内容仍为原 JSON 字符串",async t=>{
  const f=await fixture(t);const image="data:image/png;base64,"+randomBytes(2*1024*1024+13).toString("base64");
  const text='作者的中文、换行\n引号"与\\反斜线，😀以及\ud800'.repeat(7000);
  const original={text,images:[image,image],metadata:{reference:image,note:text,empty:null,enabled:false},list:[1,"正文",true]};
  const tree=await encodeContent(original,f.api,"test-only",new Map());
  assert.ok(Buffer.byteLength(JSON.stringify(tree))<3000);assert.equal(f.store.estimate(tree),Buffer.byteLength(JSON.stringify(original)));
  const response=await fetch(f.api+"/render",{method:"POST",headers:{authorization:"Bearer test-only","content-type":"application/json"},body:JSON.stringify({tree})});
  const decoded=await response.json();assert.deepEqual(decoded.payload,original);assert.deepEqual(JSON.parse(decoded.server.content_json),original);
  assert.equal(decoded.changedAt,"2026-10-03T01:00:00.000Z");
  assert.equal(f.requests.filter(x=>x.method==="POST"&&x.kind==="image").length,1);
  assert.equal(f.requests.filter(x=>x.method==="POST"&&x.kind==="string").length,1);
  const other=createContentStore(f.root,"other-author");assert.equal(await other.info(tree[1].find(pair=>pair[0][1]==="images")[1][1][0][1],"image"),null);
});

test("中断后的重试安全补齐内容，已完成的图片不会重复上传",async t=>{
  const f=await fixture(t);const image="data:image/png;base64,"+randomBytes(CHUNK_BYTES*3+7).toString("base64");f.fail(2);
  await assert.rejects(encodeContent({images:[image]},f.api,"test-only",new Map()),/测试中断/);
  const tree=await encodeContent({images:[image]},f.api,"test-only",new Map());const count=f.requests.filter(x=>x.method==="PUT").length;
  await encodeContent({images:[image]},f.api,"test-only",new Map());assert.equal(f.requests.filter(x=>x.method==="PUT").length,count);
  await f.store.validate(tree);
});

test("按 UTF8 字节分批，大批量稿件不会越过 4 MiB，请求中的原始记录没有减少",async()=>{
  const pending=Array.from({length:200},(_,at)=>({id:`draft-${at}`,itemType:"article",title:`稿件${at}`,content:{text:"稿件正文".repeat(4000)}}));
  const batch=await prepareSyncBatch(pending,"http://unused","test-only",new Map());
  assert.ok(batch.changes.length>0&&batch.changes.length<pending.length);
  assert.ok(Buffer.byteLength(batch.body)<=SYNC_BATCH_BYTES);assert.equal(JSON.parse(batch.body).changes.length,batch.changes.length);
  assert.equal(pending.length,200);assert.equal(batch.changes[0].content.text,pending[0].content.text);
});

test("非法路径、损坏分块和非 JSON 字符串不会成为可读取内容",async t=>{
  const f=await fixture(t);await assert.rejects(f.store.info("../bad","image"),/标识/);
  const bytes=Buffer.from('"合法前缀" null');const hash=createHash("sha256").update(bytes).digest("hex");
  await f.store.chunk(hash,"string",0,1,bytes.length,bytes);await assert.rejects(f.store.finish(hash,"string",bytes.length),/文字内容/);
  assert.equal(await f.store.info(hash,"string"),null);
  await assert.rejects(f.store.chunk(hash,"image",0,1,bytes.length,Buffer.from("broken")),/大小|顺序/);
});
