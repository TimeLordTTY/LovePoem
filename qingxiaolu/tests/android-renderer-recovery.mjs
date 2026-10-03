import { _android } from "playwright-core";
import { strict as assert } from "node:assert";

// 只在专用模拟器中主动终止测试页面，禁止连接真实手机。
const serial = process.env.QX_ANDROID_SERIAL || "emulator-5580";
assert.match(serial, /^emulator-\d+$/);
let device = (await _android.devices()).find(value => value.serial() === serial);
assert.ok(device, "专用模拟器未连接");
try {
  assert.equal((await device.shell("getprop ro.boot.qemu.avd_name")).toString().trim(), "qingxiaolu-author-api34");
  await device.shell("am start -n com.qingxiaolu.app/.MainActivity");
  let page = await (await device.webView({ pkg: "com.qingxiaolu.app" })).page();
  page.setDefaultTimeout(20000);
  await page.context().route("**/qingxiaolu-api/**", route => route.abort());
  if (await page.getByRole("button", { name: "先在本机使用", exact: true }).isVisible())
    await page.getByRole("button", { name: "先在本机使用", exact: true }).click();
  await page.getByRole("button", { name: "创作", exact: true }).click();
  const title = `页面恢复验收-${Date.now()}`;
  const body = "已保存的中文正文，图片和导入记录不应被清空。";
  await page.getByPlaceholder("稿件标题（可选）").fill(title);
  await page.getByPlaceholder("这一刻，想写点什么……").fill(body);
  await page.getByText(/已自动保存/).waitFor();
  await page.getByRole("button", { name: "项目", exact: true }).click();
  await page.getByRole("button", { name: /导入本地文档/ }).click();
  await page.waitForFunction(() => document.querySelector(".preview-head") || document.querySelector(".import-sources"));
  if (await page.getByRole("button", { name: "重新选择", exact: true }).isVisible())
    await page.getByRole("button", { name: "重新选择", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({ name: `${title}.txt`, mimeType: "text/plain", buffer: Buffer.from("等待正式导入的中文预览。") });
  await page.getByRole("heading", { name: "临时预览", exact: true }).waitFor();
  await page.getByText("预览已保存在本机，刷新可恢复", { exact: true }).waitFor();
  const preview = await page.locator(".candidate-list textarea").inputValue();
  const snapshot = page => page.evaluate(async () => {
    const read = (name, store) => new Promise((resolve, reject) => {
      const request = indexedDB.open(name); request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction(store), records = tx.objectStore(store).getAll(), keys = tx.objectStore(store).getAllKeys();
        tx.oncomplete = () => { db.close(); resolve(keys.result.map((key, i) => [key, records.result[i]])); };
        tx.onabort = () => { db.close(); reject(tx.error); };
      };
    });
    // 在页面内计算校验值，避免把所有原图重复传给测试进程，占用额外内存。
    const hash = async value => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(value))))]
      .map(value => value.toString(16).padStart(2, "0")).join("");
    const writing = await read("qingxiaolu-writing", "values");
    const editor = JSON.parse(writing.find(([key]) => key === "qx_editor_autosave")[1]);
    const hashes = await Promise.all(writing.filter(([key]) => key !== "qx_editor_autosave").map(async ([key, value]) => {
      // 恢复会重新建立编辑会话并自动保存；正文、原图和其余资料必须逐字相同。
      const normalized = key === "qx_drafts" ? JSON.parse(value).map(({ savedAt, editorSessionId, ...item }) => item) : value;
      return [key, await hash(normalized)];
    }));
    return { writing: hashes, editor: { title: editor.title, body: editor.body, imagesHash: await hash(editor.images) },
      previewsHash: await hash(await read("qingxiaolu-import-previews", "previews")) };
  });
  const initial = await snapshot(page);
  assert.equal(initial.editor.body, body);
  const appPid = (await device.shell("pidof com.qingxiaolu.app")).toString().trim();
  assert.ok(appPid);
  const recoveryButton = async () => {
    for (let i = 0; i < 6; i++) {
      await device.shell("uiautomator dump /sdcard/qingxiaolu-recovery-test.xml");
      const xml = (await device.shell("cat /sdcard/qingxiaolu-recovery-test.xml")).toString();
      if (!xml.includes('text="页面意外停止"')) continue;
      const button = xml.match(/<node\b[^>]*text="重新打开"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
      if (button) return { x: Math.round((+button[1] + +button[3]) / 2), y: Math.round((+button[2] + +button[4]) / 2) };
    }
    throw new Error("没有出现原生页面恢复提示");
  };
  for (let attempt = 0; attempt < 2; attempt++) {
    const before = await snapshot(page);
    const session = await page.context().newCDPSession(page);
    // CDP 专用故障命令；仅用于上面已核对归属的模拟器页面。
    const crash = session.send("Page.crash").then(() => null, error => error);
    const button = await recoveryButton();
    assert.equal((await device.shell("pidof com.qingxiaolu.app")).toString().trim(), appPid, "主进程仍然被连带终止");
    await device.shell(`input tap ${button.x} ${button.y}`);
    const crashError = await crash;
    if (crashError) assert.match(crashError.message, /closed|crash/i);
    // 同一主进程的调试套接字不变，旧连接缓存的是已关闭页面；重新连接新页面。
    await device.close();
    device = (await _android.devices()).find(value => value.serial() === serial);
    assert.ok(device);
    assert.equal((await device.shell("getprop ro.boot.qemu.avd_name")).toString().trim(), "qingxiaolu-author-api34");
    page = await (await device.webView({ pkg: "com.qingxiaolu.app" })).page(); page.setDefaultTimeout(20000);
    await page.context().route("**/qingxiaolu-api/**", route => route.abort());
    await page.getByRole("button", { name: "项目", exact: true }).waitFor();
    const after = await snapshot(page);
    assert.equal(after.previewsHash, before.previewsHash, "重建页面改变了导入预览");
    assert.deepEqual(after.editor, before.editor);
    assert.deepEqual(after.writing, before.writing, "重建改变了原图、版本或其他作者资料");
    await page.getByRole("button", { name: "项目", exact: true }).click();
    await page.getByRole("button", { name: /导入本地文档/ }).click();
    await page.getByRole("heading", { name: "选择本地文件", exact: true }).waitFor();
    await page.locator(".candidate-list article").filter({ has: page.getByRole("heading", { name: title, exact: true }) })
      .getByRole("button", { name: "恢复预览", exact: true }).click();
    await page.getByRole("heading", { name: "临时预览", exact: true }).waitFor();
    assert.equal(await page.locator(".candidate-list textarea").inputValue(), preview);
    await page.getByText("预览已保存在本机，刷新可恢复", { exact: true }).waitFor();
  }
  console.log(JSON.stringify({ rendererCrashHandled: true, appProcessSurvives: true, savedManuscriptRetained: true, importPreviewRetained: true, repeatedRecovery: true }));
} finally { await device.close(); }
