import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { listContacts } from "@/lib/domain/service";
import { createContactAction, deleteContactAction } from "@/app/actions";

export const dynamic = "force-dynamic";

const ROLES = ["Mortgage broker", "Buyer's agent", "Accountant", "Solicitor", "Conveyancer", "Valuer", "Quantity surveyor", "Property manager", "Builder", "Other"];

export default async function ContactsPage() {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const contacts = await listContacts(tenantId);

  return (
    <section>
      <h1>Contacts</h1>
      <p className="sub">Your professional directory — the team around each deal. {contacts.length} on record.</p>

      <div className="panel">
        <h2>Add a contact</h2>
        <form action={createContactAction}>
          <div className="row">
            <label className="f"><span>Name</span><input name="name" required /></label>
            <label className="f"><span>Role</span>
              <select name="role" defaultValue="Mortgage broker">{ROLES.map((r) => <option key={r}>{r}</option>)}</select>
            </label>
          </div>
          <div className="row">
            <label className="f"><span>Firm</span><input name="firm" /></label>
            <label className="f"><span>Licence</span><input name="licence" /></label>
          </div>
          <div className="row">
            <label className="f"><span>Email</span><input name="email" type="email" /></label>
            <label className="f"><span>Phone</span><input name="phone" /></label>
          </div>
          <button className="btn" type="submit">Add contact</button>
        </form>
      </div>

      <div className="panel">
        <h2>All contacts</h2>
        <table>
          <thead><tr><th>Name</th><th>Role</th><th>Firm</th><th>Email</th><th>Phone</th><th></th></tr></thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id}>
                <td><strong>{c.name}</strong></td>
                <td><span className="badge">{c.role ?? "—"}</span></td>
                <td>{c.firm ?? "—"}</td>
                <td>{c.email ?? "—"}</td>
                <td>{c.phone ?? "—"}</td>
                <td>
                  <form action={deleteContactAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <button className="x" type="submit" aria-label="Delete">×</button>
                  </form>
                </td>
              </tr>
            ))}
            {contacts.length === 0 && <tr><td colSpan={6} className="muted">No contacts yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
