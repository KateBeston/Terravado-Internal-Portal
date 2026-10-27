import type { LodgementProvider } from "./provider";
import { mockLodgementProvider } from "./mock";
import { SIMPOLOGY_CONFIGURED, simpologyLodgementProvider } from "./simpology";
import { NEXTGEN_CONFIGURED, nextgenLodgementProvider } from "./nextgen";

/** The active lodgement provider — Simpology or NextGen when keyed, else the
    built-in export-handoff (prepare + validate; the broker lodges through their
    own aggregator channel). */
export function getLodgementProvider(): LodgementProvider {
  if (SIMPOLOGY_CONFIGURED) return simpologyLodgementProvider;
  if (NEXTGEN_CONFIGURED) return nextgenLodgementProvider;
  return mockLodgementProvider;
}

export { SIMPOLOGY_CONFIGURED } from "./simpology";
export { NEXTGEN_CONFIGURED } from "./nextgen";
export type { LodgementProvider } from "./provider";
export type { LodgementSubmission, LodgementValidation } from "./types";
