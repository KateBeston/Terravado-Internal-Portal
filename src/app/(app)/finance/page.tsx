import { requireUser } from "@/lib/auth/guard";
import { getFinanceProvider } from "@/lib/integrations/finance";
import type { ServiceabilityResult } from "@/lib/integrations/finance";

export const dynamic = "force-dynamic";

const money = (v: number) => "$" + Math.round(v).toLocaleString("en-AU");
const asStr = (v: string | string[] | undefined): string => (typeof v === "string" ? v : "");
const numParam = (v: string | string[] | undefined): number | undefined => {
  if (typeof v !== "string" || v.trim() === "") return undefined;
  const n = Number(v.replace(/[,$\s]/g, ""));
  return isFinite(n) ? n : undefined;
};

export default async function FinancePage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  await requireUser();

  const grossIncome = numParam(searchParams.grossIncome);
  const deposit = numParam(searchParams.deposit);
  const existingDebtRepayments = numParam(searchParams.existingDebt) ?? 0;
  const rentalIncome = numParam(searchParams.rentalIncome);
  const dependents = numParam(searchParams.dependents) ?? 0;

  let result: ServiceabilityResult | null = null;
  if (grossIncome && deposit !== undefined) {
    result = await getFinanceProvider().assessServiceability({
      grossIncome, deposit, existingDebtRepayments, rentalIncome, dependents,
    });
  }

  return (
    <section>
      <h1>Finance — serviceability</h1>
      <p className="sub">Borrowing capacity across lenders, oriented to the client. Best fit first.</p>

      <div className="panel">
        <h2>Client position</h2>
        <form method="get">
          <div className="row">
            <label className="f"><span>Household gross income (annual)</span><input name="grossIncome" inputMode="numeric" defaultValue={asStr(searchParams.grossIncome)} placeholder="180,000" /></label>
            <label className="f"><span>Deposit / equity</span><input name="deposit" inputMode="numeric" defaultValue={asStr(searchParams.deposit)} placeholder="150,000" /></label>
          </div>
          <div className="row">
            <label className="f"><span>Existing debt repayments (annual)</span><input name="existingDebt" inputMode="numeric" defaultValue={asStr(searchParams.existingDebt)} placeholder="0" /></label>
            <label className="f"><span>Proposed rental income (annual)</span><input name="rentalIncome" inputMode="numeric" defaultValue={asStr(searchParams.rentalIncome)} placeholder="33,000" /></label>
          </div>
          <label className="f"><span>Dependents</span><input name="dependents" inputMode="numeric" defaultValue={asStr(searchParams.dependents)} placeholder="0" /></label>
          <button className="btn" type="submit">Assess across lenders</button>
        </form>
      </div>

      {result && (
        <div className="panel">
          <h2>Capacity by lender</h2>
          <table>
            <thead><tr><th>Lender</th><th>Max borrow</th><th>Max price</th><th>Assessed rate</th><th>Basis</th></tr></thead>
            <tbody>
              {result.assessments.map((a, i) => (
                <tr key={a.lender} style={i === 0 ? { background: "#f0f7f3" } : undefined}>
                  <td><strong>{a.lender}</strong>{i === 0 && <span className="badge" style={{ marginLeft: 8 }}>best fit</span>}</td>
                  <td>{money(a.maxBorrow)}</td>
                  <td>{money(a.maxPropertyPrice)}</td>
                  <td>{a.assessmentRatePct}%</td>
                  <td className="muted">{a.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="devbanner" style={{ marginTop: 16 }}>{result.disclaimer}</div>
        </div>
      )}
    </section>
  );
}
