import { requireUser, requirePlatformAdmin } from "@/lib/auth/guard";
import { adminListTenants } from "@/lib/auth/admin";
import { accountTypeLabel } from "@/lib/auth/capabilities";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireUser();
  await requirePlatformAdmin();
  const tenants = await adminListTenants();

  return (
    <section>
      <h1>Admin</h1>
      <p className="sub">Internal Terravado console — manage every account&apos;s type, members, roles and access. {tenants.length} account{tenants.length === 1 ? "" : "s"}.</p>

      <div className="panel">
        <h2>Accounts</h2>
        <table>
          <thead><tr><th>Account</th><th>Type</th><th>Members</th><th></th></tr></thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id}>
                <td><Link href={`/admin/${t.id}`}><strong>{t.name}</strong></Link></td>
                <td><span className="badge">{accountTypeLabel(t.accountType)}</span></td>
                <td>{t.members}</td>
                <td><Link className="btn ghost" href={`/admin/${t.id}`} style={{ padding: "6px 12px" }}>Manage →</Link></td>
              </tr>
            ))}
            {tenants.length === 0 && <tr><td colSpan={4} className="muted">No accounts.</td></tr>}
          </tbody>
        </table>
      </div>

      <p className="muted" style={{ fontSize: 12 }}>
        Platform admins are managed in the <code>platform_admins</code> table. Changes here apply across tenant boundaries and are
        enforced server-side.
      </p>
    </section>
  );
}
