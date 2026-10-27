/* Simpology lodgement adapter (placeholder). The real implementation submits the
   deal via Simpology's Connect / SSI gateway under a partnership and API
   credentials, mapping the deal pack to Simpology's LIXI-based LADM. Until a key
   is present the factory uses the export-handoff provider. */
import type { LodgementProvider } from "./provider";
import type { LodgementSubmission } from "./types";

export const SIMPOLOGY_CONFIGURED = Boolean(process.env.SIMPOLOGY_API_KEY);

export const simpologyLodgementProvider: LodgementProvider = {
  name: "simpology",
  async submit(): Promise<LodgementSubmission> {
    // TODO: map the deal pack to Simpology's LADM (LIXI) and submit via Connect/SSI,
    // server-side only. Requires a Simpology partnership + API credentials.
    throw new Error("Simpology lodgement not enabled — requires a Simpology partnership, Connect/SSI integration and API credentials.");
  },
};
