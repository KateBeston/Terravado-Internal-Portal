/* ===========================================================================
   TERRAVADO — Assurance: input guardrails (Layer 4)
   Pure, non-throwing validation that flags implausible inputs BEFORE the
   engine computes on them, so the model never returns a confident number from
   nonsense. Returns a list of issues; an empty list means the input is clean.
   These are guardrails, not advice — a "warn" is a prompt to check, not a block.
   =========================================================================== */

export type Severity = "error" | "warn";
export interface Issue {
  field: string;
  severity: Severity;
  message: string;
}

const issue = (field: string, severity: Severity, message: string): Issue => ({ field, severity, message });
const provided = (v: unknown): boolean => v !== undefined && v !== null && v !== "";

/** Flag a value that falls outside a plausible numeric range. */
export function checkRange(
  field: string,
  v: unknown,
  min: number,
  max: number,
  severity: Severity = "error",
): Issue | null {
  if (!provided(v)) return null;
  const n = Number(v);
  if (!isFinite(n)) return issue(field, "error", "must be a number");
  if (n < min || n > max) return issue(field, severity, `${n} is outside the plausible range ${min}–${max}`);
  return null;
}

/** Flag a value that is not strictly greater than zero. */
export function checkPositive(field: string, v: unknown, severity: Severity = "error"): Issue | null {
  if (!provided(v)) return null;
  const n = Number(v);
  if (!isFinite(n)) return issue(field, "error", "must be a number");
  if (n <= 0) return issue(field, severity, "must be greater than zero");
  return null;
}

const push = (arr: Issue[], i: Issue | null): void => {
  if (i) arr.push(i);
};

/** Generic finance-input guardrail — usable on any form in the UI. */
export function validateFinance(input: {
  price?: unknown;
  loan?: unknown;
  ratePct?: unknown;
  lvrPct?: unknown;
  grossYieldPct?: unknown;
  growthPct?: unknown;
  vacancyPct?: unknown;
}): Issue[] {
  const out: Issue[] = [];
  push(out, checkPositive("price", input.price));
  push(out, checkPositive("loan", input.loan, "warn"));
  push(out, checkRange("ratePct", input.ratePct, 0, 25, "warn"));
  push(out, checkRange("lvrPct", input.lvrPct, 0, 100));
  push(out, checkRange("grossYieldPct", input.grossYieldPct, 0, 25, "warn"));
  push(out, checkRange("growthPct", input.growthPct, -20, 30, "warn"));
  push(out, checkRange("vacancyPct", input.vacancyPct, 0, 100));
  const price = Number(input.price);
  const loan = Number(input.loan);
  if (isFinite(price) && isFinite(loan) && price > 0 && loan > price * 1.05) {
    out.push(issue("loan", "warn", "loan exceeds property price — check LVR / LMI assumptions"));
  }
  return out;
}

/** Guardrail for a development feasibility input. */
export function validateFeasibility(f: any): Issue[] {
  const out: Issue[] = [];
  push(out, checkPositive("landCost", f?.landCost));
  push(out, checkRange("debtLVRpct", f?.debtLVRpct, 0, 100));
  push(out, checkRange("debtLTCpct", f?.debtLTCpct, 0, 100));
  push(out, checkRange("debtRate", f?.debtRate, 0, 25, "warn"));
  push(out, checkRange("contingencyPct", f?.contingencyPct, 0, 50, "warn"));
  push(out, checkRange("targetMarginPct", f?.targetMarginPct, 0, 100, "warn"));
  push(out, checkRange("buildMonths", f?.buildMonths, 0, 120));
  push(out, checkRange("sellMonths", f?.sellMonths, 0, 120));
  if (Array.isArray(f?.units)) {
    f.units.forEach((u: any, i: number) => {
      push(out, checkPositive(`units[${i}].salePrice`, u?.salePrice));
      push(out, checkRange(`units[${i}].count`, u?.count, 1, 1000));
      push(out, checkRange(`units[${i}].buildRate`, u?.buildRate, 0, 20000, "warn"));
    });
  }
  return out;
}

/** Guardrail for serviceability inputs. */
export function validateServiceability(opts: any): Issue[] {
  const out: Issue[] = [];
  push(out, checkPositive("proposedLoan", opts?.proposedLoan));
  push(out, checkRange("newAnnualRent", opts?.newAnnualRent, 0, 1e7, "warn"));
  return out;
}

/** True if any issue is a hard error (as opposed to a soft warning). */
export const hasErrors = (issues: Issue[]): boolean => issues.some((i) => i.severity === "error");
