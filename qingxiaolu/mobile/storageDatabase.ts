// 创作内容使用 IndexedDB；登录令牌等小型设置仍由现有登录系统管理。
export const WRITING_KEYS = ["qx_drafts", "qx_server_cache", "qx_item_versions", "qx_web_outbox",
  "qx_project_workspaces", "qx_editor_autosave", "qx_local_trash", "qx_deleted_ids", "qx_sync_conflicts"] as const;
const managed = new Set<string>(WRITING_KEYS);
let database: IDBDatabase | undefined;
let initialized = false;
let opening: Promise<{ legacyRecovery: boolean }> | undefined;
const cache = new Map<string, string>();
let pending = 0;
let writeChain: Promise<unknown> = Promise.resolve();
let cacheSequence = 0;
let channel: BroadcastChannel | undefined;

export function writingDatabaseReady() { return initialized; }
export function writingKey(key: string) { return managed.has(key); }
export function cachedWritingValue(key: string) { return cache.get(key) ?? null; }
export function pendingWritingTransactions() { return pending > 0; }

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error || new Error("本机创作数据写入被中断"));
    transaction.onerror = () => { /* 事务中止后统一处理，保留原数据 */ };
  });
}

function requestValue<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
}

async function openDatabase() {
  const request = indexedDB.open("qingxiaolu-writing", 1);
  request.onupgradeneeded = () => {
    const db = request.result;
    db.createObjectStore("values");
    db.createObjectStore("migration");
  };
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("本机创作数据被另一个页面占用，请刷新其他情晓录页面后重试"));
  });
  db.onversionchange = () => { db.close(); database = undefined; };
  return db;
}

export async function initializeWritingDatabase() {
  if (database && initialized) return { legacyRecovery: false };
  if (opening) return opening;
  opening = initialize().finally(() => { opening = undefined; });
  return opening;
}

async function initialize() {
  const db = await openDatabase();
  try {
    const legacy: Record<string, string> = {};
    for (const key of WRITING_KEYS) {
      const value = localStorage.getItem(key);
      if (value !== null) { JSON.parse(value); legacy[key] = value; }
    }
    const transaction = db.transaction(["values", "migration"], "readwrite");
    const completed = transactionDone(transaction);
    const store = transaction.objectStore("values");
    const migration = transaction.objectStore("migration");
    let loaded = new Map<string, string>();
    let legacyRecovery = false;
    let sequence = 0;
    let preparationError: unknown;
    const requests = [store.getAllKeys(), store.getAll(), migration.get("initialized"), migration.get("original-local-storage"),
      migration.get("legacy-recovery"), migration.get("sequence")];
    const results: any[] = [];
    let remaining = requests.length;
    requests.forEach((request, at) => { request.onsuccess = () => {
      results[at] = request.result;
      if (--remaining) return;
      try {
        const [keys, records, migrated, original, priorRecovery, currentSequence] = results;
        loaded = rows(keys, records, true); sequence = Number(currentSequence || 0);
        legacyRecovery = Boolean(priorRecovery);
        if (!migrated) {
          for (const [key, value] of Object.entries(legacy)) { store.put(value, key); loaded.set(key, value); }
          migration.put(legacy, "original-local-storage");
          migration.put({ createdAt: new Date().toISOString(), version: 1 }, "initialized");
        } else if (Object.entries(legacy).some(([key, value]) => value !== original?.[key])) {
          migration.put({ ...(original || {}), ...(priorRecovery || {}), ...legacy }, "legacy-recovery");
          legacyRecovery = true;
        }
      } catch (error) { preparationError = error; transaction.abort(); }
    }; });
    await completed.catch(error => { throw preparationError || error; });
    cache.clear(); for (const [key, value] of loaded) cache.set(key, value);
    database = db; initialized = true; cacheSequence = sequence;
    // 已确认事务成功后才释放旧容量；原始副本保留在 migration 中。
    for (const key of Object.keys(legacy)) if (localStorage.getItem(key) === legacy[key]) localStorage.removeItem(key);
    if (!channel && typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel("qingxiaolu-writing-updates");
      channel.onmessage = () => { void refreshWritingCache().catch(() => undefined); };
    }
    return { legacyRecovery };
  } catch (error) { db.close(); throw error; }
}

function rows(keys: IDBValidKey[], values: any[], validate = false) {
  const result = new Map<string, string>();
  for (let at = 0; at < keys.length; at++) {
    const key = String(keys[at]);
    if (!managed.has(key) || typeof values[at] !== "string") throw new Error("本机创作数据格式异常，原数据尚未改动");
    if (validate) JSON.parse(values[at]); result.set(key, values[at]);
  }
  return result;
}

export async function refreshWritingCache() {
  if (!database) return;
  const transaction = database.transaction(["values", "migration"], "readonly");
  const store = transaction.objectStore("values");
  const [keys, records, sequence] = await Promise.all([requestValue(store.getAllKeys()), requestValue(store.getAll()),
    requestValue(transaction.objectStore("migration").get("sequence"))]);
  if (Number(sequence || 0) < cacheSequence) return;
  const fresh = rows(keys, records);
  cache.clear(); for (const [key, value] of fresh) cache.set(key, value);
  cacheSequence = Number(sequence || 0);
  window.dispatchEvent(new Event("qx-writing-change"));
}

export type WritingTransaction<T> = { values: Record<string, string | null>; result: T };
export function writingTransaction<T>(prepare: () => WritingTransaction<T>): Promise<T> {
  pending++;
  const operation = writeChain.then(async () => {
    if (!database) throw new Error("本机创作数据尚未打开，请保留编辑页面，导出备份后刷新重试");
    const transaction = database.transaction(["values", "migration"], "readwrite");
    const completed = transactionDone(transaction);
    let change: WritingTransaction<T> | undefined;
    let preparationError: unknown;
    let sequence = 0;
    try {
      const store = transaction.objectStore("values");
      const metadata = transaction.objectStore("migration");
      const sequenceRequest = metadata.get("sequence");
      const apply = (fresh: Map<string, string>) => {
        try {
          // 同一读写事务内读取最新内容；另一个标签页的保存也不会被旧缓存覆盖。
          cache.clear(); for (const [key, value] of fresh) cache.set(key, value);
          cacheSequence = sequence;
          change = prepare();
          for (const key of Object.keys(change.values)) if (!managed.has(key)) throw new Error(`不支持的创作数据项：${key}`);
          for (const [key, value] of Object.entries(change.values)) {
            // 未改动的大图和版本不重复写盘；实际修改仍在同一个事务中提交。
            if (value === null) { if (fresh.has(key)) store.delete(key); }
            else if (value !== fresh.get(key)) store.put(value, key);
          }
          metadata.put(sequence + 1, "sequence");
        } catch (error) { preparationError = error; transaction.abort(); }
      };
      sequenceRequest.onsuccess = () => {
        sequence = Number(sequenceRequest.result || 0);
        // 序号相同说明缓存仍对应磁盘版本，免去每次保存重读全部原图。
        // 序号检查在读写事务里完成，其他页面不能在检查与写入之间插入修改。
        if (sequence === cacheSequence) { apply(new Map(cache)); return; }
        const keysRequest = store.getAllKeys(), recordsRequest = store.getAll();
        let keys: IDBValidKey[] | undefined, records: any[] | undefined;
        const loaded = () => {
          if (!keys || !records) return;
          try { apply(rows(keys, records)); }
          catch (error) { preparationError = error; transaction.abort(); }
        };
        keysRequest.onsuccess = () => { keys = keysRequest.result; loaded(); };
        recordsRequest.onsuccess = () => { records = recordsRequest.result; loaded(); };
      };
      await completed;
    } catch (error) {
      try { transaction.abort(); } catch { /* 已中止或完成 */ }
      await completed.catch(() => undefined);
      throw preparationError || error;
    }
    // 只有磁盘事务完成后才更新缓存，界面不能将失败的内容当成已保存。
    for (const [key, value] of Object.entries(change!.values)) { if (value === null) cache.delete(key); else cache.set(key, value); }
    cacheSequence = sequence + 1;
    channel?.postMessage(cacheSequence);
    window.dispatchEvent(new Event("qx-writing-change"));
    return change!.result;
  });
  writeChain = operation.then(() => undefined, () => undefined);
  return operation.finally(() => { pending--; });
}

export async function legacyWritingSnapshot(recovery = false): Promise<Record<string, string> | null> {
  if (!database) return null;
  return await requestValue(database.transaction("migration").objectStore("migration").get(recovery ? "legacy-recovery" : "original-local-storage")) || null;
}
