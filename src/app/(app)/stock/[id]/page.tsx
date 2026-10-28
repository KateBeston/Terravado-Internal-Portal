import { requireUser, requireCapability } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { getDevelopment, listLots } from "@/lib/domain/service";
import { updateDevelopmentAction, deleteDevelopmentAction, createLotAction, deleteLotAction } from "@/app/actions";
import { LOT_STATUS } from "@/lib/domain/types";
import StockImport from "@/components/StockImport";
import { STOCK_EXTRACTION_CONFIGURED } from "@/lib/integrations/extraction";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";
const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const money = (v?: number | null) => (v === undefined || v === null ? "—" : "$" + Math.round(v).toLocaleString("en-AU"));
const v = (x?: number | string) => (x === undefined || x === null || x === "" ? "" : String(x));
const label = (s?: string) => (s ? s.replace(/_/g, " ") : "—");

export default async function DevelopmentPage({ params }: { params: { id: string } }) {
  await requireUser();
  await requireCapability("stock");
  const { tenantId } = await getCurrentTenant();
  const d = await getDevelopment(tenantId, params.id);
  if (!d) notFound();
  const lots = (await listLots(tenantId)).filter((l) => l.developmentId === d.id);
  const totalValue = lots.reduce((s, l) => s + (l.price ?? 0), 0);

  return (
    <section>
      <div className="sub" style={{ marginBottom: 6 }}><Link href="/stock">← Stock</Link></div>
      <h1 style={{ marginBottom: 6 }}>{d.name}</h1>
      <p className="sub">{[d.developer, d.suburb, d.state].filter(Boolean).join(" · ") || "Development"} · {lots.length} lot{lots.length === 1 ? "" : "s"} · {money(totalValue)} total</p>

      <div className="panel">
        <h2>Development</h2>
        <form action={updateDevelopmentAction}>
          <input type="hidden" name="id" value={d.id} />
          <div className="row">
            <label className="f"><span>Project name</span><input name="name" defaultValue={v(d.name)} required /></label>
            <label className="f"><span>Developer</span><input name="developer" defaultValue={v(d.developer)} /></label>
          </div>
          <div className="row">
            <label className="f"><span>Suburb</span><input name="suburb" defaultValue={v(d.suburb)} /></label>
            <label className="f"><span>State</span><select name="state" defaultValue={d.state ?? "NSW"}>{STATES.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label className="f"><span>Status</span>
              <select name="status" defaultValue={d.status ?? "active"}><option value="active">Active</option><option value="sold_out">Sold out</option><option value="archived">Archived</option></select>
            </label>
          </div>
          <div className="row">
            <label className="f"><span>Commission %</span><input name="commissionPct" type="number" step="0.1" defaultValue={v(d.commissionPct)} /></label>
            <label className="f"><span>or Commission flat ($/lot)</span><input name="commissionFlat" type="number" step="500" defaultValue={v(d.commissionFlat)} /></label>
          </div>
          <label className="f"><span>Stock list (PDF link)</span><input name="stockListUrl" defaultValue={v(d.stockListUrl)} /></label>
          <label className="f"><span>Notes</span><textarea name="notes" rows={2} defaultValue={v(d.notes)} /></label>
          <button className="btn" type="submit">Save development</button>
        </form>
        {d.stockListUrl && <p className="muted" style={{ fontSize: 12 }}><a href={d.stockListUrl} target="_blank" rel="noreferrer">Open stock list ↗</a></p>}
      </div>

      <div className="panel">
        <h2>Lots / stock</h2>
        <table>
          <thead><tr><th>Lot</th><th>Address</th><th>Stage</th><th>Price</th><th>Adv. rent</th><th>Adv. yield</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {lots.map((l) => (
              <tr key={l.id}>
                <td><strong>{l.lotNumber ?? "—"}</strong></td>
                <td>{l.address ?? "—"}</td>
                <td>{l.stage ?? "—"}</td>
                <td>{money(l.price)}</td>
                <td>{l.advertisedRent ? `$${l.advertisedRent}/wk` : "—"}</td>
                <td>{l.advertisedYieldPct != null ? `${l.advertisedYieldPct}%` : "—"}</td>
                <td><span className="badge">{label(l.status)}</span></td>
                <td>
                  <form action={deleteLotAction}>
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="developmentId" value={d.id} />
                    <button className="x" type="submit" aria-label="Delete">×</button>
                  </form>
                </td>
              </tr>
            ))}
            {lots.length === 0 && <tr><td colSpan={8} className="muted">No lots yet — add them from the stock list below.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Import from stock list</h2>
        <StockImport developmentId={d.id} aiEnabled={STOCK_EXTRACTION_CONFIGURED} />
      </div>

      <div className="panel">
        <h2>Add a lot</h2>
        <form action={createLotAction}>
          <input type="hidden" name="developmentId" value={d.id} />
          <div className="row">
            <label className="f"><span>Lot number</span><input name="lotNumber" /></label>
            <label className="f"><span>Address</span><input name="address" /></label>
            <label className="f"><span>Stage</span><input name="stage" placeholder="e.g. Stage 3" /></label>
          </div>
          <div className="row">
            <label className="f"><span>Price</span><input name="price" type="number" step="1000" /></label>
            <label className="f"><span>Status</span><select name="status" defaultValue="available">{LOT_STATUS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}</select></label>
            <label className="f"><span>Land size (m²)</span><input name="landSize" type="number" step="1" /></label>
          </div>
          <div className="row">
            <label className="f"><span>Beds</span><input name="beds" type="number" step="1" /></label>
            <label className="f"><span>Baths</span><input name="baths" type="number" step="1" /></label>
            <label className="f"><span>Cars</span><input name="cars" type="number" step="1" /></label>
          </div>
          <div className="row">
            <label className="f"><span>Advertised rent ($/wk)</span><input name="advertisedRent" type="number" step="5" /></label>
            <label className="f"><span>Advertised yield %</span><input name="advertisedYieldPct" type="number" step="0.1" /></label>
            <label className="f"><span>Advertised ROI (marketing)</span><input name="advertisedRoi" placeholder="e.g. 6.2% gross / dual income" /></label>
          </div>
          <button className="btn" type="submit">Add lot</button>
        </form>
      </div>

      <form action={deleteDevelopmentAction}>
        <input type="hidden" name="id" value={d.id} />
        <button className="x" type="submit" style={{ width: "auto", padding: "6px 12px" }}>Delete this development</button>
      </form>
    </section>
  );
}
