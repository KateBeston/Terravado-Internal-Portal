import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { listProperties, listClients } from "@/lib/domain/service";
import { createPropertyAction, deletePropertyAction, smartCreatePropertyAction } from "@/app/actions";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { CORELOGIC_CONFIGURED } from "@/lib/integrations/property-data/corelogic";
import { TITLES_CONFIGURED } from "@/lib/integrations/titles";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const STATUSES = ["considering", "owned", "sold"];
const money = (v?: number) => (v === undefined ? "—" : "$" + Math.round(v).toLocaleString("en-AU"));

export default async function PropertiesPage() {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const properties = await listProperties(tenantId);
  const clients = await listClients(tenantId);

  return (
    <section>
      <h1>Properties</h1>
      <p className="sub">Properties in active use by clients. {properties.length} on record. Open one to see its full record.</p>

      <div className="panel" style={{ borderLeft: "5px solid var(--green)" }}>
        <h2>Smart Search</h2>
        <p className="sub" style={{ marginTop: -4 }}>
          Enter an address and Terravado builds the record for you — geocode (lat/lng), suburb data, property attributes &amp;
          value from RP data, and title particulars from the land registry. It creates the property pre-filled, ready to review on its tabs.
        </p>
        <form action={smartCreatePropertyAction}>
          <label className="f"><span>Address</span><AddressAutocomplete name="address" required placeholder="Start typing the address…" /></label>
          <div className="row">
            <label className="f"><span>State</span>
              <select name="state" defaultValue="NSW">{STATES.map((s) => <option key={s}>{s}</option>)}</select>
            </label>
            <label className="f"><span>Status</span>
              <select name="status" defaultValue="considering">{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
            </label>
          </div>
          <label className="f"><span>Client (optional)</span>
            <select name="clientId" defaultValue=""><option value="">— No client —</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </label>
          <button className="btn" type="submit">Build record with Smart Search</button>
        </form>
        <p className="muted" style={{ fontSize: 12 }}>
          {CORELOGIC_CONFIGURED && TITLES_CONFIGURED
            ? "RP data and titles are connected — Smart Search returns live sourced data."
            : "Running on indicative placeholder data until " +
              [!CORELOGIC_CONFIGURED && "RP data (CoreLogic)", !TITLES_CONFIGURED && "a titles broker"].filter(Boolean).join(" and ") +
              " are connected. "}
          <Link href="/integrations">See Integrations →</Link>
        </p>
      </div>

      <div className="panel">
        <h2>Add a property manually</h2>
        <form action={createPropertyAction}>
          <label className="f"><span>Address</span><AddressAutocomplete name="address" required placeholder="Street, suburb, state, postcode" /></label>
          <div className="row">
            <label className="f"><span>State</span>
              <select name="state" defaultValue="NSW">{STATES.map((s) => <option key={s}>{s}</option>)}</select>
            </label>
            <label className="f"><span>Price</span><input name="price" inputMode="numeric" placeholder="1,250,000" /></label>
          </div>
          <div className="row">
            <label className="f"><span>Status</span>
              <select name="status" defaultValue="considering">{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
            </label>
            <label className="f"><span>Client (optional)</span>
              <select name="clientId" defaultValue=""><option value="">— No client —</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            </label>
          </div>
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
                <td><Link href={`/properties/${p.id}`}><strong>{p.address}</strong></Link></td>
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
