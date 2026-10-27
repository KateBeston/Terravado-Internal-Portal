import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { getProperty } from "@/lib/domain/service";
import { savePropertyModellingAction, addPropertyListItemAction, removePropertyListItemAction } from "@/app/actions";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";
const v = (x?: number | string) => (x === undefined || x === null || x === "" ? "" : String(x));
const money = (x?: number) => (x === undefined || x === null ? "—" : "$" + Math.round(x).toLocaleString("en-AU"));
const FREQ = ["Annual", "Half-yearly", "Quarterly", "Monthly", "Weekly"];

export default async function PropertyFinancialsTab({ params }: { params: { id: string } }) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const p = await getProperty(tenantId, params.id);
  if (!p) notFound();
  const m = p.details?.modelling ?? {};
  const expenses = m.expenses ?? [];
  const capex = m.capex ?? [];

  return (
    <>
      <p className="muted" style={{ marginTop: -6 }}>
        The deep financial inputs for this property. Saved here, they drive the Modeller when you model this
        property — real expenses, loan structure and depreciation instead of default assumptions.
      </p>

      <div className="panel">
        <h2>Income &amp; tenancy</h2>
        <form action={savePropertyModellingAction}>
          <input type="hidden" name="id" value={p.id} /><input type="hidden" name="section" value="income" />
          <div className="row">
            <label className="f"><span>Other income (annual)</span><input name="otherIncome" inputMode="numeric" defaultValue={v(m.otherIncome)} /></label>
            <label className="f"><span>Property management fee %</span><input name="pmFeePct" inputMode="numeric" defaultValue={v(m.pmFeePct)} placeholder="7" /></label>
          </div>
          <div className="row">
            <label className="f"><span>Letting weeks (per re-let)</span><input name="lettingWeeks" inputMode="numeric" defaultValue={v(m.lettingWeeks)} placeholder="1.5" /></label>
            <label className="f"><span>Vacancy weeks (per year)</span><input name="vacancyWeeks" inputMode="numeric" defaultValue={v(m.vacancyWeeks)} placeholder="2" /></label>
          </div>
          <button className="btn" type="submit">Save income</button>
        </form>
      </div>

      <div className="panel">
        <h2>Operating expenses</h2>
        <table>
          <thead><tr><th>Expense</th><th>Amount</th><th>Frequency</th><th>Deductible</th><th></th></tr></thead>
          <tbody>
            {expenses.map((e, i) => (
              <tr key={i}>
                <td className="lbl">{e.name ?? "—"}</td><td>{money(e.amount)}</td><td>{e.freq ?? "—"}</td>
                <td>{e.ded === false ? "No" : "Yes"}</td>
                <td>
                  <form action={removePropertyListItemAction}>
                    <input type="hidden" name="id" value={p.id} /><input type="hidden" name="list" value="expenses" /><input type="hidden" name="index" value={i} />
                    <button className="x" type="submit" aria-label="Remove">×</button>
                  </form>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && <tr><td colSpan={5} className="muted">No expenses entered — the engine uses standard assumptions until you add them.</td></tr>}
          </tbody>
        </table>
        <form action={addPropertyListItemAction} style={{ marginTop: 12 }}>
          <input type="hidden" name="id" value={p.id} /><input type="hidden" name="list" value="expenses" />
          <div className="row">
            <label className="f"><span>Expense</span><input name="name" placeholder="Council rates" /></label>
            <label className="f"><span>Amount</span><input name="amount" inputMode="numeric" placeholder="490" /></label>
          </div>
          <div className="row">
            <label className="f"><span>Frequency</span><select name="freq" defaultValue="Quarterly">{FREQ.map((f) => <option key={f}>{f}</option>)}</select></label>
            <label className="f"><span>Tax deductible</span><select name="ded" defaultValue="true"><option value="true">Yes</option><option value="false">No</option></select></label>
          </div>
          <button className="btn" type="submit">Add expense</button>
        </form>
      </div>

      <div className="panel">
        <h2>Loan structure</h2>
        <form action={savePropertyModellingAction}>
          <input type="hidden" name="id" value={p.id} /><input type="hidden" name="section" value="loan" />
          <div className="row">
            <label className="f"><span>Repayment type</span>
              <select name="repaymentType" defaultValue={m.repaymentType ?? "Principal & interest"}>
                <option>Principal &amp; interest</option><option>Interest only</option>
              </select>
            </label>
            <label className="f"><span>Interest-only years</span><input name="ioYears" inputMode="numeric" defaultValue={v(m.ioYears)} placeholder="0" /></label>
          </div>
          <div className="row">
            <label className="f"><span>Loan term (years)</span><input name="termYears" inputMode="numeric" defaultValue={v(m.termYears)} placeholder="30" /></label>
            <label className="f"><span>Offset balance</span><input name="offsetBalance" inputMode="numeric" defaultValue={v(m.offsetBalance)} /></label>
          </div>
          <label className="f"><span>Annual package / fees</span><input name="annualPackageFee" inputMode="numeric" defaultValue={v(m.annualPackageFee)} placeholder="395" /></label>
          <button className="btn" type="submit">Save loan</button>
        </form>
      </div>

      <div className="panel">
        <h2>Acquisition</h2>
        <form action={savePropertyModellingAction}>
          <input type="hidden" name="id" value={p.id} /><input type="hidden" name="section" value="entry" />
          <label className="f"><span>Other purchase costs (legals, B&amp;P, inspections…)</span><input name="otherPurchaseCosts" inputMode="numeric" defaultValue={v(m.otherPurchaseCosts)} placeholder="8000" /></label>
          <label className="f" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" name="capitaliseLmi" defaultChecked={m.capitaliseLmi !== false} style={{ width: "auto" }} />
            <span style={{ margin: 0 }}>Capitalise LMI into the loan</span>
          </label>
          <button className="btn" type="submit">Save acquisition</button>
        </form>
      </div>

      <div className="panel">
        <h2>Depreciation</h2>
        <form action={savePropertyModellingAction}>
          <input type="hidden" name="id" value={p.id} /><input type="hidden" name="section" value="dep" />
          <div className="row">
            <label className="f"><span>Basis</span>
              <select name="depMode" defaultValue={m.depMode ?? "assumed"}>
                <option value="assumed">Assumed</option><option value="none">None</option>
              </select>
            </label>
            <label className="f"><span>Plant &amp; equipment value</span><input name="plantValue" inputMode="numeric" defaultValue={v(m.plantValue)} placeholder="18000" /></label>
          </div>
          <label className="f"><span>Construction cost (Div 43 basis)</span><input name="constructionCost" inputMode="numeric" defaultValue={v(m.constructionCost)} /></label>
          <button className="btn" type="submit">Save depreciation</button>
        </form>
      </div>

      <div className="panel">
        <h2>Capex &amp; improvements</h2>
        <table>
          <thead><tr><th>Year</th><th>Improvement</th><th>Cost</th><th>Value uplift %</th><th>Rent uplift /wk</th><th></th></tr></thead>
          <tbody>
            {capex.map((c, i) => (
              <tr key={i}>
                <td className="lbl">{c.year ?? "—"}</td><td>{c.name ?? "—"}</td><td>{money(c.cost)}</td>
                <td>{c.upliftPct ?? "—"}</td><td>{c.rentUplift ?? "—"}</td>
                <td>
                  <form action={removePropertyListItemAction}>
                    <input type="hidden" name="id" value={p.id} /><input type="hidden" name="list" value="capex" /><input type="hidden" name="index" value={i} />
                    <button className="x" type="submit" aria-label="Remove">×</button>
                  </form>
                </td>
              </tr>
            ))}
            {capex.length === 0 && <tr><td colSpan={6} className="muted">No improvements planned.</td></tr>}
          </tbody>
        </table>
        <form action={addPropertyListItemAction} style={{ marginTop: 12 }}>
          <input type="hidden" name="id" value={p.id} /><input type="hidden" name="list" value="capex" />
          <div className="row">
            <label className="f"><span>Year</span><input name="year" inputMode="numeric" placeholder="4" /></label>
            <label className="f"><span>Improvement</span><input name="name" placeholder="Kitchen & bathroom" /></label>
          </div>
          <div className="row">
            <label className="f"><span>Cost</span><input name="cost" inputMode="numeric" placeholder="55000" /></label>
            <label className="f"><span>Value uplift %</span><input name="upliftPct" inputMode="numeric" placeholder="6" /></label>
          </div>
          <label className="f"><span>Rent uplift ($/wk)</span><input name="rentUplift" inputMode="numeric" placeholder="60" /></label>
          <button className="btn" type="submit">Add improvement</button>
        </form>
      </div>

      <p className="muted" style={{ fontSize: 12 }}>
        <Link href={`/properties/${p.id}/modelling`}>Modelling tab →</Link> runs this property through the engine with these inputs.
      </p>
    </>
  );
}
