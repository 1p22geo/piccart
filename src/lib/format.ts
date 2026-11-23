// pl-PL formatting (project override of the spec's en-US/USD): money in PLN with
// narrow no-break space separators and comma decimals, dates in pl-PL medium/short
// plus a " UTC" suffix. Fixed locale + UTC keeps server/client rendering identical.
const moneyFormatter = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' });
const dateTimeFormatter = new Intl.DateTimeFormat('pl-PL', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'UTC',
});

export function formatMoney(cents: number): string {
  return moneyFormatter.format(cents / 100);
}

export function formatDateTime(iso: string): string {
  return `${dateTimeFormatter.format(new Date(iso))} UTC`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}
