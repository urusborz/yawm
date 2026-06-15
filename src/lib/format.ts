const eur = new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' });

export function money(value: number, currency = 'EUR') {
  if (currency === 'EUR') return eur.format(value);
  return new Intl.NumberFormat('de-AT', { style: 'currency', currency }).format(value);
}

export function initials(name?: string | null) {
  if (!name) return '··';
  const parts = name.trim().split(/[\s@._-]+/).filter(Boolean);
  if (parts.length === 0) return '··';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function pluralize(count: number, one: string, many: string) {
  return count === 1 ? one : many;
}

/** Extracts a human message from Error, Supabase PostgrestError/AuthError, or anything. */
export function errMsg(e: unknown, fallback: string) {
  if (!e) return fallback;
  if (e instanceof Error) return e.message;
  if (typeof e === 'object') {
    const o = e as Record<string, unknown>;
    const msg = (o.message || o.error_description || o.error || o.hint || o.details) as string | undefined;
    if (msg) return msg;
  }
  if (typeof e === 'string') return e;
  return fallback;
}
