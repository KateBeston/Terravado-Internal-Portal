"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/* Each link may require a capability; links with none always show. Capabilities
   come from the account type (see lib/auth/capabilities). */
const LINKS: [string, string, string?][] = [
  ["/", "Dashboard"],
  ["/modeller", "Modeller", "modeller"],
  ["/workspace", "Workspace"],
  ["/lenders", "Lenders", "lenders"],
  ["/portfolio", "Portfolio", "portfolio"],
  ["/contacts", "Contacts", "clients"],
  ["/entities", "Entities", "entities"],
  ["/properties", "Properties", "properties"],
  ["/finance", "Finance", "finance"],
  ["/lodgements", "Lodgements", "lodgement"],
  ["/integrations", "Integrations", "integrations"],
  ["/business", "The Business", "business"],
  ["/shared", "Shared with me"],
  ["/account", "Account"],
];

interface NavUser { name: string; email: string; isDev: boolean; }

export default function Nav({ user, recordId, caps, isAdmin, engineVersion, taxVersion }: { user: NavUser | null; recordId?: string | null; caps?: string[]; isAdmin?: boolean; engineVersion: string; taxVersion: string; }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const allowed = (cap?: string) => !cap || !caps || caps.includes(cap);
  const links = LINKS.filter(([, , cap]) => allowed(cap));
  return (
    <aside className="nav">
      <div className="brand">
        Terravado<em>.</em>
        <small>Internal Portal</small>
      </div>
      {links.map(([href, label]) => (
        <Link key={href} href={href} className={`link${active(href) ? " on" : ""}`}>
          {label}
        </Link>
      ))}
      {isAdmin && (
        <Link href="/admin" className={`link${active("/admin") ? " on" : ""}`} style={{ color: "#e0b050" }}>
          Admin
        </Link>
      )}
      <div className="spacer" />
      {user && (
        <div className="who">
          <Link href={recordId ? `/contacts/${recordId}` : "/contacts"} className="who-link">{user.name}</Link>
          <br />
          {user.email}
          {user.isDev && <> · <span style={{ color: "#e0b050" }}>dev mode</span></>}
        </div>
      )}
      <form action="/auth/signout" method="post">
        <button className="signout" type="submit">Sign out</button>
      </form>
      <div className="ver">
        engine {engineVersion}
        <br />
        tax {taxVersion}
      </div>
    </aside>
  );
}
