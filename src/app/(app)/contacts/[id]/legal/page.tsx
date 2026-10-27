import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { getContact, listDocuments } from "@/lib/domain/service";
import { createDocumentAction, deleteDocumentAction } from "@/app/actions";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
const KINDS = ["ID / verification", "Contract of sale", "Loan document", "Trust deed", "Financial statement", "Tax return", "Payslip", "Agreement", "Other"];
const date = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "—");

export default async function PersonLegalTab({ params }: { params: { id: string } }) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const c = await getContact(tenantId, params.id);
  if (!c) notFound();
  const docs = (await listDocuments(tenantId)).filter((d) => d.clientId === c.id);

  return (
    <>
      <p className="sub">Legal and supporting documents for {c.name}. {docs.length} on record.</p>

      <div className="panel">
        <h2>Documents</h2>
        <table>
          <thead><tr><th>Document</th><th>Kind</th><th>Link / location</th><th>Added</th><th></th></tr></thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id}>
                <td><strong>{d.name}</strong></td>
                <td><span className="badge">{d.kind ?? "—"}</span></td>
                <td>{d.storagePath ? <a href={d.storagePath} target="_blank" rel="noreferrer">Open</a> : <span className="muted">—</span>}</td>
                <td className="muted">{date(d.createdAt)}</td>
                <td>
                  <form action={deleteDocumentAction}>
                    <input type="hidden" name="id" value={d.id} />
                    <input type="hidden" name="clientId" value={c.id} />
                    <button className="x" type="submit" aria-label="Delete">×</button>
                  </form>
                </td>
              </tr>
            ))}
            {docs.length === 0 && <tr><td colSpan={5} className="muted">No documents recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Record a document</h2>
        <form action={createDocumentAction}>
          <input type="hidden" name="clientId" value={c.id} />
          <div className="row">
            <label className="f"><span>Name</span><input name="name" required placeholder="e.g. Contract of sale — 12 Smith St" /></label>
            <label className="f"><span>Kind</span><select name="kind" defaultValue="Agreement">{KINDS.map((k) => <option key={k}>{k}</option>)}</select></label>
          </div>
          <label className="f"><span>Link / location</span><input name="storagePath" placeholder="https://… or where the file is held" /></label>
          <button className="btn" type="submit">Record document</button>
        </form>
        <p className="muted" style={{ fontSize: 12 }}>Records a reference now; direct file upload to secure storage is coming.</p>
      </div>
    </>
  );
}
