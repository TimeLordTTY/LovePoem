import mammoth from "mammoth";
import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import JSZip from "jszip";
import { candidate, type ImportAdapter, type ImportCandidate, type ImportContext, type ImportSource } from "./types";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

function sourceFor(file: File): ImportSource {
  const ext = file.name.toLowerCase().split(".").pop();
  if (ext === "docx") return "word";
  if (ext === "md" || ext === "markdown") return "markdown";
  if (ext === "pdf") return "pdf";
  if (ext === "txt") return "txt";
  return "other";
}

async function readPdf(file: File) {
  const document = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item: any) => item.str || "").join(" "));
  }
  return pages.join("\n\n");
}

async function readFile(file: File) {
  const ext = file.name.toLowerCase().split(".").pop();
  if (ext === "xmind") {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const jsonEntry = zip.file("content.json");
    if (jsonEntry) {
      const sheets = JSON.parse(await jsonEntry.async("text"));
      const lines: string[] = [];
      const walk = (node: any, depth = 0) => {
        if (node?.title) lines.push(`${"  ".repeat(depth)}- ${node.title}`);
        for (const child of node?.children?.attached || []) walk(child, depth + 1);
      };
      for (const sheet of sheets) {
        if (sheet.title) lines.push(`# ${sheet.title}`);
        walk(sheet.rootTopic);
      }
      return lines.join("\n");
    }
    const xmlEntry = zip.file("content.xml");
    if (xmlEntry) return xmlToOutline(await xmlEntry.async("text"));
    throw new Error(`${file.name} 中没有可识别的思维导图内容`);
  }
  if (ext === "mm" || ext === "opml") return xmlToOutline(await file.text());
  const source = sourceFor(file);
  if (source === "word") {
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return result.value;
  }
  if (source === "pdf") return readPdf(file);
  return file.text();
}

function xmlToOutline(xml: string) {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  const lines: string[] = [];
  const roots = Array.from(document.querySelectorAll("map > node, body > outline"));
  const walk = (node: Element, depth = 0) => {
    const text = node.getAttribute("TEXT") || node.getAttribute("text") ||
      node.querySelector(":scope > title")?.textContent || "";
    if (text.trim()) lines.push(`${"  ".repeat(depth)}- ${text.trim()}`);
    for (const child of Array.from(node.children)) {
      if (child.tagName.toLowerCase() === "node" || child.tagName.toLowerCase() === "outline") walk(child, depth + 1);
    }
  };
  roots.forEach((root) => walk(root));
  if (!lines.length) throw new Error("思维导图中没有可识别的节点");
  return lines.join("\n");
}

async function readExport(file: File): Promise<ImportCandidate[] | null> {
  if (!file.name.toLowerCase().endsWith(".json")) return null;
  const parsed = JSON.parse(await file.text());
  if (!Array.isArray(parsed)) return null;
  return parsed.map((item) => candidate(
    item.source || "other",
    item.sourceLabel || "导入文件",
    item.source === "qqzone" ? "" : (item.title || String(item.text || "").slice(0, 40)),
    String(item.text || ""),
    {
      publishedAt: item.publishedAt,
      images: Array.isArray(item.images) ? item.images : [],
      originalUrl: item.originalUrl,
      raw: item,
    },
  ));
}

export class FileImporter implements ImportAdapter {
  readonly id = "other" as const;
  readonly label = "文件";
  readonly modes = ["file"] as const;
  readonly description = "Word DOCX、TXT、Markdown、PDF、XMind、FreeMind、OPML、CSV 及情晓录 JSON";

  async isAvailable() { return true; }

  async collect(context: ImportContext): Promise<ImportCandidate[]> {
    const files = context.files || [];
    const groups = await Promise.all(files.map(async (file) => {
      const exported = await readExport(file);
      if (exported) return exported;
      const text = (await readFile(file)).trim();
      const source = sourceFor(file);
      return [candidate(source, source === "word" ? "Word" : source.toUpperCase(), file.name.replace(/\.[^.]+$/, ""), text, {
        raw: { fileName: file.name, size: file.size, type: file.type },
      })];
    }));
    return groups.flat();
  }
}
