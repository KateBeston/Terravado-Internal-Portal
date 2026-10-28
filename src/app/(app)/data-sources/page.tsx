import { requireUser, requireCapability } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { integrationStatuses } from "@/lib/integrations/registry";
import { getAbsIndicators } from "@/lib/integrations/abs";
import { getBankProducts } from "@/lib/integrations/bank-products";
import { listDataSourceEvents } from "@/lib/domain/service";
import { checkDataSourcesAction } from "@/app/actions";

export const dynamic = "force-dynamic";
const date = (iso?: string) => (iso ? new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

const BADGE: Record<string, { label: string; color: string }> = {
  live: { label: "Live", color: "#1f6f54" },
  fallback: { label: "Fallback", color: "#9a7b1f" },
  connected: { label: "Connected", color: "#1f6f54" },
  "not-connected": { label: "Not connected", color: "var(--muted)" },
  error: { label: "Error", color: "#b03a2e" },
};
function Badge({ s }: { s: string }) {
  const b = BADGE[s] ?? BADGE["not-connected"];
  return <span className="badge" style={{ color: b.color, borderColor: b.color }}>{b.label}</span>;
}

/* Data Sources — manage and log every external source Terravado draws on: its
   status (live / fallback / connected), what it enables, how to connect it, and
   an activity log of the live checks. */
export default async function DataSourcesPage() {
  await requireUser();
  await requireCapability("integrations");
  const { tenantId } = await getCurrentTenant();

  const sources = integrationStatuses();
  const [abs, cdr, eventsRaw] = await Promise.all([getAbsIndicators(), getBankProducts(), listDataSourceEvents(tenantId)]);
  const events = [...eventsRaw].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")).slice(0, 30);

  // Live health overlay for the sources that actually fetch at runtime.
  const liveStatus: Record<string, string> = {
    abs: abs.live ? "live" : "fallback",
    cdr: cdr.banksReturned ? "live" : "fallback",
  };
  const statusOf = (key: string, configured: boolean) => liveStatus[key] ?? (configured ? "connected" : "not-connected");

  return (
    <section>
      <h1>Data Sources</h1>
      <p className="sub">Every external source Terravado draws on — its status, what it enables, and how to connect it. Connecting is done with environment variables on the server; this is the single place to see and log them.</p>

      <div className="panel">
        <h2>Live health</h2>
        <div className="cards">
          <div className="card"><div className="k">ABS statistics</div><div className="v"><Badge s={abs.live ? "live" : "fallback"} /></div><div className="k">{abs.live ? "as at " + abs.asAt : "indicative snapshot"}</div></div>
          <div className="card"><div className="k">CDR product data</div><div className="v"><Badge s={cdr.banksReturned ? "live" : "fallback"} /></div><div className="k">{cdr.banksReturned ? `${cdr.banksReturned}/${cdr.banksTried} banks` : "no banks returned"}</div></div>
        </div>
        <form action={checkDataSourcesAction} style={{ marginTop: 10 }}>
          <button className="btn" type="submit">Check now &amp; log</button>
        </form>
      </div>

      <div className="panel">
        <h2>All sources</h2>
        <table>
          <thead><tr><th>Source</th><th>Category</th><th>Status</th><th>Enables</th><th>Connect with</th></tr></thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.key}>
                <td><strong>{s.label}</strong></td>
                <td>{s.category}</td>
                <td><Badge s={statusOf(s.key, s.configured)} /></td>
                <td style={{ fontSize: 13 }}>{s.enables}</td>
                <td style={{ fontSize: 12 }}><code>{s.envVar}</code><div className="muted" style={{ fontSize: 11 }}>{s.access}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Activity log</h2>
        {events.length === 0 ? <p className="muted">No checks logged yet — use “Check now &amp; log”.</p> : (
          <table>
            <thead><tr><th>When</th><th>Source</th><th>Status</th><th>Detail</th></tr></thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td className="muted">{date(e.createdAt)}</td>
                  <td><strong>{e.sourceKey?.toUpperCase() ?? "—"}</strong></td>
                  <td><Badge s={e.status ?? "not-connected"} /></td>
                  <td style={{ fontSize: 12 }}>{e.detail ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="muted" style={{ fontSize: 11 }}>Logs each time a live source is checked or refreshed, with whether it ran live or fell back. Live fetches are cached, so a check reflects the last fetch within the cache window.</p>
      </div>
    </section>
  );
}
