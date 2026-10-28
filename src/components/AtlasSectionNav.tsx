"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/* Atlas section tab strip — Overview (national stats & charts) and the
   interactive Map, same look as the property-record tabs. */
const TABS: { slug: string; label: string }[] = [
  { slug: "", label: "Overview" },
  { slug: "map", label: "Map" },
];

export default function AtlasSectionNav() {
  const path = usePathname() ?? "";
  const root = "/atlas";
  const here = path === root ? "" : path.slice(root.length + 1).split("/")[0];
  return (
    <nav style={{ display: "flex", flexWrap: "wrap", gap: 2, borderBottom: "1px solid var(--line)", marginBottom: 22 }}>
      {TABS.map((t) => {
        const href = t.slug ? `${root}/${t.slug}` : root;
        const active = here === t.slug;
        return (
          <Link key={t.slug} href={href} style={{
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
