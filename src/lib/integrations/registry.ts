/* Integration registry — the single source of truth for every external tool
   Terravado plugs into, whether it's connected (env configured) or running on a
   fallback, and what connecting it needs. Surfaced on the Integrations page. */
import { QUICKLI_CONFIGURED } from "./finance/quickli";
import { CORELOGIC_CONFIGURED } from "./property-data/corelogic";
import { SIMPOLOGY_CONFIGURED, NEXTGEN_CONFIGURED } from "./lodgement";
import { DOMAIN_CONFIGURED } from "./listings";
import { CDR_CONFIGURED } from "./bank-products";
import { BANK_DATA_CONFIGURED } from "./bank-data";
import { STOCK_EXTRACTION_CONFIGURED } from "./extraction";
import { GOOGLE_MAPS_CONFIGURED } from "./maps";

export interface IntegrationStatus {
  key: string;
  label: string;
  category: string;
  configured: boolean;
  envVar: string;
  fallback: string;
  enables: string;
  access: string;
}

export function integrationStatuses(): IntegrationStatus[] {
  return [
    {
      key: "quickli", label: "Quickli", category: "Serviceability / finance",
      configured: QUICKLI_CONFIGURED, envVar: "QUICKLI_API_KEY",
      fallback: "Manual lender products + Terravado engine",
      enables: "Live per-lender serviceability across Quickli's panel",
      access: "Partnership + API agreement (no public API)",
    },
    {
      key: "corelogic", label: "CoreLogic", category: "Property data",
      configured: CORELOGIC_CONFIGURED, envVar: "CORELOGIC_API_KEY",
      fallback: "Built-in indicative stub",
      enables: "Live suburb & property data (query-live, not stored)",
      access: "Commercial licence",
    },
    {
      key: "domain", label: "Domain", category: "Listings / property supply",
      configured: DOMAIN_CONFIGURED, envVar: "DOMAIN_API_KEY",
      fallback: "Manual property entry",
      enables: "On-market listings for property matching",
      access: "Domain API agreement (restrictive terms: no resale, onshore)",
    },
    {
      key: "googlemaps", label: "Google Maps", category: "Geography / imagery",
      configured: GOOGLE_MAPS_CONFIGURED, envVar: "NEXT_PUBLIC_GOOGLE_MAPS_KEY",
      fallback: "Link out to Google Maps (no embed); plain address input",
      enables: "Interactive map, satellite & street view, and Places address autocomplete on property entry",
      access: "Google Cloud project + billing (free tier); enable Maps JavaScript, Places, Maps Embed, Static Maps & Street View APIs; restrict the key by referrer",
    },
    {
      key: "cdr", label: "CDR Open Banking", category: "Lender product data",
      configured: CDR_CONFIGURED, envVar: "CDR_PRODUCTS_ENABLED",
      fallback: "Manually-entered lender rates & fees",
      enables: "Auto-refresh lender rates & fees from banks",
      access: "Public CDR Product APIs — no paid key; build the poller",
    },
    {
      key: "extraction", label: "AI stock-list extraction", category: "AI / document extraction",
      configured: STOCK_EXTRACTION_CONFIGURED, envVar: "STOCK_EXTRACTION_PROVIDER",
      fallback: "Paste-to-import with an editable confirm table",
      enables: "Upload a developer stock-list PDF and auto-extract proposed lot rows to confirm",
      access: "LLM API key (e.g. Anthropic); extract-then-confirm, not blind import",
    },
    {
      key: "bankdata", label: "Bank data (Open Banking)", category: "Client bank data / verification",
      configured: BANK_DATA_CONFIGURED, envVar: "BANK_DATA_PROVIDER",
      fallback: "Client-supplied statements + manual entry",
      enables: "Verified income, living expenses & liabilities straight into the client's Financials record",
      access: "Accredited CDR intermediary (Frollo/Basiq/illion), representative model; build on sandbox first, live needs the representative arrangement",
    },
    {
      key: "simpology", label: "Simpology", category: "Lodgement",
      configured: SIMPOLOGY_CONFIGURED, envVar: "SIMPOLOGY_API_KEY",
      fallback: "Export handoff (broker's own aggregator channel)",
      enables: "Direct lodge + status via Connect/SSI (LIXI-native)",
      access: "Partnership + API; production licence",
    },
    {
      key: "nextgen", label: "NextGen (ApplyOnline)", category: "Lodgement",
      configured: NEXTGEN_CONFIGURED, envVar: "NEXTGEN_API_KEY",
      fallback: "Export handoff (broker's own aggregator channel)",
      enables: "Direct lodge + status via ApplyOnline (60+ lenders)",
      access: "Partnership + API; production licence",
    },
  ];
}
