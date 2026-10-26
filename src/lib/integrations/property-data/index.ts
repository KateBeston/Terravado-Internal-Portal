import type { PropertyDataProvider } from "./provider";
import { stubPropertyDataProvider } from "./stub";
import { CORELOGIC_CONFIGURED, corelogicPropertyDataProvider } from "./corelogic";

/** The active property-data provider. CoreLogic when configured, else the
    indicative stub. Primary/open sources (VG, ABS, Geoscape) slot in here too,
    each governed by its retention policy. */
export function getPropertyDataProvider(): PropertyDataProvider {
  return CORELOGIC_CONFIGURED ? corelogicPropertyDataProvider : stubPropertyDataProvider;
}

export { SOURCE_RETENTION, retentionOf, mayStore } from "./retention";
export type { PropertyDataProvider } from "./provider";
export type { SuburbSnapshot, AddressLookup, Retention } from "./types";
