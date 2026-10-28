import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { getProperty } from "@/lib/domain/service";
import { addPropertyListItemAction, removePropertyListItemAction, updatePropertyListItemAction } from "@/app/actions";
import { VALUATION_TYPES } from "@/lib/domain/types";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
const v = (x?: number | string) => (x === undefined || x === null || x === "" ? "" : String(x));
const money = (x?: number | null) => (x === undefined || x === null ? "—" : (x < 0 ? "-$" : "$") + Math.abs(Math.round(x)).toLocaleString("en-AU"));

export default async function PropertyValuationsTab({ params }: { params: { id: string } }) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const p = await getProperty(tenantId, params.id);
  if (!p) notFound();
  const vals = p.details?.valuations ?? [];
  const contract = p.price;

  // Latest dated valuation (fallback to last entered) drives the headline.
  const latest = [...vals].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "")).at(-1);
  const variance = latest?.value !== undefined && contract !== undefined ? latest.value - contract : undefined;
  const lendingValue = latest?.value !== undefined && contract !== undefined ? Math.min(latest.value, contract) : undefined;
  const shortfall = variance !== undefined && variance < 0;

  return (
    <>
      <p className="muted" style={{ marginTop: -6 }}>
        Valuation events for this property. Lenders assess LVR on the <strong>lower</strong> of the contract price and the
        valuation, so a valuation under contract is funded by the borrower — the variance is what matters for the deal.
      </p>

      <div className="cards">
        <div className="card"><div className="k">Contract / current price</div><div className="v">{money(contract)}</div></div>
        <div className="card"><div className="k">Latest valuation</div><div className="v">{money(latest?.value)}</div><div className="k">{latest?.type ?? "—"}</div></div>
        <div className="card"><div className="k">Variance vs contract</div><div className="v" style={{ color: shortfall ? "#b03a2e" : variance ? "#1f6f54" : undefined }}>{variance === undefined ? "—" : money(variance)}</div></div>
        <div className="card"><div className="k">Lending value (lower of)</div><div className="v">{money(lendingValue)}</div></div>
      </div>

      {shortfall && (
        <div className="panel" style={{ borderLeft: "5px solid #b03a2e" }}>
          <strong>Valuation shortfall of {money(Math.abs(variance!))}.</strong> The lender assesses against {money(lendingValue)},
          not the {money(contract)} contract — the borrower funds the {money(Math.abs(variance!))} gap on top of their deposit, and
          the LVR is calculated on the lower figure.
        </div>
      )}

      <div className="panel">
        <h2>Valuations</h2>
        <table>
          <thead><tr><th>Date</th><th>Type</th><th>Valuer / lender</th><th>Value</th><th>Variance</th><th>Basis</th><th></th></tr></thead>
          <tbody>
            {vals.map((r, i) => {
              const varI = r.value !== undefined && contract !== undefined ? r.value - contract : undefined;
              return (
                <tr key={i}>
                  <td>
                    <form id={`val-${i}`} action={updatePropertyListItemAction}>
                      <input type="hidden" name="id" value={p.id} /><input type="hidden" name="list" value="valuations" /><input type="hidden" name="index" value={i} />
                    </form>
                    <input form={`val-${i}`} name="date" type="date" defaultValue={r.date ?? ""} />
                  </td>
                  <td>
                    <select form={`val-${i}`} name="type" defaultValue={r.type ?? "Bank valuation (full)"}>{VALUATION_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
                  </td>
                  <td><input form={`val-${i}`} name="valuer" defaultValue={r.valuer ?? ""} style={{ width: 130 }} /></td>
                  <td><input form={`val-${i}`} name="value" inputMode="numeric" defaultValue={v(r.value)} style={{ width: 120 }} /></td>
                  <td style={{ color: varI === undefined ? undefined : varI < 0 ? "#b03a2e" : "#1f6f54" }}>{varI === undefined ? "—" : money(varI)}</td>
                  <td><input form={`val-${i}`} name="basis" defaultValue={r.basis ?? ""} style={{ width: 110 }} /></td>
                  <td style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button form={`val-${i}`} className="btn" type="submit">Save</button>
                    <form action={removePropertyListItemAction}>
                      <input type="hidden" name="id" value={p.id} /><input type="hidden" name="list" value="valuations" /><input type="hidden" name="index" value={i} />
                      <button className="x" type="submit" aria-label="Remove">×</button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {vals.length === 0 && <tr><td colSpan={7} className="muted">No valuations recorded yet.</td></tr>}
          </tbody>
        </table>
        <form action={addPropertyListItemAction} style={{ marginTop: 12 }}>
          <input type="hidden" name="id" value={p.id} /><input type="hidden" name="list" value="valuations" />
          <div className="row">
            <label className="f"><span>Date</span><input name="date" type="date" /></label>
            <label className="f"><span>Type</span><select name="type" defaultValue="Bank valuation (full)">{VALUATION_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
          </div>
          <div className="row">
            <label className="f"><span>Valuer / lender</span><input name="valuer" placeholder="e.g. Herron Todd White / CBA" /></label>
            <label className="f"><span>Assessed value</span><input name="value" inputMode="numeric" placeholder="1,180,000" /></label>
          </div>
          <div className="row">
            <label className="f"><span>Basis</span><input name="basis" placeholder="as is / on completion / market value" /></label>
            <label className="f"><span>Note</span><input name="note" placeholder="e.g. came in under contract" /></label>
          </div>
          <button className="btn" type="submit">Add valuation</button>
        </form>
        <p className="muted" style={{ fontSize: 12 }}>
          The contract / current price is the property&apos;s price on its record. Not a valuation or tax advice.
        </p>
      </div>
    </>
  );
}
