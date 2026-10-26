/* ===========================================================================
   TERRAVADO — Seed / sample records
   Ported from the original Terra seeds. Used for the demo working state and
   for engine verification. In production these are replaced by Supabase rows.
   =========================================================================== */
import { todayISO } from "./tax-data";
import { blankFeasibility } from "./engine";
import type { EngineContext } from "./engine";

let _n = 0;
const uid = (p = "id") => `${p}_${(++_n).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function seedClient() {
  return {
    id: "cli_1", name: "Sample Investor", dob: "1984-03-12", phone: "", email: "", address: "",
    residency: "Australian resident", buyerStatus: "Portfolio investor",
    income: { base: 165000, overtime: 0, bonus: 0, commission: 0, selfEmployed: 0, dividends: 0, otherIncome: 0 },
    partner: { name: "", base: 95000 },
    assets: { cash: 60000, shares: 40000, super: 220000, vehicles: 25000 },
    liabilities: [
      { id: uid("li"), type: "Credit card", limit: 15000, balance: 2000, repayment: 0, rate: 0, lender: "" },
      { id: uid("li"), type: "Car loan", limit: 0, balance: 18000, repayment: 450, rate: 8.5, lender: "" },
      { id: uid("li"), type: "HECS/HELP", limit: 0, balance: 22000, repayment: 0, rate: 0, lender: "" },
    ],
    livingExpMonthly: 4200, dependants: 0,
    goals: { targetProperties: 4, timeframe: 10, cashCapacityWeekly: 250, retirementIncome: 80000 },
    consent: { given: true, date: todayISO() },
    notes: "",
  };
}

export function seedProperty() {
  return {
    id: "prop_1", label: "14 Sample St, Ashfield", assetClass: "Residential", status: "Owned",
    entityId: "ent_1", clientId: "cli_1", isPPOR: false,
    loc: { country: "AU", region: "NSW", locality: "Inner West", suburb: "Ashfield", postcode: "2131", address: "14 Sample St" },
    phys: {
      type: "House", style: "Freestanding", buildYear: 1998, beds: 3, baths: 2, cars: 2, livingAreas: 2,
      internalArea: 145, landSize: 550, frontage: 15, depth: 36, orientation: "North", construction: "Brick veneer",
      roof: "Tile", pool: false, solar: false,
      rooms: [{ name: "Living", l: 6.2, w: 4.5 }, { name: "Kitchen/Dining", l: 6.0, w: 4.0 },
      { name: "Bed 1", l: 4.4, w: 3.6 }, { name: "Bed 2", l: 3.6, w: 3.3 }, { name: "Bed 3", l: 3.4, w: 3.2 }],
    },
    title: {
      titleRef: "12/SP12345", lotDp: "Lot 12 DP 1234", zoning: "R2 Low Density",
      heritage: false, heritageNote: "",
      easements: [{ type: "Sewer main", beneficiary: "Sydney Water", width: 3, affectedArea: 45, note: "Runs along rear boundary — restricts rear extension" }],
      encumbrances: [{ type: "Covenant", detail: "Single dwelling only", impact: "Blocks dual occupancy" }],
    },
    features: [{ name: "Renovated kitchen", valuePct: 1.5 }, { name: "North-facing rear", valuePct: 2.0 }, { name: "Off-street parking", valuePct: 1.0 }],
    saleHistory: [
      { date: "2004-06-18", price: 412000, method: "Auction", dom: 24, note: "" },
      { date: "2013-11-09", price: 686000, method: "Auction", dom: 19, note: "" },
      { date: "2021-03-27", price: 900000, method: "Private treaty", dom: 31, note: "Post-COVID surge" },
      { date: "2026-02-14", price: 950000, method: "Private treaty", dom: 28, note: "Acquisition" },
    ],
    market: {
      price: 950000, purchaseDate: "2026-02-14", suburbMedian: 980000, suburbMedianRent: 620,
      landRate: 950, buildRate: 2600, daysOnMarket: 28,
      suburbCagr: 5.8, longRunAnchor: 5.0, anchorBlend: 60, rentBase: 3.0, cpi: 2.8,
      marketMovement: 4.0,
      history: "2015,610000\n2018,690000\n2021,900000\n2024,950000\n2025,985000",
      provenance: { price: "verified", suburbCagr: "typed", landRate: "typed" },
    },
    comps: [
      { addr: "12 Sample St", date: "2025-11", price: 965000, beds: 3, baths: 2, cars: 2, land: 540, internal: 148, cond: 0 },
      { addr: "8 Example Ave", date: "2025-09", price: 910000, beds: 3, baths: 1, cars: 1, land: 505, internal: 138, cond: -1 },
    ],
    compWeights: { land: 0.60, internal: 0.70, bed: 3.0, bath: 2.0, car: 1.5, cond: 2.5, timeAdjust: true },
    demand: {
      vacancyRate: 1.4, daysToLease: 14, appsPerListing: 6, rentToIncome: 29, popGrowthPct: 1.4, rentalStock: 34,
      autoVacancy: true, vacancyWeeks: 2,
    },
    income: { weeklyRent: 640, otherIncome: 0, otherIncomeLabel: "Storage / solar", pmFeePct: 7.0, lettingWeeks: 1.5, pmGstIncl: true },
    comm: {
      netLease: true, outgoingsRecoveryPct: 100, capRate: 6.25, capRateShift: 0.0,
      annualRent: 85000, reviewType: "Fixed %", reviewPct: 3.5, cpiFloor: 2.0,
      leaseYearsRemaining: 4, waleYears: 4, incentiveMonths: 6, reLetVoidMonths: 9, reLetIncentiveMonths: 9,
      makeGoodCost: 25000, gstRegistered: true,
    },
    entry: {
      deposit: 20, dutyMode: "auto", dutyManual: 0, foreignBuyer: false, firstHomeBuyer: false, capitaliseLmi: true,
      items: [
        { id: uid("e"), name: "Conveyancing / legal", amount: 2200 },
        { id: uid("e"), name: "Building & pest inspection", amount: 800 },
        { id: uid("e"), name: "Transfer & mortgage registration", amount: 340 },
        { id: uid("e"), name: "Loan application / establishment", amount: 600 },
        { id: uid("e"), name: "Bank valuation", amount: 300 },
        { id: uid("e"), name: "Depreciation schedule (QS report)", amount: 770 },
        { id: uid("e"), name: "Initial repairs & make-ready", amount: 4000 },
      ],
    },
    loan: {
      lenderId: "", repaymentType: "Principal & interest", ioYears: 3, termYears: 30,
      rateStructure: "Variable", varRate: 6.10, fixedRate: 5.79, fixedYears: 3, fixedPortion: 50,
      ratePath: [{ year: 2, rate: 6.35 }, { year: 4, rate: 5.85 }],
      offsetBalance: 0, offsetMonthly: 0, extraMonthly: 0,
      annualPackageFee: 395, monthlyAccountFee: 0, dischargeFee: 350,
      purposeSplit: 100,
    },
    expenses: [
      { id: uid("x"), name: "Council rates", amount: 490, freq: "Quarterly", startMonth: 1, esc: 3.0, ded: true },
      { id: uid("x"), name: "Water & sewerage", amount: 280, freq: "Quarterly", startMonth: 2, esc: 3.5, ded: true },
      { id: uid("x"), name: "Landlord insurance", amount: 1450, freq: "Annual", startMonth: 7, esc: 8.0, ded: true },
      { id: uid("x"), name: "Strata / body corporate", amount: 0, freq: "Quarterly", startMonth: 1, esc: 6.0, ded: true },
      { id: uid("x"), name: "Routine inspection fee", amount: 55, freq: "Quarterly", startMonth: 3, esc: 3.0, ded: true },
      { id: uid("x"), name: "Smoke alarm & compliance", amount: 99, freq: "Annual", startMonth: 8, esc: 3.0, ded: true },
      { id: uid("x"), name: "Gardening / lawns", amount: 65, freq: "Monthly", startMonth: 1, esc: 3.0, ded: true },
      { id: uid("x"), name: "Pest treatment", amount: 320, freq: "Half-yearly", startMonth: 4, esc: 3.0, ded: true },
      { id: uid("x"), name: "Accounting / tax return", amount: 350, freq: "Annual", startMonth: 9, esc: 3.0, ded: true },
    ],
    maintPct: 0.6,
    dep: { mode: "assumed", constructionCost: 0, plantEligible: false, plantValue: 18000, div43: [], div40: [], scrapYear: 0, scrapValue: 0 },
    tax: { landTaxMode: "auto", landTaxManual: 0, landValueManual: 0, paygVariation: false },
    events: [{ id: uid("ev"), year: 4, type: "Renovation", name: "Kitchen & bathroom", cost: 55000, upliftPct: 6, rentUplift: 60, status: "Planned" }],
    projects: [{ id: uid("pj"), name: "Metro station (1.2km)", year: 3, impact: 4.0, funded: true }],
    planning: {
      fsr: 0.5, heightLimit: 8.5, minLotSize: 450, frontSetback: 6, rearSetback: 6, siteCoverage: 50,
      parkingRate: 1, overlays: [], daStatus: "None", daLodged: "", daDetermined: "", daNotes: "",
    },
    horizon: 10, hurdle: 8.0, agentFeePct: 2.0, sellLegals: 1800, scenario: "Base",
    scores: {}, docs: [], notes: "",
  };
}

export function seedLenders() {
  const base = (name: string, o: Record<string, unknown>) => Object.assign({
    id: uid("len"), name, isTemplate: true,
    bufferPct: 3.00, floorPct: 5.50,
    rentShadePct: 20, ngAddBack: true,
    hemMonthly: 3400, hemPerDependant: 520, hemIncomeScale: 0.06,
    cardAssessPct: 3.8, hecsAssessed: true,
    otShadePct: 20, bonusShadePct: 20, commissionShadePct: 20, selfEmpShadePct: 0,
    existingDebtAssess: "Assessed", maxLVR: 90, maxDTI: 6.5,
    varRate: 6.10, ioLoading: 0.25, estFee: 600, valFee: 300, annualFee: 395, lmiFactor: 1.0,
    notes: "",
  }, o || {});
  return [
    base("Conservative major (template)", { bufferPct: 3.0, floorPct: 5.75, rentShadePct: 20, maxDTI: 6.0, hemMonthly: 3600 }),
    base("Moderate major (template)", { bufferPct: 3.0, floorPct: 5.50, rentShadePct: 20, maxDTI: 7.0 }),
    base("Non-bank / flexible (template)", { bufferPct: 2.0, floorPct: 5.25, rentShadePct: 10, maxDTI: 8.0, maxLVR: 95, varRate: 6.65, hemMonthly: 3200 }),
  ];
}

/** A ready-to-use in-memory context seeded with the sample portfolio. */
export function seedContext(): EngineContext {
  return {
    settings: { country: "AU", orgName: "", advisorName: "" },
    entities: [
      {
        id: "ent_1", name: "Personal (individual)", type: "Individual", region: "NSW",
        owners: [{ clientId: "cli_1", pct: 100 }], taxableIncome: 165000, foreign: false, deedExcludesForeign: true,
      },
    ],
    clients: [seedClient()],
    properties: [seedProperty()],
    lenders: seedLenders(),
    feasibilities: [blankFeasibility()],
    contacts: [{ id: uid("con"), name: "", role: "Conveyancer", firm: "", phone: "", email: "", licence: "", notes: "", propertyIds: [] }],
  };
}
