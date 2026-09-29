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
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("文章图片读取失败"));
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
  const perPage = 28;
  const pages: Blob[] = [];
  const pageCount = Math.max(1, Math.ceil(lines.length / perPage));

  for (let page = 0; page < pageCount; page++) {
    ctx.fillStyle = "#fffdf8";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#332d38";
    let y = margin;
    if (page === 0) {
      ctx.font = "bold 58px system-ui, sans-serif";
      const titleLines = wrap(ctx, title || "未命名稿件", width - margin * 2).slice(0, 3);
      for (const line of titleLines) {
        ctx.fillText(line, margin, y);
        y += 78;
      }
      y += 25;
    }
    ctx.font = "38px system-ui, sans-serif";
    for (const line of lines.slice(page * perPage, (page + 1) * perPage)) {
      ctx.fillText(line, margin, y);
      y += 57;
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
    pages.push(await canvasBlob(canvas));
  }
  return pages.map((blob, index) => new File([blob], `${title || "情晓录"}-${index + 1}.png`, { type: "image/png" }));
}

export async function shareOrDownloadArticleImages(title: string, text: string, images: string[]) {
  const files = await createArticleImages(title, text, images);
  if (navigator.share && navigator.canShare?.({ files })) {
    await navigator.share({ title: `${title} · 手机长图`, files });
    return "shared";
  }
  for (const file of files) {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  return "downloaded";
}
