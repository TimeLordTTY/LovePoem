import { chromium } from "playwright-core";
import { createInterface } from "node:readline/promises";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { collectLoadedHistory, mergeLoadedHistory } from "./loaded-history.mjs";

const source = process.argv.includes("--qqzone") ? "qqzone" : "weibo";
const label = source === "weibo" ? "微博" : "QQ空间";
const url = source === "weibo" ? "https://weibo.com/" : "https://user.qzone.qq.com/";
const profile = join(process.env.LOCALAPPDATA || homedir(), "QingxiaoluImportBrowser", source);
const outputDirectory = join(homedir(), "Downloads");
await mkdir(profile, { recursive: true });

const context = await chromium.launchPersistentContext(profile, {
  channel: "msedge",
  headless: false,
  viewport: null,
  args: ["--start-maximized"],
});
const page = context.pages()[0] || await context.newPage();
await page.goto(url, { waitUntil: "domcontentloaded" });

const terminal = createInterface({ input: process.stdin, output: process.stdout });
console.log(`\n请在打开的 Edge 中登录${label}，进入自己的历史内容页面。`);
await terminal.question("准备好后按回车开始采集：");

const records = new Map();
let unchanged = 0;
for (let round = 0; round < 240 && unchanged < 12; round++) {
  const before = records.size;
  for (const frame of page.frames()) {
    const rows = await frame.evaluate(collectLoadedHistory, source).catch(() => []);
    mergeLoadedHistory(records, rows);
  }
  unchanged = records.size === before ? unchanged + 1 : 0;
  console.log(`已识别 ${records.size} 条，正在继续向下浏览……`);
  await page.mouse.wheel(0, 1300);
  await page.waitForTimeout(900);
}

if (records.size) {
  const output = join(outputDirectory, `情晓录-${label}历史-${new Date().toISOString().slice(0, 10)}-${Date.now()}.json`);
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(output, JSON.stringify([...records.values()], null, 2), { encoding: "utf8", flag: "wx" });
  console.log(`\n采集结果已保存：${output}`);
  console.log("回到情晓录 → 设置 → 工具 → 历史导入 → 文件导入，选择这个 JSON 文件。缺失内容需在预览中核对。");
} else console.log("没有识别到历史记录，未生成文件。请确认已登录自己的历史页面，并检查页面结构是否受支持。");
await terminal.question("按回车关闭浏览器：");
await terminal.close();
await context.close();
