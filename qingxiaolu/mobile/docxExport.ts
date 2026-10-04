import JSZip from "jszip";
const xml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function exportImage(source: string) {
  const response = await fetch(source, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("有图片无法读取，Word 文件未生成，请联网后重试。");
  const original = await response.blob();
  const url = URL.createObjectURL(original);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      const timer = setTimeout(() => { image.removeAttribute("src"); reject(new Error("Word 图片读取超时，请重试")); }, 15000);
      image.onload = () => { clearTimeout(timer); resolve(image); };
      image.onerror = () => { clearTimeout(timer); reject(new Error("图片损坏，Word 文件未生成")); };
      image.src = url;
    });
    let blob = original;
    if (!["image/png", "image/jpeg"].includes(original.type)) {
      const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      canvas.getContext("2d")!.drawImage(image, 0, 0);
      blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("图片无法转换为 Word 插图")), "image/png"));
    }
    const ratio = Math.min(5486400 / image.naturalWidth, 8229600 / image.naturalHeight);
    return { bytes: await blob.arrayBuffer(), extension: blob.type === "image/jpeg" ? "jpg" : "png",
      mime: blob.type, width: Math.round(image.naturalWidth * ratio), height: Math.round(image.naturalHeight * ratio) };
  } finally { URL.revokeObjectURL(url); }
}

export async function createWritingDocx(title: string, text: string, images: string[]) {
  const zip = new JSZip();
  const relationships: string[] = [], types = new Map<string, string>();
  let body = text.split("\n").map(line => `<w:p><w:r><w:t xml:space="preserve">${xml(line)}</w:t></w:r></w:p>`).join("");
  for (const [i, source] of images.filter(Boolean).entries()) {
    const image = await exportImage(source), name = `image-${i + 1}.${image.extension}`, id = `rId${i + 1}`;
    zip.file(`word/media/${name}`, image.bytes); types.set(image.extension, image.mime);
    relationships.push(`<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${name}"/>`);
    body += `<w:p><w:r><w:drawing><wp:inline><wp:extent cx="${image.width}" cy="${image.height}"/><wp:docPr id="${i + 1}" name="插图 ${i + 1}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${i + 1}" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${image.width}" cy="${image.height}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
  }
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${[...types].map(([ext, mime]) => `<Default Extension="${ext}" ContentType="${mime}"/>`).join('')}<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`);
  zip.file('_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>');
  zip.file('docProps/core.xml', `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${xml(title)}</dc:title></cp:coreProperties>`);
  zip.file('word/_rels/document.xml.rels', `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships.join('')}</Relationships>`);
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`);
  const blob = await zip.generateAsync({ type: "blob" });
  return new File([blob], `${(title || "未命名记录").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 70)}.docx`, { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}
