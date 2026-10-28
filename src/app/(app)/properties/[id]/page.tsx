import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { getProperty, listClients, listEntities } from "@/lib/domain/service";
import { updatePropertyClientAction, updatePropertyCoreAction } from "@/app/actions";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const money = (v?: number | null) => (v === undefined || v === null ? "—" : "$" + Math.round(v).toLocaleString("en-AU"));
const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const STATUSES: { v: string; label: string }[] = [
  { v: "considering", label: "Considering" }, { v: "owned", label: "Owned" }, { v: "sold", label: "Sold" },
];

export default async function PropertyOverview({ params }: { params: { id: string } }) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const p = await getProperty(tenantId, params.id);
  if (!p) notFound();
  const [clients, entities] = await Promise.all([listClients(tenantId), listEntities(tenantId)]);

  const d = p.details ?? {};
  const t = d.title ?? {}; const l = d.locality ?? {}; const ph = d.physical ?? {};
  const sales = d.sales ?? []; const easements = t.easements ?? []; const encumbrances = t.encumbrances ?? [];
  const lastSale = sales.filter((s) => s.date).sort((a, b) => (a.date! < b.date! ? 1 : -1))[0];

  return (
    <>
      <div className="cards">
        <div className="card"><div className="k">Zoning</div><div className="v">{t.zoning ?? "—"}</div></div>
        <div className="card"><div className="k">Land size</div><div className="v">{ph.landSize ? `${ph.landSize} m²` : "—"}</div></div>
        <div className="card"><div className="k">Suburb median</div><div className="v">{money(l.suburbMedian)}</div></div>
        <div className="card"><div className="k">Last sale</div><div className="v">{lastSale ? money(lastSale.price) : "—"}</div></div>
      </div>

      <div className="panel">
        <h2>Property details</h2>
        <form action={updatePropertyCoreAction}>
          <input type="hidden" name="id" value={p.id} />
          <label className="f"><span>Address</span><AddressAutocomplete name="address" defaultValue={p.address ?? ""} required /></label>
          <div className="row">
            <label className="f"><span>State</span>
              <select name="state" defaultValue={p.state ?? "NSW"}>{STATES.map((s) => <option key={s}>{s}</option>)}</select>
            </label>
            <label className="f"><span>Price</span><input name="price" type="number" step="1000" defaultValue={p.price ?? ""} /></label>
            <label className="f"><span>Status</span>
              <select name="status" defaultValue={p.status ?? "considering"}>{STATUSES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}</select>
            </label>
          </div>
          <label className="f"><span>Owning entity (trust / SMSF / company)</span>
            <select name="entityId" defaultValue={p.entityId ?? ""}>
              <option value="">— None (held personally) —</option>
              {entities.map((e) => <option key={e.id} value={e.id}>{e.name}{e.kind ? ` (${e.kind})` : ""}</option>)}
            </select>
          </label>
          <button className="btn" type="submit">Save details</button>
        </form>
      </div>

      <div className="panel">
        <h2>Client</h2>
        <form action={updatePropertyClientAction} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <input type="hidden" name="id" value={p.id} />
          <label className="f" style={{ flex: 1, minWidth: 220, marginBottom: 0 }}><span>Assigned client (rolls up into their portfolio)</span>
            <select name="clientId" defaultValue={p.clientId ?? ""}>
              <option value="">— Unassigned —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <button className="btn" type="submit" style={{ margin: 0 }}>Save</button>
        </form>
      </div>

      <div className="panel">
        <h2>This record</h2>
        <table>
          <tbody>
            <tr><td className="muted">Title</td><td>{t.titleRef || t.lotDp || "Not entered"}</td>
                <td className="muted">Easements / encumbrances</td><td>{easements.length} / {encumbrances.length}</td></tr>
            <tr><td className="muted">Locality</td><td>{[l.suburb, l.region, l.postcode].filter(Boolean).join(" ") || "Not entered"}</td>
                <td className="muted">Sales recorded</td><td>{sales.length}</td></tr>
            <tr><td className="muted">Dwelling</td><td>{ph.type ? `${ph.type}${ph.beds ? `, ${ph.beds} bed` : ""}` : "Not entered"}</td>
                <td className="muted">Weekly rent</td><td>{d.weeklyRent ? `$${d.weeklyRent}/wk` : "Not entered"}</td></tr>
          </tbody>
        </table>
        <div style={{ marginTop: 14 }}>
          <Link className="btn" href={`/properties/${p.id}/modelling`}>Model this property →</Link>
        </div>
      </div>

      <p className="muted" style={{ fontSize: 12 }}>
        Each tab holds one part of the record. Title, locality, physical and sales can be entered by hand now;
        the Locality tab can also pull suburb figures from the connected data provider.
      </p>
    </>
  );
}
