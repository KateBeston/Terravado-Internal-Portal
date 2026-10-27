/* Lender product-data seam. Banks publish their product reference data (rates,
   fees, features) through the public CDR Open Banking Product APIs — no paid key,
   no consent, no accreditation. When enabled this refreshes lender rates/fees
   automatically; until then those live on the manually-entered lender products.
   Server-side only. */
export const CDR_CONFIGURED = Boolean(process.env.CDR_PRODUCTS_ENABLED);

export interface BankProduct {
  lender: string; name: string;
  ratePct?: number; comparisonRatePct?: number; annualFee?: number;
  lvrMax?: number; source: string; asAt: string;
}
export interface BankProductsProvider {
  readonly name: string;
  list(): Promise<BankProduct[]>;
}

const noneBankProductsProvider: BankProductsProvider = {
  name: "none",
  async list() { return []; },
};

const cdrBankProductsProvider: BankProductsProvider = {
  name: "cdr",
  async list() {
    // TODO: poll each ADI's public CDR Product Reference Data endpoint, map to
    // BankProduct[], and refresh the lender products' rates/fees on a schedule.
    throw new Error("CDR product-data ingestion not enabled — public CDR Product APIs; set CDR_PRODUCTS_ENABLED and build the poller.");
  },
};

/** The active lender product-data provider — CDR when enabled, else none. */
export function getBankProductsProvider(): BankProductsProvider {
  return CDR_CONFIGURED ? cdrBankProductsProvider : noneBankProductsProvider;
}
