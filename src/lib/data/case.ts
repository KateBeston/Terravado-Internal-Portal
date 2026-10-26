/* camelCase (app) <-> snake_case (Postgres) key mapping for the Supabase repo. */
const toSnake = (s: string): string => s.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase());
const toCamel = (s: string): string => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

export function keysToSnake(o: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(o)) out[toSnake(k)] = o[k];
  return out;
}

export function keysToCamel<T = unknown>(o: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(o)) out[toCamel(k)] = o[k];
  return out as T;
}
