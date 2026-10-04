import { candidate, type ImportCandidate } from "./types";
import { parseWritingDate } from "../writingDate";

export type OutlineEntry = { title: string; text: string; depth: number };

export function decodeDocument(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return { text: new TextDecoder("utf-16le").decode(bytes), warnings: [] };
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return { text: new TextDecoder("utf-16be").decode(bytes), warnings: [] };
  try { return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes), warnings: [] }; }
  catch {
    try { return { text: new TextDecoder("gb18030", { fatal: true }).decode(bytes), warnings: ["文件已按 GB18030 编码读取，请核对中文。"] }; }
    catch { throw new Error("文件编码无法识别，请另存为 UTF-8 后导入。"); }
  }
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false, closed = false;
  text = text.replace(/^\uFEFF/, "");
  const finish = () => { row.push(cell); if (row.some(value => value.trim())) rows.push(row); row = []; cell = ""; closed = false; };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else { quoted = false; closed = true; } }
      else cell += char;
    } else if (char === '"') {
      if (cell || closed) throw new Error("CSV 引号格式不正确，请检查文件。");
      quoted = true;
    } else if (char === ",") { row.push(cell); cell = ""; closed = false; }
    else if (char === "\n" || char === "\r") { if (char === "\r" && text[i + 1] === "\n") i++; finish(); }
    else { if (closed && char.trim()) throw new Error("CSV 引号后的内容格式不正确。"); if (!closed) cell += char; }
  }
  if (quoted) throw new Error("CSV 存在未闭合的引号，尚未导入任何内容。");
  finish();
  return rows;
}

export function safeImageSource(source: unknown): source is string {
  if (typeof source !== "string" || !source.trim()) return false;
  if (/^data:image\//i.test(source)) return true;
  try { return ["http:", "https:"].includes(new URL(source, "https://poem.timelordtty.cn/qingxiaolu/").protocol); }
  catch { return false; }
}

export function csvCandidates(text: string, fileName: string): ImportCandidate[] {
  const rows = parseCsv(text);
  if (!rows.length) return [];
  const headers = rows[0].map(value => value.trim().toLowerCase().replace(/[\s_-]/g, ""));
  const index = (...names: string[]) => headers.findIndex(header => names.includes(header));
  const bodyAt = index("text", "content", "body", "正文", "内容");
  if (bodyAt < 0) return [candidate("csv", "CSV", fileName.replace(/\.csv$/i, ""), text,
    { warnings: ["未识别正文列，已按整份 CSV 原文预览。需要按篇拆分时，请使用“标题、正文”或“title、text”列名。"] })];
  const titleAt = index("title", "标题", "名称");
  const dateAt = index("publishedat", "publishdate", "date", "发布时间", "发表时间", "日期");
  const imageAt = index("images", "image", "图片", "图片链接");
  const urlAt = index("originalurl", "url", "原链接", "来源链接");
  return rows.slice(1).map((row, at) => {
    if (row.length !== headers.length) throw new Error(`CSV 第 ${at + 2} 行与表头列数不同，请核对逗号和引号。`);
    const warnings: string[] = [];
    const date = dateAt < 0 ? "" : row[dateAt];
    if (date && !parseWritingDate(date)) warnings.push("发布时间无法识别，保留了原始日期，请在导入前核对。");
    let imageValues: unknown[] = [];
    const value = imageAt < 0 ? "" : row[imageAt].trim();
    if (value) {
      if (value.startsWith("[")) {
        try { const parsed = JSON.parse(value); if (!Array.isArray(parsed)) throw new Error(); imageValues = parsed; }
        catch { warnings.push("图片列不是有效的 JSON 数组，原始值保留在导入来源记录中。"); }
      } else imageValues = [value];
    }
    const images = imageValues.filter(safeImageSource);
    if (images.length !== imageValues.length) warnings.push("部分图片链接无法识别，已保留原始来源记录，请核对图片。");
    return candidate("csv", "CSV", titleAt < 0 ? `${fileName.replace(/\.csv$/i, "")}-${at + 1}` : row[titleAt], row[bodyAt], {
      publishedAt: date || undefined, images, originalUrl: urlAt < 0 ? undefined : row[urlAt], warnings,
      raw: { fileName, row: at + 2, fields: Object.fromEntries(rows[0].map((header, column) => [header, row[column]])) },
    });
  });
}

export function outlineText(entries: OutlineEntry[]) {
  return entries.map(entry => `${"  ".repeat(entry.depth)}- ${entry.title}${entry.text ? `\n${entry.text.split("\n").map(line => `${"  ".repeat(entry.depth + 1)}${line}`).join("\n")}` : ""}`).join("\n");
}

export function parseOutlineXml(xml: string): OutlineEntry[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("导图 XML 格式不正确，尚未导入任何内容。");
  const entries: OutlineEntry[] = [];
  const children = (node: Element, name: string) => Array.from(node.children).filter(child => child.localName.toLowerCase() === name);
  function walk(node: Element, depth = 0) {
    const title = node.getAttribute("TEXT") || node.getAttribute("text") || children(node, "title")[0]?.textContent || "";
    const richNote = children(node, "richcontent").filter(child => child.getAttribute("TYPE")?.toUpperCase() === "NOTE").map(child => child.textContent?.trim() || "").join("\n");
    const notes = children(node, "notes").map(note => note.textContent?.trim() || "").join("\n");
    const text = node.getAttribute("_note") || node.getAttribute("note") || richNote || notes;
    if (title.trim() || text.trim()) entries.push({ title: title.trim(), text: text.trim(), depth });
    for (const child of Array.from(node.children)) {
      if (["node", "outline", "topic"].includes(child.localName.toLowerCase())) walk(child, depth + 1);
      else if (["children", "topics"].includes(child.localName.toLowerCase())) walkContainer(child, depth + 1);
    }
  }
  function walkContainer(container: Element, depth: number) {
    for (const child of Array.from(container.children)) {
      if (child.localName.toLowerCase() === "topic") walk(child, depth);
      else if (["children", "topics"].includes(child.localName.toLowerCase())) walkContainer(child, depth);
    }
  }
  const roots = Array.from(doc.querySelectorAll("map > node, body > outline, sheet > topic"));
  roots.forEach(root => walk(root));
  if (!entries.length) throw new Error("思维导图中没有可识别的节点。");
  return entries;
}

export function parseXmindJson(sheets: any[]): OutlineEntry[] {
  if (!Array.isArray(sheets)) throw new Error("XMind 内容格式无法识别。");
  const entries: OutlineEntry[] = [];
  function spanText(spans: any[]): string {
    return spans.map(span => {
      const text = typeof span.text === "string" ? span.text : Array.isArray(span.spans) ? spanText(span.spans) : "";
      return typeof span.href === "string" && span.href ? `${text}（${span.href}）` : text;
    }).join("");
  }
  function noteText(notes: any): string {
    const plain = typeof notes?.plain === "string" ? notes.plain : notes?.plain?.content;
    if (typeof plain === "string" && plain) return plain;
    const html = notes?.html?.content;
    if (typeof html === "string") return html;
    if (Array.isArray(html?.paragraphs)) return html.paragraphs.map((paragraph: any) =>
      Array.isArray(paragraph.spans) ? spanText(paragraph.spans) : "").join("\n");
    return "";
  }
  function walk(node: any, depth = 0) {
    if (!node) return;
    const title = String(node.title || "");
    const note = noteText(node.notes);
    if (title || note) entries.push({ title, text: note, depth });
    for (const kind of ["attached", "detached", "summary", "callout"]) {
      const children = node.children?.[kind];
      if (children !== undefined && !Array.isArray(children)) throw new Error("XMind 节点分支格式不正确，尚未导入任何内容。");
      for (const child of children || []) walk(child, depth + 1);
    }
  }
  for (const sheet of sheets) walk(sheet.rootTopic);
  if (!entries.length) throw new Error("思维导图中没有可识别的节点。");
  return entries;
}

export function wordHtmlText(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  function text(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
    if (!(node instanceof Element)) return "";
    const value = Array.from(node.childNodes).map(text).join("");
    const tag = node.tagName.toLowerCase();
    if (["script", "style", "img"].includes(tag)) return "";
    if (tag === "br") return "\n";
    if (tag === "strong" || tag === "b") return `**${value}**`;
    if (tag === "em" || tag === "i") return `*${value}*`;
    if (tag === "u") return `<u>${value}</u>`;
    if (/^h[1-6]$/.test(tag)) return `${"#".repeat(Number(tag[1]))} ${value}\n\n`;
    if (tag === "p") return `${value}\n\n`;
    if (tag === "li") return `- ${value.trim()}\n`;
    if (tag === "td" || tag === "th") return `${value.trim()} | `;
    if (tag === "tr") return `| ${value}\n`;
    if (tag === "a") return node.getAttribute("href") ? `${value}（${node.getAttribute("href")}）` : value;
    return value;
  }
  return { text: Array.from(doc.body.childNodes).map(text).join("").replace(/\n{3,}/g, "\n\n").trim(),
    images: Array.from(doc.querySelectorAll("img")).map(image => image.getAttribute("src") || "").filter(safeImageSource) };
}
