/* ===========================================================================
   TERRAVADO — Core property-investment modelling engine
   Ported 1:1 from the original Terra single-file build (engine-2026.07).

   The only structural change from the original is that the data store, which
   the original reached through a global `DB`, is now passed in as an explicit
   `ctx` (EngineContext). Every calculation is otherwise identical, keeping the
   four corrected bugs intact (transfer-duty brackets, Monte Carlo renovation
   expense classification, serviceability double-count, commercial void
   spillover). This makes the engine a pure, deterministic, testable module.
   =========================================================================== */

import { COUNTRIES, TAX_DATA, num, clamp } from "./tax-data";

/* ---- permissive domain types (shapes mirror the seed records) ------------ */
/* eslint-disable @typescript-eslint/no-explicit-any */
export type Property = any;
export type Client = any;
export type Entity = any;
export type Lender = any;
export type Feasibility = any;

export interface EngineContext {
  properties: Property[];
  clients: Client[];
  entities: Entity[];
  lenders: Lender[];
  feasibilities: Feasibility[];
  contacts: any[];
  settings: { country?: string; orgName?: string; advisorName?: string };
}

export interface ProjectOpts {
  forceG?: number; gShift?: number; rShift?: number; rateShift?: number; vacShift?: number;
  landTaxMap?: Record<string, number> | null;
}

const deep = <T,>(o: T): T => JSON.parse(JSON.stringify(o));

/* ===========================================================================
   FREQUENCIES & EXPENSES
   =========================================================================== */
export const FREQ: Record<string, { per: number; due?: (m: number, o: number) => boolean }> = {
  "Weekly": { per: 52 }, "Fortnightly": { per: 26 }, "Monthly": { per: 12 },
  "Bi-monthly": { per: 6, due: (m, o) => (m - o) % 2 === 0 },
  "Quarterly": { per: 4, due: (m, o) => (m - o) % 3 === 0 },
  "Half-yearly": { per: 2, due: (m, o) => (m - o) % 6 === 0 },
  "Annual": { per: 1, due: (m, o) => m === o },
  "One-off": { per: 0, due: (m, o) => m === o },
};
export const annualise = (e: any): number => num(e.amount) * ((FREQ[e.freq] || {}).per || 0);

export function monthlyCharge(e: any, m: number, y: number): number {
  const f = FREQ[e.freq]; if (!f) return 0;
  const o = clamp(num(e.startMonth, 1), 1, 12);
  if (e.freq === "One-off") return (y === num(e.year, 1) && m === o) ? num(e.amount) : 0;
  if (e.freq === "Weekly") return num(e.amount) * 52 / 12;
  if (e.freq === "Fortnightly") return num(e.amount) * 26 / 12;
  if (e.freq === "Monthly") return num(e.amount);
  return (m >= o && f.due!(m, o)) ? num(e.amount) : 0;
}

/* ===========================================================================
   GROWTH DRIVERS
   =========================================================================== */
export const DRIVERS: [string, string, string, string, number, number][] = [
  ["Macro", "popGrowth", "Population growth", "State/metro growth vs national average", .20, .10],
  ["Macro", "economy", "Employment & income growth", "Job creation, wage growth, diversity", .16, .10],
  ["Macro", "rateEnv", "Interest rate direction", "Falling rates expand borrowing capacity", .10, .02],
  ["Macro", "credit", "Credit availability", "Lending standards, investor appetite", .08, 0],
  ["Micro location", "employAccess", "Access to employment", "Commute to CBD or employment node", .16, .12],
  ["Micro location", "transport", "Public transport", "Distance to rail/metro, frequency", .12, .10],
  ["Micro location", "schools", "School catchment", "Quality and demand for catchment schools", .12, .08],
  ["Micro location", "amenity", "Amenity & walkability", "Retail, dining, parks, medical", .12, .10],
  ["Micro location", "lifestyle", "Lifestyle premium", "Water, views, parkland, aspect", .10, .06],
  ["Micro location", "safety", "Safety & street quality", "Crime, street appeal, neighbouring stock", .08, .06],
  ["Micro location", "hazard", "Hazard & nuisance", "+2 = none. Flood, fire, noise, flight path", .10, .06],
  ["Planning & supply", "devPipeline", "Dwelling pipeline", "+2 = little new supply; −2 = heavy pipeline", .18, .14],
  ["Planning & supply", "infraCommitted", "Committed infrastructure", "Funded rail, road, hospital, precinct", .16, .08],
  ["Planning & supply", "zoning", "Zoning & uplift potential", "AUTO — from planning controls & encumbrances", .12, 0],
  ["Planning & supply", "scarcity", "Land scarcity", "Heritage, greenbelt, no infill capacity", .10, .04],
  ["Asset quality", "landRatio", "Land-to-asset ratio", "AUTO — land share of price", .18, .02],
  ["Asset quality", "floorplan", "Floorplan functionality", "Flow, light, storage, circulation", .10, .08],
  ["Asset quality", "condition", "Condition vs age", "Structure, services, kitchen and bath age", .10, .08],
  ["Asset quality", "renoUpside", "Improvement upside", "Reno, extension, secondary dwelling", .08, .06],
  ["Asset quality", "configFit", "Configuration fit", "Bed/bath/car vs suburb demand", .08, .10],
  ["Asset quality", "sizeFit", "Size vs suburb norm", "Internal area and land vs comparables", .06, .04],
  ["Rental demand", "rentalDemand", "Rental demand index", "AUTO — from the demand panel", .06, .24],
];
export const GROUPS = [...new Set(DRIVERS.map((d) => d[0]))];
export const CAP = 3.0;

export const DEMAND_INPUTS: [string, string, string, number, number][] = [
  ["vacancyRate", "Vacancy rate %", "Lower is tighter", 4.0, 0.3],
  ["daysToLease", "Days on market to lease", "Lower is tighter", 45, 7],
  ["appsPerListing", "Applications per listing", "Higher is tighter", 1, 12],
  ["rentToIncome", "Rent-to-income %", "Lower = headroom to raise rent", 40, 20],
  ["popGrowthPct", "Local population growth %", "Higher is stronger", -0.5, 3.0],
  ["rentalStock", "Rentals as % of dwellings", "Deeper tenant market", 8, 45],
];

export function demandIndex(p: Property) {
  const d = p.demand;
  const parts = DEMAND_INPUTS.map(([id, label, hint, worst, best]) => {
    const v = num(d[id]);
    return { id, label, hint, v, score: clamp((v - worst) / (best - worst), 0, 1) * 100 };
  });
  const idx = Math.round(parts.reduce((a, x) => a + x.score, 0) / parts.length);
  const band = idx >= 78 ? "Very tight" : idx >= 60 ? "Tight" : idx >= 42 ? "Balanced" : idx >= 25 ? "Soft" : "Oversupplied";
  return {
    idx, band, parts,
    driverScore: idx >= 80 ? 2 : idx >= 62 ? 1 : idx >= 42 ? 0 : idx >= 25 ? -1 : -2,
    impliedVacancyWeeks: +clamp(6 - (idx / 100) * 5.5, 0.3, 8).toFixed(1),
  };
}

export function autoScores(p: Property) {
  const landValue = num(p.phys.landSize) * num(p.market.landRate);
  const ratio = num(p.market.price) > 0 ? landValue / num(p.market.price) : 0;
  const land = ratio >= .60 ? 2 : ratio >= .50 ? 1 : ratio >= .38 ? 0 : ratio >= .28 ? -1 : -2;

  let z = 0;
  const fsr = num(p.planning.fsr), lot = num(p.planning.minLotSize), land2 = num(p.phys.landSize);
  if (land2 >= lot * 2 && lot > 0) z += 2;
  else if (land2 >= lot * 1.5 && lot > 0) z += 1;
  if (fsr >= 1.0) z += 1;
  if (p.title.heritage) z -= 2;
  (p.title.encumbrances || []).forEach((e: any) => { if (e.impact) z -= 1; });
  (p.title.easements || []).forEach((e: any) => { if (num(e.affectedArea) > land2 * 0.08) z -= 1; });
  z = clamp(z, -2, 2);

  return {
    landRatio: land, zoning: z, rentalDemand: demandIndex(p).driverScore,
    _landValue: landValue, _landRatio: ratio,
  };
}

export function ladder(p: Property) {
  const auto = autoScores(p);
  const rows = DRIVERS.map(([group, id, label, hint, wc, wr]) => {
    const isAuto = (id === "landRatio" || id === "rentalDemand" || id === "zoning");
    const score = isAuto ? (auto as any)[id] : clamp(num((p.scores || {})[id]), -2, 2);
    return { group, id, label, hint, score, isAuto, cap: score * wc, rent: score * wr };
  });
  const rawCap = rows.reduce((a, r) => a + r.cap, 0), rawRent = rows.reduce((a, r) => a + r.rent, 0);
  return { rows, rawCap, rawRent, adjCap: clamp(rawCap, -CAP, CAP), adjRent: clamp(rawRent, -CAP, CAP), auto };
}

export const SCENARIOS: Record<string, { g: number; r: number; rate: number; vac: number; cap: number }> = {
  Bear: { g: -2.0, r: -1.2, rate: 1.5, vac: 2, cap: 0.75 },
  Base: { g: 0, r: 0, rate: 0, vac: 0, cap: 0 },
  Bull: { g: 2.0, r: 1.2, rate: -1.0, vac: -1, cap: -0.5 },
};

/* ===========================================================================
   ENTITY / TAX
   =========================================================================== */
export function entityOf(p: Property, ctx: EngineContext): Entity {
  return ctx.entities.find((e) => e.id === p.entityId) || ctx.entities[0];
}
export function clientOf(id: string, ctx: EngineContext): Client | undefined {
  return ctx.clients.find((c) => c.id === id);
}
export function totalIncome(c: Client): number {
  const i = c.income || {};
  return num(i.base) + num(i.overtime) + num(i.bonus) + num(i.commission) + num(i.selfEmployed) + num(i.dividends) + num(i.otherIncome);
}

export function taxProfile(p: Property, ctx: EngineContext) {
  const C = COUNTRIES[p.loc.country], ent = entityOf(p, ctx);
  let rate = 0, cgt = TAX_DATA.cgtDiscount.individual, trapped = false, note = "";
  if (ent.type === "Company") {
    rate = 30; cgt = TAX_DATA.cgtDiscount.company; trapped = true;
    note = "Flat 30% (25% base-rate entity). No CGT discount. Losses trapped in the company.";
  } else if (ent.type === "SMSF") {
    rate = 15; cgt = TAX_DATA.cgtDiscount.smsf; trapped = true;
    note = "15% on rental income, effective 10% CGT after 12 months. LRBA required to borrow. SMSF property advice is financial product advice.";
  } else if (ent.type === "Trust") {
    const owners = (ent.owners || []);
    rate = owners.length
      ? owners.reduce((a: number, o: any) => { const c = clientOf(o.clientId, ctx); return a + (num(o.pct) / 100) * C.marginal(c ? totalIncome(c) : num(ent.taxableIncome)); }, 0)
      : C.marginal(num(ent.taxableIncome));
    trapped = true;
    note = "Distributed to beneficiaries at their rates. Losses trapped — cannot offset personal income. NSW land tax surcharge applies unless the deed excludes foreign persons.";
  } else {
    const owners = (ent.owners || []);
    rate = owners.length
      ? owners.reduce((a: number, o: any) => { const c = clientOf(o.clientId, ctx); return a + (num(o.pct) / 100) * C.marginal(c ? totalIncome(c) : num(ent.taxableIncome)); }, 0)
      : C.marginal(num(ent.taxableIncome));
    note = owners.length > 1
      ? "Income, deductions and gains split by ownership share. Blended marginal rate applied."
      : "Losses offset personal income (negative gearing). 50% CGT discount after 12 months.";
  }
  return { rate: +rate.toFixed(2), cgt, trapped, note, entity: ent };
}

/* ===========================================================================
   DEPRECIATION
   =========================================================================== */
export function depreciationFor(p: Property, year: number) {
  const d = p.dep, buildYear = num(p.phys.buildYear), age = Math.max(0, new Date().getFullYear() - buildYear);
  const div43Ok = buildYear >= 1987;
  let d43 = 0, d40 = 0, scrap = 0;

  if (d.mode === "assumed") {
    const cc = num(d.constructionCost) > 0 ? num(d.constructionCost) : num(p.phys.internalArea) * num(p.market.buildRate);
    d43 = (div43Ok && (age + year) <= 40) ? cc * 0.025 : 0;
    d40 = d.plantEligible ? num(d.plantValue) * Math.pow(.8, year - 1) * .2 : 0;
  } else {
    (d.div43 || []).forEach((l: any) => {
      const yrsLeft = 40 - Math.max(0, num(l.yearsClaimed));
      if (year <= yrsLeft) d43 += num(l.amount) * 0.025;
    });
    (d.div40 || []).forEach((l: any) => {
      const life = Math.max(1, num(l.life, 10)), val = num(l.value);
      if (l.method === "Prime cost") { if (year <= life) d40 += val / life; }
      else { const wdv = val * Math.pow(1 - (2 / life), year - 1); d40 += wdv * (2 / life); }
    });
  }
  if (num(d.scrapYear) === year && num(d.scrapValue) > 0) scrap = num(d.scrapValue);

  return { d43, d40, scrap, total: d43 + d40 + scrap };
}

/* ===========================================================================
   ACQUISITION
   =========================================================================== */
export function acquisition(p: Property) {
  const C = COUNTRIES[p.loc.country], e = p.entry, price = num(p.market.price);
  const autoDuty = C.duty(price, p.loc.region);
  const fhbRelief = e.firstHomeBuyer ? C.fhb(price, p.loc.region) : 0;
  const surcharge = e.foreignBuyer ? price * C.foreignDuty(p.loc.region) : 0;
  const duty = e.dutyMode === "manual" ? num(e.dutyManual) : Math.max(0, autoDuty - fhbRelief) + surcharge;

  const loanBase = price * (1 - num(e.deposit) / 100);
  const lvr = price > 0 ? loanBase / price : 0;
  const lmiRate = lvr <= .80 ? 0 : lvr <= .85 ? .009 : lvr <= .90 ? .018 : lvr <= .95 ? .031 : .045;
  const lmi = loanBase * lmiRate;
  const items = (e.items || []).reduce((a: number, x: any) => a + num(x.amount), 0);
  const loan = loanBase + (e.capitaliseLmi ? lmi : 0);
  const depositCash = price - loanBase;
  const cashIn = depositCash + duty + items + (e.capitaliseLmi ? 0 : lmi);
  return {
    autoDuty, fhbRelief, surcharge, duty, lmi, lmiRate, lvr, loan, loanBase, items,
    depositCash, cashIn, totalAcqCosts: duty + items + lmi,
  };
}

/* ===========================================================================
   LAND TAX — aggregate by state AND entity
   =========================================================================== */
export function landValueOf(p: Property, year: number): number {
  const base = num(p.tax.landValueManual) > 0 ? num(p.tax.landValueManual)
    : num(p.phys.landSize) * num(p.market.landRate);
  const g = growthRate(p);
  return base * Math.pow(1 + g / 100, Math.max(0, (year || 1) - 1));
}

export function portfolioLandTax(year: number, ctx: EngineContext) {
  const groups: Record<string, any> = {}, byProp: Record<string, number> = {};
  ctx.properties.forEach((p) => {
    if (p.isPPOR) { byProp[p.id] = 0; return; }
    if (p.status === "Sold") { byProp[p.id] = 0; return; }
    if (p.tax.landTaxMode === "manual") { byProp[p.id] = num(p.tax.landTaxManual); return; }
    const key = p.loc.country + "|" + p.loc.region + "|" + p.entityId;
    (groups[key] = groups[key] || { props: [], landValue: 0, country: p.loc.country, region: p.loc.region, entityId: p.entityId })
      .props.push(p);
  });
  Object.values(groups).forEach((g: any) => {
    const C = COUNTRIES[g.country];
    const ent = ctx.entities.find((e) => e.id === g.entityId) || ({} as Entity);
    g.landValue = g.props.reduce((a: number, p: Property) => a + landValueOf(p, year || 1), 0);

    let tax = C.landTax(g.landValue, g.region);
    if (ent.type === "Trust" && TAX_DATA.trustSurchargeNoThreshold[g.region] && !ent.deedExcludesForeign) {
      tax = C.landTax(g.landValue, g.region) + 0.016 * Math.min(g.landValue, 1075000);
    }
    if (ent.foreign) tax += g.landValue * C.foreignLandTax(g.region);

    g.tax = tax;
    g.props.forEach((p: Property) => {
      const share = g.landValue > 0 ? landValueOf(p, year || 1) / g.landValue : 0;
      byProp[p.id] = tax * share;
    });
  });
  return { groups, byProp };
}

export function standaloneLandTax(p: Property, year: number): number {
  if (p.isPPOR) return 0;
  if (p.tax.landTaxMode === "manual") return num(p.tax.landTaxManual);
  const C = COUNTRIES[p.loc.country];
  return C.landTax(landValueOf(p, year || 1), p.loc.region);
}

/* ===========================================================================
   CORE PROPERTY ENGINE
   =========================================================================== */
export function baseGrowthOf(p: Property): number {
  const m = p.market;
  return num(m.suburbCagr) * num(m.anchorBlend) / 100 + num(m.longRunAnchor) * (100 - num(m.anchorBlend)) / 100;
}
export function growthRate(p: Property, forceG?: number): number {
  if (forceG !== undefined && forceG !== null) return forceG;
  const L = ladder(p), sc = SCENARIOS[p.scenario] || SCENARIOS.Base;
  return baseGrowthOf(p) + L.adjCap + sc.g;
}

export function assetCagr(p: Property) {
  const h = (p.saleHistory || []).filter((s: any) => num(s.price) > 0 && s.date).slice().sort((a: any, b: any) => a.date < b.date ? -1 : 1);
  if (h.length < 2) return null;
  const f = h[0], l = h[h.length - 1];
  const yrs = (+new Date(l.date) - +new Date(f.date)) / (365.25 * 24 * 3600 * 1000);
  if (yrs <= 0.5) return null;
  return { cagr: +((Math.pow(num(l.price) / num(f.price), 1 / yrs) - 1) * 100).toFixed(2), years: +yrs.toFixed(1), from: f, to: l, points: h };
}

export function project(p: Property, opts: ProjectOpts = {}, ctx: EngineContext) {
  const C = COUNTRIES[p.loc.country];
  const L = ladder(p), D = demandIndex(p), T = taxProfile(p, ctx);
  const sc = SCENARIOS[p.scenario] || SCENARIOS.Base;
  const acq = acquisition(p);
  const isComm = p.assetClass === "Commercial";

  const g0 = opts.forceG !== undefined ? opts.forceG : (baseGrowthOf(p) + L.adjCap + sc.g + num(opts.gShift || 0));
  const r0 = num(p.market.rentBase) + L.adjRent + sc.r + num(opts.rShift || 0);
  const N = clamp(Math.round(num(p.horizon)), 1, 40);
  const rp = C.rp;
  const rateShift = sc.rate + num(opts.rateShift || 0);

  const vacWeeks = Math.max(0, (p.demand.autoVacancy ? D.impliedVacancyWeeks : num(p.demand.vacancyWeeks)) + sc.vac + num(opts.vacShift || 0));

  const ltMap = opts.landTaxMap || null;

  const uplift: Record<number, number> = {};
  (p.projects || []).forEach((x: any) => {
    if (!x.funded) return;
    const y = Math.round(num(x.year)), imp = num(x.impact);
    if (y >= 1 && y <= N) { uplift[y] = (uplift[y] || 0) + imp * .6; if (y > 1) uplift[y - 1] = (uplift[y - 1] || 0) + imp * .4; }
  });

  const rateFor = (year: number): number => {
    const lo = p.loan;
    const path = (lo.ratePath || []).filter((x: any) => num(x.year) <= year).sort((a: any, b: any) => num(b.year) - num(a.year));
    const variable = (path[0] ? num(path[0].rate) : num(lo.varRate)) + rateShift;
    if (lo.rateStructure === "Fixed" && year <= num(lo.fixedYears)) return num(lo.fixedRate);
    if (lo.rateStructure === "Split" && year <= num(lo.fixedYears)) {
      const f = clamp(num(lo.fixedPortion), 0, 100) / 100;
      return f * num(lo.fixedRate) + (1 - f) * variable;
    }
    return variable;
  };

  let value = num(p.market.price);
  let capRate = num(p.comm.capRate) + num(sc.cap);
  if (isComm) { value = num(p.comm.annualRent) > 0 && capRate > 0 ? num(p.comm.annualRent) / (capRate / 100) : num(p.market.price); }

  let balance = acq.loan, offset = num(p.loan.offsetBalance);
  let rentPeriodic = num(p.income.weeklyRent);
  let commRent = num(p.comm.annualRent);
  let cumCash = 0, cumD43 = 0, cumCapex = 0, m = 0, commCarry = 0;
  let year1Months: any[] = [];
  const rows: any[] = [];
  const totalMonths = clamp(Math.round(num(p.loan.termYears)), 1, 40) * 12;
  const ioMonths = p.loan.repaymentType === "Interest-only (full term)" ? totalMonths
    : p.loan.repaymentType === "Interest-only, then P&I" ? num(p.loan.ioYears) * 12 : 0;
  let rolloverShock: any = null;

  for (let y = 1; y <= N; y++) {
    let gY: number;
    if (isComm) {
      capRate = num(p.comm.capRate) + num(p.comm.capRateShift) * (y - 1) + num(sc.cap);
      if (y > 1) {
        if (p.comm.reviewType === "Fixed %") commRent *= (1 + num(p.comm.reviewPct) / 100);
        else if (p.comm.reviewType === "CPI") commRent *= (1 + Math.max(num(p.market.cpi), num(p.comm.cpiFloor)) / 100);
        else commRent *= (1 + r0 / 100);
      }
      const prev = value;
      value = capRate > 0 ? commRent / (capRate / 100) : prev;
      gY = prev > 0 ? (value / prev - 1) * 100 : 0;
    } else {
      gY = g0 + (uplift[y] || 0);
      value *= (1 + gY / 100);
      if (y > 1) rentPeriodic *= (1 + r0 / 100);
    }

    let capex = 0, evRentUplift = 0;
    (p.events || []).forEach((ev: any) => {
      if (num(ev.year) === y && ev.status !== "Cancelled") {
        capex += num(ev.cost);
        value *= (1 + num(ev.upliftPct) / 100);
        evRentUplift += num(ev.rentUplift);
        cumCapex += num(ev.cost);
      }
    });
    if (evRentUplift) { if (isComm) commRent += evRentUplift * 52; else rentPeriodic += evRentUplift; }

    let grossRent: number, voidCost = 0;
    if (isComm) {
      const expiry = num(p.comm.leaseYearsRemaining);
      let lost = commCarry;
      commCarry = 0;
      if (expiry > 0 && y === expiry + 1) lost += num(p.comm.reLetVoidMonths) + num(p.comm.reLetIncentiveMonths);
      else if (y === 1) lost += num(p.comm.incentiveMonths);
      if (lost > 12) { commCarry = lost - 12; lost = 12; }
      const monthsPaid = Math.max(0, 12 - lost);
      grossRent = commRent * monthsPaid / 12;
      voidCost = commRent * lost / 12;
    } else {
      grossRent = rentPeriodic * (rp - (rp / 52) * vacWeeks);
    }
    grossRent += num(p.income.otherIncome);

    const yRate = rateFor(y), mRate = yRate / 100 / 12;
    let interest = 0, principal = 0, repayments = 0; const md: any[] = [];
    for (let k = 0; k < 12; k++) {
      m++;
      const io = m <= ioMonths;
      const eff = Math.max(0, balance - offset);
      const i = eff * mRate;
      let sched: number;
      if (io) sched = balance * mRate;
      else {
        const rem = Math.max(1, totalMonths - m + 1);
        sched = mRate > 0 ? balance * mRate / (1 - Math.pow(1 + mRate, -rem)) : balance / rem;
      }
      const pay = Math.min(balance + i, sched + num(p.loan.extraMonthly));
      const pr = Math.max(0, pay - i);
      interest += i; principal += Math.min(pr, balance); repayments += pay;
      balance = Math.max(0, balance - pr);
      offset += num(p.loan.offsetMonthly);
      md.push({ m: k + 1, repay: pay, interest: i });
    }
    if (y === 1) year1Months = md;

    if (!rolloverShock && y > 1) {
      const prevPay = rows[y - 2].repayments;
      if (repayments > prevPay * 1.12) rolloverShock = { year: y, from: Math.round(prevPay / 12), to: Math.round(repayments / 12), pct: +((repayments / prevPay - 1) * 100).toFixed(1) };
    }

    const pmFee = grossRent * num(p.income.pmFeePct) / 100 * (p.income.pmGstIncl ? 1 : 1.1);
    const lettingFee = isComm ? 0 : rentPeriodic * num(p.income.lettingWeeks) * (p.income.pmGstIncl ? 1 : 1.1);
    const maint = value * num(p.maintPct) / 100;
    let ledger = 0, dedLedger = 0;
    (p.expenses || []).forEach((e: any) => {
      const esc = Math.pow(1 + num(e.esc, num(p.market.cpi)) / 100, y - 1);
      const amt = e.freq === "One-off" ? (num(e.year, 1) === y ? num(e.amount) : 0) : annualise(e) * esc;
      ledger += amt; if (e.ded) dedLedger += amt;
    });
    let recovered = 0;
    if (isComm && p.comm.netLease) recovered = (ledger) * num(p.comm.outgoingsRecoveryPct) / 100;

    const lt = ltMap ? (ltMap[p.id] || 0) : standaloneLandTax(p, y);
    const loanFees = num(p.loan.annualPackageFee) + num(p.loan.monthlyAccountFee) * 12;
    const opex = pmFee + lettingFee + maint + ledger + lt + loanFees - recovered + (isComm && y === N ? num(p.comm.makeGoodCost) * 0 : 0);

    const dep = depreciationFor(p, y);
    cumD43 += dep.d43;

    const dedInterest = interest * clamp(num(p.loan.purposeSplit, 100), 0, 100) / 100;
    const deductibleOpex = pmFee + lettingFee + maint + lt + loanFees + dedLedger - recovered;
    const taxable = grossRent - dedInterest - deductibleOpex - dep.total;
    const taxEffect = taxable >= 0 ? -taxable * T.rate / 100 : (T.trapped ? 0 : -taxable * T.rate / 100);

    const preTaxCF = grossRent - repayments - opex - capex;
    const postTaxCF = preTaxCF + taxEffect;
    cumCash += postTaxCF;

    rows.push({
      year: y, value: Math.round(value), balance: Math.round(balance), equity: Math.round(value - balance),
      usableEquity: Math.round(Math.max(0, value * 0.80 - balance)),
      lvr: value > 0 ? +(balance / value * 100).toFixed(1) : 0, rate: +yRate.toFixed(2), capRate: +capRate.toFixed(2),
      rentPeriodic: Math.round(isComm ? commRent : rentPeriodic), grossRent: Math.round(grossRent),
      interest: Math.round(interest), principal: Math.round(principal), repayments: Math.round(repayments),
      opex: Math.round(opex), landTax: Math.round(lt), capex: Math.round(capex), recovered: Math.round(recovered),
      dep: Math.round(dep.total), d43: Math.round(dep.d43), d40: Math.round(dep.d40), scrap: Math.round(dep.scrap),
      taxable: Math.round(taxable), taxEffect: Math.round(taxEffect),
      preTaxCF: Math.round(preTaxCF), postTaxCF: Math.round(postTaxCF), cumCash: Math.round(cumCash),
      weekly: Math.round(postTaxCF / 52),
      weeklyPayg: Math.round((preTaxCF + (p.tax.paygVariation ? taxEffect : 0)) / 52),
      grossYield: +(grossRent / value * 100).toFixed(2), netYield: +((grossRent - opex) / value * 100).toFixed(2),
      growth: +gY.toFixed(2), voidCost: Math.round(voidCost),
    });
  }

  const last = rows[rows.length - 1];
  const sellCosts = last.value * num(p.agentFeePct) / 100 + num(p.sellLegals) + num(p.loan.dischargeFee);
  const costBase = num(p.market.price) + acq.totalAcqCosts + cumCapex + sellCosts - cumD43;
  const gain = Math.max(0, last.value - costBase);
  const cgt = gain * (1 - T.cgt) * T.rate / 100;
  const netProceeds = last.value - sellCosts - last.balance - cgt;

  const flows = [-acq.cashIn].concat(rows.map((r, i) => r.postTaxCF + (i === rows.length - 1 ? netProceeds : 0)));
  const irr = solveIRR(flows);

  const cal: any[] = []; const rentIn = rows[0].grossRent / 12;
  for (let mm = 1; mm <= 12; mm++) {
    const exp = (p.expenses || []).reduce((a: number, e: any) => a + monthlyCharge(e, mm, 1), 0);
    const pm = (rows[0].grossRent * num(p.income.pmFeePct) / 100) / 12;
    const mt = (num(p.market.price) * num(p.maintPct) / 100) / 12;
    const ltM = (mm % 3 === 0) ? rows[0].landTax / 4 : 0;
    const loan = (year1Months[mm - 1] || {}).repay || 0;
    const pkg = mm === 1 ? num(p.loan.annualPackageFee) : 0;
    const out = exp + pm + mt + ltM + loan + pkg + num(p.loan.monthlyAccountFee);
    cal.push({ month: mm, inflow: Math.round(rentIn), out: Math.round(out), net: Math.round(rentIn - out) });
  }
  let run = 0, trough = 0;
  cal.forEach((x) => { run += x.net; x.cum = Math.round(run); trough = Math.min(trough, run); });

  return {
    rows, acq, ladder: L, demand: D, tax: T, isComm,
    baseGrowth: baseGrowthOf(p), g0, r0, vacWeeks, cal, trough, rateY1: rateFor(1), rolloverShock,
    exit: { sellCosts, costBase, gain, cgt, netProceeds, saleValue: last.value },
    metrics: {
      irr, totalProfit: flows.reduce((a, b) => a + b, 0),
      breakeven: (rows.find((r) => r.postTaxCF >= 0) || {}).year || null,
      grossYield: rows[0].grossYield, netYield: rows[0].netYield,
      weekly1: rows[0].weekly, weeklyPayg1: rows[0].weeklyPayg,
      cashOnCash: acq.cashIn > 0 ? +(rows[0].postTaxCF / acq.cashIn * 100).toFixed(2) : 0,
      equityEnd: last.equity, valueEnd: last.value, lvrEnd: last.lvr, cumCash: last.cumCash,
      peakOutflow: Math.min.apply(null, rows.map((r) => r.weekly)),
      usableEquityNow: rows[0].usableEquity,
    },
  };
}

export function solveIRR(flows: number[]): number | null {
  const npv = (r: number) => flows.reduce((a, f, i) => a + f / Math.pow(1 + r, i), 0);
  let lo = -.95, hi = 2.0;
  if (npv(lo) * npv(hi) > 0) return null;
  for (let i = 0; i < 160; i++) { const mid = (lo + hi) / 2; if (npv(lo) * npv(mid) <= 0) hi = mid; else lo = mid; }
  return +(((lo + hi) / 2) * 100).toFixed(2);
}

export function requiredGrowth(p: Property, ctx: EngineContext): number {
  const target = num(p.hurdle);
  const at = (g: number) => { const r = project(p, { forceG: g }, ctx).metrics.irr; return r === null ? -99 : r; };
  let lo = -10, hi = 30;
  if (at(hi) < target) return hi;
  if (at(lo) > target) return lo;
  for (let i = 0; i < 22; i++) { const mid = (lo + hi) / 2; if (at(mid) < target) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

/* ===========================================================================
   SENSITIVITY TORNADO
   =========================================================================== */
export function tornado(p: Property, ctx: EngineContext) {
  const base = project(p, {}, ctx).metrics.irr!;
  const vars: [string, keyof ProjectOpts, number, string][] = [
    ["Capital growth", "gShift", 1.0, "±1.0pp"],
    ["Interest rate", "rateShift", 1.0, "±1.0pp"],
    ["Rent growth", "rShift", 1.0, "±1.0pp"],
    ["Vacancy", "vacShift", 2.0, "±2 wks"],
  ];
  const out = vars.map(([label, key, delta, range]) => {
    const lo = project(p, { [key]: -delta }, ctx).metrics.irr;
    const hi = project(p, { [key]: +delta }, ctx).metrics.irr;
    const down = (lo === null ? base : lo) - base;
    const up = (hi === null ? base : hi) - base;
    return { label, range, base, low: Math.min(down, up), high: Math.max(down, up), swing: Math.abs(up - down) };
  });
  const p2 = deep(p); p2.market.price = num(p.market.price) * 0.95;
  const p3 = deep(p); p3.market.price = num(p.market.price) * 1.05;
  const lo = project(p2, {}, ctx).metrics.irr, hi = project(p3, {}, ctx).metrics.irr;
  out.push({
    label: "Price paid", range: "±5%", base,
    low: Math.min((lo || base) - base, (hi || base) - base), high: Math.max((lo || base) - base, (hi || base) - base),
    swing: Math.abs((hi || base) - (lo || base)),
  });
  out.sort((a, b) => b.swing - a.swing);
  return { base, rows: out, max: Math.max.apply(null, out.map((r) => Math.max(Math.abs(r.low), Math.abs(r.high))).concat([0.5])) };
}

/* ===========================================================================
   MONTE CARLO — discrete void events, stochastic rate & growth
   =========================================================================== */
export function randn(): number {
  let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function monteCarlo(p: Property, cfg: any, ctx: EngineContext) {
  cfg = Object.assign({ runs: 400, growthSd: 4.0, rateSd: 1.0, voidProb: 0.18, voidWeeksMean: 6, voidWeeksSd: 3, buffer: 20000 }, cfg || {});
  const N = clamp(Math.round(num(p.horizon)), 1, 40);
  const irrs: number[] = [], worstTroughs: number[] = [];
  let breaches = 0;

  for (let run = 0; run < cfg.runs; run++) {
    const gShift = randn() * cfg.growthSd;
    const rateShift = randn() * cfg.rateSd;
    let extraVacWeeks = 0; const voidYears: { y: number; w: number }[] = [];
    for (let y = 1; y <= N; y++) {
      if (Math.random() < cfg.voidProb) {
        const w = Math.max(1, cfg.voidWeeksMean + randn() * cfg.voidWeeksSd);
        voidYears.push({ y, w });
        extraVacWeeks += w;
      }
    }
    const avgExtra = extraVacWeeks / N;
    const r = project(p, { gShift, rateShift, vacShift: avgExtra }, ctx);
    if (r.metrics.irr !== null) irrs.push(r.metrics.irr);

    let worst = 0;
    r.rows.forEach((row: any) => {
      const v = voidYears.find((x) => x.y === row.year);
      const extraCost = v ? (num(p.income.weeklyRent) * v.w) : 0;
      const holdingCF = row.postTaxCF + row.capex;
      const need = -(holdingCF - extraCost);
      worst = Math.max(worst, need);
    });
    worstTroughs.push(worst);
    const annualCapacity = num((clientOf(p.clientId, ctx) || {}).goals?.cashCapacityWeekly || 250) * 52;
    if (worst > annualCapacity + cfg.buffer) breaches++;
  }

  irrs.sort((a, b) => a - b);
  worstTroughs.sort((a, b) => a - b);
  const pct = (arr: number[], q: number) => arr.length ? arr[Math.min(arr.length - 1, Math.floor(q * arr.length))] : 0;

  const lo = irrs[0] || 0, hi = irrs[irrs.length - 1] || 1, bins = 18, w = (hi - lo) / bins || 1;
  const hist: { x: number; n: number }[] = [];
  for (let i = 0; i < bins; i++) hist.push({ x: +(lo + i * w).toFixed(1), n: 0 });
  irrs.forEach((v) => { const i = clamp(Math.floor((v - lo) / w), 0, bins - 1); hist[i].n++; });

  return {
    runs: cfg.runs,
    p10: +pct(irrs, 0.10).toFixed(2), p50: +pct(irrs, 0.50).toFixed(2), p90: +pct(irrs, 0.90).toFixed(2),
    probNegative: +(irrs.filter((v) => v < 0).length / Math.max(1, irrs.length) * 100).toFixed(1),
    probBelowHurdle: +(irrs.filter((v) => v < num(p.hurdle)).length / Math.max(1, irrs.length) * 100).toFixed(1),
    probCashShortfall: +(breaches / cfg.runs * 100).toFixed(1),
    worstCase95: Math.round(pct(worstTroughs, 0.95)),
    hist, cfg,
  };
}

/* ===========================================================================
   VALUATION — exposed weights + time adjustment
   =========================================================================== */
export function valuation(p: Property) {
  const w = p.compWeights, mk = p.market;
  const landValue = num(p.phys.landSize) * num(mk.landRate);
  const buildValue = num(p.phys.internalArea) * num(mk.buildRate);
  const depreciated = buildValue * Math.max(.45, 1 - Math.max(0, new Date().getFullYear() - num(p.phys.buildYear)) * .008);
  const summation = landValue + depreciated;

  const now = new Date();
  const adjusted = (p.comps || []).filter((c: any) => num(c.price) > 0).map((c: any) => {
    let v = num(c.price);
    const notes: string[] = [];
    if (w.timeAdjust && c.date) {
      const d = new Date(c.date + "-01");
      const months = Math.max(0, (+now - +d) / (30.4 * 24 * 3600 * 1000));
      const t = Math.pow(1 + num(mk.marketMovement) / 100, months / 12);
      const before = v; v *= t;
      notes.push(`time +${Math.round(v - before).toLocaleString()}`);
    }
    const dl = (num(p.phys.landSize) - num(c.land || p.phys.landSize)) * num(mk.landRate) * num(w.land);
    const di = (num(p.phys.internalArea) - num(c.internal || p.phys.internalArea)) * num(mk.buildRate) * num(w.internal);
    const db = (num(p.phys.beds) - num(c.beds)) * num(w.bed) / 100 * num(c.price);
    const dba = (num(p.phys.baths) - num(c.baths || p.phys.baths)) * num(w.bath) / 100 * num(c.price);
    const dc = (num(p.phys.cars) - num(c.cars || p.phys.cars)) * num(w.car) / 100 * num(c.price);
    const dcond = (0 - num(c.cond)) * num(w.cond) / 100 * num(c.price);
    v += dl + di + db + dba + dc + dcond;
    return {
      ...c, adjusted: Math.round(v), adjLand: Math.round(dl), adjInt: Math.round(di),
      adjBed: Math.round(db), adjBath: Math.round(dba), adjCar: Math.round(dc), adjCond: Math.round(dcond),
    };
  });
  const compVal = adjusted.length ? adjusted.reduce((a: number, c: any) => a + c.adjusted, 0) / adjusted.length : 0;

  const isComm = p.assetClass === "Commercial";
  const targetYield = Math.max(2.5, num(mk.suburbMedianRent) * 52 / Math.max(1, num(mk.suburbMedian)) * 100);
  const incomeVal = isComm
    ? (num(p.comm.capRate) > 0 ? num(p.comm.annualRent) / (num(p.comm.capRate) / 100) : 0)
    : num(p.income.weeklyRent) * 52 / (targetYield / 100);

  const parts = [{ k: "Summation — land + depreciated improvements", v: summation }]
    .concat(compVal ? [{ k: "Adjusted comparable sales", v: compVal }] : [])
    .concat([{ k: isComm ? `Capitalisation at ${p.comm.capRate}%` : "Income capitalisation at suburb yield", v: incomeVal }]);
  const wts = isComm ? (compVal ? [.15, .25, .60] : [.3, .7]) : (compVal ? [.30, .45, .25] : [.6, .4]);
  const blended = parts.reduce((a, x, i) => a + x.v * wts[i], 0);

  return {
    parts, adjusted, blended, landValue, buildValue: depreciated, targetYield,
    variance: num(mk.price) > 0 ? (num(mk.price) - blended) / blended * 100 : 0,
  };
}

/* ===========================================================================
   SERVICEABILITY BY LENDER + PORTFOLIO SERVICEABILITY
   =========================================================================== */
export function serviceability(client: Client, lender: Lender, opts: any, ctx: EngineContext) {
  opts = opts || {};
  const C = COUNTRIES[ctx.settings.country || "AU"];
  const L = lender || ctx.lenders[0];
  const inc = client.income || {};
  const skip = opts.excludePropertyId || null;

  const shaded =
    num(inc.base)
    + num(inc.overtime) * (1 - num(L.otShadePct) / 100)
    + num(inc.bonus) * (1 - num(L.bonusShadePct) / 100)
    + num(inc.commission) * (1 - num(L.commissionShadePct) / 100)
    + num(inc.selfEmployed) * (1 - num(L.selfEmpShadePct) / 100)
    + num(inc.dividends) + num(inc.otherIncome);
  const partnerInc = num((client.partner || {}).base);
  const grossPersonal = shaded + partnerInc;

  const Y = Math.max(1, Math.round(num(opts.atYear, 1)));
  const owned = ctx.properties.filter((p) => p.status === "Owned" && !p.isPPOR && p.id !== skip);
  const proj = new Map<string, any>();
  owned.forEach((p) => { const r = project(p, {}, ctx); proj.set(p.id, r.rows[Math.min(Y, r.rows.length) - 1] || r.rows[0]); });

  const existingRent = owned.reduce((a, p) => {
    const row = proj.get(p.id);
    return a + num(row.grossRent) * (1 - num(L.rentShadePct) / 100);
  }, 0);
  const newRent = num(opts.newAnnualRent || 0) * (1 - num(L.rentShadePct) / 100);
  const assessedRent = existingRent + newRent;

  const taxOnPersonal = C.incomeTax(shaded) + C.incomeTax(partnerInc);
  let netIncome = grossPersonal + assessedRent - taxOnPersonal;

  if (L.ngAddBack) {
    const ngBenefit = owned.reduce((a, p) => a + Math.max(0, num(proj.get(p.id).taxEffect)), 0);
    netIncome += ngBenefit * 0.5;
  }

  const liab = client.liabilities || [];
  const cards = liab.filter((l: any) => l.type === "Credit card").reduce((a: number, l: any) => a + num(l.limit), 0) * num(L.cardAssessPct) / 100 * 12;
  const hecs = L.hecsAssessed ? liab.filter((l: any) => l.type === "HECS/HELP").reduce((a: number, l: any) => a + num(l.balance), 0) * 0.07 : 0;
  const other = liab.filter((l: any) => l.type !== "Credit card" && l.type !== "HECS/HELP").reduce((a: number, l: any) => a + num(l.repayment) * 12, 0);

  const assessRate = Math.max(num(L.floorPct), (opts.actualRate || num(L.varRate)) + num(L.bufferPct));
  const mr = assessRate / 100 / 12, n = 30 * 12;
  const existingDebt = owned.reduce((a, p) => a + num(proj.get(p.id).balance), 0);
  const existingAssessed = L.existingDebtAssess === "Assessed"
    ? existingDebt * mr / (1 - Math.pow(1 + mr, -n)) * 12
    : owned.reduce((a, p) => a + num(proj.get(p.id).repayments), 0);

  const hem = Math.max(num(client.livingExpMonthly) * 12,
    (num(L.hemMonthly) + num(L.hemPerDependant) * num(client.dependants)) * 12 + grossPersonal * num(L.hemIncomeScale));

  const commitments = cards + hecs + other + existingAssessed + hem;
  const surplus = netIncome - commitments;
  const capacity = (mr > 0 && surplus > 0) ? (surplus / 12) * (1 - Math.pow(1 + mr, -n)) / mr : 0;

  const proposedLoan = num(opts.proposedLoan || 0);
  const totalDebt = existingDebt + proposedLoan;
  const dti = grossPersonal + assessedRent > 0 ? totalDebt / (grossPersonal + assessedRent) : 0;
  const nsr = commitments > 0 ? netIncome / commitments : 0;

  const pass = proposedLoan <= capacity && dti <= num(L.maxDTI);
  return {
    lender: L, shaded, grossPersonal, assessedRent, existingRent, netIncome, cards, hecs, other,
    existingAssessed, hem, commitments, surplus, capacity, assessRate, existingDebt, totalDebt, dti, nsr, pass,
    headroom: capacity - proposedLoan,
  };
}

/* ===========================================================================
   EQUITY RECYCLING — constrained by serviceability
   =========================================================================== */
export function equityChain(cfg: any, ctx: EngineContext) {
  cfg = Object.assign({
    targetPrice: 850000, depositPct: 20, costsPct: 6, targetLVR: 80,
    lenderId: (ctx.lenders[0] || {}).id, clientId: ctx.clients[0]?.id, horizon: 15, rentYield: 4.2,
  }, cfg || {});
  const client = clientOf(cfg.clientId, ctx) || ctx.clients[0];
  const lender = ctx.lenders.find((l) => l.id === cfg.lenderId) || ctx.lenders[0];
  const owned = ctx.properties.filter((p) => p.status === "Owned");
  const cashNeeded = num(cfg.targetPrice) * (num(cfg.depositPct) + num(cfg.costsPct)) / 100;
  const newLoan = num(cfg.targetPrice) * (1 - num(cfg.depositPct) / 100);
  const newRent = num(cfg.targetPrice) * num(cfg.rentYield) / 100;

  const projections = owned.map((p) => ({ p, r: project(p, {}, ctx) }));
  const rows: any[] = [];
  let readyYear: number | null = null, servYear: number | null = null;

  for (let y = 1; y <= num(cfg.horizon); y++) {
    let usable = 0;
    projections.forEach(({ r }) => {
      const row = r.rows[Math.min(y, r.rows.length) - 1];
      if (!row) return;
      usable += Math.max(0, row.value * num(cfg.targetLVR) / 100 - row.balance);
    });
    const sv = serviceability(client, lender, { proposedLoan: newLoan, newAnnualRent: newRent, atYear: y }, ctx);
    const servOk = sv.capacity >= newLoan && sv.dti <= num(lender.maxDTI);
    const equityOk = usable >= cashNeeded;
    if (equityOk && !readyYear) readyYear = y;
    if (servOk && !servYear) servYear = y;
    rows.push({
      year: y, usable: Math.round(usable), needed: Math.round(cashNeeded),
      equityOk, servOk, capacity: Math.round(sv.capacity), dti: +sv.dti.toFixed(2),
    });
  }
  const goYear = rows.find((r) => r.equityOk && r.servOk)?.year || null;
  return {
    rows, cashNeeded, newLoan, newRent, readyYear, servYear, goYear, lender, cfg,
    blocker: goYear === null ? (readyYear === null ? "equity" : "serviceability") : null,
  };
}

/* ===========================================================================
   FEASIBILITY — value-add and development, with GST margin scheme
   =========================================================================== */
let _fUid = 0;
const fUid = (p = "id") => `${p}_${Date.now().toString(36)}${(_fUid++).toString(36)}`;

export function blankFeasibility(): Feasibility {
  return {
    id: fUid("fs"), name: "New feasibility", type: "Development", propertyId: "",
    country: "AU", region: "NSW",
    landCost: 950000, landAcqCostsPct: 5.5, demolition: 35000,
    units: [{ id: fUid("u"), name: "Townhouse A", count: 3, gfa: 150, buildRate: 2900, salePrice: 1150000 }],
    profFeesPct: 8, authorityFees: 45000, contributions: 70000, headworks: 35000,
    contingencyPct: 7, marketingPct: 1.2, sellingPct: 2.2,
    buildMonths: 14, sellMonths: 8,
    debtLVRpct: 65, debtLTCpct: 70, debtRate: 8.5, equityRate: 0, lineFeePct: 1.5,
    gstApplies: true, marginScheme: true, gstOnLand: false,
    targetMarginPct: 20, holdingRatesPa: 9000,
  };
}

export function feasibility(f: Feasibility) {
  const C = COUNTRIES[f.country] || COUNTRIES.AU;
  const gstRate = C.gst;

  const gr = (f.units || []).reduce((a: number, u: any) => a + num(u.count) * num(u.salePrice), 0);
  const gfa = (f.units || []).reduce((a: number, u: any) => a + num(u.count) * num(u.gfa), 0);
  const construction = (f.units || []).reduce((a: number, u: any) => a + num(u.count) * num(u.gfa) * num(u.buildRate), 0);

  const landAcq = num(f.landCost) * num(f.landAcqCostsPct) / 100 + C.duty(num(f.landCost), f.region);
  const profFees = construction * num(f.profFeesPct) / 100;
  const contingency = (construction + profFees) * num(f.contingencyPct) / 100;
  const marketing = gr * num(f.marketingPct) / 100;
  const selling = gr * num(f.sellingPct) / 100;
  const holding = num(f.holdingRatesPa) * (num(f.buildMonths) + num(f.sellMonths)) / 12;

  const hardSoft = construction + profFees + num(f.demolition) + num(f.authorityFees) + num(f.contributions) + num(f.headworks) + contingency;

  let gstPayable = 0, inputCredits = 0;
  if (f.gstApplies) {
    if (f.marginScheme) {
      const margin = Math.max(0, gr - num(f.landCost));
      gstPayable = margin * (gstRate / (1 + gstRate));
    } else {
      gstPayable = gr * (gstRate / (1 + gstRate));
    }
    inputCredits = (construction + profFees + num(f.demolition) + num(f.authorityFees) + marketing + selling) * (gstRate / (1 + gstRate));
  }
  const netGst = gstPayable - inputCredits;

  const tdcExGst = num(f.landCost) + landAcq + hardSoft + marketing + selling + holding;
  const debtCapLVR = gr * num(f.debtLVRpct) / 100;
  const debtCapLTC = tdcExGst * num(f.debtLTCpct) / 100;
  const debtLimit = Math.min(debtCapLVR, debtCapLTC);

  const months = Math.max(1, Math.round(num(f.buildMonths)));
  const scurve: number[] = [];
  for (let i = 1; i <= months; i++) {
    const t = i / months;
    const cum = 3 * t * t - 2 * t * t * t;
    scurve.push(cum);
  }
  let drawn = Math.min(debtLimit, num(f.landCost) + landAcq);
  let equity = Math.max(0, (num(f.landCost) + landAcq) - drawn);
  let interest = 0;
  let prevCum = 0;
  for (let i = 0; i < months; i++) {
    const cum = scurve[i];
    const spend = (hardSoft) * (cum - prevCum);
    prevCum = cum;
    const room = Math.max(0, debtLimit - drawn);
    const debtDraw = Math.min(room, spend);
    drawn += debtDraw;
    equity += (spend - debtDraw);
    interest += drawn * (num(f.debtRate) / 100 / 12);
    drawn += drawn * (num(f.debtRate) / 100 / 12);
  }
  for (let i = 0; i < Math.round(num(f.sellMonths)); i++) {
    interest += drawn * (num(f.debtRate) / 100 / 12);
    drawn += drawn * (num(f.debtRate) / 100 / 12);
  }
  const lineFee = debtLimit * num(f.lineFeePct) / 100;

  const tdc = tdcExGst + interest + lineFee + Math.max(0, netGst);
  const netRealisation = gr - selling - marketing;
  const profit = gr - tdc;
  const marginOnCost = tdc > 0 ? profit / tdc * 100 : 0;
  const marginOnGRV = gr > 0 ? profit / gr * 100 : 0;
  const peakDebt = Math.min(debtLimit, drawn);
  const equityRequired = Math.max(0, tdc - debtLimit);

  const target = num(f.targetMarginPct) / 100;
  const costsExLand = tdc - num(f.landCost) - landAcq;
  const rlv = (gr / (1 + target)) - costsExLand;

  const breakevenGR = tdc;
  const breakevenPerUnit = (f.units || []).length
    ? breakevenGR / Math.max(1, (f.units || []).reduce((a: number, u: any) => a + num(u.count), 0)) : 0;

  const projMonths = num(f.buildMonths) + num(f.sellMonths);
  const irr = projMonths > 0 && equityRequired > 0
    ? +(((Math.pow(1 + profit / Math.max(1, equityRequired), 12 / projMonths)) - 1) * 100).toFixed(1) : null;

  return {
    gr, gfa, construction, landAcq, profFees, contingency, marketing, selling, holding, hardSoft,
    gstPayable, inputCredits, netGst, interest, lineFee, tdc, profit, marginOnCost, marginOnGRV,
    peakDebt, debtLimit, equityRequired, rlv, breakevenPerUnit, irr, netRealisation, projMonths,
    unitsCount: (f.units || []).reduce((a: number, u: any) => a + num(u.count), 0),
  };
}

/* ===========================================================================
   RISK & VERDICT
   =========================================================================== */
function m$(v: number, p: Property, ctx: EngineContext): string {
  const C = COUNTRIES[(p && p.loc ? p.loc.country : null) || ctx.settings.country || "AU"];
  if (!isFinite(v)) return "—";
  const n = Math.abs(v).toLocaleString(C.loc, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return v < 0 ? "(" + C.sym + n + ")" : C.sym + n;
}

export function verdictOf(p: Property, P: ReturnType<typeof project>, ctx: EngineContext, SV?: any) {
  const f: [string, string][] = [], m = P.metrics;
  const client = clientOf(p.clientId, ctx) || ctx.clients[0];
  const cap = num(client?.goals?.cashCapacityWeekly, 250);

  if (P.acq.lvr > .90) f.push(["High", "Leverage above 90% LVR — thin equity buffer if values fall"]);
  else if (P.acq.lvr > .80) f.push(["Med", `LMI payable — ${m$(P.acq.lmi, p, ctx)} (${(P.acq.lmiRate * 100).toFixed(1)}% of loan)`]);
  if (!P.isComm && P.demand.idx < 40) f.push(["High", `Rental demand index ${P.demand.idx} — ${P.demand.band.toLowerCase()} market`]);
  if (P.isComm && num(p.comm.leaseYearsRemaining) <= 2)
    f.push(["High", `Lease expires in ${p.comm.leaseYearsRemaining} years — a re-let void of ${p.comm.reLetVoidMonths} months costs ${m$(num(p.comm.annualRent) * num(p.comm.reLetVoidMonths) / 12, p, ctx)}`]);
  if (P.isComm && num(p.comm.capRateShift) > 0) f.push(["Med", "Cap rate softening assumed — value falls even if rent rises"]);
  if (num(p.maintPct) < .5 && num(p.phys.buildYear) < 1990) f.push(["Med", "Maintenance allowance under 0.5% on a pre-1990 dwelling looks light"]);
  if (P.ladder.auto._landRatio < .30 && p.phys.type === "House") f.push(["Med", "Land is under 30% of price — weak growth engine for a house"]);
  if ((p.title.easements || []).length && P.ladder.auto.zoning < 0)
    f.push(["Med", "Easements or covenants materially restrict development upside"]);
  if (P.g0 > num(p.market.suburbCagr) + 2.5) f.push(["Med", "Modelled growth sits well above the suburb's own history"]);
  const ac = assetCagr(p);
  if (ac && ac.cagr < num(p.market.suburbCagr) - 1.5)
    f.push(["Med", `This asset has grown at ${ac.cagr}% over ${ac.years} yrs — below the suburb's ${p.market.suburbCagr}%`]);
  if (-m.weekly1 > cap) f.push(["High", `Year-1 holding cost ${m$(-m.weekly1, p, ctx)}/wk exceeds capacity of ${m$(cap, p, ctx)}/wk`]);
  if (P.trough < -3000) f.push(["Med", `Lumpy outgoings drive a ${m$(P.trough, p, ctx)} cash trough inside year 1`]);
  if (P.rolloverShock) f.push(["Med", `Repayment shock in year ${P.rolloverShock.year} — monthly ${m$(P.rolloverShock.from, p, ctx)} → ${m$(P.rolloverShock.to, p, ctx)} (+${P.rolloverShock.pct}%)`]);
  if (P.tax.trapped && P.rows[0].taxable < 0) f.push(["High", "This structure traps rental losses — no negative gearing benefit against personal income"]);
  if (P.tax.entity.type === "SMSF") f.push(["Med", "SMSF property advice is financial product advice — AFSL or authorisation required"]);
  if (num(p.loan.purposeSplit, 100) < 100) f.push(["Med", `Only ${p.loan.purposeSplit}% of interest is deductible — purpose test applied`]);
  if (SV && SV.capacity < P.acq.loan) f.push(["High", `${SV.lender.name}: capacity ${m$(SV.capacity, p, ctx)} is below the ${m$(P.acq.loan, p, ctx)} loan required`]);
  if (SV && SV.dti > num(SV.lender.maxDTI)) f.push(["Med", `DTI ${SV.dti.toFixed(1)}× exceeds ${SV.lender.name}'s ${SV.lender.maxDTI}× limit`]);

  const agg = portfolioLandTax(1, ctx);
  const solo = standaloneLandTax(p, 1);
  const aggregated = agg.byProp[p.id] || 0;
  if (aggregated > solo + 200)
    f.push(["High", `Portfolio aggregation adds ${m$(aggregated - solo, p, ctx)} of land tax a year that a single-property calculator would miss`]);

  const irr = m.irr === null ? -10 : m.irr;
  const a = clamp(irr / Math.max(1, num(p.hurdle)) * 35, 0, 35);
  const b = clamp(25 - f.reduce((x, r) => x + (r[0] === "High" ? 8 : 4), 0), 0, 25);
  const c = clamp((P.ladder.adjCap + CAP) / (2 * CAP) * 20, 0, 20);
  const d = cap > 0 ? clamp(20 * (1 - Math.max(0, -m.weekly1) / cap), 0, 20) : 10;
  const score = Math.round(a + b + c + d);
  const band = score >= 75 ? "Strong" : score >= 58 ? "Viable" : score >= 42 ? "Marginal" : "Not viable on these inputs";
  return { flags: f, score, band, parts: { a, b, c, d } };
}
