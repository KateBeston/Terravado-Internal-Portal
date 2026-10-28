import { requireUser, requireCapability } from "@/lib/auth/guard";
import { listRegulatoryAlerts } from "@/lib/regwatch/store";
import { regSources, REG_CATEGORIES } from "@/lib/integrations/regwatch";
import { runRegWatchAction, acknowledgeRegAlertAction, acknowledgeAllRegAction } from "@/app/actions";
import Link from "next/link";

export const dynamic = "force-dynamic";
const date = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "—");
const CAT_LABEL: Record<string, string> = {
  tax: "Tax", lending: "Lending", "financial-services": "Financial services", "real-estate": "Real estate",
  aml: "AML", "property-management": "Property mgmt", commercial: "Commercial", trusts: "Trusts", accounting: "Accounting",
};

export default async function RegulatoryWatchPage({ searchParams }: { searchParams: { category?: string } }) {
  await requireUser();
  await requireCapability("integrations");
  const category = searchParams.category && REG_CATEGORIES.includes(searchParams.category as never) ? searchParams.category : undefined;
  const alerts = await listRegulatoryAlerts(category);
  const unread = alerts.filter((a) => !a.acknowledged).length;
  const sources = regSources();

  return (
    <section>
      <h1>Regulatory Watch</h1>
      <p className="sub">
        Automated fortnightly monitoring of the regulators that touch property, lending, financial services, real estate, AML,
        trusts and accounting. New items appear here; it surfaces the change and links to the source — it doesn&apos;t interpret the law.
      </p>

      <div className="panel" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <form action={runRegWatchAction}><button className="btn" type="submit">Check now</button></form>
        {unread > 0 && <form action={acknowledgeAllRegAction}><button className="act ghost" type="submit">Mark all read ({unread})</button></form>}
        <span className="muted" style={{ fontSize: 12, marginLeft: "auto" }}>Monitoring {sources.length} sources · fortnightly (1st &amp; 15th) via Vercel Cron</span>
      </div>

      <div className="panel" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <Link href="/regulatory-watch" className="badge" style={{ textDecoration: "none", borderColor: !category ? "var(--green)" : "var(--line)" }}>All</Link>
        {REG_CATEGORIES.map((c) => (
          <Link key={c} href={`/regulatory-watch?category=${c}`} className="badge" style={{ textDecoration: "none", borderColor: category === c ? "var(--green)" : "var(--line)" }}>{CAT_LABEL[c]}</Link>
        ))}
      </div>

      <div className="panel">
        <h2>Updates{category ? ` — ${CAT_LABEL[category]}` : ""}</h2>
        {alerts.length === 0 ? (
          <p className="muted">No updates captured yet. Hit <em>Check now</em> to pull the latest from the regulators (runs live on the server; the build sandbox can&apos;t reach these sites, so this fills in once deployed).</p>
        ) : (
          <table>
            <thead><tr><th>Date</th><th>Body</th><th>Category</th><th>Update</th><th></th></tr></thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id} style={{ opacity: a.acknowledged ? 0.55 : 1 }}>
                  <td className="muted">{date(a.published_at ?? a.created_at)}</td>
                  <td><strong>{a.body ?? "—"}</strong></td>
                  <td><span className="badge">{CAT_LABEL[a.category ?? ""] ?? a.category}</span></td>
                  <td>
                    {a.url ? <a href={a.url} target="_blank" rel="noreferrer"><strong>{a.title}</strong></a> : <strong>{a.title}</strong>}
                    {a.summary && <div className="muted" style={{ fontSize: 12 }}>{a.summary}</div>}
                    {!a.acknowledged && <span className="badge" style={{ color: "#b03a2e", borderColor: "#b03a2e", fontSize: 10, marginLeft: 6 }}>new</span>}
                  </td>
                  <td>
                    {!a.acknowledged && (
                      <form action={acknowledgeRegAlertAction}><input type="hidden" name="id" value={a.id} /><button className="act ghost mini" type="submit">Mark read</button></form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="muted" style={{ fontSize: 11 }}>
          Sources are configurable (RSS/newsroom feeds per body) via <code>REGWATCH_SOURCES</code>. The fortnightly job needs
          <code> CRON_SECRET</code> set in Vercel; interpreting any change and updating the engine stays a human-reviewed step.
        </p>
      </div>
    </section>
  );
}
