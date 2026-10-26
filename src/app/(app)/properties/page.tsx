import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { listProperties } from "@/lib/domain/service";
import { createPropertyAction, deletePropertyAction } from "@/app/actions";

export const dynamic = "force-dynamic";

const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const STATUSES = ["considering", "owned", "sold"];
const money = (v?: number) => (v === undefined ? "—" : "$" + Math.round(v).toLocaleString("en-AU"));

export default async function PropertiesPage() {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const properties = await listProperties(tenantId);

  return (
    <section>
      <h1>Properties</h1>
      <p className="sub">Properties in active use by clients. {properties.length} on record.</p>

      <div className="panel">
        <h2>Add a property</h2>
        <form action={createPropertyAction}>
          <label className="f"><span>Address</span><input name="address" required placeholder="Street, suburb, state, postcode" /></label>
          <div className="row">
            <label className="f"><span>State</span>
              <select name="state" defaultValue="NSW">{STATES.map((s) => <option key={s}>{s}</option>)}</select>
            </label>
            <label className="f"><span>Price</span><input name="price" inputMode="numeric" placeholder="1,250,000" /></label>
          </div>
          <label className="f"><span>Status</span>
            <select name="status" defaultValue="considering">{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
          </label>
          <button className="btn" type="submit">Add property</button>
        </form>
      </div>

      <div className="panel">
        <h2>All properties</h2>
        <table>
          <thead><tr><th>Address</th><th>State</th><th>Price</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {properties.map((p) => (
              <tr key={p.id}>
                <td><strong>{p.address}</strong></td>
                <td>{p.state ?? "—"}</td>
                <td>{money(p.price)}</td>
                <td><span className="badge">{p.status ?? "—"}</span></td>
                <td>
                  <form action={deletePropertyAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <button className="x" type="submit" aria-label="Delete">×</button>
                  </form>
                </td>
              </tr>
            ))}
            {properties.length === 0 && <tr><td colSpan={5} className="muted">No properties yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
