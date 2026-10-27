import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { getEntity, listContacts, listMembers } from "@/lib/domain/service";
import { addMemberAction, deleteMemberAction } from "@/app/actions";
import { MEMBER_ROLES } from "@/lib/domain/types";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function EntityPeopleTab({ params }: { params: { id: string } }) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const [e, contacts, allMembers] = await Promise.all([
    getEntity(tenantId, params.id), listContacts(tenantId), listMembers(tenantId),
  ]);
  if (!e) notFound();
  const members = allMembers.filter((m) => m.entityId === e.id);
  const nameOf = (id?: string) => contacts.find((c) => c.id === id)?.name ?? "—";

  return (
    <>
      <p className="sub">Who is connected to {e.name}, and in what role — directors, trustees, beneficiaries, members, signatories.</p>

      <div className="panel">
        <h2>People & roles</h2>
        <table>
          <thead><tr><th>Person</th><th>Role</th><th>Primary</th><th>Can sign</th><th></th></tr></thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td><Link href={`/contacts/${m.contactId}`}><strong>{nameOf(m.contactId)}</strong></Link></td>
                <td><span className="badge">{m.role ?? "—"}</span></td>
                <td>{m.isPrimary ? "Yes" : "—"}</td>
                <td>{m.maySign ? "Yes" : "—"}</td>
                <td>
                  <form action={deleteMemberAction}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="entityId" value={e.id} />
                    <button className="x" type="submit" aria-label="Remove">×</button>
                  </form>
                </td>
              </tr>
            ))}
            {members.length === 0 && <tr><td colSpan={5} className="muted">No people linked yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Link a person</h2>
        <form action={addMemberAction}>
          <input type="hidden" name="entityId" value={e.id} />
          <div className="row">
            <label className="f"><span>Person</span>
              <select name="contactId" required defaultValue="">
                <option value="" disabled>— Select —</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="f"><span>Role</span><select name="role" defaultValue="Director">{MEMBER_ROLES.map((r) => <option key={r}>{r}</option>)}</select></label>
          </div>
          <div className="row">
            <label className="f" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><input type="checkbox" name="isPrimary" style={{ width: "auto" }} /><span>Primary contact</span></label>
            <label className="f" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><input type="checkbox" name="maySign" style={{ width: "auto" }} /><span>Authorised to sign</span></label>
          </div>
          <label className="f"><span>Notes</span><input name="notes" /></label>
          <button className="btn" type="submit">Link person</button>
        </form>
      </div>
    </>
  );
}
