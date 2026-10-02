import { cachedWritingValue, writingDatabaseReady, writingKey, writingTransaction } from "./storageDatabase";

export function readStored(key: string) {
  return writingDatabaseReady() && writingKey(key) ? cachedWritingValue(key) : localStorage.getItem(key);
}

function writeError(error: unknown) {
  if (error instanceof Error && !(error instanceof DOMException) && /[\u3400-\u9fff]/.test(error.message)) return error;
  return new Error("本机存储不足或不可写，内容尚未保存。请保留编辑页面并导出备份后重试。");
}

// 在事务轮到执行时才读取最新数据，连续保存不能覆盖前一笔刚完成的稿件。
export function changeJson<T>(prepare: () => { values: Record<string, unknown>; result: T }): T | Promise<T> {
  if (writingDatabaseReady()) return writingTransaction(() => {
    const change = prepare();
    return { values: Object.fromEntries(Object.entries(change.values).map(([key, value]) =>
      [key, value === undefined ? null : JSON.stringify(value)])), result: change.result };
  }).catch(error => { throw writeError(error); });
  const change = prepare();
  const before = Object.keys(change.values).map(key => [key, localStorage.getItem(key)] as const);
  try {
    for (const [key, value] of Object.entries(change.values)) {
      if (value === undefined) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (error) {
    for (const [key] of before) localStorage.removeItem(key);
    for (const [key, value] of before) if (value !== null) localStorage.setItem(key, value);
    throw writeError(error);
  }
  return change.result;
}

export function storeJson(key: string, value: unknown) { return changeJson(() => ({ values: { [key]: value }, result: undefined })); }
export function removeStored(key: string) { return changeJson(() => ({ values: { [key]: undefined }, result: undefined })); }
export function storeBatch(values: Record<string, unknown>) { return changeJson(() => ({ values, result: undefined })); }

export function readJson<T>(key: string, fallback: T): T {
  const value = readStored(key);
  if (!value) return fallback;
  try { return JSON.parse(value); }
  catch { throw new Error("本机数据无法读取，请先备份原数据，不要清空浏览器存储。"); }
}
