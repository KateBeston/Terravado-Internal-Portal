import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { getContact } from "@/lib/domain/service";
import { notFound } from "next/navigation";
import Link from "next/link";
import ContactSectionNav from "@/components/ContactSectionNav";

export const dynamic = "force-dynamic";

/* The person record — identity header + role-gated tab strip, with the current
   tab beneath. Mirrors the property record and the TGS contact record: one
   person, said once above whichever section follows. */
export default async function ContactRecordLayout({ children, params }: { children: React.ReactNode; params: { id: string } }) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const c = await getContact(tenantId, params.id);
  if (!c) notFound();

  const roles = c.roles ?? [];
  const isBorrower = roles.includes("Borrower");

  // Tabs shown for everyone, plus the financial tabs a borrower/applicant needs.
  const tabs: { slug: string; label: string }[] = [
    { slug: "", label: "Details" },
    ...(isBorrower ? [
      { slug: "financials", label: "Financials" },
      { slug: "properties", label: "Properties" },
      { slug: "modelling", label: "Modelling" },
    ] : []),
    { slug: "legal", label: "Legal" },
    { slug: "company", label: "Entities" },
  ];

  const roleLabels = roles.length ? roles : (c.role ? [c.role] : []);

  return (
    <section>
      <div className="sub" style={{ marginBottom: 6 }}><Link href="/contacts">← Contacts</Link></div>
      <h1 style={{ marginBottom: 6 }}>{c.name}</h1>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 18, color: "var(--muted)", fontSize: 13 }}>
        {roleLabels.map((r) => <span key={r} className="badge">{r}</span>)}
        {c.email && <><span>·</span><span>{c.email}</span></>}
        {c.phone && <><span>·</span><span>{c.phone}</span></>}
        {roleLabels.length === 0 && !c.email && !c.phone && <span>No roles or contact details yet</span>}
      </div>
      <ContactSectionNav id={c.id} tabs={tabs} />
      {children}
    </section>
  );
}
