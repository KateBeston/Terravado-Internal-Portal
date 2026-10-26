import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { getProperty } from "@/lib/domain/service";
import { addPropertyListItemAction, removePropertyListItemAction } from "@/app/actions";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
const money = (v?: number) => (v === undefined || v === null ? "—" : "$" + Math.round(v).toLocaleString("en-AU"));

export default async function PropertySalesTab({ params }: { params: { id: string } }) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const p = await getProperty(tenantId, params.id);
  if (!p) notFound();

  // Keep original indices for removal, but show newest first.
  const sales = (p.details?.sales ?? []).map((s, i) => ({ ...s, _i: i }))
    .sort((a, b) => ((a.date ?? "") < (b.date ?? "") ? 1 : -1));

  const growth = (() => {
    const dated = sales.filter((s) => s.date && s.price).sort((a, b) => (a.date! < b.date! ? -1 : 1));
    if (dated.length < 2) return null;
    const first = dated[0], last = dated[dated.length - 1];
    const years = (new Date(last.date!).getTime() - new Date(first.date!).getTime()) / (365.25 * 864e5);
    if (years <= 0 || !first.price || !last.price) return null;
    return (Math.pow(last.price / first.price, 1 / years) - 1) * 100;
  })();

  return (
    <>
      <div className="panel">
        <h2>Sales history</h2>
        {growth !== null && (
          <p className="muted" style={{ marginTop: -4 }}>
            Compound growth across the recorded sales: <strong>{growth.toFixed(1)}% p.a.</strong>
          </p>
        )}
        <table>
          <thead><tr><th>Date</th><th>Price</th><th>Method</th><th>Note</th><th></th></tr></thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s._i}>
                <td className="lbl">{s.date ?? "—"}</td>
                <td>{money(s.price)}</td>
                <td>{s.method ?? "—"}</td>
                <td className="muted">{s.note ?? ""}</td>
                <td>
                  <form action={removePropertyListItemAction}>
                    <input type="hidden" name="id" value={p.id} /><input type="hidden" name="list" value="sales" /><input type="hidden" name="index" value={s._i} />
                    <button className="x" type="submit" aria-label="Remove">×</button>
                  </form>
                </td>
              </tr>
            ))}
            {sales.length === 0 && <tr><td colSpan={5} className="muted">No sales recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Add a sale</h2>
        <form action={addPropertyListItemAction}>
          <input type="hidden" name="id" value={p.id} /><input type="hidden" name="list" value="sales" />
          <div className="row">
            <label className="f"><span>Date</span><input name="date" type="date" /></label>
            <label className="f"><span>Price</span><input name="price" inputMode="numeric" placeholder="900,000" /></label>
          </div>
          <div className="row">
            <label className="f"><span>Method</span><input name="method" placeholder="Auction / Private treaty" /></label>
            <label className="f"><span>Note</span><input name="note" placeholder="Post-COVID surge" /></label>
          </div>
          <button className="btn" type="submit">Add sale</button>
        </form>
        <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
          Full sales history is the owned data moat — entered by hand now, and the target for the Valuer-General /
          land-titles feed once connected, so macro and micro price patterns can drive the modelling.
        </p>
      </div>
    </>
  );
}
