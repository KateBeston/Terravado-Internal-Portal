/* Stock matching — score developer stock (lots) against a client's buying
   position and criteria to surface best-fit lots. Indicative only: it ranks fit,
   it is not financial advice. Affordability is derived from the client's
   borrowing capacity (the serviceability engine) + deposit; yield, location and
   size are weighted preferences. */
import type { Lot } from "@/lib/domain/types";

export interface MatchCriteria {
  maxPrice?: number;     // max purchase price = borrowing capacity + deposit
  minYieldPct?: number;  // target gross yield
  state?: string;        // preferred state ("" = any)
  minBeds?: number;
}

export interface StockItem { lot: Lot; developmentName: string; developmentState?: string; }

export interface LotMatch {
  lot: Lot;
  developmentName: string;
  developmentState?: string;
  yieldPct?: number;
  score: number;                 // 0-100
  verdict: "strong" | "possible" | "stretch";
  reasons: string[];
}

const money = (v: number) => "$" + Math.round(v).toLocaleString("en-AU");

export function lotYield(lot: Lot): number | undefined {
  if (lot.advertisedYieldPct != null) return lot.advertisedYieldPct;
  if (lot.advertisedRent && lot.price) return (lot.advertisedRent * 52) / lot.price * 100;
  return undefined;
}

function scoreItem(item: StockItem, c: MatchCriteria): LotMatch {
  const { lot } = item;
  const reasons: string[] = [];
  let earned = 0, possible = 0;
  let affordable = true;

  // Affordability — the strongest factor.
  if (c.maxPrice && lot.price) {
    possible += 50;
    if (lot.price <= c.maxPrice) { earned += 50; reasons.push(`Within budget (${money(lot.price)} ≤ ${money(c.maxPrice)})`); }
    else if (lot.price <= c.maxPrice * 1.1) { earned += 22; affordable = false; reasons.push(`Slightly over budget by ${money(lot.price - c.maxPrice)}`); }
    else { affordable = false; reasons.push(`Over budget by ${money(lot.price - c.maxPrice)}`); }
  }

  // Yield.
  const y = lotYield(lot);
  if (c.minYieldPct && y != null) {
    possible += 30;
    if (y >= c.minYieldPct) { earned += 30; reasons.push(`Yield ${y.toFixed(1)}% meets target ${c.minYieldPct}%`); }
    else { earned += 30 * Math.max(0, y / c.minYieldPct); reasons.push(`Yield ${y.toFixed(1)}% below target ${c.minYieldPct}%`); }
  } else if (y != null) {
    reasons.push(`Yield ${y.toFixed(1)}%`);
  }

  // Location.
  if (c.state) {
    possible += 10;
    if ((item.developmentState ?? "").toUpperCase() === c.state.toUpperCase()) { earned += 10; reasons.push(`In preferred state ${c.state}`); }
    else reasons.push(`Not in preferred state ${c.state}`);
  }

  // Bedrooms.
  if (c.minBeds && lot.beds != null) {
    possible += 10;
    if (lot.beds >= c.minBeds) { earned += 10; reasons.push(`${lot.beds} beds (≥ ${c.minBeds})`); }
    else reasons.push(`${lot.beds} beds (< ${c.minBeds})`);
  }

  const score = possible > 0 ? Math.round((earned / possible) * 100) : 50;
  let verdict: LotMatch["verdict"] = score >= 75 ? "strong" : score >= 50 ? "possible" : "stretch";
  if (!affordable && verdict === "strong") verdict = "possible"; // never "strong" if over budget
  if (!affordable && c.maxPrice && lot.price && lot.price > c.maxPrice * 1.1) verdict = "stretch";

  return { lot, developmentName: item.developmentName, developmentState: item.developmentState, yieldPct: y, score, verdict, reasons };
}

export function matchStock(items: StockItem[], c: MatchCriteria): LotMatch[] {
  return items
    .filter((it) => it.lot.status === "available" || it.lot.status === "under_offer")
    .map((it) => scoreItem(it, c))
    .sort((a, b) => b.score - a.score);
}
