import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant, getTenantRoles, getTenantMembers } from "@/lib/auth/tenant";
import { getUser } from "@/lib/auth/session";
import { ACCOUNT_TYPES, TEAM_ROLES, effectiveCapabilities, accountTypeLabel, normaliseAccountType, type Capability } from "@/lib/auth/capabilities";
import { updateAccountTypeAction, updateMemberRoleAction } from "@/app/actions";

export const dynamic = "force-dynamic";

const CAP_LABELS: Record<Capability, string> = {
  modeller: "Modeller", portfolio: "Portfolio", clients: "Clients / contacts", properties: "Properties",
  entities: "Entities", lenders: "Lender compare", finance: "Finance", lodgement: "Lodgement",
  bankData: "Bank data (Open Banking)", dealExport: "Deal export", stock: "Developer stock", integrations: "Integrations", business: "The Business",
};
const ALL_CAPS = Object.keys(CAP_LABELS) as Capability[];

export default async function AccountPage() {
  await requireUser();
  const [tenant, user, roles, members] = await Promise.all([
    getCurrentTenant(), getUser(), getTenantRoles(), getTenantMembers(),
  ]);
  const current = normaliseAccountType(tenant.accountType);
  const caps = effectiveCapabilities(current, roles);
  const hasBroker = roles.includes("broker");

  return (
    <section>
      <h1>Account</h1>
      <p className="sub">Your Terravado account — its type decides which features are available across the portal.</p>

      <div className="panel">
        <h2>Account</h2>
        <table>
          <tbody>
            <tr><td className="muted">Workspace</td><td><strong>{tenant.name}</strong></td></tr>
            <tr><td className="muted">Signed in as</td><td>{user?.name}{user?.email ? ` · ${user.email}` : ""}</td></tr>
            <tr><td className="muted">Account type</td><td><span className="badge">{accountTypeLabel(current)}</span></td></tr>
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Account type</h2>
        <p className="sub" style={{ marginTop: -6 }}>Sets what this account can do. Only an owner or admin can change it.</p>
        <form action={updateAccountTypeAction} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <label className="f" style={{ flex: 1, minWidth: 260, marginBottom: 0 }}><span>Type</span>
            <select name="accountType" defaultValue={current}>
              {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <button className="btn" type="submit" style={{ margin: 0 }}>Save</button>
        </form>
        <div style={{ marginTop: 10 }}>
          {ACCOUNT_TYPES.map((t) => (
            <p key={t.value} className="muted" style={{ fontSize: 12, margin: "2px 0" }}>
              <strong>{t.label}:</strong> {t.blurb}
            </p>
          ))}
        </div>
      </div>

      <div className="panel">
        <h2>Team</h2>
        <p className="sub" style={{ marginTop: -6 }}>
          Who is on this account, and their role. A member with the <strong>Broker</strong> role unlocks the broker toolset
          (lender compare, finance, bank data, lodgement, deal export) for the whole account. Only an owner or admin can change roles.
        </p>
        <table>
          <thead><tr><th>Member</th><th>Role</th><th></th></tr></thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.userId}>
                <td><strong>{m.email || m.userId}</strong>{user?.email && m.email.toLowerCase() === user.email.toLowerCase() ? " · you" : ""}</td>
                <td>
                  <form action={updateMemberRoleAction} style={{ display: "flex", gap: 8, alignItems: "center", margin: 0 }}>
                    <input type="hidden" name="userId" value={m.userId} />
                    <select name="role" defaultValue={m.role} style={{ width: "auto" }}>
                      {TEAM_ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                    </select>
                    <button className="btn ghost" type="submit" style={{ margin: 0, padding: "6px 12px" }}>Set</button>
                  </form>
                </td>
                <td />
              </tr>
            ))}
            {members.length === 0 && <tr><td colSpan={3} className="muted">Just you for now.</td></tr>}
          </tbody>
        </table>
        <p className="muted" style={{ fontSize: 12 }}>
          Inviting new teammates (and inviting external parties onto a single deal) comes with the sharing flow — the next piece.
        </p>
      </div>

      <div className="panel">
        <h2>What this account can do</h2>
        {hasBroker && current !== "broker" && (
          <p className="sub" style={{ marginTop: -6 }}>A broker on the team is granting the broker toolset on top of the account type.</p>
        )}
        <table>
          <thead><tr><th>Feature</th><th>Available</th></tr></thead>
          <tbody>
            {ALL_CAPS.map((c) => (
              <tr key={c}>
                <td>{CAP_LABELS[c]}</td>
                <td>{caps.includes(c) ? <span className="badge">Enabled</span> : <span className="muted">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ fontSize: 12 }}>
          Features are gated on capabilities, and the account type (plus team roles) grants them — so adding a broker to the team
          unlocks broker features without changing anyone else&apos;s access.
        </p>
      </div>
    </section>
  );
}
