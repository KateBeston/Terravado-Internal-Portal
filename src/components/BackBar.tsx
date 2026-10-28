"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/* A consistent back control on every screen below the top level. Top-level pages
   (reachable from the sidebar, e.g. /properties, /atlas) show nothing; deeper
   pages link to their parent — a record tab back to the record, a record back to
   its list, a section sub-page back to the section. */
export default function BackBar() {
  const path = usePathname() ?? "/";
  const segments = path.split("/").filter(Boolean);
  if (segments.length < 2) return null; // top-level or root — nav covers it
  const parent = "/" + segments.slice(0, -1).join("/");
  return (
    <div style={{ marginBottom: 14 }}>
      <Link href={parent} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)", textDecoration: "none" }}>
        <span aria-hidden>←</span> Back
      </Link>
    </div>
  );
}
