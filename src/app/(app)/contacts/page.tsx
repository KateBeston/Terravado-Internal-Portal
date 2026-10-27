import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { listContacts, listCompanies } from "@/lib/domain/service";
import { createContactAction, deleteContactAction } from "@/app/actions";
import { PERSON_ROLES } from "@/lib/domain/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const [contacts, companies] = await Promise.all([listContacts(tenantId), listCompanies(tenantId)]);
  const companyName = (id?: string) => (id ? companies.find((co) => co.id === id)?.name ?? "—" : "—");

  return (
    <section>
      <h1>Contacts</h1>
      <p className="sub">Everyone on file — borrowers/applicants and the professional team around each deal. {contacts.length} on record. Click a name for their full record.</p>

      <div className="panel">
        <h2>Add a contact</h2>
        <form action={createContactAction}>
          <label className="f"><span>Name</span><input name="name" required /></label>
          <label className="f"><span>Roles</span></label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px", marginBottom: 14 }}>
            {PERSON_ROLES.map((r) => (
              <label key={r} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, margin: 0 }}>
                <input type="checkbox" name="roles" value={r} style={{ width: "auto", margin: 0 }} /> {r}
              </label>
            ))}
          </div>
          <div className="row">
            <label className="f"><span>Firm</span><input name="firm" /></label>
            <label className="f"><span>Company</span>
              <select name="companyId" defaultValue=""><option value="">— None —</option>{companies.map((co) => <option key={co.id} value={co.id}>{co.name}</option>)}</select>
            </label>
          </div>
          <div className="row">
            <label className="f"><span>Licence</span><input name="licence" /></label>
            <label className="f"><span>Email</span><input name="email" type="email" /></label>
          </div>
          <label className="f"><span>Phone</span><input name="phone" /></label>
          <button className="btn" type="submit">Add contact</button>
        </form>
        <p className="muted" style={{ fontSize: 12 }}>Tick <strong>Borrower</strong> for someone you&apos;ll model/assess — they then get the Financials, Properties and Modelling tabs.</p>
      </div>

      <div className="panel">
        <h2>All contacts</h2>
        <table>
          <thead><tr><th>Name</th><th>Role</th><th>Firm</th><th>Company</th><th>Email</th><th>Phone</th><th></th></tr></thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id}>
                <td><Link href={`/contacts/${c.id}`}><strong>{c.name}</strong></Link></td>
                <td>{(c.roles && c.roles.length ? c.roles : (c.role ? [c.role] : [])).map((r) => <span key={r} className="badge" style={{ marginRight: 4 }}>{r}</span>)}{(!c.roles?.length && !c.role) && "—"}</td>
                <td>{c.firm ?? "—"}</td>
                <td>{companyName(c.companyId)}</td>
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
            {contacts.length === 0 && <tr><td colSpan={7} className="muted">No contacts yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
