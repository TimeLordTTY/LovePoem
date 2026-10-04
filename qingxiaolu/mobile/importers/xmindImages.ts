import type { OutlineEntry } from "./documentParsing";

export function xmindResourcePath(source: string): string | null {
  let path;
  try { path = decodeURIComponent(source.replace(/^xap:/i, "").replace(/^\/+/, "")); }
  catch { return null; }
  // 只读取导图包内的资源，不请求外部网址或本机文件。
  if (!path.startsWith("resources/") || path.split("/").some(part => !part || part === "." || part === "..") || path.includes("\\")) return null;
  return path;
}

export function xmindImageMime(bytes: Uint8Array): string | null {
  if ([137,80,78,71,13,10,26,10].every((value,index)=>bytes[index]===value)) return "image/png";
  if (bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return "image/jpeg";
  const prefix=new TextDecoder().decode(bytes.subarray(0,512));
  if (/^GIF8[79]a/.test(prefix)) return "image/gif";
  if (prefix.startsWith("RIFF") && prefix.slice(8,12)==="WEBP") return "image/webp";
  if (prefix.startsWith("BM")) return "image/bmp";
  if (/^\s*(?:<\?xml[^>]*>\s*)?<svg[\s>]/i.test(prefix.replace(/^\uFEFF/, ""))) return "image/svg+xml";
  return null;
}

export async function loadXmindImages(entries: OutlineEntry[], readAsset: (path: string) => Promise<string | null>) {
  const memo=new Map<string,Promise<string|null>>(),failed=new Set<string>();
  const prepared: OutlineEntry[]=[];
  for (const {imageSources,...entry} of entries) {
    const images: string[]=[];
    for (const source of imageSources || []) {
      const path=xmindResourcePath(source);
      if (!path) { failed.add(source); continue; }
      if (!memo.has(path)) memo.set(path,readAsset(path).catch(()=>null));
      const data=await memo.get(path);
      if (data && !images.includes(data)) images.push(data); else if (!data) failed.add(source);
    }
    prepared.push({...entry,...(images.length?{images}:{})});
  }
  return {entries:prepared,images:[...new Set(prepared.flatMap(entry=>entry.images||[]))],
    warnings:failed.size?[`有 ${failed.size} 处导图图片无法读取，原始 XMind 已保留，请下载原文件核对。`]:[]};
}
