import { Capacitor, registerPlugin } from "@capacitor/core";
const WritingFiles = registerPlugin<{
  stage(options: { name: string; mime: string; base64: string }): Promise<{ token: string }>;
  save(options: { token: string }): Promise<{ saved: boolean }>;
  shareImages(options: { tokens: string[]; title: string }): Promise<{ opened: boolean }>;
}>("WritingFiles");
export const nativeFileAvailable = () => Capacitor.isNativePlatform();
async function stage(file: File) {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("导出文件读取失败，请重试")); reader.readAsDataURL(file);
  });
  return WritingFiles.stage({ name: file.name, mime: file.type.split(";")[0], base64 });
}
export async function saveNativeFile(file: File) { return WritingFiles.save({ token: (await stage(file)).token }); }
export async function shareNativeImages(files: File[], title: string) {
  const tokens: string[] = [];
  // 逐页转交，避免所有图片的 Base64 同时堆在 WebView 内存中。
  for (const file of files) tokens.push((await stage(file)).token);
  return WritingFiles.shareImages({ tokens, title });
}
