/* Modelling run — the concept made visible. Takes a simple set of inputs for a
   property and a client's position, drives the ported engine (projection,
   Monte Carlo, serviceability, scored verdict), and returns a structured result
   for the Modeller page. Built on the verified seed context, with the key fields
   overridden from the inputs, so the full engine runs end to end. */
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
  const ctx = seedContext();
  const p = ctx.properties[0] as any;
  const client = ctx.clients[0] as any;
  const lender = (ctx.lenders[1] ?? ctx.lenders[0]) as any;
  const entity = ctx.entities[0] as any;

  // Apply the inputs over the verified seed property.
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
  p.saleHistory = [];
  p.title.easements = [];
  p.title.encumbrances = [];
  p.comps = [];
  p.features = [];
  p.events = [];
  p.projects = [];

  const P = project(p, {}, ctx) as any;
  const mc = monteCarlo(p, { runs: 300 }, ctx) as any;
  const sv = serviceability(client, lender, { proposedLoan: P.acq.loan, newAnnualRent: inp.weeklyRent * 52 }, ctx) as any;
  const v = verdictOf(p, P, ctx, sv) as any;

  const rows: ProjectionRow[] = (P.rows as any[]).map((r) => ({
    year: r.year, value: r.value, equity: r.equity, lvr: r.lvr, weekly: r.weekly, postTaxCF: r.postTaxCF,
  }));

  return {
    inputs: inp,
    verdict: { band: v.band, score: v.score, flags: v.flags },
    metrics: {
      irr: P.metrics.irr, weekly1: P.metrics.weekly1, grossYield: P.metrics.grossYield, netYield: P.metrics.netYield,
      valueEnd: P.metrics.valueEnd, equityEnd: P.metrics.equityEnd, cashOnCash: P.metrics.cashOnCash, breakeven: P.metrics.breakeven,
    },
    acq: { cashIn: P.acq.cashIn, duty: P.acq.duty, loan: P.acq.loan, lvr: P.acq.lvr, lmi: P.acq.lmi ?? 0 },
    mc: { p10: mc.p10, p50: mc.p50, p90: mc.p90, probCashShortfall: mc.probCashShortfall },
    serviceability: { capacity: sv.capacity, dti: sv.dti, lender: sv.lender?.name ?? lender.name },
    rows,
    provenanceLabel: `${(provenance().engineVersion)} · tax ${provenance().taxDataVersion}`,
  };
}
