import { requireUser } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { deriveAssessableFinances } from "@/lib/domain/finances";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";
const money = (v?: number | null) => (v === undefined || v === null ? "—" : "$" + Math.round(v).toLocaleString("en-AU"));
const date = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "—");

/* Read-only view of a deal shared with the current user. Reads are not
   tenant-filtered — RLS (the *_shared_select policies) scopes them to the shared
   deal only. A deal that isn't shared with the viewer simply returns nothing. */
export default async function SharedDealPage({ params }: { params: { clientId: string } }) {
  await requireUser();
  const sb = createClient();

  const { data: person } = await sb.from("contacts").select("*").eq("id", params.clientId).maybeSingle();
  if (!person) notFound();

  const [{ data: props }, { data: runs }] = await Promise.all([
    sb.from("properties").select("*").eq("client_id", params.clientId),
    sb.from("report_snapshots").select("*").eq("client_id", params.clientId).order("created_at", { ascending: false }),
  ]);
  const properties = (props as any[]) ?? [];
  const snapshots = (runs as any[]) ?? [];

  const fin = deriveAssessableFinances(person.finances ?? {});
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
        <span>·</span><span className="badge">View only</span>
      </div>

      <div className="panel">
        <h2>Serviceability snapshot</h2>
        <div className="cards">
          <div className="card"><div className="k">Gross income</div><div className="v">{money(fin.grossIncome)}</div></div>
          <div className="card"><div className="k">Partner income</div><div className="v">{money(fin.partnerIncome)}</div></div>
          <div className="card"><div className="k">Card limits</div><div className="v">{money(fin.cardLimits)}</div></div>
          <div className="card"><div className="k">Other commitments / mth</div><div className="v">{money(fin.monthlyCommitments)}</div></div>
        </div>
        {(d.residency || d.maritalStatus) && (
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

      <p className="muted" style={{ fontSize: 12 }}>
        You&apos;ve been given view-only access to this single deal. You can&apos;t see anything else in the sharing account.
      </p>
    </section>
  );
}
