export function searchExcerpt(text: string, query: string, limit = 160) {
  const term = query.trim().toLowerCase(), lowered = term ? text.toLowerCase() : text;
  let matchStart = term ? lowered.indexOf(term) : -1, matchEnd = matchStart + term.length;
  // 少数字符转小写后长度不同，仍按原文的位置显示，不移动或改写原文。
  if (matchStart >= 0 && lowered.length !== text.length) {
    const from = matchStart, to = matchEnd;
    let original = 0, folded = 0, found = false;
    for (const character of text) {
      const next = folded + character.toLowerCase().length;
      if (!found && from < next) { matchStart = original; found = true; }
      if (to <= next) { matchEnd = original + character.length; break; }
      original += character.length; folded = next;
    }
  }
  const isLow = (at: number) => at > 0 && /[\uDC00-\uDFFF]/.test(text[at] || "") && /[\uD800-\uDBFF]/.test(text[at - 1]);
  if (matchStart >= 0 && isLow(matchStart)) matchStart--;
  if (matchStart >= 0 && isLow(matchEnd)) matchEnd++;
  const width = Math.max(limit, matchStart < 0 ? 0 : matchEnd - matchStart + 80);
  let start = matchStart < 0 ? 0 : Math.max(0, matchStart - 50);
  let end = Math.min(text.length, start + width);
  if (matchStart >= 0) start = Math.max(0, Math.min(start, end - width));
  if (isLow(start)) start--;
  if (isLow(end)) end++;
  return { leading: start > 0, expandable: start > 0 || end < text.length,
    before: text.slice(start, matchStart < 0 ? end : matchStart),
    match: matchStart < 0 ? "" : text.slice(matchStart, matchEnd),
    after: matchStart < 0 ? "" : text.slice(matchEnd, end) };
}
