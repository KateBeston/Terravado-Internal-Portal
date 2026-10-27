import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { getContact } from "@/lib/domain/service";
import { saveClientFinancesAction } from "@/app/actions";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
const num = (x?: number) => (x === undefined || x === null ? "" : String(x));

export default async function PersonFinancialsTab({ params }: { params: { id: string } }) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const c = await getContact(tenantId, params.id);
  if (!c) notFound();
  const f = c.finances ?? {};

  return (
    <>
      <p className="sub">The serviceability position the Modeller assesses against. Income and expenses here feed borrowing capacity.</p>

      <form action={saveClientFinancesAction}>
        <input type="hidden" name="clientId" value={c.id} />

        <div className="panel">
          <h2>Income</h2>
          <div className="row">
            <label className="f"><span>Gross income (annual, primary)</span><input name="grossIncome" type="number" step="1000" defaultValue={num(f.grossIncome)} /></label>
            <label className="f"><span>Partner income (annual)</span><input name="partnerIncome" type="number" step="1000" defaultValue={num(f.partnerIncome)} /></label>
          </div>
        </div>

        <div className="panel">
          <h2>Living expenses & dependants</h2>
          <div className="row">
            <label className="f"><span>Declared living expenses (monthly)</span><input name="livingExpMonthly" type="number" step="50" defaultValue={num(f.livingExpMonthly)} /></label>
            <label className="f"><span>Dependants</span><input name="dependants" type="number" step="1" defaultValue={num(f.dependants)} /></label>
          </div>
        </div>

        <div className="panel">
          <h2>Commitments & debts</h2>
          <div className="row">
            <label className="f"><span>Other monthly commitments</span><input name="monthlyCommitments" type="number" step="50" defaultValue={num(f.monthlyCommitments)} /></label>
            <label className="f"><span>Total card limits</span><input name="cardLimits" type="number" step="500" defaultValue={num(f.cardLimits)} /></label>
            <label className="f"><span>HECS / HELP balance</span><input name="hecsBalance" type="number" step="500" defaultValue={num(f.hecsBalance)} /></label>
          </div>
        </div>

        <button className="btn" type="submit">Save financials</button>
      </form>

      <p className="muted" style={{ fontSize: 12, marginTop: 14 }}>
        This is the summary position. Detailed income by type (PAYG, self-employed, rental, retiree), employment and
        time-in-role, and itemised assets and liabilities are being built into this tab next.
      </p>
    </>
  );
}
