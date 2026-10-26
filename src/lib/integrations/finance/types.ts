/* Finance integration — the shapes the FinanceProvider speaks in. Kept
   provider-agnostic so Quickli (or any other servicing engine) implements the
   same contract. */

export interface ServiceabilityRequest {
  grossIncome: number;             // annual household gross
  existingDebtRepayments: number;  // annual commitments on existing debt
  deposit: number;                 // cash/equity available
  livingExpenses?: number;         // annual; HEM estimate used when absent
  dependents?: number;
  rentalIncome?: number;           // annual rent on the proposed property
  interestRatePct?: number;        // product rate (a default is used when absent)
}

export interface LenderAssessment {
  lender: string;
  maxBorrow: number;
  maxPropertyPrice: number;        // maxBorrow + deposit
  assessmentRatePct: number;
  notes?: string;
}

export interface ServiceabilityResult {
  assessments: LenderAssessment[]; // sorted, highest capacity first
  bestFit: LenderAssessment;
  source: string;                  // which provider produced this
  disclaimer: string;
  _provenance?: unknown;
}
