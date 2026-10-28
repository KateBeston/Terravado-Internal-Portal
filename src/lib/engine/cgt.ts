/* ===========================================================================
   CAPITAL GAINS TAX — disposal engine (FEDERAL)
   ---------------------------------------------------------------------------
   Computes the CGT on selling an investment property, by entity type:
     • Capital proceeds = sale price − selling costs.
     • Cost base = purchase price + acquisition costs + capital improvements +
       non-deductible (third-element) holding costs − capital-works deductions
       claimed (Div 43 reduces the cost base).
     • Main residence exemption (full, or partial via the 6-year absence rule).
     • Net against carried-forward capital losses BEFORE the discount.
     • Discount: 50% individuals/trusts, 1/3 SMSF, nil company — only if held
       >12 months and the owner is not a foreign resident.
     • CGT payable at the owner's marginal rate (individual/trust-distributed),
       30% (company) or 15% (SMSF).
     • Foreign resident: no discount, no main-residence exemption, and 15%
       Foreign Resident Capital Gains Withholding (FRCGW) is withheld at
       settlement as a credit against the liability (from 1 Jan 2025, no
       threshold).
   General information, not tax advice. The hard cost-base and exemption facts
   belong on the property record; this engine does the maths on them.
   =========================================================================== */

export type CgtEntity = "individual" | "joint" | "company" | "trust" | "smsf";

export interface DisposalInputs {
  entityType: CgtEntity;
  salePrice: number;
  sellingCosts?: number;        // agent, marketing, legals (absolute)
  purchasePrice: number;
  acquisitionCosts?: number;    // duty, legals, buyer's agent
  capitalImprovements?: number;
  thirdElementHoldingCosts?: number; // non-deductible rates/interest added to cost base
  capitalWorksClaimed?: number; // Div 43 deductions claimed → reduce cost base
  heldMonths: number;
  marginalRatePct?: number;     // owner's marginal rate incl Medicare (individual/trust)
  companyRatePct?: number;      // default 30
  isMainResidence?: boolean;
  mainResidenceExemptFraction?: number; // 0..1 (1 = fully exempt; partial via 6-year rule)
  priorCapitalLosses?: number;
  foreignResident?: boolean;
}

export interface DisposalResult {
  capitalProceeds: number;
  costBase: number;
  grossGain: number;            // proceeds − cost base (can be negative = loss)
  capitalLoss: number;          // positive when a loss is made this disposal
  mainResidenceExempt: number;
  lossesApplied: number;
  gainAfterLossesAndExempt: number;
  discountPct: number;
  discountAmount: number;
  taxableGain: number;
  cgtPayable: number;
  frcgwWithheld: number;        // credited against cgtPayable for foreign residents
  netProceedsAfterCgt: number;  // capitalProceeds − cgtPayable
  effectiveCgtRatePct: number;  // cgtPayable / grossGain
  notes: string[];
}

const money = (v: number) => (v < 0 ? "-$" : "$") + Math.abs(Math.round(v)).toLocaleString("en-AU");
const r2 = (v: number) => Math.round(v * 100) / 100;

export function disposalCgt(inp: DisposalInputs): DisposalResult {
  const notes: string[] = [];
  const sellingCosts = inp.sellingCosts ?? 0;
  const capitalProceeds = inp.salePrice - sellingCosts;

  const costBase =
    inp.purchasePrice
    + (inp.acquisitionCosts ?? 0)
    + (inp.capitalImprovements ?? 0)
    + (inp.thirdElementHoldingCosts ?? 0)
    - (inp.capitalWorksClaimed ?? 0);

  const grossGain = capitalProceeds - costBase;
  if ((inp.capitalWorksClaimed ?? 0) > 0) notes.push(`Cost base reduced by ${money(inp.capitalWorksClaimed ?? 0)} of capital-works (Div 43) deductions claimed`);

  // Capital loss case — no discount; carries forward.
  if (grossGain <= 0) {
    const capitalLoss = -grossGain;
    notes.push(`Capital loss of ${money(capitalLoss)} — carries forward to offset future capital gains (no CGT payable)`);
    return {
      capitalProceeds, costBase, grossGain, capitalLoss, mainResidenceExempt: 0, lossesApplied: 0,
      gainAfterLossesAndExempt: 0, discountPct: 0, discountAmount: 0, taxableGain: 0, cgtPayable: 0,
      frcgwWithheld: inp.foreignResident ? r2(inp.salePrice * 0.15) : 0,
      netProceedsAfterCgt: capitalProceeds, effectiveCgtRatePct: 0, notes,
    };
  }

  // Main residence exemption (removed for foreign residents from 2020).
  let mainResidenceExempt = 0;
  if (inp.isMainResidence && !inp.foreignResident) {
    const frac = Math.max(0, Math.min(1, inp.mainResidenceExemptFraction ?? 1));
    mainResidenceExempt = grossGain * frac;
    if (frac >= 1) notes.push("Main residence — fully exempt from CGT");
    else notes.push(`Main residence — ${Math.round(frac * 100)}% exempt (partial / 6-year rule); ${money(grossGain - mainResidenceExempt)} assessable`);
  } else if (inp.isMainResidence && inp.foreignResident) {
    notes.push("Main residence exemption not available to foreign residents (removed from 2020)");
  }
  const afterExempt = grossGain - mainResidenceExempt;

  // Prior capital losses applied BEFORE the discount.
  const lossesApplied = Math.min(inp.priorCapitalLosses ?? 0, Math.max(0, afterExempt));
  if (lossesApplied > 0) notes.push(`Applied ${money(lossesApplied)} of carried-forward capital losses before the discount`);
  const gainAfterLossesAndExempt = Math.max(0, afterExempt - lossesApplied);

  // CGT discount.
  const heldOver12m = inp.heldMonths >= 12;
  const discountEligible = heldOver12m && !inp.foreignResident && inp.entityType !== "company";
  let discountPct = 0;
  if (discountEligible) discountPct = inp.entityType === "smsf" ? 100 / 3 : 50;
  if (!heldOver12m) notes.push("Held under 12 months — no CGT discount");
  else if (inp.foreignResident) notes.push("Foreign resident — no CGT discount (removed for gains after 8 May 2012)");
  else if (inp.entityType === "company") notes.push("Company — no CGT discount");
  else notes.push(`${inp.entityType === "smsf" ? "SMSF — 1/3" : "50%"} CGT discount (held >12 months)`);

  const discountAmount = gainAfterLossesAndExempt * discountPct / 100;
  const taxableGain = gainAfterLossesAndExempt - discountAmount;

  // CGT payable by entity.
  let cgtPayable: number;
  if (inp.entityType === "company") cgtPayable = taxableGain * (inp.companyRatePct ?? 30) / 100;
  else if (inp.entityType === "smsf") cgtPayable = taxableGain * 15 / 100;
  else cgtPayable = taxableGain * (inp.marginalRatePct ?? 39) / 100;

  const frcgwWithheld = inp.foreignResident ? r2(inp.salePrice * 0.15) : 0;
  if (inp.foreignResident) notes.push(`Foreign Resident Capital Gains Withholding: 15% of the sale price (${money(frcgwWithheld)}) withheld at settlement, credited against the CGT above`);

  return {
    capitalProceeds, costBase, grossGain, capitalLoss: 0, mainResidenceExempt, lossesApplied,
    gainAfterLossesAndExempt, discountPct: r2(discountPct), discountAmount: r2(discountAmount),
    taxableGain: r2(taxableGain), cgtPayable: r2(cgtPayable), frcgwWithheld,
    netProceedsAfterCgt: r2(capitalProceeds - cgtPayable),
    effectiveCgtRatePct: grossGain > 0 ? r2((cgtPayable / grossGain) * 100) : 0,
    notes,
  };
}

/** Map an entity record's kind to a CGT entity class. */
export function cgtEntityOf(kind?: string): CgtEntity {
  const k = (kind ?? "").toLowerCase();
  if (k.includes("smsf") || k.includes("super")) return "smsf";
  if (k.includes("company")) return "company";
  if (k.includes("trust")) return "trust";
  if (k.includes("joint")) return "joint";
  return "individual";
}
