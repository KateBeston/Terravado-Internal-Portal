/* Lender product-data seam. Banks publish their product reference data (rates,
   fees, features) through the public CDR Product Reference Data (PRD) APIs — no
   key, no consent, no accreditation. CDR is federated: each ADI exposes its own
   base URI, so we poll a configurable list of banks, pull residential-mortgage
   products and read a representative rate/fee from the product detail. Runs
   server-side at request time, cached, and degrades to an empty list (never
   errors) if a bank is unreachable. Live by default; CDR_PRODUCTS_ENABLED=off
   disables it, CDR_BANKS overrides the bank list. */
export const CDR_CONFIGURED = process.env.CDR_PRODUCTS_ENABLED !== "off";

export interface BankProduct {
  lender: string; name: string;
  ratePct?: number; comparisonRatePct?: number; annualFee?: number;
  lvrMax?: number; source: string; asAt: string;
}
export interface BankProductsResult {
  products: BankProduct[];
  banksTried: number;
  banksReturned: number;
  source: string;
  asAt: string;
  note: string;
}
export interface BankProductsProvider {
  readonly name: string;
  list(): Promise<BankProduct[]>;
  fetchAll(): Promise<BankProductsResult>;
}

interface BankRef { brand: string; base: string }
/* Best-effort public CDR PRD base URIs for the majors. Override with CDR_BANKS,
   a JSON array of { "brand": "...", "base": "https://.../" } — the products
   endpoint is <base>/cds-au/v1/banking/products. */
const DEFAULT_BANKS: BankRef[] = [
  { brand: "CommBank", base: "https://api.commbank.com.au/public" },
  { brand: "NAB", base: "https://openbank.api.nab.com.au" },
  { brand: "ANZ", base: "https://api.anz" },
  { brand: "Westpac", base: "https://digital-api.westpac.com.au" },
  { brand: "Macquarie", base: "https://api.macquariebank.io" },
];
function banks(): BankRef[] {
  const raw = process.env.CDR_BANKS;
  if (!raw) return DEFAULT_BANKS;
  try { const j = JSON.parse(raw); return Array.isArray(j) ? j : DEFAULT_BANKS; } catch { return DEFAULT_BANKS; }
}

const noneBankProductsProvider: BankProductsProvider = {
  name: "none",
  async list() { return []; },
  async fetchAll() { return { products: [], banksTried: 0, banksReturned: 0, source: "none", asAt: "", note: "CDR product data is disabled (CDR_PRODUCTS_ENABLED=off)." }; },
};

async function getJson(url: string, version: string): Promise<any | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 7000);
    const r = await fetch(url, { headers: { "x-v": version, accept: "application/json" }, signal: ctrl.signal, next: { revalidate: 21600 } });
    clearTimeout(t);
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

/* Pull residential-mortgage products for one bank and read a representative
   variable rate + annual fee from the first couple of products' detail. */
async function fetchBank(b: BankRef): Promise<BankProduct[]> {
  const listUrl = `${b.base.replace(/\/$/, "")}/cds-au/v1/banking/products?product-category=RESIDENTIAL_MORTGAGES&page-size=25`;
  const listJson = await getJson(listUrl, "3");
  const products: any[] = listJson?.data?.products ?? [];
  if (!products.length) return [];
  const out: BankProduct[] = [];
  for (const p of products.slice(0, 2)) {
    const detUrl = `${b.base.replace(/\/$/, "")}/cds-au/v1/banking/products/${encodeURIComponent(p.productId)}`;
    const det = await getJson(detUrl, "4");
    const d = det?.data ?? {};
    const rates: any[] = d.lendingRates ?? [];
    const variable = rates.find((x) => String(x.lendingRateType).toUpperCase() === "VARIABLE") ?? rates[0];
    const fees: any[] = d.fees ?? [];
    const annual = fees.find((f) => /annual|package/i.test(String(f.name)) || String(f.feeType).toUpperCase() === "PERIODIC");
    out.push({
      lender: p.brand || b.brand,
      name: p.name ?? d.name ?? "Product",
      ratePct: variable?.rate !== undefined ? +(Number(variable.rate) * 100).toFixed(2) : undefined,
      comparisonRatePct: variable?.comparisonRate !== undefined ? +(Number(variable.comparisonRate) * 100).toFixed(2) : undefined,
      annualFee: annual?.amount !== undefined ? Number(annual.amount) : undefined,
      source: "CDR", asAt: new Date().toISOString().slice(0, 10),
    });
  }
  return out;
}

const cdrBankProductsProvider: BankProductsProvider = {
  name: "cdr",
  async list() { return (await this.fetchAll()).products; },
  async fetchAll(): Promise<BankProductsResult> {
    const list = banks();
    const settled = await Promise.allSettled(list.map((b) => fetchBank(b)));
    const products: BankProduct[] = [];
    let banksReturned = 0;
    for (const s of settled) {
      if (s.status === "fulfilled" && s.value.length) { banksReturned++; products.push(...s.value); }
    }
    return {
      products,
      banksTried: list.length,
      banksReturned,
      source: "CDR Product Reference Data (public)",
      asAt: new Date().toISOString().slice(0, 10),
      note: banksReturned
        ? `Live residential-mortgage products from ${banksReturned} of ${list.length} banks' public CDR endpoints.`
        : "No banks returned products — the public CDR base URIs are configurable via CDR_BANKS; confirm them against the ACCC CDR register.",
    };
  },
};

// Cache across requests (rates move slowly; PRD is polled, not real-time).
let cache: { at: number; data: BankProductsResult } | null = null;
const TTL = 6 * 60 * 60 * 1000;

export function getBankProductsProvider(): BankProductsProvider {
  return CDR_CONFIGURED ? cdrBankProductsProvider : noneBankProductsProvider;
}

/** Cached fetch for the page — avoids re-polling the banks on every request. */
export async function getBankProducts(): Promise<BankProductsResult> {
  if (cache && Date.now() - cache.at < TTL) return cache.data;
  const data = await getBankProductsProvider().fetchAll();
  cache = { at: Date.now(), data };
  return data;
}
