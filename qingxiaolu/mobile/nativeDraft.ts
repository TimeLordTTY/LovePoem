import { Capacitor, registerPlugin } from "@capacitor/core";

const AppDraft = registerPlugin<{
  open(options: { target: string; title: string; text: string; images: string[] }): Promise<{ opened: boolean; copied: boolean; needsAccessibility?: boolean }>;
}>("AppDraft");

export async function openTargetDraft(target: string, title: string, text: string, images: string[] = []) {
  if (!Capacitor.isNativePlatform()) return { opened: false, copied: false };
  return AppDraft.open({ target, title, text, images });
}
