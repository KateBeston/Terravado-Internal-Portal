import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { getContact } from "@/lib/domain/service";
import {
  saveClientFinancesAction,
  addEmploymentAction, deleteEmploymentAction,
  addIncomeAction, deleteIncomeAction,
  addAssetAction, deleteAssetAction,
  addLiabilityAction, deleteLiabilityAction,
} from "@/app/actions";
import {
  EMPLOYMENT_STATUS, EMPLOYMENT_BASIS, INCOME_TYPES, INCOME_FREQ,
  ASSET_TYPES, LIABILITY_TYPES, OWNER_OPTS,
} from "@/lib/domain/types";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const money = (v?: number | null) => (v === undefined || v === null ? "—" : "$" + Math.round(v).toLocaleString("en-AU"));
const num = (x?: number) => (x === undefined || x === null ? "" : String(x));
const FREQ_MULT: Record<string, number> = { Annual: 1, Monthly: 12, Fortnightly: 26, Weekly: 52 };
const annual = (amt?: number, freq?: string) => (amt ?? 0) * (FREQ_MULT[freq ?? "Annual"] ?? 1);
function timeInRole(startDate?: string): string {
  if (!startDate) return "—";
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return "—";
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (months < 0) months = 0;
  const y = Math.floor(months / 12), m = months % 12;
  return `${y ? `${y}y ` : ""}${m}m`;
}

export default async function PersonFinancialsTab({ params }: { params: { id: string } }) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const c = await getContact(tenantId, params.id);
  if (!c) notFound();
  const f = c.finances ?? {};
  const employment = f.employment ?? [];
  const income = f.income ?? [];
  const assets = f.assets ?? [];
  const liabilities = f.liabilities ?? [];

  const incomePA = income.reduce((s, l) => s + annual(l.amount, l.frequency), 0);
  const assetsTotal = assets.reduce((s, a) => s + (a.value ?? 0), 0);
  const liabBalance = liabilities.reduce((s, l) => s + (l.balance ?? 0), 0);
  const liabRepayMonthly = liabilities.reduce((s, l) => s + annual(l.repayment, l.frequency) / 12, 0);
  const hidden = <input type="hidden" name="personId" value={c.id} />;

  return (
    <>
      <p className="sub">The serviceability record for {c.name} — income, employment, assets and liabilities, in full.</p>

      <div className="cards">
        <div className="card"><div className="k">Income p.a. (detailed)</div><div className="v">{money(incomePA)}</div></div>
        <div className="card"><div className="k">Assets</div><div className="v">{money(assetsTotal)}</div></div>
        <div className="card"><div className="k">Liabilities</div><div className="v">{money(liabBalance)}</div></div>
        <div className="card"><div className="k">Repayments / mth</div><div className="v">{money(liabRepayMonthly)}</div></div>
      </div>

      {/* ── Employment ─────────────────────────────────────────── */}
      <div className="panel">
        <h2>Employment</h2>
        <table>
          <thead><tr><th>Employer</th><th>Status</th><th>Basis</th><th>Occupation</th><th>Time in role</th><th>Probation</th><th></th></tr></thead>
          <tbody>
            {employment.map((e) => (
              <tr key={e.id}>
                <td><strong>{e.employer ?? "—"}</strong>{e.current ? " · current" : ""}</td>
                <td>{e.status ?? "—"}</td><td>{e.basis ?? "—"}</td><td>{e.occupation ?? "—"}</td>
                <td>{timeInRole(e.startDate)}</td><td>{e.onProbation ? "Yes" : "No"}</td>
                <td><form action={deleteEmploymentAction}>{hidden}<input type="hidden" name="lineId" value={e.id} /><button className="x" aria-label="Delete">×</button></form></td>
              </tr>
            ))}
            {employment.length === 0 && <tr><td colSpan={7} className="muted">No employment recorded.</td></tr>}
          </tbody>
        </table>
        <form action={addEmploymentAction} style={{ marginTop: 12 }}>
          {hidden}
          <div className="row">
            <label className="f"><span>Employer</span><input name="employer" /></label>
            <label className="f"><span>Occupation</span><input name="occupation" /></label>
          </div>
          <div className="row">
            <label className="f"><span>Status</span><select name="status" defaultValue="Full-time">{EMPLOYMENT_STATUS.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label className="f"><span>Basis</span><select name="basis" defaultValue="PAYG">{EMPLOYMENT_BASIS.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label className="f"><span>Industry</span><input name="industry" /></label>
          </div>
          <div className="row">
            <label className="f"><span>Start date</span><input name="startDate" type="date" /></label>
            <label className="f" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><input type="checkbox" name="current" style={{ width: "auto" }} /><span>Current role</span></label>
            <label className="f" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><input type="checkbox" name="onProbation" style={{ width: "auto" }} /><span>On probation</span></label>
          </div>
          <button className="btn" type="submit">Add employment</button>
        </form>
      </div>

      {/* ── Income ─────────────────────────────────────────────── */}
      <div className="panel">
        <h2>Income</h2>
        <table>
          <thead><tr><th>Type</th><th>Owner</th><th>Amount</th><th>Freq</th><th>p.a.</th><th>SE prior / add-backs</th><th></th></tr></thead>
          <tbody>
            {income.map((l) => (
              <tr key={l.id}>
                <td><strong>{l.type ?? "—"}</strong></td><td>{l.owner ?? "—"}</td>
                <td>{money(l.amount)}</td><td>{l.frequency ?? "—"}</td><td>{money(annual(l.amount, l.frequency))}</td>
                <td>{l.priorYearAmount || l.addBacks ? `${money(l.priorYearAmount)} / ${money(l.addBacks)}` : "—"}</td>
                <td><form action={deleteIncomeAction}>{hidden}<input type="hidden" name="lineId" value={l.id} /><button className="x" aria-label="Delete">×</button></form></td>
              </tr>
            ))}
            {income.length === 0 && <tr><td colSpan={7} className="muted">No income recorded.</td></tr>}
          </tbody>
        </table>
        <form action={addIncomeAction} style={{ marginTop: 12 }}>
          {hidden}
          <div className="row">
            <label className="f"><span>Type</span><select name="type" defaultValue="PAYG base">{INCOME_TYPES.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label className="f"><span>Owner</span><select name="owner" defaultValue="Applicant">{OWNER_OPTS.map((x) => <option key={x}>{x}</option>)}</select></label>
          </div>
          <div className="row">
            <label className="f"><span>Amount</span><input name="amount" type="number" step="100" /></label>
            <label className="f"><span>Frequency</span><select name="frequency" defaultValue="Annual">{INCOME_FREQ.map((x) => <option key={x}>{x}</option>)}</select></label>
          </div>
          <div className="row">
            <label className="f"><span>Self-employed: prior-year amount</span><input name="priorYearAmount" type="number" step="100" /></label>
            <label className="f"><span>Self-employed: add-backs</span><input name="addBacks" type="number" step="100" /></label>
          </div>
          <label className="f"><span>Notes</span><input name="notes" /></label>
          <button className="btn" type="submit">Add income</button>
        </form>
        <p className="muted" style={{ fontSize: 12 }}>For self-employed income, record the latest figure as Amount and the prior financial year separately so a two-year average can be assessed; add-backs are depreciation, interest and one-offs added back.</p>
      </div>

      {/* ── Assets ─────────────────────────────────────────────── */}
      <div className="panel">
        <h2>Assets</h2>
        <table>
          <thead><tr><th>Type</th><th>Description</th><th>Owner</th><th>Value</th><th></th></tr></thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id}>
                <td><strong>{a.type ?? "—"}</strong></td><td>{a.description ?? "—"}</td><td>{a.owner ?? "—"}</td><td>{money(a.value)}</td>
                <td><form action={deleteAssetAction}>{hidden}<input type="hidden" name="lineId" value={a.id} /><button className="x" aria-label="Delete">×</button></form></td>
              </tr>
            ))}
            {assets.length === 0 && <tr><td colSpan={5} className="muted">No assets recorded.</td></tr>}
          </tbody>
        </table>
        <form action={addAssetAction} style={{ marginTop: 12 }}>
          {hidden}
          <div className="row">
            <label className="f"><span>Type</span><select name="type" defaultValue="Property">{ASSET_TYPES.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label className="f"><span>Owner</span><select name="owner" defaultValue="Applicant">{OWNER_OPTS.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label className="f"><span>Value</span><input name="value" type="number" step="500" /></label>
          </div>
          <label className="f"><span>Description</span><input name="description" /></label>
          <button className="btn" type="submit">Add asset</button>
        </form>
      </div>

      {/* ── Liabilities ────────────────────────────────────────── */}
      <div className="panel">
        <h2>Liabilities</h2>
        <table>
          <thead><tr><th>Type</th><th>Description</th><th>Owner</th><th>Limit</th><th>Balance</th><th>Repayment</th><th></th></tr></thead>
          <tbody>
            {liabilities.map((l) => (
              <tr key={l.id}>
                <td><strong>{l.type ?? "—"}</strong></td><td>{l.description ?? "—"}</td><td>{l.owner ?? "—"}</td>
                <td>{money(l.limit)}</td><td>{money(l.balance)}</td><td>{l.repayment ? `${money(l.repayment)} / ${(l.frequency ?? "mth").toLowerCase()}` : "—"}</td>
                <td><form action={deleteLiabilityAction}>{hidden}<input type="hidden" name="lineId" value={l.id} /><button className="x" aria-label="Delete">×</button></form></td>
              </tr>
            ))}
            {liabilities.length === 0 && <tr><td colSpan={7} className="muted">No liabilities recorded.</td></tr>}
          </tbody>
        </table>
        <form action={addLiabilityAction} style={{ marginTop: 12 }}>
          {hidden}
          <div className="row">
            <label className="f"><span>Type</span><select name="type" defaultValue="Home loan">{LIABILITY_TYPES.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label className="f"><span>Owner</span><select name="owner" defaultValue="Applicant">{OWNER_OPTS.map((x) => <option key={x}>{x}</option>)}</select></label>
          </div>
          <div className="row">
            <label className="f"><span>Limit (cards / LOC)</span><input name="limit" type="number" step="500" /></label>
            <label className="f"><span>Balance</span><input name="balance" type="number" step="500" /></label>
          </div>
          <div className="row">
            <label className="f"><span>Repayment</span><input name="repayment" type="number" step="50" /></label>
            <label className="f"><span>Frequency</span><select name="frequency" defaultValue="Monthly">{INCOME_FREQ.map((x) => <option key={x}>{x}</option>)}</select></label>
          </div>
          <label className="f"><span>Description</span><input name="description" /></label>
          <button className="btn" type="submit">Add liability</button>
        </form>
      </div>

      {/* ── Assessment summary (what the Modeller reads today) ──── */}
      <div className="panel">
        <h2>Assessment summary</h2>
        <p className="sub" style={{ marginTop: -6 }}>
          The figures the Modeller assesses serviceability against today. Detailed income totals {money(incomePA)} p.a.;
          detailed monthly repayments {money(liabRepayMonthly)}. The engine will read the detailed lines directly as the next step.
        </p>
        <form action={saveClientFinancesAction}>
          <input type="hidden" name="clientId" value={c.id} />
          <div className="row">
            <label className="f"><span>Gross income (annual, primary)</span><input name="grossIncome" type="number" step="1000" defaultValue={num(f.grossIncome)} /></label>
            <label className="f"><span>Partner income (annual)</span><input name="partnerIncome" type="number" step="1000" defaultValue={num(f.partnerIncome)} /></label>
          </div>
          <div className="row">
            <label className="f"><span>Living expenses (monthly)</span><input name="livingExpMonthly" type="number" step="50" defaultValue={num(f.livingExpMonthly)} /></label>
            <label className="f"><span>Dependants</span><input name="dependants" type="number" step="1" defaultValue={num(f.dependants)} /></label>
          </div>
          <div className="row">
            <label className="f"><span>Other monthly commitments</span><input name="monthlyCommitments" type="number" step="50" defaultValue={num(f.monthlyCommitments)} /></label>
            <label className="f"><span>Total card limits</span><input name="cardLimits" type="number" step="500" defaultValue={num(f.cardLimits)} /></label>
            <label className="f"><span>HECS / HELP balance</span><input name="hecsBalance" type="number" step="500" defaultValue={num(f.hecsBalance)} /></label>
          </div>
          <button className="btn" type="submit">Save assessment summary</button>
        </form>
      </div>
    </>
  );
}
