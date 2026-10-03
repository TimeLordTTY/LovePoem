import { _android } from "playwright-core";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const path = process.argv[2];
if (!path) throw new Error("请提供作者验收用双页、双插图 PDF 测试文件路径");
const original = await readFile(path);
const chinese = process.argv.includes("--chinese");
const fixtureTitle = chinese ? "原生-中文PDF-验收" : "原生-PDF-验收";
const serial = process.env.QX_ANDROID_SERIAL || "emulator-5580";
if (!/^emulator-\d+$/.test(serial)) throw new Error("此测试只使用专用模拟器");
const device = (await _android.devices()).find(device => device.serial() === serial);
if (!device) throw new Error("专用模拟器未连接");
try {
  if ((await device.shell("getprop ro.boot.qemu.avd_name")).toString().trim() !== "qingxiaolu-author-api34") throw new Error("设备归属不匹配");
  await device.shell("am start -n com.qingxiaolu.app/.MainActivity");
  const page = await (await device.webView({ pkg: "com.qingxiaolu.app" })).page();
  page.setDefaultTimeout(20000);
  await page.context().route("**/qingxiaolu-api/**", route => route.abort());
  if (await page.getByRole("button", { name: "先在本机使用", exact: true }).isVisible()) await page.getByRole("button", { name: "先在本机使用", exact: true }).click();
  await page.getByRole("button", { name: "项目", exact: true }).click();
  await page.getByRole("button", { name: /导入本地文档/ }).click();
  await page.waitForFunction(() => document.querySelector(".preview-head") || document.querySelector(".import-sources"));
  if (await page.getByRole("button", { name: "重新选择", exact: true }).isVisible()) await page.getByRole("button", { name: "重新选择", exact: true }).click();
  await page.getByRole("heading", { name: "选择本地文件", exact: true }).waitFor();
  await page.locator("input[type=file]").setInputFiles({ name: `${fixtureTitle}.pdf`, mimeType: "application/pdf", buffer: original });
  await page.getByRole("heading", { name: "临时预览", exact: true }).waitFor();
  const text = await page.locator(".candidate-list textarea").inputValue();
  if (chinese) {
    for (const line of ["海边的日记：中文图文验收", "第一段：风从海上吹来，雨停了。", "“你好，小城！”她说——然后笑了。", "第二段：保留换行、标点和中文原文。", "插图与文字都应保留。"]) {
      if (!text.includes(line)) throw new Error("中文正文或标点不完整");
    }
  } else if (!text.includes("Page 1") || !text.includes("Page 2") || !text.includes("first line.\nThe story")) throw new Error("两页文字或换行不完整");
  const imageCount = chinese ? 1 : 2;
  if (await page.locator(".candidate-images img").count() !== imageCount) throw new Error("PDF 插图缺失");
  const pixels = await page.locator(".candidate-images img").evaluateAll(async images => Promise.all(images.map(async image => {
    await image.decode();
    const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true }); context.drawImage(image, 0, 0);
    const hash = await crypto.subtle.digest("SHA-256", context.getImageData(0, 0, canvas.width, canvas.height).data);
    return { width: canvas.width, height: canvas.height, hash: [...new Uint8Array(hash)].map(value => value.toString(16).padStart(2, "0")).join("") };
  })));
  const red = Buffer.alloc(64 * 64 * 4); for (let i = 0; i < red.length; i += 4) { red[i] = 255; red[i + 1] = 30; red[i + 2] = 30; red[i + 3] = 255; }
  const expectedPixels = chinese ? [createHash("sha256").update(red).digest("hex")] : ["a43df3204d9c8fd55d2a41adfa70d7e58c4d1249b03afe1e6e8af8926055b4cd", "909d22f2296d0df83389e1360663530140a4611b81d7678b4fd55e2ebc7e9467"];
  const size = chinese ? 64 : 900;
  if (pixels.some((image, index) => image.width !== size || image.height !== size || image.hash !== expectedPixels[index])) {
    console.log(JSON.stringify({ imageDiagnostics: pixels }));
    throw new Error("PDF 插图原像素不一致");
  }
  await page.getByText("预览已保存在本机，刷新可恢复", { exact: true }).waitFor();
  await page.reload(); await page.getByRole("heading", { name: "临时预览", exact: true }).waitFor();
  if (await page.locator(".candidate-list textarea").inputValue() !== text) throw new Error("预览刷新丢失文字");
  await page.getByText("预览已保存在本机，刷新可恢复", { exact: true }).waitFor();
  await page.getByRole("button", { name: "正式导入已选内容（1）", exact: true }).click();
  await page.getByText(/已正式导入 1 条内容|跳过 1 条相同内容/).waitFor();
  const drafts = await page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open("qingxiaolu-writing", 1); request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result, query = db.transaction("values").objectStore("values").get("qx_drafts");
      query.onsuccess = () => { db.close(); resolve(JSON.parse(query.result || "[]")); };
    };
  }));
  const saved = drafts.find(item => item.title === fixtureTitle && item.content?.text === text);
  if (!saved || saved.content.images.length !== imageCount) throw new Error("正式导入缺失文字或图片");
  const bytes = Buffer.from(saved.content.importRaw.originalPdf.split(",")[1], "base64");
  if (!bytes.equals(original)) throw new Error("原 PDF 来源记录不一致");
  console.log(JSON.stringify({ oldWebViewCompatibility: true, paragraphs: true, images: imageCount, chinese,
    originalPixels: true, previewRefresh: true, importComplete: true, originalHash: createHash("sha256").update(bytes).digest("hex") }));
} finally { await device.close(); }
