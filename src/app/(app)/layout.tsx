import Nav from "@/components/Nav";
import { getUser } from "@/lib/auth/session";
import { ENGINE_VERSION, TAX_DATA } from "@/lib/engine/tax-data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  return (
    <div className="shell">
      <Nav
        user={user ? { name: user.name, email: user.email, isDev: user.isDev } : null}
        engineVersion={ENGINE_VERSION}
        taxVersion={TAX_DATA.version}
      />
      <main className="main">{children}</main>
    </div>
  );
}
