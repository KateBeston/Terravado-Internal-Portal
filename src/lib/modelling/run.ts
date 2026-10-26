/* Modelling run — the concept made visible. Takes a simple set of inputs for a
   property and a client's position, drives the ported engine (projection,
   Monte Carlo, serviceability, scored verdict, scenarios, stress test), and
   returns structured results for the Modeller page. Built on the verified seed
   context with the key fields overridden from the inputs. */
import { seedContext } from "@/lib/engine/seeds";
import { project, monteCarlo, serviceability, verdictOf } from "@/lib/engine/engine";
import { provenance } from "@/lib/assurance/provenance";

export interface ModelInputs {
  address?: string;
  state: string;
  price: number;
  weeklyRent: number;
  growthPct: number;
  ratePct: number;
  depositPct: number;
  grossIncome: number;
}

export interface ProjectionRow {
  year: number; value: number; equity: number; lvr: number; weekly: number; postTaxCF: number;
}

interface Core {
  ctx: any; p: any; P: any; sv: any; v: any;
  irr: number | null; weekly1: number; equityEnd: number; band: string; score: number;
  capacity: number; dti: number; loan: number;
}

/** Build the engine context from inputs and run projection + serviceability + verdict. */
function core(inp: ModelInputs): Core {
  const ctx = seedContext();
  const p = ctx.properties[0] as any;
  const client = ctx.clients[0] as any;
  const lender = (ctx.lenders[1] ?? ctx.lenders[0]) as any;
  const entity = ctx.entities[0] as any;

  p.label = inp.address || p.label;
  p.loc.region = inp.state;
  if (inp.address) p.loc.address = inp.address;
  entity.region = inp.state;
  p.market.price = inp.price;
  p.market.suburbMedian = inp.price;
  p.income.weeklyRent = inp.weeklyRent;
  p.market.suburbCagr = inp.growthPct;
  p.loan.varRate = inp.ratePct;
  p.entry.deposit = inp.depositPct;
  client.income.base = inp.grossIncome;
  entity.taxableIncome = inp.grossIncome;

  // Strip the sample property's own history/title artifacts so the verdict's
  // flags reflect the entered inputs, not 14 Sample St's backstory.
  p.saleHistory = []; p.title.easements = []; p.title.encumbrances = [];
  p.comps = []; p.features = []; p.events = []; p.projects = [];

  const P = project(p, {}, ctx) as any;
  const sv = serviceability(client, lender, { proposedLoan: P.acq.loan, newAnnualRent: inp.weeklyRent * 52 }, ctx) as any;
  const v = verdictOf(p, P, ctx, sv) as any;

  return {
    ctx, p, P, sv, v,
    irr: P.metrics.irr, weekly1: P.metrics.weekly1, equityEnd: P.metrics.equityEnd,
    band: v.band, score: v.score,
    capacity: sv.capacity, dti: sv.dti, loan: P.acq.loan,
  };
}

export interface ModelResult {
  inputs: ModelInputs;
  verdict: { band: string; score: number; flags: [string, string][] };
  metrics: {
    irr: number | null; weekly1: number; grossYield: number; netYield: number;
    valueEnd: number; equityEnd: number; cashOnCash: number; breakeven: number | null;
  };
  acq: { cashIn: number; duty: number; loan: number; lvr: number; lmi: number };
  mc: { p10: number; p50: number; p90: number; probCashShortfall: number };
  serviceability: { capacity: number; dti: number; lender: string };
  rows: ProjectionRow[];
  provenanceLabel: string;
}

export function runModel(inp: ModelInputs): ModelResult {
  const c = core(inp);
  const P = c.P;
  const mc = monteCarlo(c.p, { runs: 300 }, c.ctx) as any;
  const rows: ProjectionRow[] = (P.rows as any[]).map((r) => ({
    year: r.year, value: r.value, equity: r.equity, lvr: r.lvr, weekly: r.weekly, postTaxCF: r.postTaxCF,
  }));
  return {
    inputs: inp,
    verdict: { band: c.v.band, score: c.v.score, flags: c.v.flags },
    metrics: {
      irr: P.metrics.irr, weekly1: P.metrics.weekly1, grossYield: P.metrics.grossYield, netYield: P.metrics.netYield,
      valueEnd: P.metrics.valueEnd, equityEnd: P.metrics.equityEnd, cashOnCash: P.metrics.cashOnCash, breakeven: P.metrics.breakeven,
    },
    acq: { cashIn: P.acq.cashIn, duty: P.acq.duty, loan: P.acq.loan, lvr: P.acq.lvr, lmi: P.acq.lmi ?? 0 },
    mc: { p10: mc.p10, p50: mc.p50, p90: mc.p90, probCashShortfall: mc.probCashShortfall },
    serviceability: { capacity: c.sv.capacity, dti: c.sv.dti, lender: c.sv.lender?.name ?? "template lender" },
    rows,
    provenanceLabel: `${provenance().engineVersion} · tax ${provenance().taxDataVersion}`,
  };
}

/* ---- Scenario analysis — discrete, named "what ifs" ---- */
export interface ScenarioResult { name: string; irr: number | null; weekly1: number; equityEnd: number; band: string; }

const SCENARIOS: { name: string; adjust: (i: ModelInputs) => ModelInputs }[] = [
  { name: "Base case", adjust: (i) => i },
  { name: "Rates +2%", adjust: (i) => ({ ...i, ratePct: i.ratePct + 2 }) },
  { name: "Rates +3% (shock)", adjust: (i) => ({ ...i, ratePct: i.ratePct + 3 }) },
  { name: "Rent −10%", adjust: (i) => ({ ...i, weeklyRent: Math.round(i.weeklyRent * 0.9) }) },
  { name: "Low growth (2% p.a.)", adjust: (i) => ({ ...i, growthPct: 2 }) },
  { name: "Downturn (rates +2%, rent −10%, growth 1%)", adjust: (i) => ({ ...i, ratePct: i.ratePct + 2, weeklyRent: Math.round(i.weeklyRent * 0.9), growthPct: 1 }) },
];

export function runScenarios(base: ModelInputs): ScenarioResult[] {
  return SCENARIOS.map((s) => {
    const c = core(s.adjust(base));
    return { name: s.name, irr: c.irr, weekly1: c.weekly1, equityEnd: c.equityEnd, band: c.band };
  });
}

/* ---- Stress test — can the client HOLD it through a combined shock? ---- */
export interface StressTest {
  shock: string;
  baseWeekly1: number; stressedWeekly1: number;
  stressedIrr: number | null;
  capacity: number; loanRequired: number; margin: number;
  verdict: string;
}

export function runStressTest(base: ModelInputs): StressTest {
  const b = core(base);
  const stressed: ModelInputs = {
    ...base,
    ratePct: base.ratePct + 3,
    weeklyRent: Math.round(base.weeklyRent * 0.85),
    grossIncome: Math.round(base.grossIncome * 0.9),
  };
  const s = core(stressed);
  const margin = s.loan > 0 ? s.capacity / s.loan : 0;
  const verdict = margin >= 1.15 ? "Holds comfortably" : margin >= 1.0 ? "Tight" : "Under pressure";
  return {
    shock: "Rates +3%, rent −15%, income −10% — all at once",
    baseWeekly1: b.weekly1, stressedWeekly1: s.weekly1,
    stressedIrr: s.irr,
    capacity: s.capacity, loanRequired: s.loan, margin,
    verdict,
  };
}
