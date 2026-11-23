// Open-redirect guard (§8.4 screens 3–4): `next` is used only if it starts with a
// single "/" (a same-site relative path). Anything else falls back to "/".
export function safeNext(raw: string | string[] | undefined): string {
  if (typeof raw !== 'string') return '/';
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
  return '/';
}
