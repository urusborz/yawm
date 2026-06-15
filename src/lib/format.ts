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
