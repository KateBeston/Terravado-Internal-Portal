/* Bank-data seam — the CONSUMER side of open banking: a client consents to
   share their bank-account and transaction data so income, living expenses and
   liabilities can be verified straight into their Financials record.
   Server-side only.

   This is distinct from the bank-PRODUCTS seam (public product reference data,
   no consent). Consumer data is gated: the banks only release it to an
   Accredited Data Recipient or its representative under the CDR rules. The
   practical path is an accredited intermediary (Frollo / Basiq / illion) under
   the representative model — Terravado never holds its own accreditation.

   Everything above this seam is built and ready now; wiring a live provider is a
   later switch (build against the provider sandbox first, go live on the
   representative arrangement). Until BANK_DATA_PROVIDER is set, the fallback
   returns "not connected" and the record falls back to client-supplied
   statements. */

export const BANK_DATA_PROVIDER = process.env.BANK_DATA_PROVIDER ?? ""; // "frollo" | "basiq" | "illion"
export const BANK_DATA_CONFIGURED = Boolean(BANK_DATA_PROVIDER);
/** Sandbox vs live — build against the provider's test environment with no
    accreditation and no real customer data; live needs the representative step. */
export const BANK_DATA_MODE = (process.env.BANK_DATA_MODE ?? "sandbox") as "sandbox" | "live";

export interface BankConnection {
  id: string;
  contactId: string;          // the person (Financials record) this consent belongs to
  institution?: string;
  status: "pending" | "active" | "expired" | "revoked";
  consentExpiry?: string;     // CDR consents are time-boxed
  createdAt: string;
}

/* A snapshot derived from the consented data, shaped to drop straight into the
   person's Financials record (income lines, liability lines, verified living
   expenses). Amounts annual unless the name says monthly. */
export interface BankDataSnapshot {
  connectionId: string;
  asAt: string;
  income: { type: string; amountAnnual: number; source?: string; confidence?: number }[];
  liabilities: { type: string; balance?: number; limit?: number; repaymentMonthly?: number; lender?: string }[];
  livingExpensesMonthly?: number;   // verified from categorised spend
  undisclosedDebts?: string[];      // facilities seen in transactions but not declared
  source: string;
  disclaimer: string;
}

export interface BankDataProvider {
  readonly name: string;
  /** Begin a consent — returns a connection plus the URL the client is sent to
      (the provider's hosted consent flow). */
  startConnection(contactId: string): Promise<{ connection: BankConnection; consentUrl: string }>;
  /** Pull a derived, assessment-ready snapshot once consent is active. */
  getSnapshot(connectionId: string): Promise<BankDataSnapshot>;
}

/* Fallback — nothing connected. The Financials record keeps running on
   client-supplied statements and manual entry. */
const noneBankDataProvider: BankDataProvider = {
  name: "none",
  async startConnection() {
    throw new Error(
      "Bank-data connection not enabled. Set BANK_DATA_PROVIDER (frollo|basiq|illion) and the provider keys. " +
      "Until then, capture income/liabilities manually or from client-supplied statements.",
    );
  },
  async getSnapshot() {
    throw new Error("Bank-data connection not enabled — no snapshot available.");
  },
};

/* Live provider — an accredited CDR intermediary under the representative model.
   Implemented against the provider's SDK/REST when BANK_DATA_PROVIDER is set.
   Scaffolded now so the flow (consent, webhook, snapshot → Financials record) is
   ready; sandbox needs no accreditation, live needs the representative step. */
const intermediaryBankDataProvider: BankDataProvider = {
  name: BANK_DATA_PROVIDER || "intermediary",
  async startConnection(_contactId: string) {
    // TODO: call the provider (Frollo/Basiq/illion) to create a consent and
    // return its hosted consent URL; persist the BankConnection.
    throw new Error(
      `Bank-data provider "${BANK_DATA_PROVIDER}" selected (${BANK_DATA_MODE}) but not implemented. ` +
      "Build against the provider sandbox; live connection requires the representative arrangement.",
    );
  },
  async getSnapshot(_connectionId: string) {
    // TODO: fetch accounts + transactions via the provider, categorise, and map
    // to BankDataSnapshot (income lines, liabilities, verified living expenses).
    throw new Error(`Bank-data provider "${BANK_DATA_PROVIDER}" not implemented yet.`);
  },
};

/** The active bank-data provider — the accredited intermediary when configured,
    else the "none" fallback (client-supplied statements). */
export function getBankDataProvider(): BankDataProvider {
  return BANK_DATA_CONFIGURED ? intermediaryBankDataProvider : noneBankDataProvider;
}
