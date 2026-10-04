import { _android } from "playwright-core";
import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";

const [fixtureDirectory, receiverApk] = process.argv.slice(2);
assert.ok(fixtureDirectory && receiverApk, "请提供合成图片目录与独立模拟器验收接收器 APK");
const serial = process.env.QX_ANDROID_SERIAL || "emulator-5580";
assert.match(serial, /^emulator-\d+$/);
const device = (await _android.devices()).find(value => value.serial() === serial);
assert.ok(device);
let receiverInstalled = false, clipboardChanged = false, clipboardMode = "default";
try {
  assert.equal((await device.shell("getprop ro.boot.qemu.avd_name")).toString().trim(), "qingxiaolu-author-api34");
  assert.equal((await device.shell("pm path com.sina.weibo")).toString().trim(), "", "目标包已存在，未替换任何应用");
  const setting = (await device.shell("cmd appops get com.qingxiaolu.app WRITE_CLIPBOARD")).toString();
  clipboardMode = setting.match(/WRITE_CLIPBOARD:\s*(\w+)/)?.[1] || setting.match(/Default mode:\s*(\w+)/)?.[1] || "default";
  assert.ok(["default", "allow"].includes(clipboardMode), "剪贴板初始设置异常，未修改");
  // 每次从新页面开始，清除前一次故障注入的临时桥接函数；保留全部本机创作资料。
  await device.shell("am force-stop com.qingxiaolu.app");
  await device.shell("am start -n com.qingxiaolu.app/.MainActivity");
  const page = await (await device.webView({ pkg: "com.qingxiaolu.app" })).page();
  page.setDefaultTimeout(15000);
  await page.context().route("**/qingxiaolu-api/**", route => route.abort());
  const hideKeyboard = async () => {
    const current = (await device.shell("dumpsys input_method")).toString();
    if (/mInputShown=true/.test(current)) await device.shell("input keyevent 4");
    if (/mInputShown=true|mDecorViewVisible=true/.test(current)) {
      let hidden = false;
      for (let i = 0; i < 8; i++) if (!/mInputShown=true|mDecorViewVisible=true/.test((await device.shell("dumpsys input_method")).toString())) { hidden = true; break; }
      assert.ok(hidden, "系统键盘未收起");
    }
    await page.evaluate(() => document.activeElement?.blur());
  };
  const click = async locator => { await hideKeyboard(); await locator.click({ noWaitAfter: true }); };
  if (await page.getByRole("button", { name: "先在本机使用", exact: true }).isVisible())
    await click(page.getByRole("button", { name: "先在本机使用", exact: true }));
  const files = await Promise.all(["image-0.png", "original.jpg", "original.svg"].map(name => readFile(join(fixtureDirectory, name))));
  const hashes = files.map(value => createHash("sha256").update(value).digest("hex"));
  const title = `转发完整验收-${Date.now()}`, body = "只用于独立模拟器的作者正文，不发布。";
  await click(page.getByRole("button", { name: "创作", exact: true }));
  await click(page.getByRole("button", { name: "新稿件", exact: true }));
  await page.getByPlaceholder("稿件标题（可选）").fill(title);
  await page.getByPlaceholder("这一刻，想写点什么……").fill(body);
  await page.locator('input[type=file][accept="image/*"]').setInputFiles(files.map((buffer, index) => ({
    name: ["image-0.png", "original.jpg", "original.svg"][index], mimeType: ["image/png", "image/jpeg", "image/svg+xml"][index], buffer,
  })));
  await page.locator(".compact img").nth(2).waitFor();
  await click(page.getByRole("button", { name: "记录", exact: true }));
  const card = page.locator("article[data-blog-month]").filter({ has: page.getByRole("heading", { name: title, exact: true }) });
  const picker = page.locator(".forward-picker");
  const openPicker = () => click(card.getByRole("button", { name: "转发", exact: true }));
  const snapshot = name => page.evaluate(name => new Promise((resolve, reject) => {
    const request = indexedDB.open("qingxiaolu-writing", 1); request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result, query = db.transaction("values").objectStore("values").get("qx_drafts");
      query.onsuccess = () => { db.close(); const item = JSON.parse(query.result || "[]").find(value => value.title === name); resolve(item ? JSON.stringify(item.content) : null); };
      query.onerror = () => { db.close(); reject(query.error); };
    };
  }), name);
  const originalContent = await snapshot(title); assert.ok(originalContent);
  assert.equal((await device.shell("pm path com.tencent.mobileqq")).toString().trim(), "", "QQ 已安装，缺少应用场景不适用");
  const missingQQ = await page.evaluate(body => window.Capacitor.nativePromise("AppDraft", "open", { target: "QQ说说", title: "验收", text: body, images: [] }), body);
  assert.equal(missingQQ.opened, false); assert.ok(!missingQQ.needsAccessibility, "没有 QQ 时仍要求开启无障碍");
  const initialPid = (await device.shell("pidof com.qingxiaolu.app")).toString().trim();
  await openPicker(); await hideKeyboard(); await device.shell("input keyevent 4");
  await picker.waitFor({ state: "hidden" });
  assert.equal((await device.shell("pidof com.qingxiaolu.app")).toString().trim(), initialPid);
  assert.ok(await card.isVisible(), "关闭转发面板跳离了原来的记录");
  await page.evaluate(() => {
    window.qxForwardTest = { original: window.Capacitor.nativePromise, mode: "reject", calls: 0, unhandled: 0 };
    window.addEventListener("unhandledrejection", () => window.qxForwardTest.unhandled++);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new DOMException("test-only", "NotAllowedError"); } } });
    window.Capacitor.nativePromise = (plugin, method, options) => {
      const state = window.qxForwardTest;
      if (plugin !== "AppDraft" || method !== "open") return state.original(plugin, method, options);
      state.calls++;
      if (state.mode === "reject") return Promise.reject(new Error("test-only-target-unavailable"));
      if (state.mode === "cancel") return Promise.reject(new DOMException("test-only", "AbortError"));
      if (state.mode === "pending") return new Promise(resolve => state.resolve = resolve);
      return state.original(plugin, method, options).then(result => { state.result = result; return result; });
    };
  });
  await openPicker(); await click(picker.getByRole("button", { name: "微博", exact: true }));
  await picker.getByText(/转发失败/).waitFor();
  assert.equal(await page.evaluate(() => window.qxForwardTest.unhandled), 0);
  await page.evaluate(() => window.qxForwardTest.mode = "pending");
  const calls = await page.evaluate(() => window.qxForwardTest.calls);
  await page.evaluate(() => { const button = [...document.querySelectorAll(".forward-targets button")].find(value => value.textContent === "微博"); button.click(); button.click(); });
  await picker.getByText("正在准备转发内容…", { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.qxForwardTest.calls), calls + 1);
  assert.ok(await picker.getByRole("button", { name: "微博", exact: true }).isDisabled());
  await page.evaluate(() => window.qxForwardTest.resolve({ opened: false, copied: false }));
  await picker.getByText(/未确认正文复制成功/).waitFor();
  await page.evaluate(() => window.qxForwardTest.mode = "cancel");
  await click(picker.getByRole("button", { name: "微博", exact: true }));
  await picker.getByText("已取消转发，原稿仍保留。", { exact: true }).waitFor();
  await page.evaluate(() => window.qxForwardTest.mode = "native");
  const sentinel = "旧剪贴板-独立验收";
  const seeded = await page.evaluate(sentinel => window.qxForwardTest.original("AppDraft", "open", { target: "微博", title: "验收", text: sentinel, images: [] }), sentinel);
  assert.equal(seeded.copied, true, "剪贴板正常复制基线未成立，未执行拒绝写入验收");
  const appPid = (await device.shell("pidof com.qingxiaolu.app")).toString().trim();
  await device.shell("cmd appops set com.qingxiaolu.app WRITE_CLIPBOARD deny"); clipboardChanged = true;
  await click(picker.getByRole("button", { name: "微博", exact: true }));
  await picker.getByText(/未确认正文复制成功/).waitFor();
  await page.waitForFunction(() => window.qxForwardTest.result?.copied === false);
  assert.equal((await device.shell("pidof com.qingxiaolu.app")).toString().trim(), appPid, "系统拒绝复制导致 App 退出");
  await page.evaluate(() => { const field = document.createElement("textarea"); field.id = "qx-test-paste"; field.style.cssText = "position:fixed;top:100px;left:20px;z-index:99999"; document.body.append(field); field.focus(); });
  await device.shell("input keyevent 279");
  await page.waitForFunction(() => document.querySelector("#qx-test-paste")?.value);
  assert.equal(await page.locator("#qx-test-paste").inputValue(), sentinel);
  await hideKeyboard(); await page.evaluate(() => document.querySelector("#qx-test-paste").remove());
  await click(picker.getByRole("button", { name: "取消", exact: true }));
  await click(card.getByRole("button", { name: "复制正文", exact: true }));
  await page.getByText("复制未成功，请打开稿件后手动选中正文复制。原稿仍保留。", { exact: true }).waitFor();
  await device.shell(`cmd appops set com.qingxiaolu.app WRITE_CLIPBOARD ${clipboardMode}`); clipboardChanged = false;
  await click(card.getByRole("button", { name: "复制正文", exact: true }));
  await page.getByText("已复制完整正文，图片和原稿保持不变。", { exact: true }).waitFor();
  await device.installApk(await readFile(receiverApk)); receiverInstalled = true;
  assert.match((await device.shell("pm path com.sina.weibo")).toString(), /package:/, "验收接收器未安装成功");
  await device.shell("am start -n com.qingxiaolu.app/.MainActivity");
  const receipt = async action => {
    for (let i = 0; i < 30; i++) {
      const raw = (await device.shell("run-as com.sina.weibo cat files/result.json")).toString();
      if (!raw.trim().startsWith("{")) continue;
      const result = JSON.parse(raw);
      if (result.action === action) { assert.ok(!result.error, result.error); return result; }
    }
    throw new Error("未收到验收接收器回执");
  };
  const returnToAuthor = async () => {
    await device.shell("am start -n com.qingxiaolu.app/.MainActivity");
    let focused = false;
    for (let i = 0; i < 10; i++) if (/mCurrentFocus=.*com\.qingxiaolu\.app/.test((await device.shell("dumpsys window")).toString())) { focused = true; break; }
    assert.ok(focused, "作者界面未回到前台");
    await page.getByRole("button", { name: "记录", exact: true }).waitFor();
  };
  await openPicker(); await click(picker.getByRole("button", { name: "微博", exact: true }));
  const shared = await receipt("android.intent.action.SEND_MULTIPLE");
  assert.equal(shared.text, body); assert.equal(shared.images.length, 3);
  assert.deepEqual(shared.images.map(value => value.hash), hashes);
  assert.deepEqual(shared.images.map(value => value.mime), ["image/png", "image/jpeg", "image/svg+xml"]);
  await returnToAuthor(); await picker.waitFor({ state: "hidden" });
  await page.getByText(/已交给分享页 3 张图片/).waitFor();
  assert.match((await device.shell("run-as com.sina.weibo pm disable com.sina.weibo/.ShareReceiver")).toString(), /disabled/);
  assert.match((await device.shell("cmd package resolve-activity --brief -a android.intent.action.SEND_MULTIPLE -t 'image/*' -p com.sina.weibo")).toString(), /No activity/);
  await openPicker(); await click(picker.getByRole("button", { name: "微博", exact: true }));
  const launched = await receipt("android.intent.action.MAIN"); assert.equal(launched.images.length, 0);
  await returnToAuthor(); await page.getByText(/图片需要手动添加/).waitFor();
  assert.match((await device.shell("run-as com.sina.weibo pm enable com.sina.weibo/.ShareReceiver")).toString(), /enabled/);
  const manyTitle = `${title}-11张`;
  const manyFiles = await Promise.all(Array.from({ length: 11 }, (_, index) => readFile(join(fixtureDirectory, `image-${index}.png`))));
  const manyImages = manyFiles.map(buffer => `data:image/png;base64,${buffer.toString("base64")}`);
  await click(page.getByRole("button", { name: "项目", exact: true }));
  await click(page.getByRole("button", { name: /导入本地文档/ }));
  await page.getByRole("heading", { name: "选择本地文件", exact: true }).waitFor();
  await page.locator("input[type=file]").setInputFiles({ name: `${manyTitle}.json`, mimeType: "application/json", buffer: Buffer.from(JSON.stringify([{ title: manyTitle, text: body, images: manyImages }])) });
  await click(page.getByRole("button", { name: "正式导入已选内容（1）", exact: true }));
  await page.getByText(/已正式导入 1 条内容/).waitFor();
  await page.getByRole("heading", { name: "创作项目", exact: true }).waitFor();
  await click(page.getByRole("button", { name: "记录", exact: true }));
  const manyOriginal = await snapshot(manyTitle);
  const manyCard = page.locator("article[data-blog-month]").filter({ has: page.getByRole("heading", { name: manyTitle, exact: true }) });
  await click(manyCard.getByRole("button", { name: "转发", exact: true }));
  const expectedHashes = manyFiles.map(buffer => createHash("sha256").update(buffer).digest("hex"));
  for (let batch = 0; batch < 2; batch++) {
    await picker.getByLabel("照片批次").selectOption(String(batch));
    await device.shell("run-as com.sina.weibo rm files/result.json");
    await click(picker.getByRole("button", { name: "微博", exact: true }));
    const received = await receipt("android.intent.action.SEND_MULTIPLE");
    assert.deepEqual(received.images.map(value => value.hash), expectedHashes.slice(batch * 9, batch * 9 + 9));
    await returnToAuthor();
    if (!batch) assert.ok(await picker.isVisible(), "还有下一批照片时重试面板被关闭");
  }
  await picker.waitFor({ state: "hidden" });
  assert.equal(await snapshot(title), originalContent); assert.equal(await snapshot(manyTitle), manyOriginal);
  assert.equal(await page.evaluate(() => window.qxForwardTest.unhandled), 0);
  console.log(JSON.stringify({ nativeClipboardDeniedNoCrash: true, nativeCopyButtonRetry: true, oldClipboardRetained: true, exceptionHandled: true, cancellationHandled: true,
    duplicateClickBlocked: true, actualIntentReceiver: true, originalPngJpegSvgBytes: true, imageMimeAccurate: true,
    launcherFallbackHonest: true, elevenImagesTwoBatches: true, nativeBackDismissesPicker: true, missingQQSkipsPermissionRequest: true,
    originalManuscriptsPreserved: true, realThirdPartyApp: false }));
} finally {
  if (clipboardChanged) await device.shell(`cmd appops set com.qingxiaolu.app WRITE_CLIPBOARD ${clipboardMode}`);
  if (receiverInstalled) await device.shell("pm uninstall com.sina.weibo");
  await device.close();
}
