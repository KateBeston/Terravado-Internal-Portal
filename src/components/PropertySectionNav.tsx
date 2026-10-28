"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/* The property record's tab strip — same structure as the TGS venue record
   (a horizontal strip, active tab marked by a coloured underline), in the
   portal's own look. Each tab is its own sub-route under /properties/[id]. */
const TABS: { slug: string; label: string }[] = [
  { slug: "", label: "Overview" },
  { slug: "title", label: "Title" },
  { slug: "locality", label: "Locality" },
  { slug: "sales", label: "Sales history" },
  { slug: "physical", label: "Physical" },
  { slug: "financials", label: "Financials" },
  { slug: "depreciation", label: "Depreciation" },
  { slug: "modelling", label: "Modelling" },
];

export default function PropertySectionNav({ id }: { id: string }) {
  const path = usePathname() ?? "";
  const root = `/properties/${id}`;
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
