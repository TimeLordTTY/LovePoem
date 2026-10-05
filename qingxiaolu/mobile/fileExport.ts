import { nativeFileAvailable, saveNativeFile } from "./nativeFile";

export async function exportTextFile(name: string, content: string, type: string) {
  if (nativeFileAvailable()) return (await saveNativeFile(new File([content], name, { type: type.split(";")[0] }))).saved;
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
