// Playwright CLI：在本地开发网页运行，使用随机测试前缀，不修改作者预览。
async page => {
  const kind = `test-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const legacy = `${kind}:legacy`;
  const keys = [legacy];
  let child;
  try {
    const first = await page.evaluate(async key => {
      const store = await import('/importPreviewStore.ts');
      const value = { candidates: [{ id: 'original-id', source: 'txt', sourceLabel: 'TXT', title: '旧预览',
        text: '旧内容', images: [], selected: false }], targetProjectId: 'project', targetCategory: '资料', skipDuplicates: false };
      await new Promise((resolve, reject) => {
        const request = indexedDB.open('qingxiaolu-import-previews', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('previews');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result, tx = db.transaction('previews', 'readwrite');
          tx.objectStore('previews').put(value, key);
          tx.oncomplete = () => { db.close(); resolve(); };
          tx.onabort = () => { db.close(); reject(tx.error); };
        };
      });
      const claimed = await store.claimImportPreview(key), saved = await store.loadImportPreview(claimed);
      if (claimed === key || saved.candidates[0].id === 'original-id') throw new Error('旧页面迁移未隔离');
      saved.candidates[0].text = 'A 的内容'; await store.saveImportPreview(claimed, saved);
      return claimed;
    }, legacy);
    keys.push(first);
    child = await page.context().newPage(); await child.goto(page.url());
    const second = await child.evaluate(async key => {
      const store = await import('/importPreviewStore.ts');
      const claimed = await store.claimImportPreview(key), saved = await store.loadImportPreview(claimed);
      if (claimed === key) throw new Error('另一页面共用了预览键');
      saved.candidates[0].text = 'B 的内容'; await store.saveImportPreview(claimed, saved);
      return claimed;
    }, first);
    keys.push(second);
    await page.evaluate(async ({ first, second, kind }) => {
      const store = await import('/importPreviewStore.ts');
      const a = await store.loadImportPreview(first), b = await store.loadImportPreview(second);
      if (a.candidates[0].text !== 'A 的内容' || b.candidates[0].text !== 'B 的内容' || a.candidates[0].id === b.candidates[0].id) throw new Error('独立副本覆盖内容或稿件 ID');
      if (b.targetCategory !== '资料' || b.candidates[0].selected !== false || b.skipDuplicates !== false) throw new Error('复制丢失导入选择');
      const summaries = await store.listImportPreviews(kind);
      if (!summaries.some(x => x.key === first) || !summaries.some(x => x.key === second)) throw new Error('待恢复列表缺少预览');
      let protectedPage = false;
      try { await store.discardImportPreview(second); } catch { protectedPage = true; }
      if (!protectedPage) throw new Error('误删仍在其他页面使用的预览');
    }, { first, second, kind });
    await child.close(); child = undefined;
    await page.waitForFunction(async name => !(await navigator.locks.query()).held.some(lock => lock.name === name),
      `qingxiaolu-import:${second}`, { timeout: 5000 });
    await page.evaluate(async ({ first, second }) => {
      const store = await import('/importPreviewStore.ts');
      await store.discardImportPreview(second);
      if (await store.loadImportPreview(second) !== null || !(await store.loadImportPreview(first))) throw new Error('关闭后的定向清理错误');
      await store.removeImportPreview(first);
    }, { first, second });
    const restored = await page.evaluate(async key => {
      const store = await import('/importPreviewStore.ts');
      const result = await store.claimImportPreview(key);
      if (!(await store.loadImportPreview(result))) throw new Error('取消副本后无法再次恢复源预览');
      return result;
    }, legacy);
    keys.push(restored);
    return { legacySafeMigration: true, multiPageIsolation: true, independentIds: true, recoveryList: true,
      activePageProtection: true, closeThenDiscard: true, restoreAgain: true };
  } finally {
    if (child) await child.close();
    await page.evaluate(async keys => {
      const store = await import('/importPreviewStore.ts');
      for (const key of keys) await store.removeImportPreview(key);
    }, keys);
  }
}
