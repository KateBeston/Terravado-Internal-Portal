/* Per-source retention policy — how external property data may be stored is
   decided by each source's licence, not by one rule. Encoded here so the data
   layer can enforce it. See the project doc "Terravado — target architecture".  */
import type { Retention } from "./types";

export const SOURCE_RETENTION: Record<string, { retention: Retention; note: string }> = {
  "valuer-general": { retention: "store", note: "Primary settled-sales data — licensed to store and analyse." },
  "abs": { retention: "store", note: "Open data — store and compute freely." },
  "geoscape-gnaf": { retention: "store", note: "Open national address data — store freely." },
  "htag": { retention: "store", note: "API licence permits caching and redistribution with attribution." },
  "corelogic": {
    retention: "query-live",
    note: "Query on demand under licence; do not retain or build a derived dataset. A point-in-time snapshot into one client's report is use-to-serve-the-client, not dataset-building.",
  },
  "google-maps": {
    retention: "reference-only",
    note: "Store place_id and coordinates only; refetch Places/map content within the allowed window.",
  },
};

export function retentionOf(source: string): Retention {
  return SOURCE_RETENTION[source]?.retention ?? "query-live";
}

/** True when a value from this source may be written to the market-data store. */
export function mayStore(source: string): boolean {
  return retentionOf(source) === "store";
}
