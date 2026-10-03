import { _android } from "playwright-core";

const serial = process.env.QX_ANDROID_SERIAL || "emulator-5580";
if (!/^emulator-\d+$/.test(serial)) throw new Error("此测试只允许独立模拟器，不修改真实手机。");
const device = (await _android.devices()).find(device => device.serial() === serial);
if (!device) throw new Error("Android 测试设备未连接");
try {
  if ((await device.shell("getprop ro.boot.qemu.avd_name")).toString().trim() !== "qingxiaolu-author-api34")
    throw new Error("测试设备归属不匹配，未执行修改。");
  await device.shell("am start -n com.qingxiaolu.app/.MainActivity");
  const page = await (await device.webView({ pkg: "com.qingxiaolu.app" })).page();
  page.setDefaultTimeout(10000);
  const back = async isStillInside => {
    await page.evaluate(() => document.activeElement?.blur());
    await device.shell("input keyevent 4");
    // 第一次可能只收起输入法；先观察页面处理结果，避免导航已完成时误按第二次退出。
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    if (await isStillInside()) {
      await device.shell("dumpsys input_method");
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const saving = await page.locator('main[aria-busy="true"]').count();
      const failed = await page.getByText(/本机存储不足或不可写/).isVisible();
      if (await isStillInside() && !saving && !failed) await device.shell("input keyevent 4");
    }
  };
  const read = key => page.evaluate(key => new Promise((resolve, reject) => {
    const request = indexedDB.open("qingxiaolu-writing", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result, query = db.transaction("values").objectStore("values").get(key);
      query.onsuccess = () => { db.close(); resolve(JSON.parse(query.result || "null")); };
      query.onerror = () => { db.close(); reject(query.error); };
    };
  }), key);
  if (await page.getByRole("button", { name: "先在本机使用", exact: true }).isVisible())
    await page.getByRole("button", { name: "先在本机使用", exact: true }).click();
  await page.getByRole("button", { name: "项目", exact: true }).click();
  const title = `原生返回验收-${Date.now()}`;
  await page.getByPlaceholder("新项目名称").fill(title);
  await page.getByRole("button", { name: "新建", exact: true }).click();
  await page.getByRole("heading", { name: title, exact: true }).click();
  await page.getByLabel("项目简介").fill("原生返回前的新项目资料");
  await back(() => page.getByLabel("项目简介").isVisible());
  await page.getByRole("heading", { name: "创作项目", exact: true }).waitFor();
  if (!(await read("qx_drafts")).some(item => item.title === title && item.content.description === "原生返回前的新项目资料"))
    throw new Error("项目返回未保存当前资料");
  await page.getByRole("button", { name: "创作", exact: true }).click();
  await page.getByPlaceholder("稿件标题（可选）").fill(title);
  const editor = page.getByPlaceholder("这一刻，想写点什么……");
  await editor.fill("已保存的基线正文"); await page.getByText(/已自动保存/).waitFor();
  const latest = "原生返回前的新正文";
  await editor.fill(latest);
  if (await editor.inputValue() !== latest) throw new Error("测试输入没有完整替换正文");
  await back(() => editor.isVisible());
  await page.getByRole("heading", { name: "创作项目", exact: true }).waitFor();
  if ((await read("qx_editor_autosave")).body !== latest) throw new Error("返回键丢失新正文");
  await page.getByRole("button", { name: "创作", exact: true }).click();
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (key === "qx_drafts") { IDBObjectStore.prototype.put = original; throw new DOMException("test-only", "QuotaExceededError"); }
      return original.call(this, value, key);
    };
  });
  await editor.fill("保存失败时必须保留的正文");
  if (await editor.inputValue() !== "保存失败时必须保留的正文") throw new Error("测试输入未完整替换失败用例正文");
  await back(() => editor.isVisible());
  await page.getByText(/本机存储不足或不可写/).waitFor();
  if (!await editor.isVisible() || await editor.inputValue() !== "保存失败时必须保留的正文") throw new Error("失败后仍离开或丢失编辑内容");
  await back(() => editor.isVisible());
  await page.getByRole("heading", { name: "创作项目", exact: true }).waitFor();
  if ((await read("qx_editor_autosave")).body !== "保存失败时必须保留的正文") throw new Error("重试返回未保存内容");
  console.log(JSON.stringify({ nativePlatform: true, projectBackSaves: true, manuscriptBackSaves: true,
    failedSaveKeepsEditor: true, retryBackSaves: true }));
} finally { await device.close(); }
