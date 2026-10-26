/* Built-in stub finance provider — a simplified, clearly-indicative multi-lender
   servicing model so the seam works and the "best fit across lenders" shape is
   visible before Quickli is connected. NOT a real lender assessment. */
import { TAX_DATA } from "@/lib/engine/tax-data";
import { provenance } from "@/lib/assurance/provenance";
import type { FinanceProvider } from "./provider";
import type { LenderAssessment, ServiceabilityRequest, ServiceabilityResult } from "./types";

const DEFAULT_RATE = 6.5;
const BUFFER = 3.0; // serviceability assessment buffer over the product rate

interface MockLender { name: string; rateFloor: number; rentalShade: number; hemBase: number; maxDTI: number; }
const LENDERS: MockLender[] = [
  { name: "Lender A — major bank", rateFloor: 7.75, rentalShade: 0.80, hemBase: 28000, maxDTI: 6 },
  { name: "Lender B — non-major", rateFloor: 7.50, rentalShade: 0.90, hemBase: 25000, maxDTI: 7 },
  { name: "Lender C — specialist", rateFloor: 7.25, rentalShade: 0.90, hemBase: 24000, maxDTI: 8 },
];

const netIncome = (gross: number): number => Math.max(0, gross - TAX_DATA.incomeTax.AU(gross));
const hem = (base: number, dependents = 0): number => base + dependents * 8000;

function loanFromSurplus(annualSurplus: number, assessmentRatePct: number, years = 30): number {
  if (annualSurplus <= 0) return 0;
  const r = assessmentRatePct / 100 / 12;
  const n = years * 12;
  const monthly = annualSurplus / 12;
  return r === 0 ? monthly * n : (monthly * (1 - Math.pow(1 + r, -n))) / r;
}

export const stubFinanceProvider: FinanceProvider = {
  name: "stub",
  async assessServiceability(req: ServiceabilityRequest): Promise<ServiceabilityResult> {
    const rate = req.interestRatePct ?? DEFAULT_RATE;
    const assessments: LenderAssessment[] = LENDERS.map((L) => {
      const assessmentRate = Math.max(rate + BUFFER, L.rateFloor);
      const assessedIncome = netIncome(req.grossIncome) + (req.rentalIncome ?? 0) * L.rentalShade;
      const living = req.livingExpenses ?? hem(L.hemBase, req.dependents);
      const surplus = assessedIncome - living - req.existingDebtRepayments;
      let maxBorrow = loanFromSurplus(surplus, assessmentRate);
      maxBorrow = Math.min(maxBorrow, req.grossIncome * L.maxDTI); // DTI cap
      maxBorrow = Math.max(0, Math.round(maxBorrow / 1000) * 1000);
      return {
        lender: L.name,
        maxBorrow,
        maxPropertyPrice: maxBorrow + req.deposit,
        assessmentRatePct: +assessmentRate.toFixed(2),
        notes: `assessed at ${assessmentRate.toFixed(2)}%, rent shaded ${Math.round(L.rentalShade * 100)}%, DTI cap ${L.maxDTI}×`,
      };
    }).sort((a, b) => b.maxBorrow - a.maxBorrow);

    return {
      assessments,
      bestFit: assessments[0],
      source: "stub",
      disclaimer:
        "Indicative only — a simplified multi-lender model, not a real lender assessment. " +
        "The Quickli integration (authoritative servicing calculators) replaces this once connected.",
      _provenance: provenance({ model: "stub-serviceability", lenders: LENDERS.length }),
    };
  },
};
