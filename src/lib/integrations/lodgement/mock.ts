/* Built-in export-handoff lodgement provider. It validates the deal pack for
   completeness and prepares it for the broker to lodge through their own
   aggregator channel — it does NOT transmit to a lender. A direct
   Simpology/NextGen connection replaces this at the seam when keyed. */
import type { DealPack } from "@/lib/deal/pack";
import type { LodgementProvider } from "./provider";
import type { LodgementSubmission, LodgementValidation } from "./types";

function validate(pack: DealPack): LodgementValidation {
  const issues: string[] = [];
  if (!pack.applicant?.name) issues.push("Applicant name missing");
  if (!pack.applicant?.grossIncome) issues.push("Applicant gross income missing");
  if (!pack.security?.address) issues.push("Security address missing");
  if (!pack.security?.price) issues.push("Purchase price missing");
  if (!pack.loan?.amountRequired) issues.push("Loan amount could not be derived");
  if (!pack.serviceability?.lender || pack.serviceability.lender === "—") issues.push("No lender matched");
  return { ok: issues.length === 0, issues };
}

const makeRef = () => "TVD-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();

export const mockLodgementProvider: LodgementProvider = {
  name: "export-handoff",
  async submit(pack: DealPack): Promise<LodgementSubmission> {
    const validation = validate(pack);
    return {
      reference: makeRef(),
      status: "prepared",
      channel: "Export handoff",
      validation,
      disclaimer:
        "Prepared by Terravado for lodgement through the broker's own aggregator channel — " +
        "not transmitted to a lender from here. A direct Simpology/NextGen connection replaces this when keyed.",
    };
  },
};
