import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { queueItem, getLocalItems, fetchServerItems, syncNow, getSyncConflicts, resolveSyncConflict,
  deleteLocalItem, restoreLocalTrashItem, queueLocalBatch, loginSync } from "../work/writing-tests/sync.mjs";
import { createBackup, createSnapshotBackup, parseBackup, restoreBackup, backupDate } from "../work/writing-tests/backup.mjs";

class MemoryStorage {
  data = new Map();
  failKey = "";
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, value) { if (key === this.failKey) { this.failKey = ""; throw new Error("QuotaExceededError"); } this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
}
beforeEach(() => { globalThis.localStorage = new MemoryStorage(); globalThis.fetch = async () => { throw new Error("测试禁止真实网络请求"); }; });
const read = (key) => JSON.parse(localStorage.getItem(key) || "[]");
const payload = (id, text = "正文") => ({ id, itemType: "article", title: id, projectId: "project", content: { text, chapterId: "chapter-stable", images: ["data:image/png;base64,AA=="] } });
const cloud = (id, text = "云端正文", revision = 2) => ({ id, revision, seq: 42, operation: "upsert", payload: { ...payload(id, text), revision } });
const response = (data) => ({ ok: true, status: 200, json: async () => data });

test("登录区分服务不可用、错误凭据和网络失败，不误报密码错误", async () => {
  globalThis.fetch=async()=>({ok:false,status:503});
  await assert.rejects(loginSync("fixture","fixture"),/云端暂时不可用/);
  globalThis.fetch=async()=>({ok:false,status:401});
  await assert.rejects(loginSync("fixture","fixture"),/用户名或密码错误/);
  globalThis.fetch=async()=>{throw new TypeError("Failed to fetch")};
  await assert.rejects(loginSync("fixture","fixture"),/网络暂时无法连接/);
});

test("异常登录响应不能写入伪会话或覆盖原会话，取消后不提交登录", async () => {
  localStorage.setItem("qx_sync_token","previous-synthetic-session");
  for(const data of [null,{}, {token:""}]) {
    globalThis.fetch=async()=>response(data);
    await assert.rejects(loginSync("fixture","fixture"),/登录服务返回了异常响应/);
    assert.equal(localStorage.getItem("qx_sync_token"),"previous-synthetic-session");
  }
  const controller=new AbortController();
  globalThis.fetch=async()=>({ok:true,status:200,json:async()=>{controller.abort();return {token:"cancelled-synthetic-session"}}});
  await assert.rejects(loginSync("fixture","fixture",controller.signal),{name:"AbortError"});
  assert.equal(localStorage.getItem("qx_sync_token"),"previous-synthetic-session");
});

test("无效备份和空记录给出可理解错误，解析失败不修改本机内容", async () => {
  await queueItem("article", "当前稿件", {text:"当前正文"}, undefined, false, "current");
  const backup = await createBackup(), before = new Map(localStorage.data);
  for (const value of [null, [], {...backup,items:[null]}, {...backup,trash:[null]}])
    assert.throws(()=>parseBackup(JSON.stringify(value)),/不是有效的情晓录完整备份/);
  assert.throws(()=>parseBackup('{"format":'),/JSON.*尚未写入/);
  assert.deepEqual(localStorage.data,before);
});

test("备份内重复稿件 ID 在写入前拒绝，不产生重复记录或错误数量", async () => {
  await queueItem("article", "当前稿件", {text:"当前正文"}, undefined, false, "current");
  const backup = await createBackup(), before = new Map(localStorage.data);
  backup.items.push({id:"duplicate",payload:payload("duplicate","第一份正文")},{id:"duplicate",payload:payload("duplicate","另一份正文")});
  assert.throws(()=>parseBackup(JSON.stringify(backup)),/重复的稿件 ID.*尚未写入/);
  assert.throws(()=>restoreBackup(backup),/重复的稿件 ID.*尚未写入/);
  assert.deepEqual(localStorage.data,before);
});

test("旧备份的删除标记不能隐藏当前已经恢复或修改的稿件", async () => {
  await queueItem("article", "旧稿", { text: "旧正文" }, "project", false, "kept");
  await deleteLocalItem(getLocalItems()[0]);
  const backup = await createBackup();
  await restoreLocalTrashItem("kept");
  await queueItem("article", "现在的稿件", { text: "恢复后继续写的新正文" }, "project", false, "kept");
  restoreBackup(backup);
  const kept = getLocalItems().find(item => item.id === "kept");
  assert.equal(kept?.payload.content.text, "恢复后继续写的新正文");
  assert.equal(read("qx_deleted_ids").includes("kept"), false);
  assert.equal(read("qx_local_trash").some(item => item.id === "kept"), false);
});

test("跳过已有项目时不导入旧工作区遮住当前项目资料", async () => {
  await queueItem("project", "当前小说", { description: "本机新资料" }, undefined, false, "project");
  const backup = await createBackup();
  backup.workspaces.project = { description: "旧备份资料" };
  backup.items[0].payload.content.description = "旧备份资料";
  const result = restoreBackup(backup);
  assert.equal(result.skipped, 1);
  assert.equal(getLocalItems()[0].payload.content.description, "本机新资料");
  assert.equal(read("qx_project_workspaces").project, undefined);
});

test("云端稿件从回收站恢复沿用删除时已读取的版本，不冒领后续云端版本", async () => {
  localStorage.setItem("qx_server_cache", JSON.stringify([cloud("restored-cloud", "删除前原稿", 6)]));
  await deleteLocalItem(getLocalItems()[0]);
  localStorage.setItem("qx_server_cache", JSON.stringify([cloud("restored-cloud", "另一设备后续修改", 7)]));
  await restoreLocalTrashItem("restored-cloud");
  const restored = getLocalItems().find(item => item.id === "restored-cloud");
  assert.equal(restored.revision, 6);
  assert.equal(restored.payload.content.text, "删除前原稿");
  assert.equal(read("qx_web_outbox").length, 0);
});

test("项目完整备份包含回收站稿件的历史版本，恢复后仍可找回旧稿", async () => {
  await queueItem("project", "小说", {}, undefined, false, "project");
  await queueItem("article", "第一版", { text: "旧正文" }, "project", false, "deleted-chapter");
  await queueItem("article", "第二版", { text: "新正文" }, "project", false, "deleted-chapter");
  await deleteLocalItem(getLocalItems().find(item => item.id === "deleted-chapter"));
  const backup = parseBackup(JSON.stringify(await createBackup("project")));
  assert.equal(backup.trash[0].id, "deleted-chapter");
  assert.equal(backup.versions["deleted-chapter"][0].content.text, "旧正文");
  globalThis.localStorage = new MemoryStorage();
  restoreBackup(backup);
  await restoreLocalTrashItem("deleted-chapter");
  assert.equal(getLocalItems().find(item => item.id === "deleted-chapter").payload.content.text, "新正文");
  assert.equal(read("qx_item_versions")["deleted-chapter"][0].content.text, "旧正文");
});

test("云端稿件的展示时间使用实际改稿日期，保留原同步序号用于游标", () => {
  localStorage.setItem("qx_server_cache",JSON.stringify([{...cloud("dated"),changedAt:"2026-10-03T02:00:00.000Z"}]));
  const item=getLocalItems()[0];assert.equal(item.seq,Date.parse("2026-10-03T02:00:00.000Z"));assert.equal(item.cursorSeq,42);
});

test("旧页面恢复备份保留草稿与图片，排除 AI 密钥等凭据", async () => {
  const backup = await createSnapshotBackup({ qx_drafts: JSON.stringify([payload("legacy")]),
    qx_project_workspaces: JSON.stringify({ project: {world:"旧页面资料", aiKey:"test-only"} }),
    qx_item_versions: "{}", qx_server_cache: "[]", qx_editor_autosave: JSON.stringify({title:"编辑内容",body:"尚未保存"}) });
  assert.equal(backup.items[0].payload.content.text,"正文");
  assert.equal(backup.workspaces.project.world,"旧页面资料");assert.equal(backup.workspaces.project.aiKey,undefined);
  assert.equal(backup.editor.body,"尚未保存");assert.equal(backup.items[0].payload.content.images.length,1);
});

test("冲突保留双方的最后写入失败时两版、版本、缓存和队列全部保持原状", async () => {
  await queueItem("article","本机稿",{text:"本机正文"},"project",true,"conflicted",2);
  localStorage.setItem("qx_sync_conflicts",JSON.stringify([{id:"conflicted",local:read("qx_drafts")[0],server:{revision:3,item_type:"article",project_id:"project",title:"云端稿",content_json:JSON.stringify({text:"云端正文"})}}]));
  const before=new Map(localStorage.data);localStorage.failKey="qx_drafts";
  await assert.rejects(resolveSyncConflict("conflicted","both"),/尚未保存/);assert.deepEqual(localStorage.data,before);
  await resolveSyncConflict("conflicted","both");assert.equal(getLocalItems().length,2);assert.equal(getSyncConflicts().length,0);
});

test("文件夹整批读回失败撤销资料和版本，成功后保留当前云端基线与旧内容", () => {
  localStorage.setItem("qx_server_cache", JSON.stringify([cloud("a", "旧正文", 7)]));
  const before=new Map(localStorage.data);localStorage.failKey="qx_drafts";
  const change={...payload("a","文件夹新正文"),title:"新标题"};
  assert.throws(()=>queueLocalBatch([change],{qx_project_workspaces:{project:{world:"新资料"}}}),/尚未保存/);
  assert.deepEqual(localStorage.data,before);
  queueLocalBatch([change],{qx_project_workspaces:{project:{world:"新资料"}}});
  assert.equal(read("qx_drafts")[0].baseRevision,7);assert.equal(JSON.parse(localStorage.getItem("qx_item_versions")).a[0].content.text,"旧正文");
  queueLocalBatch([{...change,title:"只改标题"}]);
  assert.equal(JSON.parse(localStorage.getItem("qx_item_versions")).a[0].title,"新标题");
  assert.throws(()=>queueLocalBatch([change,change]),/重复/);
});

test("超过 500 条不会删掉旧稿，存储失败明确报错且原稿保留", async () => {
  localStorage.setItem("qx_drafts", JSON.stringify(Array.from({ length: 500 }, (_, i) => payload(`old-${i}`))));
  await queueItem("article", "新稿", { text: "新内容" }, undefined, false, "new");
  assert.equal(getLocalItems().length, 501);
  assert.ok(getLocalItems().some((item) => item.id === "old-499"));
  localStorage.failKey = "qx_drafts";
  await assert.rejects(queueItem("article", "失败稿", { text: "保留编辑页" }), /尚未保存/);
  assert.equal(getLocalItems().length, 501);
});

test("同步后保留离线副本，并能编辑到云端最新 revision", async () => {
  localStorage.setItem("qx_sync_token", "test-only");
  await queueItem("article", "稿件", { text: "正文" }, "project", true, "a");
  globalThis.fetch = async () => response({ applied: [{ id: "a", revision: 1 }], conflicts: [] });
  await syncNow();
  assert.equal(getLocalItems()[0].syncState, "synced");
  globalThis.fetch = async () => response({ changes: [cloud("a", "其他设备的新文字", 2)], nextCursor: 42, hasMore: false });
  await fetchServerItems();
  globalThis.fetch = async () => { throw new Error("offline"); };
  await assert.rejects(fetchServerItems(), /offline/);
  assert.equal(getLocalItems()[0].payload.content.text, "其他设备的新文字");
  assert.equal(getLocalItems()[0].revision, 2);
});

test("同步在途继续改稿，响应不会把新文字标成已同步或清掉", async () => {
  localStorage.setItem("qx_sync_token", "test-only");
  await queueItem("article", "稿件", { text: "旧文字" }, undefined, true, "a");
  let finish;
  globalThis.fetch = () => new Promise((resolve) => { finish = resolve; });
  const syncing = syncNow();
  await queueItem("article", "稿件", { text: "新文字" }, undefined, false, "a");
  finish(response({ applied: [{ id: "a", revision: 1 }], conflicts: [] }));
  await syncing;
  assert.equal(getLocalItems()[0].payload.content.text, "新文字");
  assert.equal(getLocalItems()[0].syncState, "local");
  assert.equal(getLocalItems()[0].revision, 1);
});

const editorExtra = (text, sessionId = "editor-a", base = 0) => ({ qx_editor_autosave: {
  editingId: "a", sessionId, title: "稿件", body: text, metadata: { _baseRevision: base },
} });

test("列表同步确认更新同一编辑会话，旧闭包自动保存不重置基线", async () => {
  localStorage.setItem("qx_sync_token", "test-only");
  await queueItem("article", "稿件", { text: "初稿" }, undefined, true, "a", 0, true, editorExtra("初稿"));
  globalThis.fetch = async () => response({ applied: [{ id: "a", revision: 1 }], conflicts: [] });
  await syncNow();
  assert.equal(JSON.parse(localStorage.getItem("qx_editor_autosave")).metadata._baseRevision, 1);
  await queueItem("article", "稿件", { text: "继续写" }, undefined, false, "a", 0, false, editorExtra("继续写"));
  assert.equal(read("qx_drafts")[0].baseRevision, 1);
  assert.equal(JSON.parse(localStorage.getItem("qx_editor_autosave")).metadata._baseRevision, 1);
});

test("同一编辑会话同步在途继续写作，确认只更新基线并保留新正文", async () => {
  localStorage.setItem("qx_sync_token", "test-only");
  await queueItem("article", "稿件", { text: "初稿" }, undefined, true, "a", 0, true, editorExtra("初稿"));
  let finish; globalThis.fetch = () => new Promise(resolve => { finish = resolve; });
  const syncing = syncNow();
  await queueItem("article", "稿件", { text: "在途新稿" }, undefined, false, "a", 0, false, editorExtra("在途新稿"));
  finish(response({ applied: [{ id: "a", revision: 1 }], conflicts: [] })); await syncing;
  const editor = JSON.parse(localStorage.getItem("qx_editor_autosave"));
  assert.equal(editor.body, "在途新稿"); assert.equal(editor.metadata._baseRevision, 1);
  assert.equal(read("qx_drafts")[0].content.text, "在途新稿");
});

test("另一个编辑会话的在途修改不借用前一会话的确认基线", async () => {
  localStorage.setItem("qx_sync_token", "test-only");
  await queueItem("article", "稿件", { text: "A 的稿" }, undefined, true, "a", 0, true, editorExtra("A 的稿"));
  let finish; globalThis.fetch = () => new Promise(resolve => { finish = resolve; });
  const syncing = syncNow();
  await queueItem("article", "稿件", { text: "B 的稿" }, undefined, false, "a", 0, false, editorExtra("B 的稿", "editor-b"));
  finish(response({ applied: [{ id: "a", revision: 1 }], conflicts: [] })); await syncing;
  assert.equal(read("qx_drafts")[0].baseRevision, 0);
  assert.equal(JSON.parse(localStorage.getItem("qx_editor_autosave")).metadata._baseRevision, 0);
  assert.equal(read("qx_drafts")[0].content.text, "B 的稿");
});

test("读取另一设备新稿不会抬高仍在编辑的旧稿基线", async () => {
  localStorage.setItem("qx_sync_token", "test-only");
  await queueItem("article", "稿件", { text: "我的旧稿" }, undefined, false, "a", 1, true, editorExtra("我的旧稿", "editor-a", 1));
  globalThis.fetch = async () => response({ changes: [cloud("a", "另一设备新稿", 2)], nextCursor: 42, hasMore: false });
  await fetchServerItems();
  await queueItem("article", "稿件", { text: "继续写旧稿" }, undefined, true, "a", 1, false, editorExtra("继续写旧稿", "editor-a", 1));
  assert.equal(read("qx_web_outbox")[0].baseRevision, 1);
  globalThis.fetch = async () => response({ applied: [], conflicts: [{ id: "a", server: { revision: 2, content_json: JSON.stringify({ text: "另一设备新稿" }) } }] });
  await assert.rejects(syncNow(), /版本冲突/);
  assert.equal(getSyncConflicts()[0].local.content.text, "继续写旧稿");
});

test("历史待同步内容不冒领当前另一编辑会话的确认", async () => {
  localStorage.setItem("qx_sync_token", "test-only");
  await queueItem("article", "稿件", { text: "A 的稿" }, undefined, true, "a", 0, true, editorExtra("A 的稿"));
  const pending = localStorage.getItem("qx_web_outbox");
  await queueItem("article", "稿件", { text: "B 的稿" }, undefined, false, "a", 0, false, editorExtra("B 的稿", "editor-b"));
  localStorage.setItem("qx_web_outbox", pending);
  globalThis.fetch = async () => response({ applied: [{ id: "a", revision: 1 }], conflicts: [] });
  await syncNow();
  assert.equal(read("qx_drafts")[0].baseRevision, 0);
  assert.equal(JSON.parse(localStorage.getItem("qx_editor_autosave")).metadata._baseRevision, 0);
});

test("重复选择同步同一稿件只发送最新文字", async () => {
  await queueItem("article", "稿件", { text: "初稿" }, undefined, true, "a");
  await queueItem("article", "稿件", { text: "终稿" }, undefined, true, "a");
  assert.equal(read("qx_web_outbox").length, 1);
  assert.equal(read("qx_web_outbox")[0].content.text, "终稿");
});

test("冲突保留双方，云端作为原稿，本机版成为独立未上传副本", async () => {
  localStorage.setItem("qx_sync_token", "test-only");
  await queueItem("article", "冲突稿", { text: "本机文字" }, "project", true, "a", 1);
  globalThis.fetch = async () => response({ applied: [], conflicts: [{ id: "a", server: { revision: 2, item_type: "article", project_id: "project", title: "云端标题", content_json: JSON.stringify({ text: "云端文字" }) } }] });
  await assert.rejects(syncNow(), /版本冲突/);
  assert.equal(getSyncConflicts().length, 1);
  await resolveSyncConflict("a", "both");
  assert.equal(getSyncConflicts().length, 0);
  assert.equal(getLocalItems().find((item) => item.id === "a").payload.content.text, "云端文字");
  assert.ok(getLocalItems().some((item) => item.id !== "a" && item.payload.content.text === "本机文字"));
  assert.equal(read("qx_web_outbox").length, 0);
});

test("完整备份往返保留正文、图片和章节 ID，排除账号和 AI 密钥", async () => {
  await queueItem("project", "小说", { chapters: [{ id: "chapter-stable", title: "第一章" }], aiKey: "test-private" }, undefined, false, "project");
  const item = payload("a");
  await queueItem(item.itemType, item.title, item.content, item.projectId, false, item.id);
  localStorage.setItem("qx_project_workspaces", JSON.stringify({ project: { chapters: [{ id: "chapter-stable" }], privateNotes: "作者备注", aiKey: "test-private" } }));
  localStorage.setItem("qx_sync_token", "not-for-backup");
  const backup = parseBackup(JSON.stringify(await createBackup()));
  assert.ok(!JSON.stringify(backup).includes("test-private"));
  assert.ok(!JSON.stringify(backup).includes("not-for-backup"));
  globalThis.localStorage = new MemoryStorage();
  const result = restoreBackup(backup);
  assert.equal(result.restored, 2);
  const restored = getLocalItems().find((entry) => entry.id === "a");
  assert.equal(restored.payload.content.chapterId, "chapter-stable");
  assert.equal(restored.payload.content.images[0], "data:image/png;base64,AA==");
  assert.equal(read("qx_web_outbox").length, 0);
  const again = restoreBackup(backup);
  assert.equal(again.restored, 0);
  assert.equal(again.skipped, 2);
});

test("恢复遇到存储失败撤销本次写入，已有稿件仍然存在", async () => {
  await queueItem("article", "原稿", { text: "原文" }, undefined, false, "a");
  const backup = await createBackup();
  backup.items.push({ id: "b", payload: payload("b") });
  const before = new Map(localStorage.data);
  localStorage.failKey = "qx_project_workspaces";
  assert.throws(() => restoreBackup(backup), /尚未保存/);
  assert.deepEqual(localStorage.data, before);
  assert.throws(() => parseBackup('{"format":"other"}'), /有效/);
});

test("本地删除撤销待上传，恢复后刷新仍能找回稿件", async () => {
  await queueItem("article", "稿件", { text: "正文" }, undefined, true, "a");
  deleteLocalItem(getLocalItems()[0]);
  assert.equal(getLocalItems().length, 0);
  assert.equal(read("qx_web_outbox").length, 0);
  restoreLocalTrashItem("a");
  assert.equal(getLocalItems()[0].payload.content.text, "正文");
});

test("批量同步超过 500 条会分批发送，不漏掉最后一篇", async () => {
  localStorage.setItem("qx_sync_token", "test-only");
  const items = Array.from({ length: 501 }, (_, i) => ({ ...payload(`batch-${i}`), syncState: "pending" }));
  localStorage.setItem("qx_drafts", JSON.stringify(items));
  localStorage.setItem("qx_web_outbox", JSON.stringify(items));
  const batches = [];
  globalThis.fetch = async (_, options) => {
    const changes = JSON.parse(options.body).changes;
    batches.push(changes.length);
    return response({ applied: changes.map((item) => ({ id: item.id, revision: 1 })), conflicts: [] });
  };
  await Promise.all([syncNow(), syncNow()]);
  assert.deepEqual(batches, [500, 1]);
  assert.equal(read("qx_web_outbox").length, 0);
  assert.equal(getLocalItems().length, 501);
});

test("冲突后继续改稿，再保留本机版使用最新文字和云端基线", async () => {
  localStorage.setItem("qx_sync_token", "test-only");
  await queueItem("article", "稿件", { text: "旧本机版" }, undefined, true, "a", 1);
  globalThis.fetch = async () => response({ applied: [], conflicts: [{ id: "a", server: { revision: 2, item_type: "article", title: "稿件", content_json: '{"text":"云端版"}' } }] });
  await assert.rejects(syncNow());
  await queueItem("article", "稿件", { text: "更新的本机版" }, undefined, false, "a", 1);
  await resolveSyncConflict("a", "local");
  assert.equal(read("qx_web_outbox")[0].baseRevision, 2);
  assert.equal(read("qx_web_outbox")[0].content.text, "更新的本机版");
});

test("备份可以包含未写入存储的当前编辑内容", async () => {
  const item = { id: "unsaved", payload: payload("unsaved", "编辑器中的最新文字") };
  const backup = await createBackup(undefined, item);
  assert.equal(backup.items[0].payload.content.text, "编辑器中的最新文字");
  assert.equal(backup.editor.body, "编辑器中的最新文字");
  assert.equal(getLocalItems().length, 0);
});

test("回收站写入失败不会先删除原稿", async () => {
  await queueItem("article", "稿件", { text: "正文" }, undefined, false, "a");
  localStorage.failKey = "qx_local_trash";
  assert.throws(() => deleteLocalItem(getLocalItems()[0]), /尚未保存/);
  assert.equal(getLocalItems()[0].id, "a");
});

test("云端响应后本机写入失败，稿件及待同步队列均保留", async () => {
  localStorage.setItem("qx_sync_token", "test-only");
  await queueItem("article", "稿件", { text: "正文" }, undefined, true, "a");
  globalThis.fetch = async () => response({ applied: [{ id: "a", revision: 1 }], conflicts: [] });
  localStorage.failKey = "qx_drafts";
  await assert.rejects(syncNow(), /尚未保存/);
  assert.equal(read("qx_web_outbox").length, 1);
  assert.equal(getLocalItems()[0].payload.content.text, "正文");
});

test("远程图片不可读取时明确拒绝生成不完整备份", async () => {
  await queueItem("article", "图片稿", { text: "正文", images: ["https://example.invalid/photo.png"] });
  await assert.rejects(createBackup(), /完整备份未生成/);
});

test("凌晨生成的备份使用本机当天日期，而非 UTC 前一天", () => {
  assert.equal(backupDate(new Date(2026, 9, 2, 0, 15)), "2026-10-02");
});
