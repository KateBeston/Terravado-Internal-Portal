import type { Entity } from "@/lib/data/repository";

export type Role = "owner" | "admin" | "adviser" | "viewer";
export type PropertyStatus = "considering" | "owned" | "sold";

/* A client's financial position — drives serviceability when a property is
   modelled for this client. All annual figures unless the name says monthly. */
export interface ClientFinances {
  grossIncome?: number;        // annual gross, primary
  partnerIncome?: number;      // annual gross, partner
  livingExpMonthly?: number;   // declared monthly living expenses
  dependants?: number;
  monthlyCommitments?: number; // existing loan / other repayments per month
  cardLimits?: number;         // total credit-card limits
  hecsBalance?: number;        // HECS/HELP balance
}

export interface Client extends Entity {
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  finances?: ClientFinances;
}

export interface Contact extends Entity {
  name: string;
  role?: string;
  firm?: string;
  email?: string;
  phone?: string;
  licence?: string;
}

/* The full property record behind the tabbed detail view. Each sub-object is a
   tab; integrations (VG / ABS / Geoscape / CoreLogic / Domain) populate the
   same shape a person can enter by hand, stamped with its source. */
export interface Easement { type?: string; beneficiary?: string; width?: number; note?: string; }
export interface Encumbrance { type?: string; detail?: string; impact?: string; }
export interface SaleRecord { date?: string; price?: number; method?: string; note?: string; }

export interface PropertyTitle {
  titleRef?: string; lotDp?: string; zoning?: string;
  heritage?: boolean; heritageNote?: string;
  easements?: Easement[];
  encumbrances?: Encumbrance[];
}
export interface PropertyLocality {
  suburb?: string; locality?: string; region?: string; postcode?: string;
  suburbMedian?: number; suburbMedianRent?: number;
  vacancyPct?: number; daysToLease?: number; popGrowthPct?: number; annualGrowthPct?: number;
  transport?: string; notes?: string;
  source?: string; asAt?: string;
}
export interface PropertyPhysical {
  type?: string; beds?: number; baths?: number; cars?: number;
  landSize?: number; internalArea?: number; buildYear?: number;
  construction?: string; notes?: string;
}
export interface PropertyDetails {
  weeklyRent?: number;
  title?: PropertyTitle;
  locality?: PropertyLocality;
  physical?: PropertyPhysical;
  sales?: SaleRecord[];
}

export interface Property extends Entity {
  address: string;
  state?: string;
  price?: number;
  status?: PropertyStatus;
  clientId?: string;
  details?: PropertyDetails;
}

/* A saved modelling run, written to a client's file (append-only). The payload
   is a self-contained summary of the run so a saved run reads correctly even if
   the engine or tax tables move on. */
export interface RunSnapshotPayload {
  address: string; state: string; price: number; weeklyRent: number;
  depositPct: number; growthPct: number; ratePct: number;
  verdictBand: string; verdictScore: number;
  irr: number | null; weekly1: number; grossYield: number;
  valueEnd: number; equityEnd: number;
  loan: number; lvr: number; capacity: number; dti: number;
  stressVerdict: string; stressMargin: number;
}

export interface ReportSnapshot extends Entity {
  clientId?: string;
  title?: string;
  payload: RunSnapshotPayload;
  provenance?: { label?: string };
}

export type BusinessDocStatus = "active" | "draft" | "archived";

export interface BusinessDocument extends Entity {
  title: string;
  category?: string;
  summary?: string;
  status?: BusinessDocStatus;
  link?: string;
}
