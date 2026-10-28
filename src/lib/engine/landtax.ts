/* ===========================================================================
   LAND TAX — portfolio aggregation (persisted-model helper)
   ---------------------------------------------------------------------------
   Land tax is assessed on UNIMPROVED LAND VALUE, aggregated per state AND per
   owning entity, with the tax-free threshold applied ONCE to the group total.
   The group liability is then apportioned back across the holdings by their
   land-value share. A principal place of residence is exempt and excluded.

   This is the single most commonly missed line in Australian property
   modelling: two sub-threshold holdings that each attract $0 standalone can
   attract thousands once aggregated under the one entity in the one state.

   This helper works off a lean holding shape built from the persisted records,
   so the portfolio page does not need the full modeller Property object. The
   NSW-trust no-threshold surcharge and foreign surcharge are FLAGGED, not
   computed here, because the persisted entity does not yet record the trust
   deed's foreign-person exclusion or an entity's foreign status — computing a
   surcharge off data we do not hold would be a fabricated number.
   =========================================================================== */
import { COUNTRIES } from "./tax-data";

export interface LandTaxHolding {
  id: string;
  label: string;
  region: string;        // state (NSW, VIC, …)
  landValue: number;     // unimproved land value; 0 / missing → excluded
  ownerKey: string;      // entity id, or a per-client "personal" key
  ownerName: string;
  ownerKind?: string;    // Individual / Joint / Company / Trust / SMSF / …
  isPPOR?: boolean;
  foreign?: boolean;             // foreign owner → surcharge land tax
  deedExcludesForeign?: boolean; // trust deed excludes foreign persons → avoids NSW trust surcharge
}

export interface LandTaxProp {
  id: string;
  label: string;
  landValue: number;
  share: number;         // 0..1 of the group's land value
  apportioned: number;   // this holding's slice of the group tax
  standalone: number;    // what it would attract assessed on its own
}

export interface LandTaxGroup {
  key: string;
  region: string;
  ownerName: string;
  ownerKind?: string;
  landValue: number;     // aggregate unimproved land value
  tax: number;           // group liability (threshold applied once, incl. surcharges)
  baseTax: number;       // land tax before surcharges
  trustSurcharge: number; // NSW trust no-threshold surcharge applied
  foreignSurcharge: number; // foreign-owner surcharge applied
  standalone: number;    // sum of each holding assessed alone
  props: LandTaxProp[];
  nswTrustFlag: boolean;  // NSW trust where the deed does not exclude foreign persons
}

export interface LandTaxResult {
  groups: LandTaxGroup[];
  byProp: Record<string, number>;   // property id → apportioned tax
  totalAggregated: number;
  totalStandalone: number;
  difference: number;                // aggregated − standalone (the aggregation cost)
  excluded: { id: string; label: string; reason: string }[];
}

export function aggregateLandTax(holdings: LandTaxHolding[], country = "AU"): LandTaxResult {
  const C = COUNTRIES[country] || COUNTRIES.AU;
  const groups: Record<string, LandTaxGroup> = {};
  const byProp: Record<string, number> = {};
  const excluded: { id: string; label: string; reason: string }[] = [];

  for (const h of holdings) {
    if (h.isPPOR) { byProp[h.id] = 0; excluded.push({ id: h.id, label: h.label, reason: "Principal place of residence (exempt)" }); continue; }
    if (!(h.landValue > 0)) { byProp[h.id] = 0; excluded.push({ id: h.id, label: h.label, reason: "No unimproved land value set" }); continue; }
    const key = h.region + "|" + h.ownerKey;
    const isNswTrustSurcharge = h.region === "NSW" && h.ownerKind === "Trust" && !h.deedExcludesForeign;
    const g = groups[key] || (groups[key] = {
      key, region: h.region, ownerName: h.ownerName, ownerKind: h.ownerKind,
      landValue: 0, tax: 0, baseTax: 0, trustSurcharge: 0, foreignSurcharge: 0, standalone: 0, props: [],
      nswTrustFlag: isNswTrustSurcharge, foreign: !!h.foreign,
    } as LandTaxGroup & { foreign: boolean });
    g.props.push({ id: h.id, label: h.label, landValue: h.landValue, share: 0, apportioned: 0, standalone: C.landTax(h.landValue, h.region) });
  }

  const list = Object.values(groups);
  for (const g of list) {
    const foreign = (g as LandTaxGroup & { foreign?: boolean }).foreign ?? false;
    g.landValue = g.props.reduce((a, p) => a + p.landValue, 0);
    g.baseTax = C.landTax(g.landValue, g.region);
    // NSW trust without a foreign-exclusion deed loses the threshold: the first
    // $1,075,000 (normally free) is taxed at the 1.6% land-tax rate.
    g.trustSurcharge = g.nswTrustFlag ? 0.016 * Math.min(g.landValue, 1075000) : 0;
    // Foreign-owner surcharge: the state's surcharge rate on the land value.
    g.foreignSurcharge = foreign ? C.foreignLandTax(g.region) * g.landValue : 0;
    g.tax = g.baseTax + g.trustSurcharge + g.foreignSurcharge;
    g.standalone = g.props.reduce((a, p) => a + p.standalone, 0);
    for (const p of g.props) {
      p.share = g.landValue > 0 ? p.landValue / g.landValue : 0;
      p.apportioned = g.tax * p.share;
      byProp[p.id] = p.apportioned;
    }
  }

  const totalAggregated = list.reduce((a, g) => a + g.tax, 0);
  const totalStandalone = list.reduce((a, g) => a + g.standalone, 0);
  return { groups: list, byProp, totalAggregated, totalStandalone, difference: totalAggregated - totalStandalone, excluded };
}
