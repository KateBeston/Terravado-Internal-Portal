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

/* The unified entity/company record (since 0012). One record for every
   organisation or structure: a company, trust, SMSF or partnership that holds
   property, or a network org — agency, lender, conveyancer, accountant,
   developer. `kind` is the type; people link to it through EntityMember with a
   role, and a property's ownership can be attributed to it (properties.entityId). */
export interface OwnershipEntity extends Entity {
  clientId?: string;   // optional primary client association
  name: string;
  kind?: string;       // see ENTITY_TYPES
  region?: string;     // state of the entity
  abn?: string;
  phone?: string;
  email?: string;
  website?: string;
  notes?: string;
}

/* A person's membership of an entity, carrying their role (director, trustee,
   beneficiary, member, client-of...). The person<->entity many-to-many. */
export interface EntityMember extends Entity {
  entityId?: string;
  contactId?: string;
  role?: string;
  isPrimary?: boolean;
  maySign?: boolean;
  startedAt?: string;
  endedAt?: string;
  notes?: string;
}

export const ENTITY_TYPES = [
  "Individual", "Joint", "Company", "Trust", "SMSF", "Partnership",
  "Agency", "Lender", "Conveyancer", "Accountant", "Developer", "Referral partner", "Buyers agent", "Other",
] as const;

export const MEMBER_ROLES = [
  "Director", "Secretary", "Shareholder", "Trustee", "Beneficiary", "Appointor",
  "Member", "Partner", "Public officer", "Signatory", "Client", "Accountant", "Solicitor", "Other",
] as const;

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
  lat?: number; lng?: number; placeId?: string;   // from Google Places (address identifier)
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

/* Depreciation schedule line items (from a quantity surveyor's report).
   Div 43 — capital works (the building), written off at 2.5% p.a. over 40 years.
   Div 40 — plant & equipment (removable assets), written off over each asset's
   effective life by prime cost or diminishing value. */
export const DIV40_METHODS = ["Diminishing value", "Prime cost"] as const;
export interface Div43Line { name?: string; amount?: number; yearsClaimed?: number; }
export interface Div40Line { name?: string; value?: number; life?: number; method?: string; }

export interface PropertyModelling {
  // Income & tenancy
  otherIncome?: number; pmFeePct?: number; lettingWeeks?: number; vacancyWeeks?: number;
  // Loan structure
  repaymentType?: string; ioYears?: number; termYears?: number; offsetBalance?: number; annualPackageFee?: number;
  // Acquisition
  otherPurchaseCosts?: number; capitaliseLmi?: boolean;
  // Depreciation — "assumed" (estimate), "schedule" (QS report) or "none"
  depMode?: string; plantValue?: number; constructionCost?: number; buildRate?: number;
  div43?: Div43Line[]; div40?: Div40Line[]; scrapYear?: number; scrapValue?: number;
  // Lists
  expenses?: PropertyExpense[];
  capex?: CapexEvent[];
}

/* Land-tax inputs. Unimproved land value is the figure the state revenue office
   assesses (from the rates/land-tax notice), not the purchase price — so it is
   entered, not derived. PPOR holdings are exempt and excluded from the aggregate. */
export interface PropertyTax {
  landValueManual?: number;   // unimproved land value (VG / revenue office)
  isPPOR?: boolean;           // principal place of residence — exempt
}

/* A valuation event on the property. Lenders assess LVR on the LOWER of the
   contract price and the valuation, so a valuation under contract is funded by
   the borrower — the variance is the number that matters for finance. */
export const VALUATION_TYPES = ["Bank valuation (full)", "Desktop", "Kerbside", "AVM / automated", "Independent / sworn", "Contract price"] as const;
export interface Valuation {
  date?: string;
  type?: string;
  valuer?: string;   // valuer firm or lender who ordered it
  value?: number;
  basis?: string;    // "as is", "on completion", "market value"
  note?: string;
}

export interface PropertyDetails {
  weeklyRent?: number;
  title?: PropertyTitle;
  locality?: PropertyLocality;
  physical?: PropertyPhysical;
  sales?: SaleRecord[];
  valuations?: Valuation[];
  modelling?: PropertyModelling;
  tax?: PropertyTax;
  currentLoanBalance?: number;   // actual outstanding loan today; when set, the equity chain uses it instead of the modelled balance
}

export interface Property extends Entity {
  address: string;
  state?: string;
  price?: number;
  status?: PropertyStatus;
  clientId?: string;
  entityId?: string;   // ownership attributed to an entity (trust/SMSF/company)
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

/* A developer project the advisor has stock in. Commission arrangement lives
   here for the commission calculator; the stock list PDF is referenced by URL
   for now (file upload to storage later). */
export interface Development extends Entity {
  name: string;
  developer?: string;
  suburb?: string;
  state?: string;
  region?: string;
  description?: string;
  commissionPct?: number;
  commissionFlat?: number;
  stockListUrl?: string;
  status?: string;   // active / sold_out / archived
  notes?: string;
}

/* A saved development feasibility study. The whole feasibility model (land,
   product mix, cost stack, funding, GST) is held in `data` as the engine's
   Feasibility object; engine.feasibility(data) computes the result. */
export interface FeasibilityRecord extends Entity {
  name?: string;
  data: Record<string, unknown>;
}

/* An entry in the Data Sources activity log — a check or refresh of an external
   data source and whether it ran live or fell back. */
export interface DataSourceEvent extends Entity {
  sourceKey?: string;
  status?: string;   // live / fallback / error / disabled
  detail?: string;
}

export const LOT_STATUS = ["available", "under_offer", "sold", "settled", "withdrawn"] as const;

/* One lot / property of stock under a development. Carries the marketed figures
   (advertised rent/yield/ROI) alongside price and stage; the Modeller and the
   matching engine read these. */
export interface Lot extends Entity {
  developmentId?: string;
  lotNumber?: string;
  address?: string;
  stage?: string;
  price?: number;
  status?: string;   // see LOT_STATUS
  beds?: number;
  baths?: number;
  cars?: number;
  landSize?: number;
  advertisedRent?: number;       // weekly
  advertisedYieldPct?: number;
  advertisedRoi?: string;
  notes?: string;
}

/* Advisor sales pipeline — a sale-in-progress of a lot (or labelled property)
   to a client, tracked by stage, with its commission. */
export const DEAL_STAGES = [
  "lead", "reserved", "awaiting_pre_approval", "awaiting_finance", "contract_exchanged",
  "awaiting_title_registration", "awaiting_settlement", "settled", "lost",
] as const;

export interface AdvisorDeal extends Entity {
  lotId?: string;
  developmentId?: string;
  clientId?: string;
  propertyLabel?: string;
  salePrice?: number;
  commissionPct?: number;
  commissionFlat?: number;
  stage?: string;
  expectedSettlement?: string;
  notes?: string;
  updatedAt?: string;
}

/** Commission payable on a deal — flat amount if set, else sale price × rate. */
export function commissionFor(d: AdvisorDeal): number {
  if (d.commissionFlat) return d.commissionFlat;
  if (d.commissionPct && d.salePrice) return (d.salePrice * d.commissionPct) / 100;
  return 0;
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
