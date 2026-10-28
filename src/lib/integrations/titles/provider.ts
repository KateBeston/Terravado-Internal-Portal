import type { TitleParticulars } from "./types";

/** The land-titles seam. A broker adapter (GlobalX / InfoTrack / Dye & Durham /
    CITEC) or the built-in stub implements this. A title search is a paid,
    on-demand request per property — never a bulk dataset. */
export interface TitlesProvider {
  readonly name: string;
  lookupTitle(address: string, state: string): Promise<TitleParticulars>;
}
