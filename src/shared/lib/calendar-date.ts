/**
 * Today's date in Tbilisi, "2026-10-02": the calendar the site keeps, wherever
 * the code runs. A Vercel function runs in UTC, four hours behind, and the
 * owner may open the dashboard abroad.
 */
export function todayInTbilisi(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Tbilisi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}
