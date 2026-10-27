import { requireUser, requireCapability } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { listLenders } from "@/lib/domain/service";
import { assessPosition } from "@/lib/modelling/run";
import { QUICKLI_CONFIGURED } from "@/lib/integrations/finance/quickli";
import Link from "next/link";

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
  await requireCapability("finance");
  const { tenantId } = await getCurrentTenant();

  const engineLenders = (await listLenders(tenantId))
    .filter((l) => l.active !== false)
    .map((l) => ({ id: l.id, name: l.name, isTemplate: false, ...(l.policy ?? {}) }));

  const grossIncome = numParam(searchParams.grossIncome);
  const deposit = numParam(searchParams.deposit);
  const existingDebtAnnual = numParam(searchParams.existingDebt) ?? 0;
  const rentalIncome = numParam(searchParams.rentalIncome);
  const dependents = numParam(searchParams.dependents) ?? 0;

  const rows = (grossIncome && deposit !== undefined)
    ? assessPosition({
        grossIncome,
        dependants: dependents,
        monthlyCommitments: Math.round(existingDebtAnnual / 12),
        rentalIncomeAnnual: rentalIncome,
      }, engineLenders.length ? engineLenders : undefined)
    : null;

  return (
    <section>
      <h1>Finance — serviceability</h1>
      <p className="sub">Borrowing capacity across your lender products, highest first.</p>

      <div className="panel" style={{ borderLeft: `4px solid ${QUICKLI_CONFIGURED ? "var(--success)" : "var(--warning-border)"}` }}>
        {QUICKLI_CONFIGURED
          ? <p className="muted" style={{ margin: 0 }}>Quickli connected — live lender serviceability available.</p>
          : <p className="muted" style={{ margin: 0 }}>
              Assessed against your <Link href="/lenders">manual lender products</Link>{engineLenders.length ? ` (${engineLenders.length})` : ""} using Terravado&apos;s engine.
              Connecting Quickli replaces this with each lender&apos;s live calculator.
            </p>}
      </div>

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
          <label className="f"><span>Dependants</span><input name="dependents" inputMode="numeric" defaultValue={asStr(searchParams.dependents)} placeholder="0" /></label>
          <button className="btn" type="submit">Assess across lenders</button>
        </form>
      </div>

      {rows && (
        <div className="panel">
          <h2>Capacity by lender</h2>
          <table>
            <thead><tr><th>Lender product</th><th>Max borrow</th><th>Max price</th><th>DTI cap</th><th>Max LVR</th></tr></thead>
            <tbody>
              {rows.map((a, i) => (
                <tr key={a.name} style={i === 0 ? { background: "var(--primary-tint)" } : undefined}>
                  <td><strong>{a.name}</strong>{i === 0 && <span className="badge" style={{ marginLeft: 8 }}>best fit</span>}</td>
                  <td>{money(a.capacity)}</td>
                  <td>{money(a.capacity + (deposit ?? 0))}</td>
                  <td>{a.maxDTI}×</td>
                  <td>{a.maxLVR}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            Indicative — assessed by Terravado&apos;s engine against your lender products. Verify before relying on it with a client.
          </p>
        </div>
      )}
    </section>
  );
}
