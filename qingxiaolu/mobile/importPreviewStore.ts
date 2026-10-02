import type { ImportCandidate } from "./importers/types";

export type ImportPreview = {
  candidates: ImportCandidate[];
  targetProjectId: string;
  targetCategory: string;
  skipDuplicates: boolean;
  updatedAt?: string;
  leaseVersion?: number;
};

// 临时预览独立保存，不扩大旧创作数据库的格式，也不进入云端待同步队列。
let database: Promise<IDBDatabase> | undefined;
let chain: Promise<unknown> = Promise.resolve();

function open() {
  if (!database) database = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("qingxiaolu-import-previews", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("previews");
    request.onerror = () => { database = undefined; reject(request.error); };
    request.onblocked = () => { database = undefined; reject(new Error("预览存储被其他页面占用，请刷新其他情晓录页面后重试。")); };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => { db.close(); database = undefined; };
      resolve(db);
    };
  });
  return database;
}

function operation<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  const result = chain.then(async () => {
    const db = await open();
    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction("previews", mode);
      let value: T;
      transaction.oncomplete = () => resolve(value);
      transaction.onabort = () => reject(transaction.error || new Error("预览保存被中断。"));
      transaction.onerror = () => { /* 中止后统一处理，旧预览保留 */ };
      try {
        const request = run(transaction.objectStore("previews"));
        request.onsuccess = () => { value = request.result; };
      } catch (error) {
        transaction.abort(); reject(error);
      }
    });
  });
  chain = result.then(() => undefined, () => undefined);
  return result;
}

export async function loadImportPreview(key: string): Promise<ImportPreview | null> {
  const value = await operation("readonly", store => store.get(key));
  if (value === undefined) return null;
  if (!Array.isArray(value?.candidates)) throw new Error("临时预览无法读取，请保留原文件后重试，原预览尚未删除。");
  return value;
}

export function saveImportPreview(key: string, value: ImportPreview) {
  return operation("readwrite", store => store.put({ ...value, updatedAt: new Date().toISOString(), leaseVersion: 1 }, key));
}

export function removeImportPreview(key: string) {
  return operation("readwrite", store => store.delete(key)).then(result => {
    const source = forkSources.get(key);
    if (source) { claims.delete(source); forkSources.delete(key); }
    return result;
  });
}

export type ImportPreviewSummary = { key: string; title: string; count: number; updatedAt: string };
export function listImportPreviews(kind: string) {
  const result = chain.then(async () => {
    const db = await open();
    return new Promise<ImportPreviewSummary[]>((resolve, reject) => {
      const transaction = db.transaction("previews", "readonly");
      const summaries: ImportPreviewSummary[] = [];
      const request = transaction.objectStore("previews").openCursor(IDBKeyRange.bound(`${kind}:`, `${kind}:\uffff`));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        const value = cursor.value;
        summaries.push({ key: String(cursor.key), title: value?.candidates?.[0]?.title || "未命名预览",
          count: Array.isArray(value?.candidates) ? value.candidates.length : 0, updatedAt: value?.updatedAt || "" });
        cursor.continue();
      };
      transaction.oncomplete = () => resolve(summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      transaction.onabort = () => reject(transaction.error || new Error("未完成预览列表无法读取"));
      transaction.onerror = () => { /* 原预览保留 */ };
    });
  });
  chain = result.then(() => undefined, () => undefined);
  return result;
}

// 页面整个生命周期持有锁；复制标签页的 sessionStorage 相同，也不能共用写入目标。
const owned = new Set<string>();
const claims = new Map<string, Promise<string>>();
const forkSources = new Map<string, string>();
async function reserve(key: string) {
  if (!navigator.locks) return false;
  return new Promise<boolean>((resolve, reject) => {
    void navigator.locks.request(`qingxiaolu-import:${key}`, { ifAvailable: true }, async lock => {
      if (!lock) { resolve(false); return; }
      owned.add(key); resolve(true);
      // 浏览器在页面关闭或导航时释放；离开导入面板仍保护本页面的预览。
      await new Promise<void>(() => {});
    }).catch(reject);
  });
}

export function claimImportPreview(key: string): Promise<string> {
  if (claims.has(key)) return claims.get(key)!;
  const result = (async () => {
    const source = await loadImportPreview(key);
    // 旧版本没有页面锁，迁移时先另存副本，保留仍打开的旧页面原有写入目标。
    if ((!source || source.leaseVersion === 1) && await reserve(key)) return key;
    const kind = key.split(":")[0];
    const independent = `${kind}:${crypto.randomUUID()}`;
    await reserve(independent);
    if (source) await saveImportPreview(independent, { ...source,
      candidates: source.candidates.map(item => ({ ...item, id: crypto.randomUUID() })) });
    forkSources.set(independent, key);
    claims.set(independent, Promise.resolve(independent));
    return independent;
  })();
  claims.set(key, result);
  void result.catch(() => { claims.delete(key); });
  return result;
}

export async function discardImportPreview(key: string) {
  if (!navigator.locks || owned.has(key)) return removeImportPreview(key);
  return navigator.locks.request(`qingxiaolu-import:${key}`, { ifAvailable: true }, async lock => {
    if (!lock) throw new Error("该预览正在其他页面使用，请先关闭那个页面，再丢弃预览。");
    await removeImportPreview(key);
  });
}
