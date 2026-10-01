// 写入失败时保留现有数据，并向界面明确报告，避免误报保存成功。
export function storeJson(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { throw new Error("本机存储不足或不可写，内容尚未保存。请保留编辑页面并导出备份后重试。"); }
}

export function readJson<T>(key: string, fallback: T): T {
  const value = localStorage.getItem(key);
  if (!value) return fallback;
  try { return JSON.parse(value); }
  catch { throw new Error("本机数据无法读取，请先备份原数据，不要清空浏览器存储。"); }
}

export function storeBatch(values: Record<string, unknown>) {
  const before = Object.keys(values).map((key) => [key, localStorage.getItem(key)] as const);
  try { for (const [key, value] of Object.entries(values)) storeJson(key, value); }
  catch (error) {
    for (const [key, value] of before) { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); }
    throw error;
  }
}
