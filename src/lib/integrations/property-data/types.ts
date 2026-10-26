/* Property-data integration shapes. Every value carries its source and the
   retention policy that governs whether Terravado may store it. */

export type Retention = "store" | "query-live" | "reference-only";

export interface SuburbSnapshot {
  locality: string;
  state: string;
  medianPrice?: number;
  grossYieldPct?: number;
  vacancyPct?: number;
  annualGrowthPct?: number;
  source: string;
  retention: Retention;
  asAt: string; // ISO date the data is as-at
  disclaimer: string;
}

export interface AddressLookup {
  address: string;
  lat?: number;
  lng?: number;
  source: string;
  retention: Retention;
}
