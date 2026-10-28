import type { AddressLookup, PropertyAttributes, SuburbSnapshot } from "./types";

/** The property-data seam. Primary/open sources (VG, ABS, Geoscape), CoreLogic,
    or the built-in stub each implement this. The retention policy on the result
    tells the caller whether the value may be stored. */
export interface PropertyDataProvider {
  readonly name: string;
  suburbSnapshot(locality: string, state: string): Promise<SuburbSnapshot>;
  lookupAddress(address: string): Promise<AddressLookup>;
  propertyAttributes(address: string, state: string): Promise<PropertyAttributes>;
}
