/* Display formatters — ported from the original Terra UI. */
import { COUNTRIES, num } from "./engine/tax-data";

export function money(v: number, countryCode = "AU", dp = 0): string {
  const C = COUNTRIES[countryCode] || COUNTRIES.AU;
  if (!isFinite(v)) return "—";
  const n = Math.abs(v).toLocaleString(C.loc, { minimumFractionDigits: dp, maximumFractionDigits: dp });
  return v < 0 ? "(" + C.sym + n + ")" : C.sym + n;
}

export const pct = (v: number, dp = 2): string => (isFinite(v) ? (+v).toFixed(dp) + "%" : "—");

export const short = (v: number): string =>
  Math.abs(v) >= 1e6 ? (v / 1e6).toFixed(2) + "M" : Math.abs(v) >= 1e3 ? Math.round(v / 1e3) + "k" : String(Math.round(v));

export { num };
