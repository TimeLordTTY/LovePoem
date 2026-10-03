import { Capacitor, registerPlugin } from "@capacitor/core";

export type ForwardResult = {
  opened: boolean; copied: boolean; needsAccessibility?: boolean;
  openedAs?: "share" | "app" | "none";
  requestedImages?: number; preparedImages?: number; failedImages?: number; omittedImages?: number;
};

const AppDraft = registerPlugin<{
  open(options: { target: string; title: string; text: string; images: string[] }): Promise<ForwardResult>;
  copy(options: { title: string; text: string }): Promise<{ copied: boolean }>;
}>("AppDraft");

export function copyNativeDraftText(title: string, text: string) { return AppDraft.copy({ title, text }); }

export async function openTargetDraft(target: string, title: string, text: string, images: string[] = []): Promise<ForwardResult> {
  if (!Capacitor.isNativePlatform()) return { opened: false, copied: false };
  return AppDraft.open({ target, title, text, images });
}
