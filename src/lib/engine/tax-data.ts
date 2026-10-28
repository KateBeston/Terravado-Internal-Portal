/* ===========================================================================
   TERRAVADO — Engine: versioned tax data & jurisdiction constants
   Ported verbatim from the original Terra engine (engine-2026.07).
   Effective-dated block — never hardcode rates elsewhere. Replace wholesale
   when rates change; keep prior versions for historical reproducibility.
   =========================================================================== */

export const APP_VERSION = "0.1.0";
export const ENGINE_VERSION = "engine-2026.07";

export const num = (v: unknown, f = 0): number => (isFinite(+(v as number)) ? +(v as number) : f);
export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

/** Progressive bracket evaluator. rows: [ceiling, base, rate, from][] */
export function bracket(v: number, rows: number[][]): number {
  for (const r of rows) if (v <= r[0]) return r[1] + r[2] * (v - r[3]);
  return 0;
}

export const todayISO = (): string => new Date().toISOString().slice(0, 10);

/* --- Medicare levy, surcharge & Division 293 (FEDERAL) ---------------------
   Thresholds are indexed/legislated annually — maintain alongside the tax scale.
   Single-rate figures; family thresholds add a dependants dimension later. */
export const MEDICARE = { pct: 0.02, lowerSingle: 26000, upperSingle: 32500 }; // 2024-25 single thresholds

/** Medicare levy with the low-income phase-in (nil below the lower threshold,
    10% of the excess through the shade-in band, full 2% above the upper). */
export function medicareLevy(ti: number): number {
  if (ti <= MEDICARE.lowerSingle) return 0;
  if (ti <= MEDICARE.upperSingle) return 0.10 * (ti - MEDICARE.lowerSingle);
  return MEDICARE.pct * ti;
}

/** Medicare Levy Surcharge — singles WITHOUT private patient hospital cover.
    2025-26 single tiers: 1% $97,001–113,000, 1.25% $113,001–151,000, 1.5% above. */
export function medicareLevySurcharge(ti: number, hasPrivateHospitalCover: boolean): number {
  if (hasPrivateHospitalCover) return 0;
  const rate = ti <= 97000 ? 0 : ti <= 113000 ? 0.01 : ti <= 151000 ? 0.0125 : 0.015;
  return rate * ti;
}

/** Division 293 — extra 15% on concessional super contributions where income
    (incl. those contributions) exceeds $250,000, on the lesser of the
    contributions and the amount over the threshold. */
export function division293(incomePlusContributions: number, concessionalContributions: number): number {
  const over = Math.max(0, incomePlusContributions - 250000);
  return 0.15 * Math.min(Math.max(0, concessionalContributions), over);
}

/** VIC Vacant Residential Land Tax — escalating 1% / 2% / 3% of capital improved
    value by consecutive vacant year, for residential land vacant 6+ months
    (statewide from 1 Jan 2025). Separate from general land tax. */
export function vicVacantResidentialLandTax(capitalImprovedValue: number, consecutiveVacantYears: number): number {
  const rate = consecutiveVacantYears <= 1 ? 0.01 : consecutiveVacantYears === 2 ? 0.02 : 0.03;
  return rate * Math.max(0, capitalImprovedValue);
}

export interface TaxData {
  version: string;
  effectiveFrom: string;
  source: string;
  transferDuty: Record<string, (v: number) => number>;
  fhbConcession: Record<string, { full: number; taper: number }>;
  foreignDuty: Record<string, number>;
  foreignLandTax: Record<string, number>;
  landTax: Record<string, (L: number) => number>;
  trustSurchargeNoThreshold: Record<string, boolean>;
  incomeTax: Record<string, (ti: number) => number>;
  marginalRate: Record<string, (ti: number) => number>;
  gstRate: number;
  cgtDiscount: { individual: number; company: number; smsf: number };
  effectiveLives: [string, number][];
}

export const TAX_DATA: TaxData = {
  version: "AU-2026-27",
  effectiveFrom: "2026-07-01",
  source: "State revenue offices & ATO. Indicative — verify before reliance.",

  transferDuty: {
    NSW: (v) => bracket(v, [[17000, 0, .0125, 0], [36000, 212, .015, 17000], [97000, 497, .0175, 36000], [364000, 1564, .035, 97000], [1212000, 10909, .045, 364000], [3636000, 49069, .055, 1212000], [Infinity, 182389, .07, 3636000]]),
    VIC: (v) => v > 2e6 ? 110000 + .065 * (v - 2e6) : v > 960000 ? .055 * v : bracket(v, [[25000, 0, .014, 0], [130000, 350, .024, 25000], [960000, 2870, .06, 130000]]),
    QLD: (v) => bracket(v, [[5000, 0, 0, 0], [75000, 0, .015, 5000], [540000, 1050, .035, 75000], [1000000, 17325, .045, 540000], [Infinity, 38025, .0575, 1000000]]),
    WA: (v) => bracket(v, [[120000, 0, .019, 0], [150000, 2280, .0285, 120000], [360000, 3135, .038, 150000], [725000, 11115, .0475, 360000], [Infinity, 28453, .0515, 725000]]),
    SA: (v) => bracket(v, [[12000, 0, .01, 0], [30000, 120, .02, 12000], [50000, 480, .03, 30000], [100000, 1080, .035, 50000], [200000, 2830, .04, 100000], [250000, 6830, .0425, 200000], [300000, 8955, .0475, 250000], [500000, 11330, .05, 300000], [Infinity, 21330, .055, 500000]]),
    TAS: (v) => bracket(v, [[3000, 50, 0, 0], [25000, 50, .0175, 3000], [75000, 435, .0225, 25000], [200000, 1560, .035, 75000], [375000, 5935, .04, 200000], [725000, 12935, .0425, 375000], [Infinity, 27810, .045, 725000]]),
    ACT: (v) => v > 1455000 ? .0454 * v : bracket(v, [[200000, 0, .012, 0], [300000, 2400, .022, 200000], [500000, 4600, .034, 300000], [750000, 11400, .0432, 500000], [1000000, 22200, .059, 750000], [Infinity, 36950, .064, 1000000]]),
    NT: (v) => v < 525000 ? (.06571441 * Math.pow(v / 1000, 2) + 15 * (v / 1000)) : v <= 3e6 ? .0495 * v : v <= 5e6 ? .0575 * v : .0595 * v,
  },

  fhbConcession: {
    NSW: { full: 800000, taper: 1000000 }, VIC: { full: 600000, taper: 750000 },
    QLD: { full: 700000, taper: 800000 }, WA: { full: 450000, taper: 600000 },
    SA: { full: Infinity, taper: Infinity }, TAS: { full: 750000, taper: 750000 },
    ACT: { full: 1020000, taper: 1020000 }, NT: { full: 0, taper: 0 },
  },
  foreignDuty: { NSW: .09, VIC: .08, QLD: .08, WA: .07, SA: .07, TAS: .08, ACT: .04, NT: 0 },
  foreignLandTax: { NSW: .05, VIC: .04, QLD: .03, WA: 0, SA: .005, TAS: .02, ACT: .0075, NT: 0 },

  landTax: {
    NSW: (L) => L <= 1075000 ? 0 : L <= 6571000 ? 100 + .016 * (L - 1075000) : 88036 + .02 * (L - 6571000),
    VIC: (L) => L < 50000 ? 0 : L < 100000 ? 500 : L < 300000 ? 975 : bracket(L, [[600000, 1350, .003, 300000], [1000000, 2250, .006, 600000], [1800000, 4650, .009, 1000000], [3000000, 11850, .0165, 1800000], [Infinity, 31650, .0265, 3000000]]),
    QLD: (L) => L < 600000 ? 0 : bracket(L, [[1000000, 500, .01, 600000], [3000000, 4500, .0165, 1000000], [5000000, 37500, .0125, 3000000], [Infinity, 62500, .0175, 5000000]]),
    WA: (L) => L < 300000 ? 0 : L < 420000 ? 300 : bracket(L, [[1000000, 300, .0025, 420000], [1800000, 1750, .009, 1000000], [5000000, 8950, .018, 1800000], [Infinity, 66550, .02, 5000000]]),
    SA: (L) => L < 732000 ? 0 : bracket(L, [[1176000, 0, .005, 732000], [1711000, 2220, .01, 1176000], [2738000, 7570, .02, 1711000], [Infinity, 28110, .024, 2738000]]),
    TAS: (L) => L < 125000 ? 0 : L < 500000 ? .0055 * (L - 125000) : 2062.5 + .015 * (L - 500000),
    ACT: (L) => 1462 + .0075 * L,
    NT: () => 0,
  },
  trustSurchargeNoThreshold: { NSW: true },

  incomeTax: {
    // 2026-27 resident scale: nil / 15% / 30% / 37% / 45%. (2025-26 used 16% on
    // the 18,201–45,000 band, base 4,288; retained in prior versions.) Legislated
    // further cut to 14% from 1 Jul 2027.
    AU: (ti) => {
      const t = ti <= 18200 ? 0 : ti <= 45000 ? .15 * (ti - 18200) : ti <= 135000 ? 4020 + .30 * (ti - 45000)
        : ti <= 190000 ? 31020 + .37 * (ti - 135000) : 51370 + .45 * (ti - 190000);
      return t + medicareLevy(ti); // + Medicare levy (2%, with low-income phase-in)
    },
  },
  marginalRate: {
    // Incl. Medicare (2%): 0 / 17 / 32 / 39 / 47.
    AU: (ti) => ti <= 18200 ? 0 : ti <= 45000 ? 17 : ti <= 135000 ? 32 : ti <= 190000 ? 39 : 47,
  },
  gstRate: 0.10,
  cgtDiscount: { individual: .50, company: 0, smsf: 1 / 3 },

  effectiveLives: [
    ["Carpet", 8], ["Vinyl / laminate flooring", 10], ["Blinds", 10], ["Curtains", 6],
    ["Hot water system", 12], ["Oven", 12], ["Cooktop", 12], ["Rangehood", 12], ["Dishwasher", 10],
    ["Air conditioner (split)", 10], ["Air conditioner (ducted)", 15], ["Ceiling fan", 5],
    ["Smoke alarm", 6], ["Solar system", 20], ["Garage door motor", 10], ["Security system", 5],
    ["Light shades", 5], ["Furniture (loose)", 13], ["Clothes dryer", 10], ["Exhaust fan", 10],
  ],
};

export interface Country {
  name: string; sym: string; loc: string; area: string; rentPer: string; rp: number;
  regions: string[]; regionLabel: string; localityLabel: string;
  duty: (v: number, r: string) => number;
  fhb: (v: number, r: string) => number;
  foreignDuty: (r: string) => number;
  landTax: (L: number, r: string) => number;
  foreignLandTax: (r: string) => number;
  marginal: (ti: number) => number;
  incomeTax: (ti: number) => number;
  gst: number;
}

export const COUNTRIES: Record<string, Country> = {
  AU: {
    name: "Australia", sym: "$", loc: "en-AU", area: "m²", rentPer: "week", rp: 52,
    regions: ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"], regionLabel: "State", localityLabel: "Council / LGA",
    duty: (v, r) => TAX_DATA.transferDuty[r] ? TAX_DATA.transferDuty[r](v) : 0,
    fhb: (v, r) => {
      const c = TAX_DATA.fhbConcession[r]; if (!c) return 0;
      const full = TAX_DATA.transferDuty[r] ? TAX_DATA.transferDuty[r](v) : 0;
      if (v <= c.full) return full;
      if (v < c.taper) return full * (1 - (v - c.full) / (c.taper - c.full));
      return 0;
    },
    foreignDuty: (r) => TAX_DATA.foreignDuty[r] || 0,
    landTax: (L, r) => TAX_DATA.landTax[r] ? TAX_DATA.landTax[r](L) : 0,
    foreignLandTax: (r) => TAX_DATA.foreignLandTax[r] || 0,
    marginal: TAX_DATA.marginalRate.AU, incomeTax: TAX_DATA.incomeTax.AU, gst: TAX_DATA.gstRate,
  },
  NZ: {
    name: "New Zealand", sym: "$", loc: "en-NZ", area: "m²", rentPer: "week", rp: 52,
    regions: ["Auckland", "Wellington", "Canterbury", "Waikato", "Otago", "Other"], regionLabel: "Region", localityLabel: "Territorial authority",
    duty: () => 0, fhb: () => 0, foreignDuty: () => 0, landTax: () => 0, foreignLandTax: () => 0,
    marginal: () => 39, incomeTax: (ti) => ti * .33, gst: .15,
  },
  UK: {
    name: "United Kingdom", sym: "£", loc: "en-GB", area: "m²", rentPer: "month", rp: 12,
    regions: ["England", "Scotland", "Wales", "Northern Ireland"], regionLabel: "Nation", localityLabel: "Local authority",
    duty: (v) => bracket(v, [[250000, 0, 0, 0], [925000, 0, .05, 250000], [1500000, 33750, .10, 925000], [Infinity, 91250, .12, 1500000]]) + v * .03,
    fhb: () => 0, foreignDuty: () => .02, landTax: () => 0, foreignLandTax: () => 0,
    marginal: () => 40, incomeTax: (ti) => ti * .35, gst: .20,
  },
  US: {
    name: "United States", sym: "$", loc: "en-US", area: "sq ft", rentPer: "month", rp: 12,
    regions: ["CA", "NY", "TX", "FL", "WA", "Other"], regionLabel: "State", localityLabel: "County",
    duty: (v) => v * .01, fhb: () => 0, foreignDuty: () => 0, landTax: () => 0, foreignLandTax: () => 0,
    marginal: () => 32, incomeTax: (ti) => ti * .28, gst: 0,
  },
  OTHER: {
    name: "Custom", sym: "", loc: "en-US", area: "m²", rentPer: "month", rp: 12,
    regions: ["Region 1", "Region 2"], regionLabel: "Region", localityLabel: "Locality",
    duty: () => 0, fhb: () => 0, foreignDuty: () => 0, landTax: () => 0, foreignLandTax: () => 0,
    marginal: () => 30, incomeTax: (ti) => ti * .3, gst: 0,
  },
};
