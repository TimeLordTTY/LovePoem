import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { csvCandidates, decodeDocument, parseCsv, parseXmindJson, outlineText } from "../work/writing-tests/importers/documentParsing.mjs";
import { candidate } from "../work/writing-tests/importers/types.mjs";
import { commitImport } from "../work/writing-tests/importers/importCommit.mjs";
import { pdfText, pdfPixels } from "../work/writing-tests/importers/pdfParsing.mjs";
import { installPdfStreamIterator, installPdfBufferTransfer } from "../work/writing-tests/importers/pdfCompatibility.mjs";
import { parseWritingDate, writingDateInfo } from "../work/writing-tests/writingDate.mjs";
import { spawnSync } from "node:child_process";
class MemoryStorage {
  data = new Map(); failKey = "";
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, value) { if (key === this.failKey) { this.failKey = ""; throw new Error("QuotaExceededError"); } this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
}
beforeEach(() => { globalThis.localStorage = new MemoryStorage(); });
const read = key => JSON.parse(localStorage.getItem(key));
const items = () => [candidate("txt", "TXT", "第一篇", "正文一"), candidate("txt", "TXT", "第二篇", "正文二")];
test("日历日期在东西时区均保持原日和归档月，带时区时间仍按真实时刻显示", () => {
  const moduleUrl = new URL("../work/writing-tests/writingDate.mjs", import.meta.url).href;
  for (const timezone of ["America/Los_Angeles", "Asia/Hong_Kong"]) {
    const result = spawnSync(process.execPath, ["--input-type=module", "-e",
      `import{writingDateInfo}from ${JSON.stringify(moduleUrl)};console.log(JSON.stringify([writingDateInfo('2026-10-01',0),writingDateInfo('2026-10-01T00:00:00Z',0)]));`],
      { env: { ...process.env, TZ: timezone }, encoding: "utf8" });
    assert.equal(result.status,0,result.stderr);
    const [day, instant]=JSON.parse(result.stdout);assert.equal(day.label,"2026年10月1日");assert.equal(day.groupKey,"2026-10");
    assert.equal(instant.time,Date.parse("2026-10-01T00:00:00Z"));
    assert.equal(instant.groupKey,timezone==="America/Los_Angeles"?"2026-09":"2026-10");
  }
});
test("无效日历日期不滚到下个月，CSV 仍保留原字段并提示，闰年与中文日期可识别", () => {
  assert.equal(parseWritingDate("2026-02-30"),null);assert.equal(parseWritingDate("2026-02-30T12:00:00Z"),null);
  assert.equal(parseWritingDate("1900-02-29"),null);assert.ok(parseWritingDate("2000-02-29"));
  assert.ok(parseWritingDate("2026年10月1日")?.dateOnly);assert.ok(parseWritingDate("2026/10/1")?.dateOnly);
  const record=csvCandidates("标题,正文,日期\n无效日期,原文,2026-02-30","dates.csv")[0];
  assert.equal(record.publishedAt,"2026-02-30");assert.ok(record.warnings.length);
  const date=writingDateInfo(record.publishedAt,123);assert.equal(date.groupKey,"date-review");assert.ok(date.label.includes("2026-02-30"));
});
test("旧 WebView 的图片缓冲区转移保留像素、扩展补零、截断并分离原缓冲区", () => {
  const modern=ArrayBuffer.prototype.transferToFixedLength;installPdfBufferTransfer();assert.equal(ArrayBuffer.prototype.transferToFixedLength,modern);
  class OldBuffer extends ArrayBuffer {}
  Object.defineProperty(OldBuffer.prototype,"transferToFixedLength",{value:undefined,configurable:true});installPdfBufferTransfer(OldBuffer);
  const source=new OldBuffer(3);new Uint8Array(source).set([17,23,99]);const result=source.transferToFixedLength();
  assert.deepEqual([...new Uint8Array(result)],[17,23,99]);assert.equal(source.byteLength,0);
  const extended=new OldBuffer(2);new Uint8Array(extended).set([4,5]);assert.deepEqual([...new Uint8Array(extended.transferToFixedLength(4))],[4,5,0,0]);
  const shortened=new OldBuffer(3);new Uint8Array(shortened).set([6,7,8]);assert.deepEqual([...new Uint8Array(shortened.transferToFixedLength(1))],[6]);
  const invalid=new OldBuffer(1);assert.throws(()=>invalid.transferToFixedLength(-1),RangeError);assert.throws(()=>invalid.transferToFixedLength(1n),TypeError);
  assert.equal(invalid.byteLength,1);assert.throws(()=>source.transferToFixedLength(),TypeError);
});
test("旧 WebView 的流异步迭代完整读取，提前结束取消并释放锁，不替换现代实现", async () => {
  const modern = ReadableStream.prototype[Symbol.asyncIterator]; installPdfStreamIterator();
  assert.equal(ReadableStream.prototype[Symbol.asyncIterator], modern);
  class OldStream extends ReadableStream {}
  Object.defineProperty(OldStream.prototype, Symbol.asyncIterator, {value:undefined,configurable:true});
  installPdfStreamIterator(OldStream);
  const stream=new OldStream({start(controller){controller.enqueue("第一段");controller.enqueue("第二段");controller.close();}});
  const values=[];for await(const value of stream)values.push(value);
  assert.deepEqual(values,["第一段","第二段"]);assert.equal(stream.locked,false);
  let cancelled=false;
  const interrupted=new OldStream({start(controller){controller.enqueue("未读完");},cancel(){cancelled=true;}});
  for await(const value of interrupted){assert.equal(value,"未读完");break;}
  assert.equal(cancelled,true);assert.equal(interrupted.locked,false);
});
test("旧 WebView 流的读取错误正常传播，读取锁仍然释放", async () => {
  class OldStream extends ReadableStream {}
  Object.defineProperty(OldStream.prototype, Symbol.asyncIterator, {value:undefined,configurable:true});installPdfStreamIterator(OldStream);
  const marker=new Error("原始读取错误");const stream=new OldStream({start(controller){controller.error(marker);}});
  await assert.rejects(async()=>{for await(const value of stream){void value;}},error=>error===marker);
  assert.equal(stream.locked,false);
});
test("PDF 保留换行、段落和中文相邻文字，不把一页合成长行", () => {
  const item=(str,x,y,hasEOL=false)=>({str,transform:[1,0,0,12,x,y],height:12,width:str.length*12,hasEOL});
  assert.equal(pdfText([item("海边",0,100),item("小城",24,100,true),item("另一行",0,81,true),item("新的段落",0,43)]),"海边小城\n另一行\n\n新的段落");
  assert.equal(pdfText([item("first",0,100),item("word",72,100)]),"first word");
  assert.equal(pdfText([{type:"beginMarkedContent"},item("正文",0,100)]),"正文");
});
test("PDF 图片像素保留 RGB、透明通道与每行不足 8 位的灰度图", () => {
  assert.deepEqual([...pdfPixels({width:1,height:1,kind:2,data:Uint8Array.from([17,23,99])})],[17,23,99,255]);
  assert.deepEqual([...pdfPixels({width:1,height:1,kind:3,data:Uint8Array.from([17,23,99,42])})],[17,23,99,42]);
  const grey=pdfPixels({width:3,height:2,kind:1,data:Uint8Array.from([0b10100000,0b01000000])});
  assert.deepEqual([grey[0],grey[4],grey[8],grey[12],grey[16],grey[20]],[255,0,255,0,255,0]);
  assert.throws(()=>pdfPixels({width:2,height:1,kind:2,data:Uint8Array.from([1,2,3])}),/完整解码/);
});
test("CSV 保留中文、引号逗号、跨行正文和原日期，并逐篇预览", () => {
  const entries = csvCandidates('\uFEFF标题,正文,日期\r\n海边,"风,海\n说""你好""",2026-09-28\r\n雨夜,雨声,2026-09-29', "日记.csv");
  assert.equal(entries.length, 2); assert.equal(entries[0].text, '风,海\n说"你好"');
  assert.equal(entries[0].publishedAt, "2026-09-28"); assert.equal(entries[1].title, "雨夜");
  assert.throws(() => parseCsv('title,text\na,"未闭合'), /未闭合/);
  assert.throws(() => csvCandidates("title,text\na,b,c", "a.csv"), /列数/);
  assert.ok(csvCandidates("a,b\n1,2", "a.csv")[0].warnings.length);
});
test("旧中文编码和 UTF16 文档可读，XMind 备注和层级保留", () => {
  assert.equal(decodeDocument(Uint8Array.from([255,254,0x77,0x6d]).buffer).text, "海");
  assert.equal(decodeDocument(Uint8Array.from([0xba,0xa3]).buffer).text, "海");
  const entries = parseXmindJson([{rootTopic:{title:"小说",children:{attached:[{title:"第一章",notes:{plain:{content:"回到海边"}}}]}}}]);
  assert.deepEqual(entries[1], {title:"第一章",text:"回到海边",depth:1});
  assert.match(outlineText(entries), /回到海边/);
});

test("XMind 富文本备注保留段落和嵌套链接，不把对象变成正文", () => {
  const entries = parseXmindJson([{ rootTopic: { title: "小说", notes: { plain: { content: "" }, html: { content: { paragraphs: [
    { spans: [{ text: "第一段" }, { href: "https://example.com/source", spans: [{ text: "资料来源" }] }] },
    { spans: [{ text: "第二段📝" }] },
  ] } } } } }]);
  assert.equal(entries[0].text, "第一段资料来源（https://example.com/source）\n第二段📝");
  assert.equal(parseXmindJson([{rootTopic:{title:"空备注",notes:{plain:{content:""}}}}])[0].text, "");
});

test("XMind 普通、游离、概要和标注节点全部保留，普通分支顺序保持", () => {
  const entries = parseXmindJson([{ rootTopic: { title: "小说", children: {
    attached: [{ title: "第一章" }], detached: [{ title: "游离灵感" }],
    summary: [{ title: "阶段概要", notes: { plain: { content: "概要正文" } } }],
    callout: [{ title: "人物标注", notes: { plain: { content: "不要忘记的伏笔" } } }],
  } } }]);
  assert.deepEqual(entries.map(v => v.title), ["小说", "第一章", "游离灵感", "阶段概要", "人物标注"]);
  assert.equal(entries.at(-1).text, "不要忘记的伏笔");
  assert.ok(entries.slice(1).every(v => v.depth === 1));
});

test("XMind 导入背景等项目资料时保留一次原文件，重复节点不重复附加", () => {
  localStorage.setItem("qx_drafts", JSON.stringify([{id:"p",itemType:"project",title:"小说",content:{}}]));
  const originalXmind = "data:application/x-xmind;base64,UEs=";
  const nodes = [candidate("other","XMIND","背景一","正文一",{raw:{fileName:"小说.xmind",originalXmind}}),
    candidate("other","XMIND","背景二","正文二",{raw:{fileName:"小说.xmind",originalXmind}})];
  commitImport(nodes,{projectId:"p",category:"背景"});
  const workspace = read("qx_project_workspaces").p;
  assert.equal(workspace.importDocuments.length,1);
  assert.equal(workspace.importDocuments[0].dataUrl,originalXmind);
  assert.match(workspace.world,/正文二/);
  assert.deepEqual(commitImport(nodes,{projectId:"p",category:"背景"}),{added:0,skipped:2});
  assert.equal(read("qx_project_workspaces").p.importDocuments.length,1);
});
test("批量导入遇到容量错误整批回滚，重试不会留下半批或重复内容", () => {
  const selected = items(); localStorage.setItem("qx_drafts", JSON.stringify([{id:"old", itemType:"article"}]));
  const before = new Map(localStorage.data); localStorage.failKey = "qx_drafts";
  assert.throws(() => commitImport(selected), /尚未保存/); assert.deepEqual(localStorage.data, before);
  assert.deepEqual(commitImport(selected), {added:2,skipped:0});
  assert.deepEqual(commitImport(items()), {added:0,skipped:2}); assert.equal(read("qx_drafts").length,3);
  assert.deepEqual(commitImport(items(), {skipDuplicates:false}), {added:2,skipped:0});
});
test("来源日期、图片、原始记录保留且不自动上传", () => {
  const item = candidate("qqzone","QQ空间","无标题","原正文",{publishedAt:"2020-01-02",images:["data:image/png;base64,AA=="],raw:{note:"来源"}});
  commitImport([item]); const saved = read("qx_drafts")[0];
  assert.equal(saved.title, ""); assert.equal(saved.content.publishedAt,"2020-01-02");
  assert.deepEqual(saved.content.images,item.images); assert.deepEqual(saved.content.importRaw,item.raw);
  assert.equal(localStorage.getItem("qx_web_outbox"),null);
});
test("人物导入同时更新项目资料和稿件版本；末步失败全部回滚", () => {
  const project = {id:"p",itemType:"project",title:"小说",baseRevision:4,content:{world:"原世界",characterCards:[]}};
  localStorage.setItem("qx_server_cache", JSON.stringify([{id:"p",revision:5,payload:project}]));
  localStorage.setItem("qx_project_workspaces",JSON.stringify({p:{aiKey:"local-only",world:"新世界"}}));
  const before = new Map(localStorage.data); localStorage.failKey = "qx_drafts";
  assert.throws(() => commitImport(items(),{projectId:"p",category:"人物"}), /尚未保存/);
  assert.deepEqual(localStorage.data,before);
  commitImport(items(),{projectId:"p",category:"人物"});
  const saved = read("qx_drafts")[0]; assert.equal(saved.baseRevision,5); assert.equal(saved.content.world,"新世界");
  assert.equal(saved.content.characterCards.length,2); assert.equal(saved.content.aiKey,undefined);
  assert.equal(read("qx_project_workspaces").p.aiKey,"local-only"); assert.equal(read("qx_item_versions").p.length,1);
  assert.deepEqual(commitImport(items(),{projectId:"p",category:"人物"}),{added:0,skipped:2});
});
