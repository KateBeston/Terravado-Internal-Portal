/* ===========================================================================
   SMART SEARCH — build a property record from its address
   ---------------------------------------------------------------------------
   The property-record analog of TGS's Sanctum Smart Search. Given an address it
   fans out across the integration seams and assembles a pre-filled property
   record: geocode (lat/lng), suburb data, property attributes & value (RP data)
   and title particulars (land registry). Each source is called independently and
   wrapped, so one unavailable provider degrades to a gap rather than failing the
   whole search. Every source is reported back with whether it ran live or on the
   indicative stub, so nothing is presented as sourced data when it isn't.
   =========================================================================== */
import { getPropertyDataProvider } from "./property-data";
import { getTitlesProvider } from "./titles";
import type { PropertyDetails, PropertyLocality } from "@/lib/domain/types";

export interface SmartSource { label: string; provider: string; ok: boolean; live: boolean; }
export interface SmartSearchInput {
  address: string;
  state?: string;
  placeFields?: Record<string, unknown>;   // from Google Places (localityFromGeo)
}
export interface SmartSearchResult {
  core: { address: string; state: string; price?: number };
  details: PropertyDetails;
  sources: SmartSource[];
  disclaimers: string[];
}

export async function smartSearchProperty(input: SmartSearchInput): Promise<SmartSearchResult> {
  const pd = getPropertyDataProvider();
  const titles = getTitlesProvider();
  const pf = input.placeFields ?? {};
  const state = (pf.region as string) || input.state || "NSW";
  const pdLive = pd.name !== "stub";
  const titlesLive = titles.name !== "stub";

  const sources: SmartSource[] = [];
  const disclaimers: string[] = [];
  const details: PropertyDetails = {};
  let price: number | undefined;

  // Geo baseline from Google Places, when the address was picked from autocomplete.
  const loc: PropertyLocality = {};
  if (pf.lat !== undefined) loc.lat = pf.lat as number;
  if (pf.lng !== undefined) loc.lng = pf.lng as number;
  if (pf.placeId) loc.placeId = pf.placeId as string;
  if (pf.suburb) loc.suburb = pf.suburb as string;
  if (pf.region) loc.region = pf.region as string;
  if (pf.postcode) loc.postcode = pf.postcode as string;

  // 1) Geocode — only when Places didn't already give coordinates.
  if (loc.lat === undefined) {
    try {
      const a = await pd.lookupAddress(input.address);
      if (a.lat !== undefined) { loc.lat = a.lat; loc.lng = a.lng; }
      sources.push({ label: "Geocode (lat/lng)", provider: a.source, ok: true, live: a.source !== "stub" });
    } catch { sources.push({ label: "Geocode (lat/lng)", provider: pd.name, ok: false, live: pdLive }); }
  } else {
    sources.push({ label: "Geocode (lat/lng)", provider: "google-places", ok: true, live: true });
  }

  // 2) Suburb data.
  try {
    const locality = loc.suburb || loc.locality || input.address;
    const snap = await pd.suburbSnapshot(locality, state);
    loc.suburbMedian = snap.medianPrice;
    loc.vacancyPct = snap.vacancyPct;
    loc.annualGrowthPct = snap.annualGrowthPct;
    loc.source = snap.source;
    loc.asAt = snap.asAt;
    disclaimers.push(snap.disclaimer);
    sources.push({ label: "Suburb data", provider: snap.source, ok: true, live: snap.source !== "stub" });
  } catch { sources.push({ label: "Suburb data", provider: pd.name, ok: false, live: pdLive }); }

  // 3) Property attributes & value (RP data).
  try {
    const attr = await pd.propertyAttributes(input.address, state);
    details.physical = {
      type: attr.propertyType, beds: attr.beds, baths: attr.baths, cars: attr.cars,
      landSize: attr.landSize, buildYear: attr.buildYear,
    };
    if (attr.landValue) details.tax = { landValueManual: attr.landValue };
    price = attr.estimatedValue;
    if (attr.estimatedValue) {
      details.valuations = [{ date: attr.asAt, type: "AVM / automated", valuer: attr.source, value: attr.estimatedValue, basis: "market value", note: "Auto estimate from Smart Search" }];
    }
    disclaimers.push(attr.disclaimer);
    sources.push({ label: "Property attributes & value (RP data)", provider: attr.source, ok: true, live: attr.source !== "stub" });
  } catch { sources.push({ label: "Property attributes & value (RP data)", provider: pd.name, ok: false, live: pdLive }); }

  // 4) Title particulars (land registry).
  try {
    const t = await titles.lookupTitle(input.address, state);
    details.title = { titleRef: t.titleReference, lotDp: t.lotPlan, zoning: t.zoning };
    if (t.landArea && !details.physical?.landSize) details.physical = { ...(details.physical ?? {}), landSize: t.landArea };
    disclaimers.push(t.disclaimer);
    sources.push({ label: "Title particulars (land registry)", provider: t.source, ok: true, live: t.source !== "stub" });
  } catch { sources.push({ label: "Title particulars (land registry)", provider: titles.name, ok: false, live: titlesLive }); }

  details.locality = loc;
  return { core: { address: input.address, state, price }, details, sources, disclaimers: [...new Set(disclaimers)] };
}
