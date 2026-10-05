import { nativeFileAvailable, saveNativeFile } from "./nativeFile";

export async function exportTextFile(name: string, content: string, type: string) {
  if (nativeFileAvailable()) return (await saveNativeFile(new File([content], name, { type: type.split(";")[0] }))).saved;
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export async function exportOriginalFile(name: string, source: string) {
  if (!/^data:application\/(pdf|x-xmind);base64,/.test(source)) throw new Error("原文件格式无法识别，尚未导出");
  const response = await fetch(source);
  if (!response.ok) throw new Error("原文件读取失败，请保留当前记录后重试");
  const blob = await response.blob();
  return (await saveNativeFile(new File([blob], name, { type: blob.type }))).saved;
}
