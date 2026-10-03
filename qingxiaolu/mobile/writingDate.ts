export function parseWritingDate(value: unknown): { date: Date; dateOnly: boolean } | null {
  const text = String(value || "").trim();
  if (!text) return null;
  const day = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?=$|[T\s])/.exec(text) ||
    /^(\d{4})年(\d{1,2})月(\d{1,2})日$/.exec(text);
  if (day) {
    const year = Number(day[1]), month = Number(day[2]), date = Number(day[3]);
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (month < 1 || month > 12 || date < 1 || date > days[month - 1]) return null;
    if (day[0].length === text.length) {
      // 日历日期没有时区和时刻，按本机日历创建，不能按 UTC 零点换成前一天。
      const local = new Date(0); local.setFullYear(year, month - 1, date); local.setHours(12, 0, 0, 0);
      return { date: local, dateOnly: true };
    }
  }
  const time = Date.parse(text);
  return Number.isFinite(time) ? { date: new Date(time), dateOnly: false } : null;
}

export function writingDateInfo(value: unknown, fallbackTime: number) {
  const original = String(value || "").trim();
  const parsed = parseWritingDate(original);
  const date = parsed?.date || new Date(fallbackTime);
  const needsReview = Boolean(original && !parsed);
  const year = date.getFullYear(), month = date.getMonth() + 1;
  return {
    time: date.getTime(),
    label: needsReview ? `原日期：${original}（待核对）` : parsed?.dateOnly
      ? `${year}年${month}月${date.getDate()}日` : date.toLocaleString(),
    groupKey: needsReview ? "date-review" : `${year}-${String(month).padStart(2, "0")}`,
    groupLabel: needsReview ? "日期待核对" : `${year}年${month}月`,
  };
}
