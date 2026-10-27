import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { getLender } from "@/lib/domain/service";
import { updateLenderAction, deleteLenderAction } from "@/app/actions";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";
const KINDS = ["Major bank", "Non-bank", "Specialist", "Credit union", "Other"];
const v = (x?: number | string) => (x === undefined || x === null || x === "" ? "" : String(x));

export default async function LenderEditPage({ params }: { params: { id: string } }) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const l = await getLender(tenantId, params.id);
  if (!l) notFound();
  const p = l.policy ?? {};

  return (
    <section>
      <div className="sub" style={{ marginBottom: 6 }}><Link href="/lenders">← Lenders</Link></div>
      <h1 style={{ marginBottom: 6 }}>{l.name}</h1>
      <p className="sub">Serviceability policy for this lender product. Every field is used by the comparison engine.</p>

      <form action={updateLenderAction}>
        <input type="hidden" name="id" value={l.id} />

        <div className="panel">
          <h2>Identity</h2>
          <label className="f"><span>Name</span><input name="name" defaultValue={l.name} required /></label>
          <div className="row">
            <label className="f"><span>Kind</span>
              <select name="kind" defaultValue={l.kind ?? "Major bank"}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select>
            </label>
            <label className="f"><span>Active</span>
              <select name="active" defaultValue={l.active === false ? "false" : "true"}><option value="true">Yes</option><option value="false">No</option></select>
            </label>
          </div>
        </div>

        <div className="panel">
          <h2>Assessment rate</h2>
          <div className="row">
            <label className="f"><span>Serviceability buffer (%)</span><input name="bufferPct" inputMode="decimal" defaultValue={v(p.bufferPct)} /></label>
            <label className="f"><span>Assessment floor rate (%)</span><input name="floorPct" inputMode="decimal" defaultValue={v(p.floorPct)} /></label>
          </div>
          <div className="row">
            <label className="f"><span>Product variable rate (%)</span><input name="varRate" inputMode="decimal" defaultValue={v(p.varRate)} /></label>
            <label className="f"><span>Interest-only loading (%)</span><input name="ioLoading" inputMode="decimal" defaultValue={v(p.ioLoading)} /></label>
          </div>
        </div>

        <div className="panel">
          <h2>Income shading</h2>
          <div className="row">
            <label className="f"><span>Rent shade (%)</span><input name="rentShadePct" inputMode="decimal" defaultValue={v(p.rentShadePct)} /></label>
            <label className="f"><span>Overtime shade (%)</span><input name="otShadePct" inputMode="decimal" defaultValue={v(p.otShadePct)} /></label>
          </div>
          <div className="row">
            <label className="f"><span>Bonus shade (%)</span><input name="bonusShadePct" inputMode="decimal" defaultValue={v(p.bonusShadePct)} /></label>
            <label className="f"><span>Commission shade (%)</span><input name="commissionShadePct" inputMode="decimal" defaultValue={v(p.commissionShadePct)} /></label>
          </div>
          <div className="row">
            <label className="f"><span>Self-employed shade (%)</span><input name="selfEmpShadePct" inputMode="decimal" defaultValue={v(p.selfEmpShadePct)} /></label>
            <label className="f"><span>Negative-gearing add-back</span>
              <select name="ngAddBack" defaultValue={p.ngAddBack === false ? "false" : "true"}><option value="true">Yes</option><option value="false">No</option></select>
            </label>
          </div>
        </div>

        <div className="panel">
          <h2>Living expenses (HEM)</h2>
          <div className="row">
            <label className="f"><span>HEM base (monthly $)</span><input name="hemMonthly" inputMode="numeric" defaultValue={v(p.hemMonthly)} /></label>
            <label className="f"><span>Per dependant (monthly $)</span><input name="hemPerDependant" inputMode="numeric" defaultValue={v(p.hemPerDependant)} /></label>
          </div>
          <label className="f"><span>Income scaling factor (of gross)</span><input name="hemIncomeScale" inputMode="decimal" defaultValue={v(p.hemIncomeScale)} placeholder="0.06" /></label>
        </div>

        <div className="panel">
          <h2>Existing debts</h2>
          <div className="row">
            <label className="f"><span>Credit-card assessment (% of limit p.a.)</span><input name="cardAssessPct" inputMode="decimal" defaultValue={v(p.cardAssessPct)} /></label>
            <label className="f"><span>HECS/HELP assessed</span>
              <select name="hecsAssessed" defaultValue={p.hecsAssessed === false ? "false" : "true"}><option value="true">Yes</option><option value="false">No</option></select>
            </label>
          </div>
          <label className="f"><span>Existing mortgage debt</span>
            <select name="existingDebtAssess" defaultValue={p.existingDebtAssess ?? "Assessed"}>
              <option value="Assessed">Assessed (at buffered rate)</option>
              <option value="Actual">Actual repayments</option>
            </select>
          </label>
        </div>

        <div className="panel">
          <h2>Caps</h2>
          <div className="row">
            <label className="f"><span>Max LVR (%)</span><input name="maxLVR" inputMode="decimal" defaultValue={v(p.maxLVR)} /></label>
            <label className="f"><span>Max DTI (×)</span><input name="maxDTI" inputMode="decimal" defaultValue={v(p.maxDTI)} /></label>
          </div>
        </div>

        <div className="panel">
          <h2>Fees</h2>
          <div className="row">
            <label className="f"><span>Establishment fee ($)</span><input name="estFee" inputMode="numeric" defaultValue={v(p.estFee)} /></label>
            <label className="f"><span>Valuation fee ($)</span><input name="valFee" inputMode="numeric" defaultValue={v(p.valFee)} /></label>
          </div>
          <div className="row">
            <label className="f"><span>Annual package fee ($)</span><input name="annualFee" inputMode="numeric" defaultValue={v(p.annualFee)} /></label>
            <label className="f"><span>LMI factor (×)</span><input name="lmiFactor" inputMode="decimal" defaultValue={v(p.lmiFactor)} /></label>
          </div>
        </div>

        <button className="btn" type="submit">Save lender product</button>
      </form>

      <form action={deleteLenderAction} style={{ marginTop: 16 }}>
        <input type="hidden" name="id" value={l.id} />
        <button className="x" type="submit" style={{ width: "auto", padding: "6px 12px" }}>Delete this product</button>
      </form>
    </section>
  );
}
