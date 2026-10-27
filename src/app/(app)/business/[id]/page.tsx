import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { getBusinessDoc } from "@/lib/domain/service";
import { updateBusinessDocAction } from "@/app/actions";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";
const STATUSES = ["active", "draft", "archived"];

export default async function BusinessDocPage({ params }: { params: { id: string } }) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const d = await getBusinessDoc(tenantId, params.id);
  if (!d) notFound();

  return (
    <section>
      <div className="sub" style={{ marginBottom: 6 }}><Link href="/business">← The Business</Link></div>
      <h1 style={{ marginBottom: 6 }}>{d.title}</h1>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 18, color: "var(--muted)", fontSize: 13 }}>
        <span>{d.category ?? "—"}</span><span>·</span>
        <span className="badge">{d.status ?? "active"}</span>
        {d.link && <><span>·</span><a href={d.link} target="_blank" rel="noreferrer">external link ↗</a></>}
      </div>

      {d.summary && <p className="sub" style={{ fontStyle: "italic" }}>{d.summary}</p>}

      <div className="panel">
        {d.content
          ? <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: 14 }}>{d.content}</div>
          : <p className="muted">No content stored yet. Add it below.</p>}
      </div>

      <details>
        <summary style={{ cursor: "pointer", color: "var(--muted)", fontSize: 13, marginBottom: 12 }}>Edit this document</summary>
        <div className="panel">
          <form action={updateBusinessDocAction}>
            <input type="hidden" name="id" value={d.id} />
            <div className="row">
              <label className="f"><span>Status</span>
                <select name="status" defaultValue={d.status ?? "active"}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
              </label>
              <label className="f"><span>Link</span><input name="link" defaultValue={d.link ?? ""} placeholder="https://…" /></label>
            </div>
            <label className="f"><span>Summary</span><textarea name="summary" rows={2} defaultValue={d.summary ?? ""} /></label>
            <label className="f"><span>Content</span><textarea name="content" rows={16} defaultValue={d.content ?? ""} /></label>
            <button className="btn" type="submit">Save document</button>
          </form>
        </div>
      </details>
    </section>
  );
}
