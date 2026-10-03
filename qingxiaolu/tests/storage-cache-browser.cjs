// Playwright CLI：仅在独立验收浏览器运行，覆盖同版本缓存、未收到通知的外部更新与失败回滚。
async page => {
  await page.getByRole('button', { name: '项目', exact: true }).waitFor();
  let child;
  const firstId = `cache-first-${Date.now()}`, secondId = `cache-second-${Date.now()}`;
  try {
    await page.evaluate(async firstId => {
      const db = await import(performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname === '/storageDatabase.ts').name);
      const storage = await import(performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname === '/storage.ts').name);
      await db.initializeWritingDatabase();
      window.qxCacheTest = { reads: 0, puts: 0, originalGetAll: IDBObjectStore.prototype.getAll, originalPut: IDBObjectStore.prototype.put };
      const state = window.qxCacheTest;
      IDBObjectStore.prototype.getAll = function (...args) {
        if (this.name === 'values') state.reads++;
        return state.originalGetAll.apply(this, args);
      };
      IDBObjectStore.prototype.put = function (...args) {
        if (this.name === 'values') state.puts++;
        return state.originalPut.apply(this, args);
      };
      await storage.changeJson(() => ({ values: { qx_drafts: [...storage.readJson('qx_drafts', []),
        { id: firstId, itemType: 'article', title: '缓存验收甲', content: { text: '甲' }, baseRevision: 0 }] }, result: undefined }));
      const puts = state.puts;
      const unchanged = storage.readJson('qx_drafts', []);
      await storage.storeJson('qx_drafts', unchanged);
      if (state.reads !== 0) throw new Error('相同版本仍重读全部原图');
      if (state.puts !== puts) throw new Error('未改变的稿件被重复写盘');
    }, firstId);
    child = await page.context().newPage();
    await child.goto(page.url());
    await child.getByRole('button', { name: '项目', exact: true }).waitFor();
    await child.evaluate(async secondId => {
      const storage = await import(performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname === '/storage.ts').name);
      // 故意不通知另一页，验证保存方必须检查磁盘版本，不能只相信内存。
      BroadcastChannel.prototype.postMessage = () => {};
      await storage.changeJson(() => ({ values: { qx_drafts: [...storage.readJson('qx_drafts', []),
        { id: secondId, itemType: 'article', title: '缓存验收乙', content: { text: '乙' }, baseRevision: 0 }] }, result: undefined }));
    }, secondId);
    await page.evaluate(async ({ firstId, secondId }) => {
      const storage = await import(performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname === '/storage.ts').name), state = window.qxCacheTest;
      await storage.changeJson(() => ({ values: { qx_drafts: storage.readJson('qx_drafts', []).map(item =>
        item.id === firstId ? { ...item, title: '甲已修改' } : item) }, result: undefined }));
      const drafts = storage.readJson('qx_drafts', []);
      if (state.reads !== 1 || !drafts.some(item => item.id === secondId && item.content.text === '乙'))
        throw new Error('漏通知后未刷新，或覆盖另一页的正文');
      const before = storage.readStored('qx_drafts'), oldEditor = storage.readStored('qx_editor_autosave');
      IDBObjectStore.prototype.put = function (value, key) {
        if (key === 'qx_editor_autosave') throw new DOMException('test-only', 'QuotaExceededError');
        return state.originalPut.call(this, value, key);
      };
      let failed = false;
      try { await storage.changeJson(() => ({ values: { qx_drafts: drafts.map(item => item.id === firstId ? { ...item, title: '必须回滚' } : item),
        qx_editor_autosave: { body: '不可成功写入' } }, result: undefined })); }
      catch { failed = true; }
      finally { IDBObjectStore.prototype.put = state.originalPut; }
      if (!failed || storage.readStored('qx_drafts') !== before || storage.readStored('qx_editor_autosave') !== oldEditor)
        throw new Error('失败后未回滚缓存');
      const request = indexedDB.open('qingxiaolu-writing', 1);
      const saved = await new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () => { const db = request.result, query = db.transaction('values').objectStore('values').get('qx_drafts');
          query.onsuccess = () => { db.close(); resolve(query.result); }; query.onerror = () => reject(query.error); };
      });
      if (saved !== before) throw new Error('失败后磁盘数据被部分改动');
    }, { firstId, secondId });
    return { sameVersionSkipsFullRead: true, unchangedSkipsWrite: true,
      unannouncedOtherPageUpdateRetained: true, transactionRollbackRetained: true };
  } finally {
    if (child) await child.close();
    await page.evaluate(async ids => {
      if (window.qxCacheTest) { IDBObjectStore.prototype.getAll = window.qxCacheTest.originalGetAll; IDBObjectStore.prototype.put = window.qxCacheTest.originalPut; }
      const storage = await import(performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname === '/storage.ts').name);
      await storage.changeJson(() => ({ values: { qx_drafts: storage.readJson('qx_drafts', []).filter(item => !ids.includes(item.id)) }, result: undefined }));
    }, [firstId, secondId]);
  }
}
