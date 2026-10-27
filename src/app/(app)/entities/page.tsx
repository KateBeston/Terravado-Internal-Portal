import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { listEntities, listClients } from "@/lib/domain/service";
import { createEntityAction, deleteEntityAction } from "@/app/actions";
import { ENTITY_TYPES } from "@/lib/domain/types";
import Link from "next/link";

export const dynamic = "force-dynamic";
const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

export default async function EntitiesPage() {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const [entities, clients] = await Promise.all([listEntities(tenantId), listClients(tenantId)]);
  const clientName = (id?: string) => (id ? clients.find((c) => c.id === id)?.name ?? "—" : "—");

  return (
    <section>
      <h1>Entities</h1>
      <p className="sub">One record for every company, trust, SMSF or partnership that holds property, and every network organisation — agency, lender, conveyancer, accountant, developer. {entities.length} on record. Click a name for its full record.</p>

      <div className="panel">
        <h2>Add an entity</h2>
        <form action={createEntityAction}>
          <label className="f"><span>Name</span><input name="name" required placeholder="e.g. Smith Family Trust / ABC Buyers Agency" /></label>
          <div className="row">
            <label className="f"><span>Type</span><select name="kind" defaultValue="Company">{ENTITY_TYPES.map((k) => <option key={k}>{k}</option>)}</select></label>
            <label className="f"><span>State</span><select name="region" defaultValue="NSW">{STATES.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label className="f"><span>ABN</span><input name="abn" /></label>
          </div>
          <div className="row">
            <label className="f"><span>Phone</span><input name="phone" /></label>
            <label className="f"><span>Email</span><input name="email" type="email" /></label>
            <label className="f"><span>Website</span><input name="website" /></label>
          </div>
          <label className="f"><span>Primary client (optional)</span>
            <select name="clientId" defaultValue=""><option value="">— None —</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </label>
          <label className="f"><span>Notes</span><textarea name="notes" rows={2} /></label>
          <button className="btn" type="submit">Add entity</button>
        </form>
      </div>

      <div className="panel">
        <h2>All entities</h2>
        <table>
          <thead><tr><th>Name</th><th>Type</th><th>State</th><th>ABN</th><th>Client</th><th></th></tr></thead>
          <tbody>
            {entities.map((e) => (
              <tr key={e.id}>
                <td><Link href={`/entities/${e.id}`}><strong>{e.name}</strong></Link></td>
                <td><span className="badge">{e.kind ?? "—"}</span></td>
                <td>{e.region ?? "—"}</td>
                <td>{e.abn ?? "—"}</td>
                <td>{clientName(e.clientId)}</td>
                <td>
                  <form action={deleteEntityAction}>
                    <input type="hidden" name="id" value={e.id} />
                    <button className="x" type="submit" aria-label="Delete">×</button>
                  </form>
                </td>
              </tr>
            ))}
            {entities.length === 0 && <tr><td colSpan={6} className="muted">No entities yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
