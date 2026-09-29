import { chromium } from "playwright-core";
import { createInterface } from "node:readline/promises";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const source = process.argv.includes("--qqzone") ? "qqzone" : "weibo";
const label = source === "weibo" ? "微博" : "QQ空间";
const url = source === "weibo" ? "https://weibo.com/u/page/follow/102803" : "https://user.qzone.qq.com/";
const executablePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const profile = join(process.env.LOCALAPPDATA || homedir(), "QingxiaoluImportBrowser", source);
const outputDirectory = join(homedir(), "Downloads");
await mkdir(profile, { recursive: true });

const context = await chromium.launchPersistentContext(profile, {
  executablePath,
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
    const rows = await frame.locator("article, [mid], .feed, .f-single, .content, .mod_wrap").evaluateAll((nodes) =>
      nodes.slice(0, 300).map((node) => {
        const text = (node.innerText || "").trim();
        const images = [...node.querySelectorAll("img")].map((image) => image.currentSrc || image.src).filter(Boolean);
        const links = [...node.querySelectorAll("a[href]")].map((link) => link.href).filter(Boolean);
        const timeNode = node.querySelector("time, [date], [title*='202'], a[title]");
        const publishedAt = timeNode?.getAttribute("datetime") || timeNode?.getAttribute("title") || timeNode?.textContent?.trim() || "";
        return { text, images, originalUrl: links.find((link) => /weibo\.com|qzone\.qq\.com/.test(link)) || "", publishedAt };
      })).catch(() => []);
    for (const row of rows) {
      if (row.text.length < 3) continue;
      const key = `${row.publishedAt}|${row.text.slice(0, 160)}`;
      records.set(key, {
        id: crypto.randomUUID(),
        source,
        sourceLabel: label,
        publishedAt: row.publishedAt,
        title: row.text.split("\n")[0].slice(0, 60),
        text: row.text,
        images: row.images,
        originalUrl: row.originalUrl,
      });
    }
  }
  unchanged = records.size === before ? unchanged + 1 : 0;
  console.log(`已识别 ${records.size} 条，正在继续向下浏览……`);
  await page.mouse.wheel(0, 1300);
  await page.waitForTimeout(900);
}

const output = join(outputDirectory, `情晓录-${label}历史-${new Date().toISOString().slice(0, 10)}.json`);
await writeFile(output, JSON.stringify([...records.values()], null, 2), "utf8");
console.log(`\n采集完成：${output}`);
console.log("回到情晓录 → 设置 → 工具 → 历史导入 → 文件导入，选择这个 JSON 文件。");
await terminal.question("按回车关闭浏览器：");
await terminal.close();
await context.close();
