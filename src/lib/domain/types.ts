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

/* Personal / demographic detail for a person record (the Details tab). The
   serviceability financials live in `finances`; this is who-they-are. */
export interface PersonDetails {
  firstName?: string; lastName?: string;
  dob?: string;                    // ISO date
  residency?: string;              // Citizen / Permanent resident / Visa
  maritalStatus?: string;          // Single / Married / De facto / ...
  addressLine?: string; suburb?: string; state?: string; postcode?: string;
  preferredContact?: string;       // Email / Phone / SMS
  occupation?: string;             // headline occupation (detail; employment sits in finances)
  idType?: string; idNumber?: string;  // e.g. Driver licence / Passport
}

/* The unified person record (since 0011). `roles` says what this person is —
   Borrower/applicant, Broker, Buyer's agent, Accountant, Solicitor, etc. — and
   drives which tabs the record shows. A person with the Borrower role is a
   "client" to the Modeller and carries `finances`. */
export const PERSON_ROLES = [
  "Borrower", "Mortgage broker", "Buyer's agent", "Accountant", "Solicitor",
  "Conveyancer", "Valuer", "Quantity surveyor", "Property manager", "Builder", "Referral partner", "Other",
] as const;

export interface Contact extends Entity {
  name: string;
  roles?: string[];
  role?: string;      // legacy single-role label (kept for existing data / display)
  firm?: string;
  email?: string;
  phone?: string;
  licence?: string;
  companyId?: string;
  notes?: string;
  finances?: ClientFinances;
  details?: PersonDetails;
}

/* A company / organisation in the adviser's network — agency, lender,
   conveyancer, accountant, developer, referral partner. Contacts link to one. */
export interface Company extends Entity {
  name: string;
  kind?: string;
  abn?: string;
  phone?: string;
  email?: string;
  website?: string;
  notes?: string;
}

/* A client ownership entity — the trust/company/SMSF that holds the property
   for tax and structuring (used by land-tax aggregation). */
export interface OwnershipEntity extends Entity {
  clientId?: string;
  name: string;
  kind?: string;   // Individual / Company / Trust / SMSF / Partnership
  region?: string; // state of the entity
  abn?: string;
  notes?: string;
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

/* A document recorded against a person (the Legal tab). `storagePath` holds a
   link or location string for now; file upload to Supabase Storage comes later. */
export interface PersonDocument extends Entity {
  clientId?: string;
  name: string;
  kind?: string;
  storagePath?: string;
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
