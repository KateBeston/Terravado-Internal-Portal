"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/* The person record's tab strip — same structure and measurements as the
   property record (a horizontal strip, active tab marked by a coloured
   underline). Which tabs show is decided on the server from the person's
   roles and passed in, because a client component cannot read the database. */
export default function ContactSectionNav({ id, tabs }: { id: string; tabs: { slug: string; label: string }[] }) {
  const path = usePathname() ?? "";
  const root = `/contacts/${id}`;
  const here = path === root ? "" : path.slice(root.length + 1).split("/")[0];
  return (
    <nav style={{ display: "flex", flexWrap: "wrap", gap: 2, borderBottom: "1px solid var(--line)", marginBottom: 22 }}>
      {tabs.map((t) => {
        const href = t.slug ? `${root}/${t.slug}` : root;
        const active = here === t.slug;
        return (
          <Link key={t.slug || "root"} href={href} style={{
            padding: "10px 14px", fontSize: 12, letterSpacing: ".06em", textTransform: "uppercase",
            textDecoration: "none", whiteSpace: "nowrap", fontWeight: active ? 600 : 500,
            color: active ? "var(--green-d)" : "var(--muted)",
            borderBottom: active ? "2px solid var(--green)" : "2px solid transparent", marginBottom: -1,
          }}>{t.label}</Link>
        );
      })}
    </nav>
  );
}
