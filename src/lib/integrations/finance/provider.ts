import type { ServiceabilityRequest, ServiceabilityResult } from "./types";

/** The finance seam. Any servicing engine (Quickli, or the built-in stub)
    implements this. Nothing above the seam knows which one is active. */
export interface FinanceProvider {
  readonly name: string;
  assessServiceability(req: ServiceabilityRequest): Promise<ServiceabilityResult>;
}
