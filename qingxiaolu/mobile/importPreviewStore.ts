import type { ImportCandidate } from "./importers/types";

export type ImportPreview = {
  candidates: ImportCandidate[];
  targetProjectId: string;
  targetCategory: string;
  skipDuplicates: boolean;
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
  return operation("readwrite", store => store.put(value, key));
}

export function removeImportPreview(key: string) {
  return operation("readwrite", store => store.delete(key));
}
