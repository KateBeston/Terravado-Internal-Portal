/* Deal pack — assembles an application-ready package from a client + property +
   the modelled result, ready to hand into the lodgement channel. The structure
   is grouped to mirror LIXI CAL's logical sections (Applicant, Financials,
   Security, Loan) so mapping to the exact LIXI schema later is a field exercise,
   not a rebuild. It is NOT itself LIXI XML yet — that mapping waits on confirmed
   lodgement-platform partner access and the current schema. */
import type { Client, Property } from "@/lib/domain/types";
import { runModel, runLenderCompare, type ModelInputs } from "@/lib/modelling/run";
import { provenance } from "@/lib/assurance/provenance";

export interface DealPack {
  meta: { generatedAt: string; engineVersion: string; source: string; disclaimer: string; lixiMapping: string };
  applicant: {
    name: string; email?: string; phone?: string;
    grossIncome: number; partnerIncome: number; dependants: number; livingExpMonthly: number;
  };
  liabilities: { cardLimits: number; hecsBalance: number; otherMonthlyRepayments: number };
  security: {
    address: string; state: string; purpose: string;
    price: number; propertyType?: string; landSize?: number; beds?: number; baths?: number;
  };
  loan: {
    amountRequired: number; lvrPct: number; cashToComplete: number; transferDuty: number;
    repaymentType?: string; termYears?: number; productName: string;
  };
  serviceability: { lender: string; borrowingCapacity: number; dti: number; serviceable: boolean; note: string };
  lenderShortlist: { name: string; capacity: number; serviceable: boolean; bestFit: boolean }[];
  projection: { year1WeeklyCashflow: number; irr: number | null; grossYieldPct: number; endValue: number; endEquity: number };
}

/** Build the engine inputs for a client + property (+ optional lender products). */
export function dealInputs(client: Client, property: Property, engineLenders?: any[]): ModelInputs {
  const d = property.details ?? {};
  const fin = client.finances ?? {};
  return {
    address: property.address,
    state: property.state ?? d.locality?.region ?? "NSW",
    price: property.price ?? 0,
    weeklyRent: d.weeklyRent ?? 0,
    growthPct: d.locality?.annualGrowthPct ?? 5.0,
    ratePct: 6.1,
    depositPct: 20,
    grossIncome: fin.grossIncome ?? 0,
    clientName: client.name,
    partnerIncome: fin.partnerIncome,
    livingExpMonthly: fin.livingExpMonthly,
    dependants: fin.dependants,
    monthlyCommitments: fin.monthlyCommitments,
    cardLimits: fin.cardLimits,
    hecsBalance: fin.hecsBalance,
    modelling: d.modelling,
    ...(engineLenders && engineLenders.length ? { lenders: engineLenders } : {}),
  };
}

export function assembleDealPack(client: Client, property: Property, engineLenders?: any[]): DealPack {
  const inp = dealInputs(client, property, engineLenders);
  const r = runModel(inp);
  const lc = runLenderCompare(inp);
  const best = lc.rows.find((x) => x.bestFit) ?? lc.rows[0];
  const d = property.details ?? {};
  const fin = client.finances ?? {};
  const ph = d.physical ?? {};
  const m = d.modelling ?? {};
  const prov = provenance();

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      engineVersion: prov.engineVersion,
      source: "Terravado",
      disclaimer:
        "Indicative, Terravado-modelled package for origination. Serviceability is assessed against lender " +
        "templates and must be confirmed in the lender's own calculator at lodgement. Not a credit decision.",
      lixiMapping: "Grouped to LIXI CAL sections (Applicant / Financials / Security / Loan); exact LIXI XML mapping pending lodgement-platform access.",
    },
    applicant: {
      name: client.name, email: client.email, phone: client.phone,
      grossIncome: fin.grossIncome ?? 0,
      partnerIncome: fin.partnerIncome ?? 0,
      dependants: fin.dependants ?? 0,
      livingExpMonthly: fin.livingExpMonthly ?? 0,
    },
    liabilities: {
      cardLimits: fin.cardLimits ?? 0,
      hecsBalance: fin.hecsBalance ?? 0,
      otherMonthlyRepayments: fin.monthlyCommitments ?? 0,
    },
    security: {
      address: property.address, state: inp.state, purpose: "Investment",
      price: property.price ?? 0, propertyType: ph.type, landSize: ph.landSize, beds: ph.beds, baths: ph.baths,
    },
    loan: {
      amountRequired: r.acq.loan, lvrPct: Math.round(r.acq.lvr * 100), cashToComplete: r.acq.cashIn, transferDuty: r.acq.duty,
      repaymentType: m.repaymentType, termYears: m.termYears, productName: best?.name ?? "—",
    },
    serviceability: {
      lender: best?.name ?? "—", borrowingCapacity: best?.capacity ?? 0, dti: best?.dti ?? 0,
      serviceable: best ? best.pass : false,
      note: "Assessed against lender templates; confirm in the lender's calculator at lodgement.",
    },
    lenderShortlist: lc.rows.map((x) => ({ name: x.name, capacity: x.capacity, serviceable: x.pass, bestFit: x.bestFit })),
    projection: {
      year1WeeklyCashflow: r.metrics.weekly1, irr: r.metrics.irr, grossYieldPct: r.metrics.grossYield,
      endValue: r.metrics.valueEnd, endEquity: r.metrics.equityEnd,
    },
  };
}
