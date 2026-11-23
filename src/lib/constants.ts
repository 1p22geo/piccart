export const PAGE_SIZE = 12;
export const MAX_QTY_PER_LINE = 10;
export const LOW_STOCK_THRESHOLD = 5;
export const SESSION_TTL_DAYS = 30;
export const SESSION_COOKIE = 'piccart_sid';
export const MAX_PRICE_CENTS = 10_000_000; // 100,000.00
export const MAX_STOCK = 1_000_000;
export const BCRYPT_COST = 10;

// Project override: Polska first, Polish country names.
export const COUNTRIES = [
  'Polska', 'Wielka Brytania', 'Kanada', 'Niemcy', 'Francja', 'Hiszpania',
  'Włochy', 'Holandia', 'Szwecja', 'Japonia', 'Australia', 'Brazylia',
] as const;

export const SORT_OPTIONS = [
  'newest', 'name-asc', 'name-desc', 'price-asc', 'price-desc',
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];
