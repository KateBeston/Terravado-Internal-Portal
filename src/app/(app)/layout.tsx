import Nav from "@/components/Nav";
import { getUser } from "@/lib/auth/session";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { listContacts } from "@/lib/domain/service";
import { ENGINE_VERSION, TAX_DATA } from "@/lib/engine/tax-data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  // Resolve the signed-in user's own person record (by email) so their name in
  // the nav links straight to it. Best-effort — never block the layout.
  let recordId: string | null = null;
  if (user?.email) {
    try {
      const { tenantId } = await getCurrentTenant();
      const people = await listContacts(tenantId);
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
        engineVersion={ENGINE_VERSION}
        taxVersion={TAX_DATA.version}
      />
      <main className="main">{children}</main>
    </div>
  );
}
