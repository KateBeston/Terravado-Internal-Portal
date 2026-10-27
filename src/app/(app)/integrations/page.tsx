import { requireUser } from "@/lib/auth/guard";
import { integrationStatuses } from "@/lib/integrations/registry";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  await requireUser();
  const items = integrationStatuses();
  const connected = items.filter((i) => i.configured).length;

  // Group by category, preserving order.
  const categories: string[] = [];
  for (const i of items) if (!categories.includes(i.category)) categories.push(i.category);

  return (
    <section>
      <h1>Integrations</h1>
      <p className="sub">Every external tool Terravado connects to, and what it needs to switch on. {connected} of {items.length} connected.</p>

      <div className="panel" style={{ borderLeft: "4px solid var(--primary)" }}>
        <p className="muted" style={{ margin: 0 }}>
          Each integration has a built seam and a working fallback — so the portal runs fully today, and each external tool
          switches on by setting its environment variable once the agreement/key is in place. No rebuild required.
        </p>
      </div>

      {categories.map((cat) => (
        <div className="panel" key={cat}>
          <h2>{cat}</h2>
          <table>
            <thead><tr><th>Tool</th><th>State</th><th>Enables</th><th>Fallback in use</th><th>Env var</th><th>Access needed</th></tr></thead>
            <tbody>
              {items.filter((i) => i.category === cat).map((i) => (
                <tr key={i.key}>
                  <td><strong>{i.label}</strong></td>
                  <td>
                    <span className="badge" style={{
                      background: i.configured ? "var(--success-bg)" : "var(--warning-bg)",
                      color: i.configured ? "var(--success)" : "var(--warning)",
                    }}>{i.configured ? "Connected" : "Fallback"}</span>
                  </td>
                  <td className="muted">{i.enables}</td>
                  <td className="muted">{i.configured ? "—" : i.fallback}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 11 }}>{i.envVar}</td>
                  <td className="muted">{i.access}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <p className="muted" style={{ fontSize: 12 }}>
        Set an integration&apos;s environment variable (server-side) once its agreement/key is in place and it takes over from the
        fallback automatically. CDR product data needs no paid key — it&apos;s public; it just needs the poller built.
      </p>
    </section>
  );
}
