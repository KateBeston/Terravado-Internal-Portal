/* Listings / property-supply seam. Domain is the reachable path (on-market
   stock) for property matching. Config-gated: with a Domain key the real
   provider is used; without one the app relies on manually-entered properties.
   Server-side only. */
export const DOMAIN_CONFIGURED = Boolean(process.env.DOMAIN_API_KEY);

export interface ListingQuery {
  suburb?: string; state?: string; postcode?: string;
  minPrice?: number; maxPrice?: number; beds?: number; propertyType?: string;
}
export interface Listing {
  address: string; price?: number; beds?: number; baths?: number; cars?: number;
  propertyType?: string; url?: string; source: string;
}
export interface ListingsProvider {
  readonly name: string;
  search(query: ListingQuery): Promise<Listing[]>;
}

const noneListingsProvider: ListingsProvider = {
  name: "none",
  async search() { return []; },
};

const domainListingsProvider: ListingsProvider = {
  name: "domain",
  async search() {
    // TODO: call Domain's listings API with DOMAIN_API_KEY (restrictive terms:
    // no resale, onshore hosting). Map results to Listing[]. Server-side only.
    throw new Error("Domain listings not enabled — requires a Domain API agreement and key (DOMAIN_API_KEY).");
  },
};

/** The active listings provider — Domain when keyed, else none (manual entry). */
export function getListingsProvider(): ListingsProvider {
  return DOMAIN_CONFIGURED ? domainListingsProvider : noneListingsProvider;
}
