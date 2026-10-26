/* Quickli adapter (placeholder). The real implementation calls Quickli's API to
   compare borrowing capacity and match products across its lender panel, under a
   commercial agreement. Until a key is present the factory uses the stub, so the
   rest of the app is unchanged when this goes live. */
import type { FinanceProvider } from "./provider";
import type { ServiceabilityRequest, ServiceabilityResult } from "./types";

export const QUICKLI_CONFIGURED = Boolean(process.env.QUICKLI_API_KEY);

export const quickliFinanceProvider: FinanceProvider = {
  name: "quickli",
  async assessServiceability(_req: ServiceabilityRequest): Promise<ServiceabilityResult> {
    // TODO: call Quickli's servicing API with QUICKLI_API_KEY, map its per-lender
    // capacity + product-fit response into ServiceabilityResult. Proxy server-side
    // only — never expose the key to the browser.
    throw new Error("Quickli provider not yet implemented — requires a Quickli API agreement and key.");
  },
};
