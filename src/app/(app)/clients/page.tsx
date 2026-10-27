import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { listClients } from "@/lib/domain/service";
import { createClientAction, deleteClientAction } from "@/app/actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const clients = await listClients(tenantId);

  return (
    <section>
      <h1>Clients</h1>
      <p className="sub">The people you model and plan for. {clients.length} on record.</p>

      <div className="panel">
        <h2>Add a client</h2>
        <form action={createClientAction}>
          <label className="f"><span>Name</span><input name="name" required placeholder="Full name" /></label>
          <div className="row">
            <label className="f"><span>Email</span><input name="email" type="email" /></label>
            <label className="f"><span>Phone</span><input name="phone" /></label>
          </div>
          <label className="f"><span>Notes</span><textarea name="notes" rows={2} /></label>
          <button className="btn" type="submit">Add client</button>
        </form>
      </div>

      <div className="panel">
        <h2>All clients</h2>
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Notes</th><th></th></tr></thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id}>
                <td><Link href={`/contacts/${c.id}`}><strong>{c.name}</strong></Link></td>
                <td>{c.email ?? "—"}</td>
                <td>{c.phone ?? "—"}</td>
                <td className="muted">{c.notes ?? ""}</td>
                <td>
                  <form action={deleteClientAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <button className="x" type="submit" aria-label="Delete">×</button>
                  </form>
                </td>
              </tr>
            ))}
            {clients.length === 0 && <tr><td colSpan={5} className="muted">No clients yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
