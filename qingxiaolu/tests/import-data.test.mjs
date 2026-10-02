import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { csvCandidates, decodeDocument, parseCsv, parseXmindJson, outlineText } from "../work/writing-tests/importers/documentParsing.mjs";
import { candidate } from "../work/writing-tests/importers/types.mjs";
import { commitImport } from "../work/writing-tests/importers/importCommit.mjs";
class MemoryStorage {
  data = new Map(); failKey = "";
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, value) { if (key === this.failKey) { this.failKey = ""; throw new Error("QuotaExceededError"); } this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
}
beforeEach(() => { globalThis.localStorage = new MemoryStorage(); });
const read = key => JSON.parse(localStorage.getItem(key));
const items = () => [candidate("txt", "TXT", "第一篇", "正文一"), candidate("txt", "TXT", "第二篇", "正文二")];
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
