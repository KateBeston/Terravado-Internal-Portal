import { requireUser, requireCapability } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { listDevelopments, listLots } from "@/lib/domain/service";
import { createDevelopmentAction } from "@/app/actions";
import Link from "next/link";

export const dynamic = "force-dynamic";
const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

export default async function StockPage() {
  await requireUser();
  await requireCapability("stock");
  const { tenantId } = await getCurrentTenant();
  const [developments, lots] = await Promise.all([listDevelopments(tenantId), listLots(tenantId)]);
  const lotCount = (devId: string) => lots.filter((l) => l.developmentId === devId).length;
  const availCount = (devId: string) => lots.filter((l) => l.developmentId === devId && l.status === "available").length;

  return (
    <section>
      <h1>Stock</h1>
      <p className="sub">Developer projects you have stock in. Load a development, add its lots, and the Modeller &amp; matching run off them. {developments.length} development{developments.length === 1 ? "" : "s"}.</p>

      <div className="panel">
        <h2>Add a development</h2>
        <form action={createDevelopmentAction}>
          <div className="row">
            <label className="f"><span>Project name</span><input name="name" required placeholder="e.g. Parkside Release 3" /></label>
            <label className="f"><span>Developer</span><input name="developer" /></label>
          </div>
          <div className="row">
            <label className="f"><span>Suburb</span><input name="suburb" /></label>
            <label className="f"><span>State</span><select name="state" defaultValue="NSW">{STATES.map((s) => <option key={s}>{s}</option>)}</select></label>
          </div>
          <div className="row">
            <label className="f"><span>Commission %</span><input name="commissionPct" type="number" step="0.1" placeholder="e.g. 5" /></label>
            <label className="f"><span>or Commission flat ($/lot)</span><input name="commissionFlat" type="number" step="500" /></label>
          </div>
          <label className="f"><span>Stock list (link to the PDF)</span><input name="stockListUrl" placeholder="https://… where the stock list PDF is held" /></label>
          <label className="f"><span>Notes</span><textarea name="notes" rows={2} /></label>
          <button className="btn" type="submit">Add development</button>
        </form>
      </div>

      <div className="panel">
        <h2>All developments</h2>
        <table>
          <thead><tr><th>Project</th><th>Developer</th><th>Location</th><th>Lots</th><th>Available</th><th>Commission</th></tr></thead>
          <tbody>
            {developments.map((d) => (
              <tr key={d.id}>
                <td><Link href={`/stock/${d.id}`}><strong>{d.name}</strong></Link></td>
                <td>{d.developer ?? "—"}</td>
                <td>{[d.suburb, d.state].filter(Boolean).join(" ") || "—"}</td>
                <td>{lotCount(d.id)}</td>
                <td>{availCount(d.id)}</td>
                <td>{d.commissionPct ? `${d.commissionPct}%` : d.commissionFlat ? `$${d.commissionFlat.toLocaleString("en-AU")}/lot` : "—"}</td>
              </tr>
            ))}
            {developments.length === 0 && <tr><td colSpan={6} className="muted">No developments yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
