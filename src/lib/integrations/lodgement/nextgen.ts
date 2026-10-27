/* NextGen (ApplyOnline) lodgement adapter (placeholder). The real implementation
   submits the deal via NextGen's ApplyOnline under a partnership and API
   credentials, mapping the deal pack to the lender's required LIXI profile. Until
   a key is present the factory uses the export-handoff provider. */
import type { LodgementProvider } from "./provider";
import type { LodgementSubmission } from "./types";

export const NEXTGEN_CONFIGURED = Boolean(process.env.NEXTGEN_API_KEY);

export const nextgenLodgementProvider: LodgementProvider = {
  name: "nextgen",
  async submit(): Promise<LodgementSubmission> {
    // TODO: map the deal pack to the lender's LIXI profile and submit via ApplyOnline,
    // server-side only. Requires a NextGen partnership + API credentials.
    throw new Error("NextGen lodgement not enabled — requires a NextGen partnership, ApplyOnline integration and API credentials.");
  },
};
