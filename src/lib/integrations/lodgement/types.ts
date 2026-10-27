/* Lodgement integration shapes. The provider prepares/submits a deal pack toward
   the lending channel and reports back a reference, status, channel and a
   validation result. Provider-agnostic so the export-handoff (now) and
   Simpology/NextGen (later) implement the same contract. */
export interface LodgementValidation { ok: boolean; issues: string[]; }

export interface LodgementSubmission {
  reference: string;
  status: string;   // pipeline status after submit
  channel: string;  // how it was handled (Export handoff / Simpology / NextGen)
  validation: LodgementValidation;
  disclaimer: string;
}
