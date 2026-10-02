// 用已打开本地开发网页的 Playwright CLI run-code 执行；只读写本测试的随机键。
async page => {
  return page.evaluate(async () => {
    const { loadImportPreview, saveImportPreview, removeImportPreview } = await import('/importPreviewStore.ts');
    const prefix = `test-${crypto.randomUUID()}`;
    const keys = [`${prefix}-a`, `${prefix}-b`];
    const preview = text => ({ candidates: [{ id: 'preview-a', source: 'txt', sourceLabel: 'TXT',
      title: '预览', text, images: ['data:image/png;base64,' + 'A'.repeat(6 * 1024 * 1024)], selected: false }],
      targetProjectId: 'project-a', targetCategory: '资料', skipDuplicates: false });
    const assert = (condition, message) => { if (!condition) throw new Error(message); };
    try {
      const original = preview('作者修改');
      await saveImportPreview(keys[0], original);
      const stored = await loadImportPreview(keys[0]);
      assert(JSON.stringify({ ...stored, updatedAt: undefined, leaseVersion: undefined }) === JSON.stringify(original), '大预览往返不完整');
      assert(Boolean(stored.updatedAt), '缺少恢复列表的保存时间');
      await Promise.all([saveImportPreview(keys[0], preview('第一笔')), saveImportPreview(keys[0], preview('第二笔'))]);
      assert((await loadImportPreview(keys[0])).candidates[0].text === '第二笔', '连续保存次序错误');
      await saveImportPreview(keys[1], preview('另一标签页'));
      const put = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (value, key) {
        if (key === keys[0]) throw new DOMException('test-only', 'QuotaExceededError');
        return put.call(this, value, key);
      };
      let failed = false;
      try { await saveImportPreview(keys[0], preview('失败修改')); } catch { failed = true; }
      finally { IDBObjectStore.prototype.put = put; }
      assert(failed && (await loadImportPreview(keys[0])).candidates[0].text === '第二笔', '失败写入破坏旧副本');
      await saveImportPreview(keys[0], preview('成功重试'));
      assert((await loadImportPreview(keys[0])).candidates[0].text === '成功重试', '失败后的队列不能重试');
      await removeImportPreview(keys[0]);
      assert(await loadImportPreview(keys[0]) === null, '取消未删除');
      assert((await loadImportPreview(keys[1])).candidates[0].text === '另一标签页', '取消误删其他预览');
      return { largeRoundtrip: true, queueOrder: true, rollbackAndRetry: true, independentRemoval: true };
    } finally {
      for (const key of keys) await removeImportPreview(key);
    }
  });
}
