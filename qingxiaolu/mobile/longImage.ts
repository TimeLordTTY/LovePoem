import JSZip from "jszip";

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (!paragraph) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const char of paragraph) {
      const next = line + char;
      if (ctx.measureText(next).width > width && line) {
        lines.push(line);
        line = char;
      } else {
        line = next;
      }
    }
    lines.push(line);
  }
  return lines;
}

function canvasBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("长图生成失败")), "image/png", 0.94));
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    const timer = window.setTimeout(() => reject(new Error("文章图片读取超时，请检查网络后重试")), 15000);
    image.onload = () => { window.clearTimeout(timer); resolve(image); };
    image.onerror = () => { window.clearTimeout(timer); reject(new Error("文章图片读取失败，请检查链接或先保存到本机后重试")); };
    image.src = src;
  });
}

export async function createArticleImages(title: string, text: string, images: string[]) {
  const width = 1080;
  const height = 1800;
  const margin = 92;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.font = "38px system-ui, sans-serif";
  const lines = wrap(ctx, text, width - margin * 2);
  const pages: Blob[] = [];
  ctx.font = "bold 58px system-ui, sans-serif";
  const titleLines = wrap(ctx, title || "未命名稿件", width - margin * 2);
  const layout: Array<Array<{ text: string; y: number; title: boolean }>> = [[]];
  let cursor = margin;
  for (const [isTitle, values] of [[true, titleLines], [false, lines]] as const) {
    for (const line of values) {
      const fontSize = isTitle ? 58 : 38;
      if (cursor + fontSize > height - 120) { layout.push([]); cursor = margin; }
      layout[layout.length - 1].push({ text: line, y: cursor + fontSize, title: isTitle });
      cursor += isTitle ? 78 : 57;
    }
    if (isTitle) cursor += 25;
  }
  const pageCount = layout.length;

  for (let page = 0; page < pageCount; page++) {
    ctx.fillStyle = "#fffdf8";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#332d38";
    for (const line of layout[page]) {
      ctx.font = line.title ? "bold 58px system-ui, sans-serif" : "38px system-ui, sans-serif";
      ctx.fillText(line.text, margin, line.y);
    }
    ctx.fillStyle = "#8a818d";
    ctx.font = "26px system-ui, sans-serif";
    ctx.fillText(`情晓录 · ${page + 1}/${pageCount + images.filter(Boolean).length}`, margin, height - 52);
    pages.push(await canvasBlob(canvas));
  }

  for (const source of images.filter(Boolean)) {
    const image = await loadImage(source);
    ctx.fillStyle = "#fffdf8";
    ctx.fillRect(0, 0, width, height);
    const ratio = Math.min((width - margin * 2) / image.width, (height - margin * 2) / image.height);
    const drawWidth = image.width * ratio;
    const drawHeight = image.height * ratio;
    ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
    ctx.fillStyle = "#8a818d"; ctx.font = "26px system-ui, sans-serif";
    ctx.fillText(`情晓录 · ${pages.length + 1}/${pageCount + images.filter(Boolean).length}`, margin, height - 52);
    pages.push(await canvasBlob(canvas));
  }
  const name = (title || "情晓录").replace(/[\\/:*?"<>|\r\n]/g, "_").slice(0, 80);
  return pages.map((blob, index) => new File([blob], `${name}-${index + 1}.png`, { type: "image/png" }));
}

export function downloadArticleImage(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function createArticleImageArchive(files: File[]) {
  const zip = new JSZip();
  for (const file of files) zip.file(file.name, await file.arrayBuffer());
  const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
  const name = files[0]?.name.replace(/-\d+\.png$/, "") || "情晓录";
  return new File([blob], `${name}-分享图片.zip`, { type: "application/zip" });
}

export async function shareOrDownloadArticleImages(title: string, text: string, images: string[]) {
  const files = await createArticleImages(title, text, images);
  if (window.matchMedia("(pointer: coarse)").matches && navigator.share && navigator.canShare?.({ files })) {
    try { await navigator.share({ title: `${title} · 手机长图`, files }); return "shared"; }
    catch (error: any) { if (error?.name === "AbortError") return "cancelled"; }
  }
  files.forEach(downloadArticleImage);
  return "downloaded";
}
