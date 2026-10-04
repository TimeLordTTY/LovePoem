// 只读取当前已加载的内容卡片，不点击发表、评论、登录或绕过平台访问限制。
export function collectLoadedHistory(source) {
  const roots = [...document.querySelectorAll('article, [mid], [data-mblogid], .f-single, .WB_feed_detail')];
  const identified = node => node.matches('[mid], [data-mblogid], .f-single');
  const posts = roots.filter(node => !roots.some(other => other !== node && other.contains(node) && identified(other)));
  const cards = posts.filter(node => identified(node) || !posts.some(other => other !== node && node.contains(other)));
  return cards.map(node => {
    const body = node.querySelector('[node-type="feed_list_content_full"], [node-type="feed_list_content"], [class*="detail_wbtext"], .WB_text, .f-info, [data-post-body]');
    const text = (body?.innerText || body?.textContent || '').trim();
    const images = [...node.querySelectorAll('img')].filter(image => !image.closest('.avatar, [class*="avatar"], [class*="portrait"]'))
      .map(image => image.getAttribute('data-original') || image.getAttribute('data-src') || image.currentSrc || image.src)
      .filter(value => value && !/^(javascript|file):/i.test(value));
    const uniqueImages = [...new Set(images)];
    const time = node.querySelector('time, [node-type="feed_list_item_date"], .c_tx3[title], [data-published-at]');
    const publishedAt = time?.getAttribute('datetime') || time?.getAttribute('data-published-at') || time?.getAttribute('title') || '';
    const links = [...node.querySelectorAll('a[href]')].map(link => link.href);
    const originalUrl = links.find(link => source === 'weibo' ? /^https?:\/\/(?:www\.)?weibo\.com\/(?:\d+\/[^/?#]+|detail\/|status\/)/.test(link) : /^https?:\/\/user\.qzone\.qq\.com\/\d+\/(?:mood|blog)\//.test(link)) || '';
    const sourceId = node.getAttribute('mid') || node.getAttribute('data-mblogid') || node.getAttribute('data-tid') || '';
    const warnings = [];
    if (!body) warnings.push('未识别完整正文区域，请对照原页面补全；图片记录已保留。');
    if (!publishedAt) warnings.push('未识别原发布时间，请在正式导入前补全。');
    if (/展开全文|全文/.test(node.querySelector('[node-type="feed_list_content"]')?.innerText || '') || node.querySelector('[data-truncated="true"]'))
      warnings.push('正文可能折叠，请在原页面展开后重新采集。');
    return { sourceId, source, sourceLabel: source === 'weibo' ? '微博' : 'QQ空间', title: '', text,
      images: uniqueImages, publishedAt, originalUrl, warnings };
  }).filter(row => row.text || row.images.length);
}

export function mergeLoadedHistory(records, rows) {
  for (const row of rows) {
    const key = row.sourceId ? `${row.source}:${row.sourceId}` : row.originalUrl || JSON.stringify([row.source, row.publishedAt, row.text, row.images]);
    const previous = records.get(key);
    if (!previous || row.text.length >= previous.text.length) records.set(key, { ...row, images: [...new Set([...(previous?.images || []), ...row.images])] });
  }
}
