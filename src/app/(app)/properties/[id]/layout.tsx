import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { getProperty } from "@/lib/domain/service";
import { notFound } from "next/navigation";
import Link from "next/link";
import PropertySectionNav from "@/components/PropertySectionNav";

export const dynamic = "force-dynamic";

const money = (v?: number | null) => (v === undefined || v === null ? "—" : "$" + Math.round(v).toLocaleString("en-AU"));

/* The property record — identity header + tab strip, with the current tab's
   page rendered beneath. Mirrors the TGS venue record layout. */
export default async function PropertyRecordLayout({ children, params }: { children: React.ReactNode; params: { id: string } }) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const p = await getProperty(tenantId, params.id);
  if (!p) notFound();

  return (
    <section>
      <div className="sub" style={{ marginBottom: 6 }}><Link href="/properties">← Properties</Link></div>
      <h1 style={{ marginBottom: 6 }}>{p.address}</h1>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 20, color: "var(--muted)", fontSize: 13 }}>
        <span>{p.state ?? "—"}</span><span>·</span>
        <span>{money(p.price)}</span><span>·</span>
        <span className="badge">{p.status ?? "—"}</span>
      </div>
      <PropertySectionNav id={p.id} />
      {children}
    </section>
  );
}
