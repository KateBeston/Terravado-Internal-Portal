import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { listBusinessDocs } from "@/lib/domain/service";
import { createBusinessDocAction, deleteBusinessDocAction } from "@/app/actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUSES = ["active", "draft", "archived"];

export default async function BusinessPage() {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const docs = await listBusinessDocs(tenantId);

  return (
    <section>
      <h1>The Business</h1>
      <p className="sub">Business development — strategy documents, decisions and milestones. {docs.length} logged.</p>

      <div className="panel">
        <h2>Log a document or decision</h2>
        <form action={createBusinessDocAction}>
          <label className="f"><span>Title</span><input name="title" required /></label>
          <div className="row">
            <label className="f"><span>Category</span><input name="category" placeholder="Strategy / Competitive / Architecture …" /></label>
            <label className="f"><span>Status</span>
              <select name="status" defaultValue="active">{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
            </label>
          </div>
          <label className="f"><span>Summary</span><textarea name="summary" rows={2} /></label>
          <label className="f"><span>Content (optional — the full document, openable later)</span><textarea name="content" rows={5} placeholder="Paste or write the document body here…" /></label>
          <label className="f"><span>Link (optional)</span><input name="link" placeholder="https://…" /></label>
          <button className="btn" type="submit">Log it</button>
        </form>
      </div>

      <div className="panel">
        <h2>Business development log</h2>
        <table>
          <thead><tr><th>Title</th><th>Category</th><th>Summary</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id}>
                <td>
                  <Link href={`/business/${d.id}`}><strong>{d.title}</strong></Link>
                  {d.link && <> · <a href={d.link} target="_blank" rel="noreferrer">link</a></>}
                </td>
                <td>{d.category ?? "—"}</td>
                <td className="muted">{d.summary ?? ""}</td>
                <td><span className="badge">{d.status ?? "active"}</span></td>
                <td>
                  <form action={deleteBusinessDocAction}>
                    <input type="hidden" name="id" value={d.id} />
                    <button className="x" type="submit" aria-label="Delete">×</button>
                  </form>
                </td>
              </tr>
            ))}
            {docs.length === 0 && <tr><td colSpan={5} className="muted">Nothing logged yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
