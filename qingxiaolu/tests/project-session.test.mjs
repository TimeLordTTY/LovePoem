import { test, beforeEach } from "node:test";
import { strict as assert } from "node:assert";
import { queueItem, syncNow, fetchServerItems, getLocalItems, getItemVersions } from "../work/writing-tests/sync.mjs";
import { bindProjectSession, projectSessionRevision, projectPayloadFingerprint, projectSnapshotSignature, PROJECT_SESSION_FIELD } from "../work/writing-tests/projectSession.mjs";
import { createBackup } from "../work/writing-tests/backup.mjs";
class Storage {
  data = new Map(); failKey = "";
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, value) { if (key === this.failKey) { this.failKey = ""; throw new Error("QuotaExceededError"); } this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
}
beforeEach(() => { globalThis.localStorage = new Storage(); localStorage.setItem("qx_sync_token", "test-only"); globalThis.fetch = async () => { throw new Error("禁止真实网络"); }; });
const response = value => ({ ok: true, status: 200, json: async () => value });
const read = key => JSON.parse(localStorage.getItem(key) || "null");
async function save(description, session, upload = false, parent = description, base = 0) {
  const content = { type: "小说", description, world: "世界观", privateNotes: "私密备注" };
  const fingerprint = await projectPayloadFingerprint("项目", content);
  const parentHash = await projectPayloadFingerprint("项目", { ...content, description: parent });
  await queueItem("project", "项目", content, undefined, upload, "project", base, true, () => {
    const all = read("qx_project_workspaces") || {};
    return { qx_project_workspaces: { ...all, project: { ...content, aiKey: "test-only", [PROJECT_SESSION_FIELD]: bindProjectSession(all.project?.[PROJECT_SESSION_FIELD], session,
      projectSessionRevision("project", session, base), fingerprint, parentHash) } } };
  }, session);
}
test("项目确认基线原子保留，拉取移除已同步草稿后旧页面继续写仍使用新基线", async () => {
  await save("第一版", "a", true);
  globalThis.fetch = async () => response({ applied: [{ id: "project", revision: 1 }], conflicts: [] });
  await syncNow();
  const first = getLocalItems()[0];
  globalThis.fetch = async () => response({ changes: [{ ...first, operation: "upsert" }], nextCursor: 1, hasMore: false });
  await fetchServerItems(); assert.equal(read("qx_drafts").length, 0);
  await save("第二版", "a", true);
  assert.equal(read("qx_web_outbox")[0].baseRevision, 1); assert.equal(projectSessionRevision("project", "a", 0), 1);
});
test("未看过提交内容的另一会话不能借用在途确认", async () => {
  await save("提交的第一版", "a", true);
  let finish, started;
  const requestStarted = new Promise(resolve => started = resolve);
  globalThis.fetch = () => { started(); return new Promise(resolve => finish = resolve); };
  const syncing = syncNow(); await requestStarted;
  await save("另一分支", "b", false, "未见过的旧版");
  finish(response({ applied: [{ id: "project", revision: 1 }], conflicts: [] })); await syncing;
  assert.equal(getLocalItems()[0].payload.content.description, "另一分支");
  assert.equal(projectSessionRevision("project", "b", 0), 0); assert.equal(getLocalItems()[0].revision, 0);
});
test("另一页面确实读过提交版本时，可安全承接确认并保留其后续修改", async () => {
  await save("已读的第一版", "a", true);
  let finish, started; const requestStarted = new Promise(resolve => started = resolve);
  globalThis.fetch = () => { started(); return new Promise(resolve => finish = resolve); };
  const syncing = syncNow(); await requestStarted;
  await save("读后修改", "b", false, "已读的第一版");
  finish(response({ applied: [{ id: "project", revision: 1 }], conflicts: [] })); await syncing;
  assert.equal(projectSessionRevision("project", "b", 0), 1); assert.equal(getLocalItems()[0].revision, 1);
  assert.equal(getLocalItems()[0].payload.content.description, "读后修改");
});
test("其他设备项目更新刷新本机资料镜像，保留旧版和本机密钥，不抬高旧会话基线", async () => {
  await save("旧资料", "a", true);
  globalThis.fetch = async () => response({ applied: [{ id: "project", revision: 1 }], conflicts: [] }); await syncNow();
  globalThis.fetch = async () => response({ changes: [{ id: "project", revision: 2, seq: 2, operation: "upsert", payload: {
    id: "project", itemType: "project", title: "新项目名", content: { type: "小说", description: "另一设备新资料", world: "新世界观", privateNotes: "新备注" } } }], nextCursor: 2, hasMore: false });
  await fetchServerItems();
  const workspace = read("qx_project_workspaces").project;
  assert.equal(workspace.description, "另一设备新资料"); assert.equal(workspace.aiKey, "test-only");
  assert.equal(projectSessionRevision("project", "a", 0), 1);
  assert.ok(getItemVersions("project").some(version => version.content.description === "旧资料"));
});
test("拉取远端项目不覆盖尚未同步的本机资料，写入失败整批回滚", async () => {
  await save("本机未同步", "a", false);
  globalThis.fetch = async () => response({ changes: [{ id: "project", revision: 4, seq: 4, operation: "upsert", payload: { id: "project", itemType: "project", title: "项目", content: { description: "远端资料" } } }], nextCursor: 4, hasMore: false });
  await fetchServerItems(); assert.equal(read("qx_project_workspaces").project.description, "本机未同步");
  const before = new Map(localStorage.data); localStorage.failKey = "qx_project_workspaces";
  await assert.rejects(save("必须回滚", "a", false), /尚未保存/); assert.deepEqual(localStorage.data, before);
});
test("确认本身写入失败不留下部分基线更新，重试可以完整确认", async () => {
  await save("第一版", "a", true);
  globalThis.fetch = async () => response({ applied: [{ id: "project", revision: 1 }], conflicts: [] });
  const before = new Map(localStorage.data); localStorage.failKey = "qx_project_workspaces";
  await assert.rejects(syncNow(), /尚未保存/); assert.deepEqual(localStorage.data, before);
  await syncNow(); assert.equal(projectSessionRevision("project", "a", 0), 1);
});
test("项目签名忽略本机会话但核对所有资料；备份不导出会话或密钥", async () => {
  await save("备份资料", "a", false);
  const data = read("qx_project_workspaces").project;
  assert.equal(projectSnapshotSignature("项目", data), projectSnapshotSignature("项目", { ...data, [PROJECT_SESSION_FIELD]: {} }));
  assert.notEqual(projectSnapshotSignature("项目", data), projectSnapshotSignature("项目", { ...data, privateNotes: "不同" }));
  const backup = await createBackup(); assert.equal(backup.workspaces.project[PROJECT_SESSION_FIELD], undefined); assert.equal(backup.workspaces.project.aiKey, undefined);
});
test("另一页面只打开同一版项目，不会抹掉原页面已确认的基线", async () => {
  await save("已确认资料", "a", true);
  globalThis.fetch = async () => response({ applied: [{ id: "project", revision: 1 }], conflicts: [] }); await syncNow();
  await save("已确认资料", "b", false, "已确认资料", 1);
  assert.equal(projectSessionRevision("project", "a", 0), 1); assert.equal(projectSessionRevision("project", "b", 0), 1);
  await save("原页面继续写", "a", true, "已确认资料", 0);
  assert.equal(read("qx_web_outbox")[0].baseRevision, 1);
});
test("远端项目镜像写盘失败时版本、草稿和缓存全部回滚", async () => {
  await save("原资料", "a", true);
  globalThis.fetch = async () => response({ applied: [{ id: "project", revision: 1 }], conflicts: [] }); await syncNow();
  globalThis.fetch = async () => response({ changes: [{ id: "project", revision: 2, seq: 2, operation: "upsert", payload: { id: "project", itemType: "project", title: "项目", content: { description: "远端新资料" } } }], nextCursor: 2, hasMore: false });
  const before = new Map(localStorage.data); localStorage.failKey = "qx_project_workspaces";
  await assert.rejects(fetchServerItems(), /尚未保存/); assert.deepEqual(localStorage.data, before);
  await fetchServerItems(); assert.equal(read("qx_project_workspaces").project.description, "远端新资料");
});
