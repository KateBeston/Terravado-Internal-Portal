/* Built-in stub property-data provider — deterministic, clearly-indicative
   values so the seam works before the real sources (VG / ABS / Geoscape /
   Google) are connected. NOT sourced data. */
import { retentionOf } from "./retention";
import type { PropertyDataProvider } from "./provider";
import type { AddressLookup, SuburbSnapshot } from "./types";

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export const stubPropertyDataProvider: PropertyDataProvider = {
  name: "stub",
  async suburbSnapshot(locality: string, state: string): Promise<SuburbSnapshot> {
    const h = hash(locality.toLowerCase() + "|" + state.toLowerCase());
    return {
      locality,
      state,
      medianPrice: 550000 + (h % 900) * 1000,
      grossYieldPct: +(3 + (h % 35) / 10).toFixed(1),
      vacancyPct: +(0.5 + (h % 30) / 10).toFixed(1),
      annualGrowthPct: +(2 + (h % 60) / 10).toFixed(1),
      source: "stub",
      retention: retentionOf("stub"),
      asAt: new Date().toISOString().slice(0, 10),
      disclaimer:
        "Indicative placeholder — not sourced data. Replaced by the real providers " +
        "(Valuer-General / ABS / Geoscape / Google) once connected.",
    };
  },
  async lookupAddress(address: string): Promise<AddressLookup> {
    const h = hash(address.toLowerCase());
    return {
      address,
      lat: -33.86 + (h % 1000) / 10000,
      lng: 151.2 + (h % 1000) / 10000,
      source: "stub",
      retention: retentionOf("google-maps"),
    };
  },
};
