// PDF 的文字块坐标用于恢复行与段落；分栏等复杂阅读顺序仍应对照原文件。
export function pdfText(items: any[]) {
  const lines: string[] = [];
  let row = "", y = 0, height = 0, endX = 0, breakLine = false;
  for (const item of items) {
    if (typeof item.str !== "string") continue;
    if (!item.str) { breakLine ||= Boolean(item.hasEOL); continue; }
    const itemY = Number(item.transform?.[5] || 0);
    const itemX = Number(item.transform?.[4] || 0);
    const itemHeight = Math.abs(Number(item.height || item.transform?.[3] || 1));
    const gap = Math.abs(itemY - y);
    const rowChanged = row && (breakLine || gap > Math.max(height, itemHeight) * 0.4);
    if (rowChanged) {
      lines.push(row.trimEnd());
      if (gap > Math.max(height, itemHeight) * 1.75) lines.push("");
      row = "";
    }
    if (row && itemX - endX > itemHeight * 0.2 && !/\s$/.test(row) && !/^\s/.test(item.str)) row += " ";
    row += item.str; y = itemY; height = itemHeight; endX = itemX + Number(item.width || 0);
    breakLine = Boolean(item.hasEOL);
  }
  if (row) lines.push(row.trimEnd());
  return lines.join("\n").trim();
}

export function pdfPixels(image: { width: number; height: number; kind: number; data: Uint8Array }) {
  const { width, height, kind, data } = image;
  const expected = kind === 1 ? Math.ceil(width / 8) * height : width * height * (kind === 2 ? 3 : 4);
  if (![1, 2, 3].includes(kind) || data.length < expected) throw new Error("PDF 图片数据无法完整解码");
  if (kind === 3) return new Uint8ClampedArray(data);
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const at = i * 4;
    if (kind === 1) {
      const row = Math.floor(i / width), column = i % width;
      const value = data[row * Math.ceil(width / 8) + (column >> 3)] & (128 >> (column % 8)) ? 255 : 0;
      pixels[at] = pixels[at + 1] = pixels[at + 2] = value;
    } else { pixels[at] = data[i * 3]; pixels[at + 1] = data[i * 3 + 1]; pixels[at + 2] = data[i * 3 + 2]; }
    pixels[at + 3] = 255;
  }
  return pixels;
}

async function imageSource(image: any) {
  if (!image?.width || !image.height || image.width * image.height > 16 * 1024 * 1024) throw new Error("图片过大或无法读取");
  const canvas = document.createElement("canvas");
  canvas.width = image.width; canvas.height = image.height;
  try {
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("图片画布不可用");
    if (image.bitmap) context.drawImage(image.bitmap, 0, 0);
    else context.putImageData(new ImageData(pdfPixels(image), image.width, image.height), 0, 0);
    const result = canvas.toDataURL("image/png");
    if (!result.startsWith("data:image/png;base64,")) throw new Error("图片未完整生成");
    return result;
  } finally { canvas.width = canvas.height = 0; }
}

function getImage(page: any, id: string) {
  return new Promise<any>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("PDF 图片读取超时")), 15000);
    try { (id.startsWith("g_") ? page.commonObjs : page.objs).get(id, (value: any) => { window.clearTimeout(timer); resolve(value); }); }
    catch (error) { window.clearTimeout(timer); reject(error); }
  });
}

export async function readPdfContent(pdf: any, ops: Record<string, number>) {
  const pages: Array<{ page: number; text: string; imageIndices: number[] }> = [];
  const images: string[] = [];
  let failedImages = 0;
  for (let number = 1; number <= pdf.numPages; number++) {
    const page = await pdf.getPage(number);
    try {
      const text = pdfText((await page.getTextContent()).items);
      const list = await page.getOperatorList();
      const imageIndices: number[] = [];
      const seen = new Set<string | object>();
      for (let at = 0; at < list.fnArray.length; at++) {
        const op = list.fnArray[at], args = list.argsArray[at];
        const indirect = op === ops.paintImageXObject || op === ops.paintImageXObjectRepeat;
        const inline = op === ops.paintInlineImageXObject || op === ops.paintInlineImageXObjectGroup;
        if (!indirect && !inline) continue;
        const reference = args[0];
        if (seen.has(reference)) continue;
        seen.add(reference);
        try {
          const image = indirect ? await getImage(page, reference) : reference;
          const source = await imageSource(image);
          let index = images.indexOf(source);
          if (index < 0) { index = images.length; images.push(source); }
          imageIndices.push(index);
        } catch { failedImages++; }
      }
      pages.push({ page: number, text, imageIndices });
    } finally { page.cleanup(); }
  }
  const text = pages.map(page => page.text).join("\n\n");
  const warnings = ["已提取可编辑文字和插图；复杂分栏、字体样式及矢量内容请对照原始 PDF 核对。"];
  if (!text.trim()) warnings.push("PDF 没有可编辑文字；图片与原文件已保留，如需文字请先进行 OCR 识别。");
  if (failedImages) warnings.push(`有 ${failedImages} 处图片未能提取，请下载原始 PDF 核对；未丢弃原文件。`);
  return { text, images, warnings, raw: { pdfPages: pages, pdfPageCount: pdf.numPages } };
}
