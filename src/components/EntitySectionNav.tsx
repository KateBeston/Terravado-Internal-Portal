"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/* The entity record's tab strip — same structure as the person and property
   records. Each tab is a sub-route under /entities/[id]. */
const TABS: { slug: string; label: string }[] = [
  { slug: "", label: "Details" },
  { slug: "people", label: "People & roles" },
  { slug: "properties", label: "Properties" },
];

export default function EntitySectionNav({ id }: { id: string }) {
  const path = usePathname() ?? "";
  const root = `/entities/${id}`;
  const here = path === root ? "" : path.slice(root.length + 1).split("/")[0];
  return (
    <nav style={{ display: "flex", flexWrap: "wrap", gap: 2, borderBottom: "1px solid var(--line)", marginBottom: 22 }}>
      {TABS.map((t) => {
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
