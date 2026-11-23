/** Bundled studio images keep the demo catalog available offline. */
export function productImage(url: string): string {
  const match = /^https:\/\/picsum\.photos\/400\/400\?seed=pcc-(mug|tote|board|bottle|beanie|candle|journal|cup|backpack)-([123])$/.exec(url);
  if (!match) return url;
  const [, product, view] = match;
  return `/products/${product}-${view}.webp?seed=pcc-${product}-${view}`;
}
