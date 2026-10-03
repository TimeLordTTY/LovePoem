import mammoth from "mammoth";
// Android 系统 WebView 可能晚于桌面浏览器更新，使用同版本自带的兼容构建。
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import workerUrl from "./pdfWorker.ts?worker&url";
import JSZip from "jszip";
import { candidate, type ImportAdapter, type ImportCandidate, type ImportContext, type ImportSource } from "./types";
import { decodeDocument, csvCandidates, parseOutlineXml, parseXmindJson, outlineText, wordHtmlText, safeImageSource } from "./documentParsing";
import { readPdfContent } from "./pdfParsing";
import { installPdfStreamIterator, installPdfBufferTransfer } from "./pdfCompatibility";

installPdfStreamIterator();
installPdfBufferTransfer();
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

function sourceFor(file: File): ImportSource {
  const ext = file.name.toLowerCase().split(".").pop();
  if (ext === "docx") return "word";
  if (ext === "doc") return "word";
  if (ext === "csv") return "csv";
  if (ext === "md" || ext === "markdown") return "markdown";
  if (ext === "pdf") return "pdf";
  if (ext === "txt") return "txt";
  return "other";
}

async function readPdf(file: File) {
  const originalPdf = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(new Blob([file], { type: "application/pdf" }));
  });
  // 导入需要保留像素，避免旧 WebView 的离屏 GPU 转换改变原图颜色。
  const task = pdfjs.getDocument({ data: await file.arrayBuffer(), isOffscreenCanvasSupported: false });
  try {
    const document = await task.promise;
    const result = await readPdfContent(document, pdfjs.OPS);
    return { ...result, raw: { ...result.raw, originalPdf } };
  } catch (error) {
    if ((error as Error).name === "PasswordException") throw new Error("PDF 受到密码保护，请先解锁原文件后重新导入。");
    throw error;
  } finally { await task.destroy(); }
}

async function readFile(file: File): Promise<{ text: string; images?: string[]; warnings?: string[]; raw?: Record<string, unknown> }> {
  const ext = file.name.toLowerCase().split(".").pop();
  if (ext === "xmind") {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const jsonEntry = zip.file("content.json");
    if (jsonEntry) {
      const sheets = JSON.parse(await jsonEntry.async("text"));
      const entries = parseXmindJson(sheets);
      return { text: outlineText(entries), raw: { outlineEntries: entries } };
    }
    const xmlEntry = zip.file("content.xml");
    if (xmlEntry) { const entries = parseOutlineXml(await xmlEntry.async("text")); return { text: outlineText(entries), raw: { outlineEntries: entries } }; }
    throw new Error(`${file.name} 中没有可识别的思维导图内容`);
  }
  if (ext === "mm" || ext === "opml") {
    const decoded = decodeDocument(await file.arrayBuffer());
    const entries = parseOutlineXml(decoded.text);
    return { text: outlineText(entries), warnings: decoded.warnings, raw: { outlineEntries: entries } };
  }
  const source = sourceFor(file);
  if (source === "word") {
    if (ext === "doc") {
      const decoded = decodeDocument(await file.arrayBuffer());
      if (!/<html|<body/i.test(decoded.text)) throw new Error("旧版二进制 DOC 请用 Word 另存为 DOCX 后导入。情晓录导出的文字版 Word 文件可直接读取。");
      return { ...wordHtmlText(decoded.text), warnings: decoded.warnings };
    }
    const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() }, {
      convertImage: mammoth.images.imgElement(async image => ({ src: `data:${image.contentType};base64,${await image.readAsBase64String()}` })),
    });
    return { ...wordHtmlText(result.value), warnings: result.messages.length ? ["文档含部分无法原样还原的样式，请核对预览中的段落和插图。"] : [] };
  }
  if (source === "pdf") return readPdf(file);
  return decodeDocument(await file.arrayBuffer());
}

async function readExport(file: File): Promise<ImportCandidate[] | null> {
  if (!file.name.toLowerCase().endsWith(".json")) return null;
  let parsed;
  try { parsed = JSON.parse(decodeDocument(await file.arrayBuffer()).text); }
  catch { throw new Error(`${file.name} 不是有效的 JSON 文件，请检查内容。`); }
  if (parsed?.format === "qingxiaolu-backup") throw new Error("这是情晓录完整备份，请从“设置 → 从完整备份恢复”导入，避免将备份误存成稿件。");
  if (!Array.isArray(parsed)) return null;
  return parsed.map((value) => {
    const item = typeof value === "string" ? { text: value } : value;
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("JSON 内容应为稿件记录或文字组成的数组。");
    const originalImages = Array.isArray(item.images) ? item.images : [];
    const images = originalImages.filter(safeImageSource);
    return candidate(
    item.source || "other",
    item.sourceLabel || "导入文件",
    item.source === "qqzone" ? "" : (item.title || String(item.text || "").slice(0, 40)),
    String(item.text || ""),
    {
      publishedAt: item.publishedAt,
      images,
      warnings: images.length !== originalImages.length ? ["部分图片链接无法识别，请核对预览；原始来源记录会随导入保留。"] : [],
      originalUrl: item.originalUrl,
      raw: item,
    },
  ); });
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
      if (file.name.toLowerCase().endsWith(".csv")) {
        const decoded = decodeDocument(await file.arrayBuffer());
        return csvCandidates(decoded.text, file.name).map(item => ({ ...item, warnings: [...decoded.warnings, ...(item.warnings || [])] }));
      }
      const result = await readFile(file);
      const text = result.text.trim();
      const source = sourceFor(file);
      return [candidate(source, source === "word" ? "Word" : source.toUpperCase(), file.name.replace(/\.[^.]+$/, ""), text, {
        images: result.images || [],
        warnings: result.warnings || [],
        raw: { fileName: file.name, size: file.size, type: file.type, ...result.raw },
      })];
    }));
    return groups.flat();
  }
}
