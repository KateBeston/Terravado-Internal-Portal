import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { getEntity } from "@/lib/domain/service";
import { notFound } from "next/navigation";
import Link from "next/link";
import EntitySectionNav from "@/components/EntitySectionNav";

export const dynamic = "force-dynamic";

/* The entity/company record — identity header + tab strip, current tab beneath.
   Same chrome as the person and property records. */
export default async function EntityRecordLayout({ children, params }: { children: React.ReactNode; params: { id: string } }) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const e = await getEntity(tenantId, params.id);
  if (!e) notFound();

  return (
    <section>
      <div className="sub" style={{ marginBottom: 6 }}><Link href="/entities">← Entities</Link></div>
      <h1 style={{ marginBottom: 6 }}>{e.name}</h1>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 18, color: "var(--muted)", fontSize: 13 }}>
        <span className="badge">{e.kind ?? "—"}</span>
        {e.region && <><span>·</span><span>{e.region}</span></>}
        {e.abn && <><span>·</span><span>ABN {e.abn}</span></>}
      </div>
      <EntitySectionNav id={e.id} />
      {children}
    </section>
  );
}
