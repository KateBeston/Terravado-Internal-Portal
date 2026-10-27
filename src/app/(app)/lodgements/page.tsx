import { requireUser, requireCapability } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { listLodgements } from "@/lib/domain/service";
import { updateLodgementStatusAction, deleteLodgementAction } from "@/app/actions";
import { SIMPOLOGY_CONFIGURED, NEXTGEN_CONFIGURED } from "@/lib/integrations/lodgement";

export const dynamic = "force-dynamic";

const STATUSES = ["prepared", "submitted", "conditional", "approved", "settled", "declined", "withdrawn"];
const LABEL: Record<string, string> = {
  prepared: "Prepared", submitted: "Submitted", conditional: "Conditional approval",
  approved: "Approved", settled: "Settled", declined: "Declined", withdrawn: "Withdrawn",
};
const money = (v?: number) => (v === undefined || v === null ? "—" : "$" + Math.round(v).toLocaleString("en-AU"));

export default async function LodgementsPage() {
  await requireUser();
  await requireCapability("lodgement");
  const { tenantId } = await getCurrentTenant();
  const lodgements = await listLodgements(tenantId);
  const live = SIMPOLOGY_CONFIGURED ? "Simpology" : NEXTGEN_CONFIGURED ? "NextGen" : null;

  return (
    <section>
      <h1>Lodgements</h1>
      <p className="sub">Deals prepared and tracked through to settlement. {lodgements.length} on record.</p>

      <div className="panel" style={{ borderLeft: `4px solid ${live ? "var(--success)" : "var(--warning-border)"}` }}>
        {live
          ? <p className="muted" style={{ margin: 0 }}>Live lodgement channel connected: <strong>{live}</strong>.</p>
          : <p className="muted" style={{ margin: 0 }}>
              Deals are prepared via <strong>export handoff</strong> — the broker lodges through their own aggregator channel, and you track status here.
              A direct Simpology/NextGen connection (one-click lodge + status feed) switches on when keyed.
            </p>}
      </div>

      <div className="panel">
        <h2>Deal pipeline</h2>
        <table>
          <thead><tr><th>Prepared</th><th>Client</th><th>Property</th><th>Loan</th><th>Lender</th><th>Channel</th><th>Ref</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {lodgements.map((l) => {
              const p = l.payload ?? {};
              return (
                <tr key={l.id}>
                  <td className="lbl">{new Date(l.createdAt).toLocaleDateString("en-AU")}</td>
                  <td className="lbl">{p.applicant?.name ?? "—"}</td>
                  <td className="lbl">{p.security?.address ?? "—"}</td>
                  <td>{money(p.loan?.amountRequired)}</td>
                  <td>{p.serviceability?.lender ?? "—"}</td>
                  <td>{l.channel ?? "—"}</td>
                  <td className="muted" style={{ fontSize: 11 }}>{l.reference ?? "—"}</td>
                  <td>
                    <form action={updateLodgementStatusAction} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input type="hidden" name="id" value={l.id} />
                      <select name="status" defaultValue={l.status} style={{ width: "auto", padding: "4px 8px" }}>
                        {STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
                      </select>
                      <button className="btn" type="submit" style={{ padding: "4px 10px", margin: 0 }}>Set</button>
                    </form>
                    {l.notes && <div className="muted" style={{ fontSize: 10, marginTop: 4 }}>{l.notes}</div>}
                  </td>
                  <td>
                    <form action={deleteLodgementAction}>
                      <input type="hidden" name="id" value={l.id} />
                      <button className="x" type="submit" aria-label="Remove">×</button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {lodgements.length === 0 && <tr><td colSpan={9} className="muted">No lodgements yet. Model a deal for a client, open the deal pack, and “Lodge / track”.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
