/* ===========================================================================
   SHORTLIST — model-backed, per-client property ranking.
   ---------------------------------------------------------------------------
   The generalisation of stock matching: instead of four preference weights, each
   candidate property is run through the full modelling engine FOR THIS CLIENT
   (their serviceability position, the area's growth) and ranked by the engine's
   verdict, adjusted for the client's goal and stated criteria. Every rank shows
   its working — serviceability, after-tax weekly, yield, projected equity — so
   it is a data-backed shortlist to investigate, not a buy instruction.

   Candidates come from any source (the tenant's "considering" properties,
   available stock lots, later a listings feed); this module only needs the few
   fields below, so a new source plugs in by producing Candidate[].
   =========================================================================== */
import { runModel, type ModelInputs } from "@/lib/modelling/run";
import { modelDepreciation } from "@/lib/engine/depreciation";
import { COUNTRIES } from "@/lib/engine/tax-data";
import { deriveAssessableFinances } from "@/lib/domain/finances";
import type { Client } from "@/lib/domain/types";

export type Goal = "balanced" | "cashflow" | "growth";

export interface Candidate {
  id: string;
  source: "property" | "stock";
  label: string;
  state?: string;
  price?: number;
  weeklyRent?: number;
  beds?: number;
  growthPct?: number;
  buildYear?: number;
  href?: string;      // link to the record, when there is one
  sublabel?: string;  // e.g. development name / suburb
}

/* Standard, clearly-ESTIMATED splits used only when the record doesn't carry the
   real figures — so the ranking reflects land tax and depreciation directionally.
   Conservative ratios; the exact numbers belong on the property record. */
function estimates(c: Candidate) {
  const price = c.price ?? 0;
  const thisYear = new Date().getFullYear();
  const by = c.source === "stock" ? thisYear : c.buildYear;
  const isNew = c.source === "stock" || (by != null && by >= thisYear - 2);
  const div43Ok = c.source === "stock" || (by != null && by >= 1987);
  const constructionCost = div43Ok ? Math.round(price * (isNew ? 0.5 : 0.4)) : 0;
  const plantValue = isNew ? Math.round(price * 0.04) : div43Ok ? Math.round(price * 0.015) : 0;
  const landValue = Math.round(price * ((c.beds ?? 3) >= 3 ? 0.45 : 0.3));
  return { by, constructionCost, plantValue, landValue };
}

export interface ShortlistCriteria {
  minYieldPct?: number;
  state?: string;
  minBeds?: number;
  goal?: Goal;
}

export interface Ranked {
  rank: number;
  candidate: Candidate;
  score: number;        // 0–100 composite
  band: string;         // engine verdict band
  weekly1: number;      // after-tax weekly cashflow, yr 1
  grossYield: number;
  equityEnd: number;    // projected equity, end of horizon
  irr: number | null;
  capacity: number;
  loan: number;
  serviceable: boolean;
  reasons: string[];
}

const money = (v: number) => (v < 0 ? "-$" : "$") + Math.abs(Math.round(v)).toLocaleString("en-AU");
const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

function clientPosition(client: Client) {
  const fin = deriveAssessableFinances(client.finances ?? {});
  return {
    grossIncome: fin.grossIncome ?? 0,
    partnerIncome: fin.partnerIncome,
    livingExpMonthly: fin.livingExpMonthly,
    dependants: fin.dependants,
    monthlyCommitments: fin.monthlyCommitments,
    cardLimits: fin.cardLimits,
    hecsBalance: fin.hecsBalance,
  };
}

/** Rank candidate properties for a client, most-suitable first. */
export function rankForClient(client: Client, candidates: Candidate[], engineLenders: unknown[], criteria: ShortlistCriteria = {}): Ranked[] {
  const pos = clientPosition(client);
  const goal = criteria.goal ?? "balanced";

  const ranked: Ranked[] = candidates
    .filter((c) => (c.price ?? 0) > 0)
    .slice(0, 80) // bound the compute for very large pools
    .map((c) => {
      const est = estimates(c);
      const inp: ModelInputs = {
        state: c.state || "NSW",
        price: c.price ?? 0,
        weeklyRent: c.weeklyRent ?? 0,
        growthPct: c.growthPct ?? 5.0,
        ratePct: 6.1,
        depositPct: 20,
        clientName: client.name,
        buildYear: est.by,
        landValue: est.landValue,
        modelling: { depMode: est.constructionCost > 0 ? "assumed" : "none", constructionCost: est.constructionCost, plantValue: est.plantValue },
        ...pos,
        ...(engineLenders.length ? { lenders: engineLenders as ModelInputs["lenders"] } : {}),
      };
      const r = runModel(inp);
      // Explainable estimates (the engine already folds these into the after-tax weekly above).
      const depYr1 = est.constructionCost > 0 ? modelDepreciation({ mode: "assumed", constructionCost: est.constructionCost, plantValue: est.plantValue, buildYear: est.by }, 1).firstYear : 0;
      const landTaxYr1 = COUNTRIES.AU.landTax(est.landValue, c.state || "NSW");
      const weekly1 = r.metrics.weekly1;
      const grossYield = r.metrics.grossYield;
      const serviceable = r.serviceability.capacity >= r.acq.loan;

      const reasons: string[] = [];
      let score = r.verdict.score;
      reasons.push(`Model verdict: ${r.verdict.band} (${r.verdict.score}/100)`);
      reasons.push(serviceable
        ? `Serviceable — capacity ${money(r.serviceability.capacity)} ≥ loan ${money(r.acq.loan)}`
        : `Over capacity — loan ${money(r.acq.loan)} > capacity ${money(r.serviceability.capacity)}`);
      if (!serviceable) score = Math.min(score, 45); // can't be a top pick if they can't fund it
      reasons.push(`${weekly1 >= 0 ? "+" : ""}${money(weekly1)}/wk after tax (yr 1)`);

      if (criteria.minYieldPct && grossYield != null) {
        if (grossYield >= criteria.minYieldPct) reasons.push(`Yield ${grossYield.toFixed(1)}% meets target ${criteria.minYieldPct}%`);
        else { score -= 8; reasons.push(`Yield ${grossYield.toFixed(1)}% below target ${criteria.minYieldPct}%`); }
      } else if (grossYield != null) {
        reasons.push(`Gross yield ${grossYield.toFixed(1)}%`);
      }
      if (criteria.minBeds && c.beds != null && c.beds < criteria.minBeds) { score -= 6; reasons.push(`${c.beds} beds (< ${criteria.minBeds})`); }
      if (criteria.state && (c.state ?? "").toUpperCase() !== criteria.state.toUpperCase()) { score -= 10; reasons.push(`Not in preferred state ${criteria.state}`); }

      // Goal weighting — tilt toward cashflow or growth without overriding the model.
      if (goal === "cashflow") score += Math.max(-8, Math.min(8, weekly1 / 25));
      else if (goal === "growth") score += Math.max(-8, Math.min(8, ((r.metrics.irr ?? 0) - 6)));
      if (depYr1 > 0) reasons.push(`Est. depreciation yr 1: ~${money(depYr1)}${c.source === "stock" ? " (new build)" : ""} — lifts after-tax cashflow`);
      reasons.push(`Est. land tax: ~${money(landTaxYr1)}/yr standalone${landTaxYr1 === 0 ? " (below threshold)" : ""}`);
      reasons.push(`Projected equity yr ${10}: ${money(r.metrics.equityEnd)}`);

      return {
        rank: 0, candidate: c, score: Math.round(clamp(score)), band: r.verdict.band,
        weekly1, grossYield, equityEnd: r.metrics.equityEnd, irr: r.metrics.irr,
        capacity: r.serviceability.capacity, loan: r.acq.loan, serviceable, reasons,
      };
    });

  ranked.sort((a, b) => b.score - a.score || b.equityEnd - a.equityEnd);
  ranked.forEach((r, i) => { r.rank = i + 1; });
  return ranked;
}
