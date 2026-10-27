/* Collapse the detailed serviceability record (income lines, liabilities) into
   the summary shape the engine already assesses. The engine math is unchanged —
   this only derives better inputs for it. When the structured lists are present
   they are authoritative; otherwise the stored summary fields are used as-is.

   Income is fed at gross (same basis as the manual "gross income"); lender-
   specific shading stays in the lender policy layer, so nothing is double-counted. */
import type { ClientFinances, IncomeLine } from "./types";

const FREQ: Record<string, number> = { Annual: 1, Monthly: 12, Fortnightly: 26, Weekly: 52 };
const annual = (amt?: number, freq?: string): number => (amt ?? 0) * (FREQ[freq ?? "Annual"] ?? 1);

/* Assessable annual figure for one income line. Self-employed lines average the
   latest and prior year when a prior year is given, and add back depreciation/
   interest/one-offs. */
function assessableIncome(line: IncomeLine): number {
  const base = annual(line.amount, line.frequency);
  const selfEmp = (line.type ?? "").startsWith("Self-employed");
  const addBacks = line.addBacks ?? 0;
  if (selfEmp && line.priorYearAmount) return (base + line.priorYearAmount) / 2 + addBacks;
  return base + (selfEmp ? addBacks : 0);
}

export function deriveAssessableFinances(finances?: ClientFinances): ClientFinances {
  const f = finances ?? {};
  const income = f.income ?? [];
  const liabilities = f.liabilities ?? [];
  const out: ClientFinances = { ...f };

  if (income.length) {
    let applicant = 0, partner = 0;
    for (const l of income) {
      const amt = assessableIncome(l);
      if ((l.owner ?? "Applicant") === "Partner") partner += amt;
      else applicant += amt; // Applicant and Joint both assessed on the applicant side
    }
    out.grossIncome = Math.round(applicant);
    out.partnerIncome = Math.round(partner);
  }

  if (liabilities.length) {
    let cards = 0, hecs = 0, commitmentsMonthly = 0;
    for (const l of liabilities) {
      const type = l.type ?? "";
      if (type === "Credit card") cards += l.limit ?? 0;
      else if (type === "HECS-HELP") hecs += l.balance ?? 0;
      else commitmentsMonthly += annual(l.repayment, l.frequency) / 12;
    }
    out.cardLimits = Math.round(cards);
    out.hecsBalance = Math.round(hecs);
    out.monthlyCommitments = Math.round(commitmentsMonthly);
  }

  return out;
}
