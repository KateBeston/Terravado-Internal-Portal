/* Integration registry — the single source of truth for every external tool
   Terravado plugs into, whether it's connected (env configured) or running on a
   fallback, and what connecting it needs. Surfaced on the Integrations page. */
import { QUICKLI_CONFIGURED } from "./finance/quickli";
import { CORELOGIC_CONFIGURED } from "./property-data/corelogic";
import { SIMPOLOGY_CONFIGURED, NEXTGEN_CONFIGURED } from "./lodgement";
import { DOMAIN_CONFIGURED } from "./listings";
import { CDR_CONFIGURED } from "./bank-products";

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
      key: "cdr", label: "CDR Open Banking", category: "Lender product data",
      configured: CDR_CONFIGURED, envVar: "CDR_PRODUCTS_ENABLED",
      fallback: "Manually-entered lender rates & fees",
      enables: "Auto-refresh lender rates & fees from banks",
      access: "Public CDR Product APIs — no paid key; build the poller",
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
