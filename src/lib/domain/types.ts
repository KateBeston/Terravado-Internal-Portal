import type { Entity } from "@/lib/data/repository";

export type Role = "owner" | "admin" | "adviser" | "viewer";
export type PropertyStatus = "considering" | "owned" | "sold";

/* A person's financial position — the serviceability record. The legacy summary
   fields are what the Modeller assesses today; the structured lists below are
   the full detail (income by type, employment, assets, liabilities) and will
   feed the engine as the serviceability build deepens. */

/* An employment / income-source engagement. Time-in-role is derived from
   startDate at display time. */
export interface EmploymentRecord {
  id?: string;
  employer?: string;
  status?: string;      // Full-time / Part-time / Casual / Contract / Self-employed / Retired / Not employed
  basis?: string;       // PAYG / Self-employed
  occupation?: string;
  industry?: string;
  startDate?: string;   // ISO date
  current?: boolean;
  onProbation?: boolean;
  notes?: string;
}

/* One income line. `type` carries the serviceability treatment; self-employed
   lines use priorYearAmount (2-yr) and addBacks. */
export interface IncomeLine {
  id?: string;
  type?: string;        // see INCOME_TYPES
  owner?: string;       // Applicant / Partner
  amount?: number;
  frequency?: string;   // Annual / Monthly / Fortnightly / Weekly
  priorYearAmount?: number;  // self-employed: prior financial year
  addBacks?: number;         // self-employed: depreciation/interest/one-offs added back
  notes?: string;
}

export interface AssetLine {
  id?: string;
  type?: string;        // Property / Savings / Superannuation / Vehicle / Shares / Business / Other
  description?: string;
  value?: number;
  owner?: string;
}

export interface LiabilityLine {
  id?: string;
  type?: string;        // Home loan / Investment loan / Credit card / Personal loan / Car loan / HECS-HELP / BNPL / Other
  description?: string;
  limit?: number;       // for revolving facilities (cards, LOC)
  balance?: number;
  repayment?: number;
  frequency?: string;   // repayment frequency
  owner?: string;
}

export interface ClientFinances {
  // Legacy summary — the Modeller assesses these (annual unless named monthly).
  grossIncome?: number;
  partnerIncome?: number;
  livingExpMonthly?: number;
  dependants?: number;
  monthlyCommitments?: number;
  cardLimits?: number;
  hecsBalance?: number;
  // Structured detail.
  employment?: EmploymentRecord[];
  income?: IncomeLine[];
  assets?: AssetLine[];
  liabilities?: LiabilityLine[];
}

export const EMPLOYMENT_STATUS = ["Full-time", "Part-time", "Casual", "Contract", "Self-employed", "Retired", "Not employed"] as const;
export const EMPLOYMENT_BASIS = ["PAYG", "Self-employed"] as const;
export const INCOME_TYPES = [
  "PAYG base", "PAYG overtime", "PAYG bonus", "PAYG commission", "PAYG allowances",
  "Self-employed (sole trader)", "Self-employed (company)", "Self-employed (trust)",
  "Rental income", "Government pension", "Age pension", "Super / retiree drawdown",
  "Investment / dividends", "Child support / maintenance", "Other",
] as const;
export const INCOME_FREQ = ["Annual", "Monthly", "Fortnightly", "Weekly"] as const;
export const ASSET_TYPES = ["Property", "Savings / cash", "Superannuation", "Vehicle", "Shares / managed funds", "Business", "Other"] as const;
export const LIABILITY_TYPES = ["Home loan", "Investment loan", "Credit card", "Personal loan", "Car loan", "HECS-HELP", "BNPL", "Other"] as const;
export const OWNER_OPTS = ["Applicant", "Partner", "Joint"] as const;

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
