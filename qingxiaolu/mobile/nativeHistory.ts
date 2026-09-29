import { Capacitor, registerPlugin } from "@capacitor/core";
import { candidate, type ImportCandidate, type ImportSource } from "./importers/types";

type NativeRecord = {
  id: string;
  source: "weibo" | "qqzone" | "wechat" | "yiyan";
  text: string;
  imageCount: number;
  capturedAt: string;
};

const HistoryImport = registerPlugin<{
  openAccessibilitySettings(): Promise<void>;
  getCaptured(): Promise<{ records: string }>;
  clearCaptured(): Promise<void>;
}>("HistoryImport");

export function nativeCaptureAvailable() {
  return Capacitor.getPlatform() === "android";
}

export async function openNativeCaptureSettings() {
  await HistoryImport.openAccessibilitySettings();
}

export async function readNativeCaptured(source: ImportSource): Promise<ImportCandidate[]> {
  const result = await HistoryImport.getCaptured();
  const records = JSON.parse(result.records || "[]") as NativeRecord[];
  return records.filter((record) => record.source === source).map((record) =>
    candidate(record.source,
      record.source === "weibo" ? "微博" : record.source === "qqzone" ? "QQ 空间"
        : record.source === "wechat" ? "微信朋友圈" : "一言",
      record.text.split("\n")[0].slice(0, 40), record.text, {
        publishedAt: record.capturedAt,
        images: Array.from({ length: Math.max(0, record.imageCount) }, () => ""),
        raw: record,
      }));
}
