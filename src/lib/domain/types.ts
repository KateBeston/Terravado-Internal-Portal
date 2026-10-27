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
/* Deep financial modelling inputs — the prototype's modelling depth, persisted
   on the property and fed to the engine when the property is modelled. Any
   field left unset falls back to the engine's standard assumptions. */
export interface PropertyExpense { name?: string; amount?: number; freq?: string; ded?: boolean; }
export interface CapexEvent { year?: number; name?: string; cost?: number; upliftPct?: number; rentUplift?: number; }
export interface PropertyModelling {
  // Income & tenancy
  otherIncome?: number; pmFeePct?: number; lettingWeeks?: number; vacancyWeeks?: number;
  // Loan structure
  repaymentType?: string; ioYears?: number; termYears?: number; offsetBalance?: number; annualPackageFee?: number;
  // Acquisition
  otherPurchaseCosts?: number; capitaliseLmi?: boolean;
  // Depreciation
  depMode?: string; plantValue?: number; constructionCost?: number;
  // Lists
  expenses?: PropertyExpense[];
  capex?: CapexEvent[];
}

export interface PropertyDetails {
  weeklyRent?: number;
  title?: PropertyTitle;
  locality?: PropertyLocality;
  physical?: PropertyPhysical;
  sales?: SaleRecord[];
  modelling?: PropertyModelling;
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

/* A lender / bank product's serviceability policy — the parameters the engine
   assesses borrowing capacity with. Manually set up per product, or (later)
   supplied live by Quickli. */
export interface LenderPolicy {
  // Assessment rate
  bufferPct?: number; floorPct?: number; varRate?: number; ioLoading?: number;
  // Income shading (%)
  rentShadePct?: number; otShadePct?: number; bonusShadePct?: number; commissionShadePct?: number; selfEmpShadePct?: number;
  ngAddBack?: boolean;
  // Living expenses (HEM)
  hemMonthly?: number; hemPerDependant?: number; hemIncomeScale?: number;
  // Debts
  cardAssessPct?: number; hecsAssessed?: boolean; existingDebtAssess?: string;
  // Caps
  maxLVR?: number; maxDTI?: number;
  // Fees
  estFee?: number; valFee?: number; annualFee?: number; lmiFactor?: number;
}

export interface Lender extends Entity {
  name: string;
  kind?: string;
  active?: boolean;
  policy?: LenderPolicy;
}

export type LodgementStatus = "prepared" | "submitted" | "conditional" | "approved" | "settled" | "declined" | "withdrawn";

/* A prepared deal handed toward the lending channel, with a status pipeline the
   broker/adviser tracks. `payload` is the deal-pack snapshot. */
export interface Lodgement extends Entity {
  clientId?: string;
  propertyId?: string;
  status: LodgementStatus;
  channel?: string;
  reference?: string;
  payload: Record<string, any>;
  notes?: string;
  updatedAt?: string;
}

export type BusinessDocStatus = "active" | "draft" | "archived";

export interface BusinessDocument extends Entity {
  title: string;
  category?: string;
  summary?: string;
  status?: BusinessDocStatus;
  link?: string;
  content?: string;
}
