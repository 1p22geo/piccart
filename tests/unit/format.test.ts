import { escapeLike, formatDateTime, formatMoney, slugify } from '@/lib/format';

// pl-PL formatting (project override): narrow no-break space U+00A0 as thousands
// separator, comma decimal, "zł" suffix; dates as pl-PL medium/short + " UTC".
const NBSP = '\u00a0';

describe('format', () => {
  test('U-FMT-01 formatMoney: 1850→18,50 zł, 1234567→12 345,67 zł, 1→0,01 zł', () => {
    expect(formatMoney(1850)).toBe(`18,50${NBSP}zł`);
    expect(formatMoney(1_234_567)).toBe(`12${NBSP}345,67${NBSP}zł`);
    expect(formatMoney(1)).toBe(`0,01${NBSP}zł`);
  });

  test('U-FMT-02 formatDateTime("2026-11-23T10:02:11.000Z") contains "23 lis 2026" and "UTC"', () => {
    const formatted = formatDateTime('2026-11-23T10:02:11.000Z');
    expect(formatted).toContain('23 lis 2026');
    expect(formatted).toContain('UTC');
  });

  test('U-FMT-03 slugify("Screen 1 — Catalog / “Home”") → "screen-1-catalog-home"', () => {
    expect(slugify('Screen 1 — Catalog / “Home”')).toBe('screen-1-catalog-home');
  });

  test('U-FMT-04 escapeLike("50_off\\100%") escapes \\, %, _', () => {
    expect(escapeLike('50_off\\100%')).toBe('50\\_off\\\\100\\%');
  });
});
