import type { DealPack } from "@/lib/deal/pack";
import type { LodgementSubmission } from "./types";

/* The lodgement seam. The export-handoff (built-in) or a real rail
   (Simpology / NextGen, when keyed) implements this. Nothing above the seam
   knows which is active. */
export interface LodgementProvider {
  readonly name: string;
  submit(pack: DealPack): Promise<LodgementSubmission>;
}
