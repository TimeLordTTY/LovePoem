import { readStored } from "./storage";

const snapshots = new Map<string, { raw: string; value: any }>();

// 原图等字符串不可变，可以复用；容器必须独立，调用方修改不能污染下一次读取。
function copyJson(value: any): any {
  if (!value || typeof value !== "object") return value;
  const result: any = Array.isArray(value) ? [] : {};
  const pending = [{ source: value, target: result }];
  while (pending.length) {
    const { source, target } = pending.pop()!;
    for (const [key, item] of Object.entries(source)) {
      const copied: any = item && typeof item === "object" ? Array.isArray(item) ? [] : {} : item;
      Object.defineProperty(target, key, { value: copied, enumerable: true, writable: true, configurable: true });
      if (item && typeof item === "object") pending.push({ source: item, target: copied });
    }
  }
  return result;
}

export function readItemSnapshot(key: "qx_drafts" | "qx_server_cache"): any[] {
  const raw = readStored(key) || "[]";
  let snapshot = snapshots.get(key);
  if (!snapshot || snapshot.raw !== raw) {
    snapshot = { raw, value: JSON.parse(raw) };
    snapshots.set(key, snapshot);
  }
  return copyJson(snapshot.value);
}
