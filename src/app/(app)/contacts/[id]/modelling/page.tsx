import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { getContact, listReportSnapshots } from "@/lib/domain/service";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";
const money = (v?: number | null) => (v === undefined || v === null ? "—" : "$" + Math.round(v).toLocaleString("en-AU"));
const date = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "—");

export default async function PersonModellingTab({ params }: { params: { id: string } }) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const c = await getContact(tenantId, params.id);
  if (!c) notFound();
  const runs = (await listReportSnapshots(tenantId)).filter((r) => r.clientId === c.id);

  return (
    <>
      <p className="sub">Modelling runs saved to {c.name}&apos;s file. {runs.length} on record.</p>

      <div className="panel">
        <h2>Saved runs</h2>
        <table>
          <thead><tr><th>Property</th><th>Verdict</th><th>Weekly</th><th>Gross yield</th><th>Saved</th></tr></thead>
          <tbody>
            {runs.map((r) => {
              const p = r.payload;
              return (
                <tr key={r.id}>
                  <td><strong>{p.address ?? r.title ?? "Run"}</strong>{p.state ? ` · ${p.state}` : ""}</td>
                  <td><span className="badge">{p.verdictBand ?? "—"}{p.verdictScore != null ? ` ${Math.round(p.verdictScore)}` : ""}</span></td>
                  <td>{p.weekly1 != null ? money(p.weekly1) + "/wk" : "—"}</td>
                  <td>{p.grossYield != null ? (p.grossYield * 100).toFixed(1) + "%" : "—"}</td>
                  <td className="muted">{date(r.createdAt)}</td>
                </tr>
              );
            })}
            {runs.length === 0 && <tr><td colSpan={5} className="muted">No saved runs yet. Model a property and save the run to this person&apos;s file.</td></tr>}
          </tbody>
        </table>
        <div style={{ marginTop: 14 }}>
          <Link className="btn" href={`/modeller?clientId=${c.id}`}>Open the Modeller →</Link>
        </div>
      </div>
    </>
  );
}
