import Nav from "@/components/Nav";
import BackBar from "@/components/BackBar";
import { getUser } from "@/lib/auth/session";
import { getCurrentTenant, getTenantRoles } from "@/lib/auth/tenant";
import { effectiveCapabilities } from "@/lib/auth/capabilities";
import { getIsPlatformAdmin } from "@/lib/auth/admin";
import { listContacts } from "@/lib/domain/service";
import { unreadRegulatoryCount } from "@/lib/regwatch/store";
import { ENGINE_VERSION, TAX_DATA } from "@/lib/engine/tax-data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  const tenant = await getCurrentTenant();
  const [roles, isAdmin] = await Promise.all([getTenantRoles(), getIsPlatformAdmin()]);
  const caps = effectiveCapabilities(tenant.accountType, roles);
  const regUnread = caps.includes("integrations") ? await unreadRegulatoryCount() : 0;

  // Resolve the signed-in user's own person record (by email) so their name in
  // the nav links straight to it. Best-effort — never block the layout.
  let recordId: string | null = null;
  if (user?.email && tenant.tenantId) {
    try {
      const people = await listContacts(tenant.tenantId);
      recordId = people.find((p) => p.email?.toLowerCase() === user.email.toLowerCase())?.id ?? null;
    } catch {
      recordId = null;
    }
  }

  return (
    <div className="shell">
      <Nav
        user={user ? { name: user.name, email: user.email, isDev: user.isDev } : null}
        recordId={recordId}
        caps={caps}
        isAdmin={isAdmin}
        engineVersion={ENGINE_VERSION}
        taxVersion={TAX_DATA.version}
        regUnread={regUnread}
      />
      <main className="main"><BackBar />{children}</main>
    </div>
  );
}
