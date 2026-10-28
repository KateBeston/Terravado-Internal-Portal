/* Built-in stub titles provider — deterministic, clearly-indicative particulars
   so Smart Search works before a titles broker is connected. NOT a real title
   search. */
import type { TitlesProvider } from "./provider";
import type { TitleParticulars } from "./types";

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const ZONES = ["R1 General Residential", "R2 Low Density Residential", "R3 Medium Density Residential", "R4 High Density Residential"];
const TENURES = ["Freehold", "Freehold", "Freehold", "Strata"];

export const stubTitlesProvider: TitlesProvider = {
  name: "stub",
  async lookupTitle(address: string, state: string): Promise<TitleParticulars> {
    const h = hash(address.toLowerCase() + "|" + state.toLowerCase());
    return {
      address,
      state,
      titleReference: `${(h % 900) + 1}/SP${100000 + (h % 899999)}`,
      lotPlan: `Lot ${(h % 40) + 1} DP${700000 + (h % 299999)}`,
      tenure: TENURES[h % TENURES.length],
      landArea: 300 + (h % 500),
      councilLGA: "—",
      zoning: ZONES[h % ZONES.length],
      source: "stub",
      asAt: new Date().toISOString().slice(0, 10),
      disclaimer:
        "Indicative placeholder — not a real title search. Replaced by a titles broker " +
        "(GlobalX / InfoTrack / Dye & Durham / CITEC) once connected.",
    };
  },
};
