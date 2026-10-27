/* Account type (persona) -> capabilities. Features are gated on CAPABILITIES,
   and the account type grants them — so a consultant who later adds a broker to
   the team can be granted broker capabilities without rewriting any checks.
   Core functionality (dashboard, modeller, clients, properties) is shared by
   everyone; the type adds or removes the rest. */

export type AccountType = "broker" | "consultant" | "buyers_agent" | "public";

export const ACCOUNT_TYPES: { value: AccountType; label: string; blurb: string }[] = [
  { value: "broker", label: "Mortgage broker", blurb: "Full serviceability, lender compare, bank data, lodgement and deal export." },
  { value: "consultant", label: "Investment consultant / adviser", blurb: "Modelling, portfolio, lender compare and advice — no lodgement." },
  { value: "buyers_agent", label: "Buyers agent", blurb: "Property sourcing, modelling and client portfolios." },
  { value: "public", label: "Public / end investor", blurb: "Self-serve modelling and portfolio only." },
];

export type Capability =
  | "modeller" | "portfolio" | "clients" | "properties" | "entities"
  | "lenders" | "finance" | "lodgement" | "bankData" | "dealExport"
  | "integrations" | "business";

/* Which capabilities each account type is granted. Everyone gets the shared
   core; the differences are lenders/finance/lodgement/bankData/dealExport and
   the admin-ish integrations/business sections. */
const CORE: Capability[] = ["modeller", "portfolio", "clients", "properties", "entities"];

const MATRIX: Record<AccountType, Capability[]> = {
  broker: [...CORE, "lenders", "finance", "lodgement", "bankData", "dealExport", "integrations", "business"],
  consultant: [...CORE, "lenders", "finance", "dealExport", "integrations", "business"],
  buyers_agent: [...CORE, "integrations", "business"],
  public: ["modeller", "portfolio", "properties"],
};

const DEFAULT_TYPE: AccountType = "broker";

export function normaliseAccountType(type?: string | null): AccountType {
  return type && type in MATRIX ? (type as AccountType) : DEFAULT_TYPE;
}

export function capabilitiesFor(type?: string | null): Capability[] {
  return MATRIX[normaliseAccountType(type)];
}

export function can(type: string | null | undefined, cap: Capability): boolean {
  return capabilitiesFor(type).includes(cap);
}

export function accountTypeLabel(type?: string | null): string {
  return ACCOUNT_TYPES.find((t) => t.value === normaliseAccountType(type))?.label ?? "Mortgage broker";
}
