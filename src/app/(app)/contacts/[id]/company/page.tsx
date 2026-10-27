import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { getContact, getCompany } from "@/lib/domain/service";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PersonCompanyTab({ params }: { params: { id: string } }) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const c = await getContact(tenantId, params.id);
  if (!c) notFound();
  const company = c.companyId ? await getCompany(tenantId, c.companyId) : null;

  return (
    <>
      <p className="sub">Companies and entities {c.name} is connected to.</p>

      <div className="panel">
        <h2>Linked company</h2>
        {company ? (
          <table>
            <tbody>
              <tr><td className="muted">Name</td><td><Link href={`/companies/${company.id}`}><strong>{company.name}</strong></Link></td></tr>
              <tr><td className="muted">Kind</td><td>{company.kind ?? "—"}</td></tr>
              <tr><td className="muted">ABN</td><td>{company.abn ?? "—"}</td></tr>
            </tbody>
          </table>
        ) : (
          <p className="muted">No company linked. Set one on the Details tab.</p>
        )}
      </div>

      <div className="panel">
        <h2>Entities & roles</h2>
        <p className="muted">
          Trust / SMSF / company attribution — where this person is a director, trustee, beneficiary or member, each with its
          own entity record — is being built next, so ownership can sit under an entity as well as a person.
        </p>
      </div>
    </>
  );
}
