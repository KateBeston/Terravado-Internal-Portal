import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { getProperty } from "@/lib/domain/service";
import { savePropertyDetailsAction, addPropertyListItemAction, removePropertyListItemAction } from "@/app/actions";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PropertyTitleTab({ params }: { params: { id: string } }) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const p = await getProperty(tenantId, params.id);
  if (!p) notFound();
  const t = p.details?.title ?? {};
  const easements = t.easements ?? [];
  const encumbrances = t.encumbrances ?? [];

  return (
    <>
      <div className="panel">
        <h2>Title</h2>
        <form action={savePropertyDetailsAction}>
          <input type="hidden" name="id" value={p.id} />
          <input type="hidden" name="section" value="title" />
          <div className="row">
            <label className="f"><span>Title reference</span><input name="titleRef" defaultValue={t.titleRef ?? ""} placeholder="12/SP12345" /></label>
            <label className="f"><span>Lot / DP</span><input name="lotDp" defaultValue={t.lotDp ?? ""} placeholder="Lot 12 DP 1234" /></label>
          </div>
          <label className="f"><span>Zoning</span><input name="zoning" defaultValue={t.zoning ?? ""} placeholder="R2 Low Density Residential" /></label>
          <label className="f" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" name="heritage" defaultChecked={!!t.heritage} style={{ width: "auto" }} />
            <span style={{ margin: 0 }}>Heritage listed / affected</span>
          </label>
          <label className="f"><span>Heritage note</span><textarea name="heritageNote" rows={2} defaultValue={t.heritageNote ?? ""} /></label>
          <button className="btn" type="submit">Save title</button>
        </form>
      </div>

      <div className="panel">
        <h2>Easements</h2>
        <table>
          <thead><tr><th>Type</th><th>Beneficiary</th><th>Width (m)</th><th>Note</th><th></th></tr></thead>
          <tbody>
            {easements.map((e, i) => (
              <tr key={i}>
                <td>{e.type ?? "—"}</td><td>{e.beneficiary ?? "—"}</td><td>{e.width ?? "—"}</td><td className="muted">{e.note ?? ""}</td>
                <td>
                  <form action={removePropertyListItemAction}>
                    <input type="hidden" name="id" value={p.id} /><input type="hidden" name="list" value="easements" /><input type="hidden" name="index" value={i} />
                    <button className="x" type="submit" aria-label="Remove">×</button>
                  </form>
                </td>
              </tr>
            ))}
            {easements.length === 0 && <tr><td colSpan={5} className="muted">No easements recorded.</td></tr>}
          </tbody>
        </table>
        <form action={addPropertyListItemAction} style={{ marginTop: 12 }}>
          <input type="hidden" name="id" value={p.id} /><input type="hidden" name="list" value="easements" />
          <div className="row">
            <label className="f"><span>Type</span><input name="type" placeholder="Sewer main" /></label>
            <label className="f"><span>Beneficiary</span><input name="beneficiary" placeholder="Sydney Water" /></label>
          </div>
          <div className="row">
            <label className="f"><span>Width (m)</span><input name="width" inputMode="numeric" /></label>
            <label className="f"><span>Note</span><input name="note" placeholder="Restricts rear extension" /></label>
          </div>
          <button className="btn" type="submit">Add easement</button>
        </form>
      </div>

      <div className="panel">
        <h2>Encumbrances &amp; covenants</h2>
        <table>
          <thead><tr><th>Type</th><th>Detail</th><th>Impact</th><th></th></tr></thead>
          <tbody>
            {encumbrances.map((e, i) => (
              <tr key={i}>
                <td>{e.type ?? "—"}</td><td>{e.detail ?? "—"}</td><td className="muted">{e.impact ?? ""}</td>
                <td>
                  <form action={removePropertyListItemAction}>
                    <input type="hidden" name="id" value={p.id} /><input type="hidden" name="list" value="encumbrances" /><input type="hidden" name="index" value={i} />
                    <button className="x" type="submit" aria-label="Remove">×</button>
                  </form>
                </td>
              </tr>
            ))}
            {encumbrances.length === 0 && <tr><td colSpan={4} className="muted">No encumbrances recorded.</td></tr>}
          </tbody>
        </table>
        <form action={addPropertyListItemAction} style={{ marginTop: 12 }}>
          <input type="hidden" name="id" value={p.id} /><input type="hidden" name="list" value="encumbrances" />
          <div className="row">
            <label className="f"><span>Type</span><input name="type" placeholder="Covenant" /></label>
            <label className="f"><span>Detail</span><input name="detail" placeholder="Single dwelling only" /></label>
          </div>
          <label className="f"><span>Impact</span><input name="impact" placeholder="Blocks dual occupancy" /></label>
          <button className="btn" type="submit">Add encumbrance</button>
        </form>
      </div>
    </>
  );
}
