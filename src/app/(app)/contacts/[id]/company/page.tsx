import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { getContact, listEntities, listMembers } from "@/lib/domain/service";
import { addMemberAction, deleteMemberAction } from "@/app/actions";
import { MEMBER_ROLES } from "@/lib/domain/types";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PersonEntitiesTab({ params }: { params: { id: string } }) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const [c, entities, allMembers] = await Promise.all([
    getContact(tenantId, params.id), listEntities(tenantId), listMembers(tenantId),
  ]);
  if (!c) notFound();
  const mine = allMembers.filter((m) => m.contactId === c.id);
  const entityOf = (id?: string) => entities.find((e) => e.id === id);

  return (
    <>
      <p className="sub">Companies, trusts and SMSFs {c.name} is connected to, and in what role.</p>

      <div className="panel">
        <h2>Entities &amp; roles</h2>
        <table>
          <thead><tr><th>Entity</th><th>Type</th><th>Role</th><th>Signs</th><th></th></tr></thead>
          <tbody>
            {mine.map((m) => {
              const e = entityOf(m.entityId);
              return (
                <tr key={m.id}>
                  <td>{e ? <Link href={`/entities/${e.id}`}><strong>{e.name}</strong></Link> : "—"}</td>
                  <td>{e?.kind ?? "—"}</td>
                  <td><span className="badge">{m.role ?? "—"}</span></td>
                  <td>{m.maySign ? "Yes" : "—"}</td>
                  <td>
                    <form action={deleteMemberAction}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="contactId" value={c.id} />
                      <button className="x" type="submit" aria-label="Remove">×</button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {mine.length === 0 && <tr><td colSpan={5} className="muted">Not linked to any entity yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Link to an entity</h2>
        {entities.length === 0 ? (
          <p className="muted">No entities yet — create one under <Link href="/entities">Entities</Link> first.</p>
        ) : (
          <form action={addMemberAction}>
            <input type="hidden" name="contactId" value={c.id} />
            <div className="row">
              <label className="f"><span>Entity</span>
                <select name="entityId" required defaultValue="">
                  <option value="" disabled>— Select —</option>
                  {entities.map((e) => <option key={e.id} value={e.id}>{e.name}{e.kind ? ` (${e.kind})` : ""}</option>)}
                </select>
              </label>
              <label className="f"><span>Role</span><select name="role" defaultValue="Director">{MEMBER_ROLES.map((r) => <option key={r}>{r}</option>)}</select></label>
            </div>
            <div className="row">
              <label className="f" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><input type="checkbox" name="isPrimary" style={{ width: "auto" }} /><span>Primary contact for it</span></label>
              <label className="f" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><input type="checkbox" name="maySign" style={{ width: "auto" }} /><span>Authorised to sign</span></label>
            </div>
            <button className="btn" type="submit">Link</button>
          </form>
        )}
      </div>
    </>
  );
}
