import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { getContact, listProperties } from "@/lib/domain/service";
import { createPropertyAction } from "@/app/actions";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";
const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const money = (v?: number | null) => (v === undefined || v === null ? "—" : "$" + Math.round(v).toLocaleString("en-AU"));

export default async function PersonPropertiesTab({ params }: { params: { id: string } }) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const c = await getContact(tenantId, params.id);
  if (!c) notFound();
  const mine = (await listProperties(tenantId)).filter((p) => p.clientId === c.id);
  const totalValue = mine.reduce((s, p) => s + (p.price ?? 0), 0);

  return (
    <>
      <p className="sub">Properties owned or being considered by {c.name}. {mine.length} on record · {money(totalValue)} total.</p>

      <div className="panel">
        <h2>Their properties</h2>
        <table>
          <thead><tr><th>Address</th><th>State</th><th>Price</th><th>Status</th></tr></thead>
          <tbody>
            {mine.map((p) => (
              <tr key={p.id}>
                <td><Link href={`/properties/${p.id}`}><strong>{p.address}</strong></Link></td>
                <td>{p.state ?? "—"}</td>
                <td>{money(p.price)}</td>
                <td><span className="badge">{p.status ?? "—"}</span></td>
              </tr>
            ))}
            {mine.length === 0 && <tr><td colSpan={4} className="muted">No properties linked yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Add a property for this person</h2>
        <form action={createPropertyAction}>
          <input type="hidden" name="clientId" value={c.id} />
          <label className="f"><span>Address</span><input name="address" required /></label>
          <div className="row">
            <label className="f"><span>State</span><select name="state" defaultValue="NSW">{STATES.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label className="f"><span>Price</span><input name="price" type="number" step="1000" /></label>
            <label className="f"><span>Status</span>
              <select name="status" defaultValue="considering">
                <option value="considering">Considering</option><option value="owned">Owned</option><option value="sold">Sold</option>
              </select>
            </label>
          </div>
          <button className="btn" type="submit">Add property</button>
        </form>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link className="btn ghost" href={`/portfolio?clientId=${c.id}`}>Portfolio roll-up →</Link>
        <Link className="btn ghost" href={`/modeller?clientId=${c.id}`}>Model for this person →</Link>
      </div>
    </>
  );
}
