/* ===========================================================================
   TERRAVADO — Assurance: provenance / traceability stamping (Layer 3)
   Every figure Terravado produces must be traceable to the engine version,
   the tax-data version it was computed against, and the moment it was run.
   Attach a stamp to any result or report snapshot so an adviser — or an
   auditor — can reproduce exactly what was shown and why.
   =========================================================================== */

import { ENGINE_VERSION, TAX_DATA } from "../engine/tax-data";

export interface Provenance {
  engineVersion: string;
  taxDataVersion: string;
  taxEffectiveFrom: string;
  taxSource: string;
  computedAt: string; // ISO 8601 timestamp
  assumptions?: Record<string, unknown>;
}

/** Build a provenance stamp for the current engine + tax-data version. */
export function provenance(assumptions?: Record<string, unknown>): Provenance {
  return {
    engineVersion: ENGINE_VERSION,
    taxDataVersion: TAX_DATA.version,
    taxEffectiveFrom: TAX_DATA.effectiveFrom,
    taxSource: TAX_DATA.source,
    computedAt: new Date().toISOString(),
    ...(assumptions ? { assumptions } : {}),
  };
}

/** Return a copy of `result` carrying a `_provenance` stamp (non-mutating). */
export function stamp<T extends object>(
  result: T,
  assumptions?: Record<string, unknown>,
): T & { _provenance: Provenance } {
  return { ...result, _provenance: provenance(assumptions) };
}

/** One-line, human-readable provenance label for a report footer. */
export function provenanceLabel(p: Provenance = provenance()): string {
  return `Terravado ${p.engineVersion} · tax ${p.taxDataVersion} (from ${p.taxEffectiveFrom}) · computed ${p.computedAt.slice(0, 19).replace("T", " ")} UTC`;
}
