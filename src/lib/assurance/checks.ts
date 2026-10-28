/* ===========================================================================
   TERRAVADO — Assurance: the check suite (Layers 1 & 4)
   Two kinds of check, each naming the AUTHORITATIVE SOURCE it answers to:
     • reference-data known-answer checks — the engine must reproduce the
       published schedule exactly (expected values computed by hand from that
       schedule). These catch code regressions automatically.
     • engine-path invariants — the engine must run end-to-end and return
       finite, correctly-ordered outputs.
   The `source` on each check is where a human auditor (Layer 5) re-confirms the
   figure still matches the live source, since real rates and policies move.
   =========================================================================== */

import { TAX_DATA } from "../engine/tax-data";
import { aggregateLandTax } from "../engine/landtax";
import { modelDepreciation } from "../engine/depreciation";
import { seedContext } from "../engine/seeds";
import {
  project, monteCarlo, feasibility, serviceability, valuation, equityChain,
} from "../engine/engine";

export type CheckStatus = "pass" | "fail";

export interface CheckResult {
  id: string;
  category: string;
  description: string;
  source: string;
  expected: number | string | null;
  actual: number | string | null;
  status: CheckStatus;
}

interface CheckDef {
  id: string;
  category: string;
  description: string;
  source: string;
  run: () => { expected: number | string | null; actual: number | string | null; pass: boolean };
}

const TOL = 1e-6;
const near = (a: number, b: number, tol = TOL): boolean => Math.abs(a - b) <= tol;

/** Compact helper for a rounded known-answer reference check. */
function ref(
  id: string,
  category: string,
  description: string,
  source: string,
  expected: number,
  compute: () => number,
): CheckDef {
  return {
    id,
    category,
    description,
    source,
    run: () => {
      const actual = Math.round(compute());
      return { expected, actual, pass: actual === expected };
    },
  };
}

/* ---- Layer 1: reference-data known-answer checks ------------------------- */
const referenceChecks: CheckDef[] = [
  ref("duty-nsw-760k", "Transfer duty", "NSW duty on $760,000", "Revenue NSW — transfer duty", 28729, () => TAX_DATA.transferDuty.NSW(760000)),
  ref("duty-nsw-1m", "Transfer duty", "NSW duty on $1,000,000", "Revenue NSW — transfer duty", 39529, () => TAX_DATA.transferDuty.NSW(1000000)),
  ref("duty-vic-500k", "Transfer duty", "VIC duty on $500,000", "SRO Victoria — land transfer duty", 25070, () => TAX_DATA.transferDuty.VIC(500000)),
  ref("duty-qld-540k", "Transfer duty", "QLD duty on $540,000", "Queensland Revenue Office — transfer duty", 17325, () => TAX_DATA.transferDuty.QLD(540000)),
  ref("landtax-nsw-1_5m", "Land tax", "NSW land tax on $1.5m land value", "Revenue NSW — land tax", 6900, () => TAX_DATA.landTax.NSW(1500000)),
  ref("landtax-nsw-threshold", "Land tax", "NSW land tax at $1,075,000 threshold is nil", "Revenue NSW — land tax", 0, () => TAX_DATA.landTax.NSW(1075000)),
  ref("landtax-aggregation-effect", "Land tax", "Two NSW $800k holdings under one entity: $8,500 aggregated vs $0 standalone", "Revenue NSW — land tax aggregation",
    8500, () => aggregateLandTax([
      { id: "a", label: "A", region: "NSW", landValue: 800000, ownerKey: "e1", ownerName: "Trust", ownerKind: "Trust" },
      { id: "b", label: "B", region: "NSW", landValue: 800000, ownerKey: "e1", ownerName: "Trust", ownerKind: "Trust" },
    ]).totalAggregated),
  ref("dep-div43-2_5pct", "Depreciation", "Div 43 capital works: $320k construction, post-1987 → $8,000 year 1", "ATO — Div 43 capital works (2.5% p.a.)",
    8000, () => modelDepreciation({ mode: "assumed", constructionCost: 320000, buildYear: 2015 }, 1).rows[0].div43),
  ref("dep-div40-dv-y1", "Depreciation", "Div 40 diminishing value: $5,000 asset, 10-yr life → $1,000 year 1", "ATO — Div 40 diminishing value (200%/life)",
    1000, () => modelDepreciation({ mode: "schedule", div40: [{ name: "Asset", value: 5000, life: 10, method: "Diminishing value" }] }, 1).rows[0].div40),
  ref("inctax-au-100k", "Income tax", "AU income tax + Medicare on $100,000", "ATO — individual rates 2026–27", 22520, () => TAX_DATA.incomeTax.AU(100000)),
  ref("inctax-au-200k", "Income tax", "AU income tax + Medicare on $200,000", "ATO — individual rates 2026–27", 59870, () => TAX_DATA.incomeTax.AU(200000)),
  {
    id: "cgt-individual", category: "CGT", description: "Individual CGT discount = 50%",
    source: "ATO — CGT discount",
    run: () => ({ expected: 0.5, actual: TAX_DATA.cgtDiscount.individual, pass: near(TAX_DATA.cgtDiscount.individual, 0.5) }),
  },
  {
    id: "cgt-smsf", category: "CGT", description: "SMSF CGT discount = 1/3",
    source: "ATO — CGT discount (super)",
    run: () => ({ expected: "0.3333", actual: +TAX_DATA.cgtDiscount.smsf.toFixed(4), pass: near(TAX_DATA.cgtDiscount.smsf, 1 / 3) }),
  },
  {
    id: "gst-rate", category: "GST", description: "GST rate = 10%",
    source: "ATO — GST",
    run: () => ({ expected: 0.1, actual: TAX_DATA.gstRate, pass: near(TAX_DATA.gstRate, 0.1) }),
  },
];

/* ---- Sample development used by the feasibility invariant ---------------- */
const sampleFeasibility = () => ({
  country: "AU", region: "NSW", landCost: 950000, landAcqCostsPct: 5.5, demolition: 35000,
  units: [{ count: 3, gfa: 150, buildRate: 2900, salePrice: 1150000 }],
  profFeesPct: 8, authorityFees: 45000, contributions: 70000, headworks: 35000,
  contingencyPct: 7, marketingPct: 1.2, sellingPct: 2.2, buildMonths: 14, sellMonths: 8,
  debtLVRpct: 65, debtLTCpct: 70, debtRate: 8.5, lineFeePct: 1.5,
  gstApplies: true, marginScheme: true, targetMarginPct: 20, holdingRatesPa: 9000,
});

/* ---- Layer 4: engine-path invariants ------------------------------------ */
function engineChecks(): CheckDef[] {
  const INV = "Engine invariant — internal consistency";
  const ctx = seedContext();
  const p = ctx.properties[0];
  const client = ctx.clients[0];
  const lender = ctx.lenders[0];

  return [
    {
      id: "proj-irr-finite", category: "Projection", description: "project() returns a finite IRR", source: INV,
      run: () => { const v = project(p, {}, ctx).metrics.irr; return { expected: "finite", actual: v, pass: v !== null && isFinite(v) }; },
    },
    {
      id: "proj-rows-10", category: "Projection", description: "10-year model produces 10 rows", source: INV,
      run: () => { const n = project(p, {}, ctx).rows.length; return { expected: 10, actual: n, pass: n === 10 }; },
    },
    {
      id: "proj-growth", category: "Projection", description: "end value exceeds purchase price", source: INV,
      run: () => { const P = project(p, {}, ctx); const pass = P.metrics.valueEnd > p.market.price; return { expected: "> price", actual: Math.round(P.metrics.valueEnd), pass }; },
    },
    {
      id: "mc-order", category: "Monte Carlo", description: "percentiles ordered p90 ≥ p50 ≥ p10", source: INV,
      run: () => {
        const mc = monteCarlo(p, { runs: 200 }, ctx);
        const pass = [mc.p10, mc.p50, mc.p90].every(isFinite) && mc.p90 >= mc.p50 && mc.p50 >= mc.p10;
        return { expected: "p90≥p50≥p10", actual: `${mc.p10} / ${mc.p50} / ${mc.p90}`, pass };
      },
    },
    {
      id: "mc-prob-bounds", category: "Monte Carlo", description: "cash-shortfall probability within 0–100%", source: INV,
      run: () => { const v = monteCarlo(p, { runs: 200 }, ctx).probCashShortfall; return { expected: "0–100", actual: v, pass: v >= 0 && v <= 100 }; },
    },
    {
      id: "feas-gr", category: "Feasibility", description: "gross realisation = sum of unit sales (3 × $1.15m)", source: INV,
      run: () => { const gr = Math.round(feasibility(sampleFeasibility()).gr); return { expected: 3450000, actual: gr, pass: gr === 3450000 }; },
    },
    {
      id: "val-blended", category: "Valuation", description: "blended valuation is positive", source: INV,
      run: () => { const v = valuation(p).blended; return { expected: "> 0", actual: Math.round(v), pass: v > 0 }; },
    },
    {
      id: "svc-capacity", category: "Serviceability", description: "borrowing capacity is finite and ≥ 0", source: INV,
      run: () => {
        const sv = serviceability(client, lender, { proposedLoan: 760000, newAnnualRent: 33000 }, ctx);
        return { expected: "≥ 0", actual: Math.round(sv.capacity), pass: isFinite(sv.capacity) && sv.capacity >= 0 };
      },
    },
    {
      id: "eq-rows-15", category: "Equity chain", description: "15-year horizon produces 15 rows", source: INV,
      run: () => { const n = equityChain({ targetPrice: 850000 }, ctx).rows.length; return { expected: 15, actual: n, pass: n === 15 }; },
    },
  ];
}

/** Run every assurance check and return structured results. */
export function runChecks(): CheckResult[] {
  const defs: CheckDef[] = [...referenceChecks, ...engineChecks()];
  return defs.map((d) => {
    let r: { expected: number | string | null; actual: number | string | null; pass: boolean };
    try {
      r = d.run();
    } catch (e) {
      r = { expected: "(ran clean)", actual: `ERROR: ${(e as Error).message}`, pass: false };
    }
    return {
      id: d.id, category: d.category, description: d.description, source: d.source,
      expected: r.expected, actual: r.actual, status: (r.pass ? "pass" : "fail") as CheckStatus,
    };
  });
}

export function summarise(results: CheckResult[]): { total: number; passed: number; failed: number } {
  const failed = results.filter((r) => r.status === "fail").length;
  return { total: results.length, passed: results.length - failed, failed };
}
