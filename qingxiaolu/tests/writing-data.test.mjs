import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { queueItem, getLocalItems, fetchServerItems, syncNow, getSyncConflicts, resolveSyncConflict,
  deleteLocalItem, restoreLocalTrashItem } from "../work/writing-tests/sync.mjs";
import { createBackup, parseBackup, restoreBackup } from "../work/writing-tests/backup.mjs";

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
