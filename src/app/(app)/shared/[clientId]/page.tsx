import { requireUser } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { deriveAssessableFinances } from "@/lib/domain/finances";
import { addDealNoteAction, addDealDocumentAction, collabSaveFinancesAction } from "@/app/actions";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";
const money = (v?: number | null) => (v === undefined || v === null ? "—" : "$" + Math.round(v).toLocaleString("en-AU"));
const date = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "—");
const num = (x?: number) => (x === undefined || x === null ? "" : String(x));
const DOC_KINDS = ["Pre-approval", "Loan document", "ID / verification", "Contract of sale", "Financial statement", "Other"];

/* A deal shared with the current user. Reads are not tenant-filtered — RLS scopes
   them to the shared deal. With collaborate permission, the guest can add notes,
   add documents and update the financials (all via guarded RPCs). */
export default async function SharedDealPage({ params }: { params: { clientId: string } }) {
  await requireUser();
  const sb = createClient();
  const cid = params.clientId;

  const { data: person } = await sb.from("contacts").select("*").eq("id", cid).maybeSingle();
  if (!person) notFound();

  const [{ data: props }, { data: runs }, { data: shares }, { data: noteRows }, { data: docRows }] = await Promise.all([
    sb.from("properties").select("*").eq("client_id", cid),
    sb.from("report_snapshots").select("*").eq("client_id", cid).order("created_at", { ascending: false }),
    sb.from("deal_shares").select("permission").eq("client_id", cid).eq("status", "accepted"),
    sb.from("deal_notes").select("*").eq("client_id", cid).order("created_at", { ascending: true }),
    sb.from("documents").select("*").eq("client_id", cid).order("created_at", { ascending: false }),
  ]);
  const properties = (props as any[]) ?? [];
  const snapshots = (runs as any[]) ?? [];
  const notes = (noteRows as any[]) ?? [];
  const docs = (docRows as any[]) ?? [];
  const collaborate = ((shares as any[]) ?? []).some((s) => s.permission === "collaborate");

  const fin = deriveAssessableFinances(person.finances ?? {});
  const f = person.finances ?? {};
  const d = person.details ?? {};
  const roles: string[] = person.roles ?? [];

  return (
    <section>
      <div className="sub" style={{ marginBottom: 6 }}><Link href="/shared">← Shared with me</Link></div>
      <h1 style={{ marginBottom: 6 }}>{person.name}</h1>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 18, color: "var(--muted)", fontSize: 13 }}>
        {roles.map((r) => <span key={r} className="badge">{r}</span>)}
        {person.email && <><span>·</span><span>{person.email}</span></>}
        {person.phone && <><span>·</span><span>{person.phone}</span></>}
        <span>·</span><span className="badge">{collaborate ? "Collaborate" : "View only"}</span>
      </div>

      <div className="panel">
        <h2>Serviceability snapshot</h2>
        <div className="cards">
          <div className="card"><div className="k">Gross income</div><div className="v">{money(fin.grossIncome)}</div></div>
          <div className="card"><div className="k">Partner income</div><div className="v">{money(fin.partnerIncome)}</div></div>
          <div className="card"><div className="k">Card limits</div><div className="v">{money(fin.cardLimits)}</div></div>
          <div className="card"><div className="k">Other commitments / mth</div><div className="v">{money(fin.monthlyCommitments)}</div></div>
        </div>
        {collaborate && (
          <form action={collabSaveFinancesAction} style={{ marginTop: 12 }}>
            <input type="hidden" name="clientId" value={cid} />
            <p className="sub" style={{ marginTop: 0 }}>Update the serviceability position — your changes save to the deal.</p>
            <div className="row">
              <label className="f"><span>Gross income (annual)</span><input name="grossIncome" type="number" step="1000" defaultValue={num(f.grossIncome)} /></label>
              <label className="f"><span>Partner income (annual)</span><input name="partnerIncome" type="number" step="1000" defaultValue={num(f.partnerIncome)} /></label>
            </div>
            <div className="row">
              <label className="f"><span>Living expenses (monthly)</span><input name="livingExpMonthly" type="number" step="50" defaultValue={num(f.livingExpMonthly)} /></label>
              <label className="f"><span>Dependants</span><input name="dependants" type="number" step="1" defaultValue={num(f.dependants)} /></label>
            </div>
            <div className="row">
              <label className="f"><span>Other commitments (monthly)</span><input name="monthlyCommitments" type="number" step="50" defaultValue={num(f.monthlyCommitments)} /></label>
              <label className="f"><span>Card limits</span><input name="cardLimits" type="number" step="500" defaultValue={num(f.cardLimits)} /></label>
              <label className="f"><span>HECS / HELP</span><input name="hecsBalance" type="number" step="500" defaultValue={num(f.hecsBalance)} /></label>
            </div>
            <button className="btn" type="submit">Save financials</button>
          </form>
        )}
        {!collaborate && (d.residency || d.maritalStatus) && (
          <p className="muted" style={{ fontSize: 12 }}>{[d.residency, d.maritalStatus].filter(Boolean).join(" · ")}</p>
        )}
      </div>

      <div className="panel">
        <h2>Properties</h2>
        <table>
          <thead><tr><th>Address</th><th>State</th><th>Price</th><th>Status</th></tr></thead>
          <tbody>
            {properties.map((p) => (
              <tr key={p.id}>
                <td><strong>{p.address}</strong></td><td>{p.state ?? "—"}</td><td>{money(p.price)}</td>
                <td><span className="badge">{p.status ?? "—"}</span></td>
              </tr>
            ))}
            {properties.length === 0 && <tr><td colSpan={4} className="muted">No properties on this deal.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Modelling runs</h2>
        <table>
          <thead><tr><th>Property</th><th>Verdict</th><th>Weekly</th><th>Saved</th></tr></thead>
          <tbody>
            {snapshots.map((r) => {
              const p = r.payload ?? {};
              return (
                <tr key={r.id}>
                  <td><strong>{p.address ?? r.title ?? "Run"}</strong></td>
                  <td><span className="badge">{p.verdictBand ?? "—"}{p.verdictScore != null ? ` ${Math.round(p.verdictScore)}` : ""}</span></td>
                  <td>{p.weekly1 != null ? money(p.weekly1) + "/wk" : "—"}</td>
                  <td className="muted">{date(r.created_at)}</td>
                </tr>
              );
            })}
            {snapshots.length === 0 && <tr><td colSpan={4} className="muted">No saved runs on this deal.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Documents</h2>
        <table>
          <thead><tr><th>Document</th><th>Kind</th><th>Link</th><th>Added</th></tr></thead>
          <tbody>
            {docs.map((dc) => (
              <tr key={dc.id}>
                <td><strong>{dc.name}</strong></td><td>{dc.kind ?? "—"}</td>
                <td>{dc.storage_path ? <a href={dc.storage_path} target="_blank" rel="noreferrer">Open</a> : <span className="muted">—</span>}</td>
                <td className="muted">{date(dc.created_at)}</td>
              </tr>
            ))}
            {docs.length === 0 && <tr><td colSpan={4} className="muted">No documents yet.</td></tr>}
          </tbody>
        </table>
        {collaborate && (
          <form action={addDealDocumentAction} style={{ marginTop: 12 }}>
            <input type="hidden" name="clientId" value={cid} />
            <div className="row">
              <label className="f"><span>Document name</span><input name="name" required placeholder="e.g. Pre-approval — ANZ" /></label>
              <label className="f"><span>Kind</span><select name="kind" defaultValue="Pre-approval">{DOC_KINDS.map((k) => <option key={k}>{k}</option>)}</select></label>
            </div>
            <label className="f"><span>Link / location</span><input name="storagePath" placeholder="https://…" /></label>
            <button className="btn" type="submit">Add document</button>
          </form>
        )}
      </div>

      <div className="panel">
        <h2>Deal notes</h2>
        {notes.length === 0 ? <p className="muted">No notes yet.</p> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {notes.map((nt) => (
              <div key={nt.id} style={{ borderLeft: "2px solid var(--line)", paddingLeft: 10 }}>
                <div className="muted" style={{ fontSize: 12 }}>{nt.author_label ?? "Someone"} · {date(nt.created_at)}</div>
                <div>{nt.body}</div>
              </div>
            ))}
          </div>
        )}
        {collaborate && (
          <form action={addDealNoteAction} style={{ marginTop: 12 }}>
            <input type="hidden" name="clientId" value={cid} />
            <label className="f"><textarea name="body" rows={2} required placeholder="Add a note to the deal…" /></label>
            <button className="btn" type="submit">Post note</button>
          </form>
        )}
      </div>

      <p className="muted" style={{ fontSize: 12 }}>
        {collaborate
          ? "You can contribute to this single deal — notes, documents and the financials. You can't see anything else in the sharing account."
          : "You have view-only access to this single deal. You can't see anything else in the sharing account."}
      </p>
    </section>
  );
}
