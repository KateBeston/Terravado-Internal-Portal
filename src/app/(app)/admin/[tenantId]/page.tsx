import { requireUser, requirePlatformAdmin } from "@/lib/auth/guard";
import { adminListTenants, adminListMembers, adminListUsers } from "@/lib/auth/admin";
import { adminSetAccountTypeAction, adminSetMemberRoleAction, adminAddMemberAction } from "@/app/actions";
import { ACCOUNT_TYPES, TEAM_ROLES } from "@/lib/auth/capabilities";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminTenantPage({ params }: { params: { tenantId: string } }) {
  await requireUser();
  await requirePlatformAdmin();
  const [tenants, members, users] = await Promise.all([
    adminListTenants(), adminListMembers(params.tenantId), adminListUsers(),
  ]);
  const tenant = tenants.find((t) => t.id === params.tenantId);
  if (!tenant) notFound();
  const memberIds = new Set(members.map((m) => m.userId));
  const addable = users.filter((u) => !memberIds.has(u.userId));

  return (
    <section>
      <div className="sub" style={{ marginBottom: 6 }}><Link href="/admin">← Admin</Link></div>
      <h1 style={{ marginBottom: 6 }}>{tenant.name}</h1>
      <p className="sub">Internal management of this account — type, members, roles and access.</p>

      <div className="panel">
        <h2>Account type</h2>
        <form action={adminSetAccountTypeAction} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <input type="hidden" name="tenantId" value={tenant.id} />
          <label className="f" style={{ flex: 1, minWidth: 240, marginBottom: 0 }}><span>Type</span>
            <select name="accountType" defaultValue={tenant.accountType}>
              {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <button className="btn" type="submit" style={{ margin: 0 }}>Set type</button>
        </form>
      </div>

      <div className="panel">
        <h2>Members &amp; roles</h2>
        <table>
          <thead><tr><th>Member</th><th>Role</th></tr></thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.userId}>
                <td><strong>{m.email || m.userId}</strong></td>
                <td>
                  <form action={adminSetMemberRoleAction} style={{ display: "flex", gap: 8, alignItems: "center", margin: 0 }}>
                    <input type="hidden" name="tenantId" value={tenant.id} />
                    <input type="hidden" name="userId" value={m.userId} />
                    <select name="role" defaultValue={m.role} style={{ width: "auto" }}>
                      {TEAM_ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                    </select>
                    <button className="btn ghost" type="submit" style={{ margin: 0, padding: "6px 12px" }}>Set</button>
                  </form>
                </td>
              </tr>
            ))}
            {members.length === 0 && <tr><td colSpan={2} className="muted">No members.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Add a member</h2>
        {addable.length === 0 ? (
          <p className="muted">Every existing user is already on this account. (Creating brand-new login users / invites comes with the sharing flow.)</p>
        ) : (
          <form action={adminAddMemberAction}>
            <input type="hidden" name="tenantId" value={tenant.id} />
            <div className="row">
              <label className="f"><span>User</span>
                <select name="userId" required defaultValue="">
                  <option value="" disabled>— Select a user —</option>
                  {addable.map((u) => <option key={u.userId} value={u.userId}>{u.email || u.userId}</option>)}
                </select>
              </label>
              <label className="f"><span>Role</span>
                <select name="role" defaultValue="broker">{TEAM_ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}</select>
              </label>
            </div>
            <button className="btn" type="submit">Add to account</button>
          </form>
        )}
      </div>
    </section>
  );
}
