"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: [string, string][] = [
  ["/", "Dashboard"],
  ["/modeller", "Modeller"],
  ["/workspace", "Workspace"],
  ["/lenders", "Lenders"],
  ["/portfolio", "Portfolio"],
  ["/contacts", "Contacts"],
  ["/entities", "Entities"],
  ["/properties", "Properties"],
  ["/finance", "Finance"],
  ["/lodgements", "Lodgements"],
  ["/integrations", "Integrations"],
  ["/business", "The Business"],
];

interface NavUser { name: string; email: string; isDev: boolean; }

export default function Nav({ user, recordId, engineVersion, taxVersion }: { user: NavUser | null; recordId?: string | null; engineVersion: string; taxVersion: string; }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <aside className="nav">
      <div className="brand">
        Terravado<em>.</em>
        <small>Internal Portal</small>
      </div>
      {LINKS.map(([href, label]) => (
        <Link key={href} href={href} className={`link${active(href) ? " on" : ""}`}>
          {label}
        </Link>
      ))}
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
