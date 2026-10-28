/* Modelling run — the concept made visible. Takes a simple set of inputs for a
   property and a client's position, drives the ported engine (projection,
   Monte Carlo, serviceability, scored verdict, scenarios, stress test), and
   returns structured results for the Modeller page. Built on the verified seed
   context with the key fields overridden from the inputs. */
import { seedContext } from "@/lib/engine/seeds";
import { project, monteCarlo, serviceability, verdictOf, equityChain } from "@/lib/engine/engine";
import { provenance } from "@/lib/assurance/provenance";
import type { PropertyModelling } from "@/lib/domain/types";

const num = (v: unknown): number => { const n = Number(v); return isFinite(n) ? n : 0; };

export interface ModelInputs {
  address?: string;
  state: string;
  price: number;
  weeklyRent: number;
  growthPct: number;
  ratePct: number;
  depositPct: number;
  grossIncome: number;
  // Optional client position — when present, the model is run against this
  // client's real serviceability rather than income alone. Left undefined for
  // the generic (no-client) case, which keeps the sample position.
  clientName?: string;
  partnerIncome?: number;
  livingExpMonthly?: number;
  dependants?: number;
  monthlyCommitments?: number;
  cardLimits?: number;
  hecsBalance?: number;
  // Optional deep property financials — operating expenses, loan structure,
  // acquisition costs, depreciation and capex. Unset fields fall back to the
  // engine's standard assumptions, so the simple run is unchanged.
  modelling?: PropertyModelling;
  // Optional lender products to assess against (from the tenant's manual lender
  // setup). When absent the built-in templates are used.
  lenders?: any[];
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
  // Use the tenant's lender products when supplied, else the built-in templates.
  if (inp.lenders && inp.lenders.length) ctx.lenders = inp.lenders as any;
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

  // Client financial position — override the sample position only for the
  // fields actually supplied, so the generic (no-client) run is unchanged.
  if (inp.clientName) client.name = inp.clientName;
  if (inp.partnerIncome !== undefined) client.partner.base = inp.partnerIncome;
  if (inp.livingExpMonthly !== undefined) client.livingExpMonthly = inp.livingExpMonthly;
  if (inp.dependants !== undefined) client.dependants = inp.dependants;
  if (inp.monthlyCommitments !== undefined || inp.cardLimits !== undefined || inp.hecsBalance !== undefined) {
    const liab: any[] = [];
    if (inp.cardLimits) liab.push({ id: "li_card", type: "Credit card", limit: inp.cardLimits, balance: 0, repayment: 0, rate: 0, lender: "" });
    if (inp.hecsBalance) liab.push({ id: "li_hecs", type: "HECS/HELP", limit: 0, balance: inp.hecsBalance, repayment: 0, rate: 0, lender: "" });
    if (inp.monthlyCommitments) liab.push({ id: "li_other", type: "Personal loan", limit: 0, balance: 0, repayment: inp.monthlyCommitments, rate: 0, lender: "" });
    client.liabilities = liab;
  }

  // Deep property financials (optional) — override the seed property's standard
  // assumptions with the entered expenses, loan structure, acquisition costs,
  // depreciation and capex. Unset fields keep the engine's assumptions.
  const m = inp.modelling;
  if (m) {
    if (m.otherIncome !== undefined) p.income.otherIncome = m.otherIncome;
    if (m.pmFeePct !== undefined) p.income.pmFeePct = m.pmFeePct;
    if (m.lettingWeeks !== undefined) p.income.lettingWeeks = m.lettingWeeks;
    if (m.vacancyWeeks !== undefined) { p.demand.vacancyWeeks = m.vacancyWeeks; p.demand.autoVacancy = false; }
    if (m.expenses && m.expenses.length) {
      p.expenses = m.expenses.map((e, i) => ({ id: `x_${i}`, name: e.name || "Expense", amount: num(e.amount), freq: e.freq || "Annual", startMonth: 1, esc: 3.0, ded: e.ded !== false }));
    }
    if (m.repaymentType) p.loan.repaymentType = m.repaymentType;
    if (m.ioYears !== undefined) p.loan.ioYears = m.ioYears;
    if (m.termYears !== undefined) p.loan.termYears = m.termYears;
    if (m.offsetBalance !== undefined) p.loan.offsetBalance = m.offsetBalance;
    if (m.annualPackageFee !== undefined) p.loan.annualPackageFee = m.annualPackageFee;
    if (m.otherPurchaseCosts !== undefined) p.entry.items = [{ id: "e_other", name: "Acquisition costs", amount: m.otherPurchaseCosts }];
    if (m.capitaliseLmi !== undefined) p.entry.capitaliseLmi = m.capitaliseLmi;
    if (m.depMode) p.dep.mode = m.depMode;
    if (m.plantValue !== undefined) { p.dep.plantValue = m.plantValue; p.dep.plantEligible = m.plantValue > 0; }
    if (m.constructionCost !== undefined) p.dep.constructionCost = m.constructionCost;
  }

  // Strip the sample property's own history/title artifacts so the verdict's
  // flags reflect the entered inputs, not 14 Sample St's backstory. Capex
  // events are kept when the property supplies its own.
  p.saleHistory = []; p.title.easements = []; p.title.encumbrances = [];
  p.comps = []; p.features = []; p.projects = [];
  p.events = (m && m.capex && m.capex.length)
    ? m.capex.map((c, i) => ({ id: `ev_${i}`, year: num(c.year), type: "Renovation", name: c.name || "Capex", cost: num(c.cost), upliftPct: num(c.upliftPct), rentUplift: num(c.rentUplift), status: "Planned" }))
    : [];

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

/* ---- Lender comparison — borrowing capacity across lender templates ---- */
export interface LenderCompareRow {
  name: string; capacity: number; dti: number; maxLVR: number; maxDTI: number;
  pass: boolean; headroom: number; bestFit: boolean;
}

export function runLenderCompare(inp: ModelInputs): { loanRequired: number; rows: LenderCompareRow[] } {
  const c = core(inp);
  const annualRent = inp.weeklyRent * 52;
  const loanRequired = c.P.acq.loan;
  const rows: LenderCompareRow[] = (c.ctx.lenders as any[]).map((lender) => {
    const sv = serviceability(c.ctx.clients[0], lender, { proposedLoan: loanRequired, newAnnualRent: annualRent }, c.ctx) as any;
    return {
      name: lender.name, capacity: sv.capacity, dti: sv.dti,
      maxLVR: lender.maxLVR, maxDTI: lender.maxDTI, pass: sv.pass, headroom: sv.headroom, bestFit: false,
    };
  }).sort((a, b) => b.capacity - a.capacity);
  // Best fit: the lender that serviceably lends the most against the required loan.
  const best = rows.find((r) => r.pass);
  if (best) best.bestFit = true;
  return { loanRequired, rows };
}

/* ---- Borrowing capacity across lenders for a bare client position (Finance
   page). No property/purchase — just "how much can they borrow" per lender. ---- */
export interface PositionInput {
  grossIncome: number; partnerIncome?: number; livingExpMonthly?: number; dependants?: number;
  monthlyCommitments?: number; cardLimits?: number; hecsBalance?: number; rentalIncomeAnnual?: number;
}
export interface LenderCapacityRow { name: string; capacity: number; maxDTI: number; maxLVR: number; }

export function assessPosition(pos: PositionInput, lenders?: any[]): LenderCapacityRow[] {
  const ctx = seedContext();
  if (lenders && lenders.length) ctx.lenders = lenders as any;
  const client = ctx.clients[0] as any;
  client.income.base = pos.grossIncome;
  if (pos.partnerIncome !== undefined) client.partner.base = pos.partnerIncome;
  if (pos.livingExpMonthly !== undefined) client.livingExpMonthly = pos.livingExpMonthly;
  if (pos.dependants !== undefined) client.dependants = pos.dependants;
  const liab: any[] = [];
  if (pos.cardLimits) liab.push({ id: "c", type: "Credit card", limit: pos.cardLimits, balance: 0, repayment: 0 });
  if (pos.hecsBalance) liab.push({ id: "h", type: "HECS/HELP", limit: 0, balance: pos.hecsBalance, repayment: 0 });
  if (pos.monthlyCommitments) liab.push({ id: "o", type: "Personal loan", limit: 0, balance: 0, repayment: pos.monthlyCommitments });
  if (liab.length) client.liabilities = liab;
  return (ctx.lenders as any[]).map((lender) => {
    const sv = serviceability(client, lender, { proposedLoan: 0, newAnnualRent: pos.rentalIncomeAnnual ?? 0 }, ctx) as any;
    return { name: lender.name, capacity: sv.capacity, maxDTI: lender.maxDTI, maxLVR: lender.maxLVR };
  }).sort((a, b) => b.capacity - a.capacity);
}

/* ---- Equity chain — equity recycling constrained by serviceability ----
   Models when the client can fund the NEXT acquisition: usable equity across
   the existing owned portfolio projected forward (the equity test) AND the
   lender's capacity for the new loan (the serviceability test). It names the
   blocker — "equity without capacity is not a purchase". Built on the engine's
   equityChain, with the modeller context assembled from the client's owned
   holdings. Pass each owned property's ModelInputs (via dealInputs) plus a base
   ModelInputs carrying the client's position (use an owned property's inputs,
   or a placeholder when the client owns nothing yet). */
export interface EquityChainCfg {
  targetPrice: number; depositPct: number; costsPct: number; targetLVR: number;
  horizon: number; rentYield: number; lenderId?: string;
}

export function runEquityChain(base: ModelInputs, ownedInputs: ModelInputs[], cfg: EquityChainCfg) {
  const root = core(base);
  const ctx = root.ctx;
  ctx.clients = [root.ctx.clients[0]];
  ctx.properties = ownedInputs.map((inp) => { const c = core(inp); c.p.status = "Owned"; return c.p; });
  return equityChain({
    targetPrice: cfg.targetPrice, depositPct: cfg.depositPct, costsPct: cfg.costsPct,
    targetLVR: cfg.targetLVR, horizon: cfg.horizon, rentYield: cfg.rentYield,
    clientId: ctx.clients[0].id, lenderId: cfg.lenderId ?? ctx.lenders[0]?.id,
  }, ctx);
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
