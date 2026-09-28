const TIME_ZONE = 'Asia/Tbilisi';

/**
 * Tbilisi-time date parts, read through en-GB because every browser has it.
 * Chrome ships no Georgian date or number data: `Intl.DateTimeFormat('ka')`
 * silently falls back to US English ("Sep 28, 2026") there.
 */
const PARTS = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: TIME_ZONE,
});

function tbilisiParts(value: string | Date) {
  const parts: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};
  for (const { type, value: text } of PARTS.formatToParts(new Date(value))) parts[type] = text;
  return parts;
}

type UnitKey = 'bytes' | 'kb' | 'mb';
type Units = (key: UnitKey, values: { size: string }) => string;

/**
 * Dates and file sizes in the dashboard's language, in Tbilisi time wherever
 * the admin happens to be. `units` words a size (admin.units).
 *
 * English keeps the day-month-year order the dashboard has always used
 * (en-GB). Georgian is written the way it is in Georgia, 28.09.2026, and put
 * together here rather than by the browser (see PARTS).
 */
export function createAdminFormat(locale: string, units: Units) {
  if (locale === 'en') {
    const common = { day: '2-digit', month: 'short', year: 'numeric', timeZone: TIME_ZONE } as const;
    const date = new Intl.DateTimeFormat('en-GB', common);
    const dateTime = new Intl.DateTimeFormat('en-GB', {
      ...common,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    const number = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 });

    return {
      date: (value: string | Date) => date.format(new Date(value)),
      dateTime: (value: string | Date) => dateTime.format(new Date(value)),
      fileSize: (bytes: number) => fileSize(bytes, (size) => number.format(size), units),
    };
  }

  const date = (value: string | Date) => {
    const { day, month, year } = tbilisiParts(value);
    return `${day}.${month}.${year}`;
  };

  return {
    date,
    dateTime: (value: string | Date) => {
      const { hour, minute } = tbilisiParts(value);
      return `${date(value)}, ${hour}:${minute}`;
    },
    // A decimal comma, and no thousands separator.
    fileSize: (bytes: number) =>
      fileSize(bytes, (size) => String(Math.round(size * 10) / 10).replace('.', ','), units),
  };
}

function fileSize(bytes: number, format: (size: number) => string, units: Units): string {
  if (bytes < 1024) return units('bytes', { size: format(bytes) });
  if (bytes < 1024 * 1024) return units('kb', { size: format(Math.round(bytes / 1024)) });
  return units('mb', { size: format(bytes / (1024 * 1024)) });
}
