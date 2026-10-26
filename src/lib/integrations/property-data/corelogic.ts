/* CoreLogic / Cotality adapter (placeholder). Query-live only: under their
   licence, responses must NOT be persisted into the market-data store or used to
   build a derived dataset. A point-in-time snapshot into one client's report is
   permitted. Until a key is present the factory uses the stub. */
import type { PropertyDataProvider } from "./provider";
import type { SuburbSnapshot, AddressLookup } from "./types";

export const CORELOGIC_CONFIGURED = Boolean(process.env.CORELOGIC_API_KEY);

export const corelogicPropertyDataProvider: PropertyDataProvider = {
  name: "corelogic",
  async suburbSnapshot(_locality: string, _state: string): Promise<SuburbSnapshot> {
    throw new Error("CoreLogic/Cotality provider not yet implemented — requires a commercial data agreement and key.");
  },
  async lookupAddress(_address: string): Promise<AddressLookup> {
    throw new Error("CoreLogic/Cotality provider not yet implemented.");
  },
};
