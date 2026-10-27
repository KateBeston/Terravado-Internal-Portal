import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { getUser } from "@/lib/auth/session";
import { ACCOUNT_TYPES, capabilitiesFor, accountTypeLabel, normaliseAccountType, type Capability } from "@/lib/auth/capabilities";
import { updateAccountTypeAction } from "@/app/actions";

export const dynamic = "force-dynamic";

const CAP_LABELS: Record<Capability, string> = {
  modeller: "Modeller", portfolio: "Portfolio", clients: "Clients / contacts", properties: "Properties",
  entities: "Entities", lenders: "Lender compare", finance: "Finance", lodgement: "Lodgement",
  bankData: "Bank data (Open Banking)", dealExport: "Deal export", integrations: "Integrations", business: "The Business",
};
const ALL_CAPS = Object.keys(CAP_LABELS) as Capability[];

export default async function AccountPage() {
  await requireUser();
  const [tenant, user] = await Promise.all([getCurrentTenant(), getUser()]);
  const current = normaliseAccountType(tenant.accountType);
  const caps = capabilitiesFor(current);

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
        <h2>What this account can do</h2>
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
          Features are gated on capabilities, and the account type grants them — so adding a broker to the team can unlock broker
          features without changing anyone else&apos;s access. Team roles and inviting external parties onto single deals come next.
        </p>
      </div>
    </section>
  );
}
