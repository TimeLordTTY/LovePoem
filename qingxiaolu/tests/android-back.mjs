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
  const hideKeyboard = async () => {
    const ime = async () => (await device.shell("dumpsys input_method")).toString();
    const current = await ime();
    if (/mInputShown=true/.test(current)) {
      // 先单独收起系统键盘，再按一次页面返回；不能用旧失败提示判断键盘状态。
      await device.shell("input keyevent 4");
    }
    if (/mInputShown=true|mDecorViewVisible=true/.test(current)) {
      let hidden = false;
      for (let i = 0; i < 8; i++) if (!/mInputShown=true|mDecorViewVisible=true/.test(await ime())) { hidden = true; break; }
      if (!hidden) throw new Error("系统键盘未收起，未继续执行页面返回");
    }
    // 提前 blur 会触发键盘关闭动画，此时再按返回可能直接退出页面。
    await page.evaluate(() => document.activeElement?.blur());
  };
  const back = async () => { await hideKeyboard(); await device.shell("input keyevent 4"); };
  const tap = async text => {
    await hideKeyboard();
    // 不等待旧 WebView 无关的页面导航事件，页面结果断言仍使用原有 10 秒期限。
    await page.getByRole("button", { name: text, exact: true }).click({ noWaitAfter: true });
  };
  const read = key => page.evaluate(key => new Promise((resolve, reject) => {
    const request = indexedDB.open("qingxiaolu-writing", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result, query = db.transaction("values").objectStore("values").get(key);
      query.onsuccess = () => {
        db.close(); const value = JSON.parse(query.result || "null");
        // 只传回本测试所核对的字段，避免将整库原图复制到调试通道而拖慢实际按键。
        resolve(key === "qx_drafts" ? value.map(item => ({ title: item.title, content: { description: item.content?.description } })) : { body: value?.body });
      };
      query.onerror = () => { db.close(); reject(query.error); };
    };
  }), key);
  if (await page.getByRole("button", { name: "先在本机使用", exact: true }).isVisible())
    await page.getByRole("button", { name: "先在本机使用", exact: true }).click();
  await hideKeyboard();
  await tap("项目");
  const title = `原生返回验收-${Date.now()}`;
  await page.getByPlaceholder("新项目名称").fill(title);
  await tap("新建");
  await page.getByRole("heading", { name: title, exact: true }).click({ noWaitAfter: true });
  await page.getByLabel("项目简介").fill("原生返回前的新项目资料");
  await back();
  await page.getByRole("heading", { name: "创作项目", exact: true }).waitFor();
  if (!(await read("qx_drafts")).some(item => item.title === title && item.content.description === "原生返回前的新项目资料"))
    throw new Error("项目返回未保存当前资料");
  await tap("创作");
  await page.getByPlaceholder("稿件标题（可选）").fill(title);
  const editor = page.getByPlaceholder("这一刻，想写点什么……");
  await editor.fill("已保存的基线正文"); await page.getByText(/已自动保存/).waitFor();
  const latest = "原生返回前的新正文";
  await editor.fill(latest);
  if (await editor.inputValue() !== latest) throw new Error("测试输入没有完整替换正文");
  await back();
  await page.getByRole("heading", { name: "创作项目", exact: true }).waitFor();
  if ((await read("qx_editor_autosave")).body !== latest) throw new Error("返回键丢失新正文");
  await tap("创作");
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (key === "qx_drafts") { IDBObjectStore.prototype.put = original; throw new DOMException("test-only", "QuotaExceededError"); }
      return original.call(this, value, key);
    };
  });
  await editor.fill("保存失败时必须保留的正文");
  if (await editor.inputValue() !== "保存失败时必须保留的正文") throw new Error("测试输入未完整替换失败用例正文");
  await back();
  await page.getByText(/本机存储不足或不可写/).waitFor();
  if (!await editor.isVisible() || await editor.inputValue() !== "保存失败时必须保留的正文") throw new Error("失败后仍离开或丢失编辑内容");
  await back();
  await page.getByRole("heading", { name: "创作项目", exact: true }).waitFor();
  if ((await read("qx_editor_autosave")).body !== "保存失败时必须保留的正文") throw new Error("重试返回未保存内容");
  console.log(JSON.stringify({ nativePlatform: true, projectBackSaves: true, manuscriptBackSaves: true,
    failedSaveKeepsEditor: true, retryBackSaves: true }));
} finally { await device.close(); }
