import { requireUser, requireCapability } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { listDeals, listLots, listClients, listDevelopments } from "@/lib/domain/service";
import { createDealAction, updateDealStageAction, deleteDealAction } from "@/app/actions";
import { DEAL_STAGES, commissionFor } from "@/lib/domain/types";
import CommissionCalculator from "@/components/CommissionCalculator";

export const dynamic = "force-dynamic";
const money = (v?: number | null) => (v === undefined || v === null ? "—" : "$" + Math.round(v).toLocaleString("en-AU"));
const label = (s?: string) => (s ? s.replace(/_/g, " ") : "—");
const CLOSED = new Set(["settled", "lost"]);

export default async function PipelinePage() {
  await requireUser();
  await requireCapability("stock");
  const { tenantId } = await getCurrentTenant();
  const [deals, lots, clients, developments] = await Promise.all([
    listDeals(tenantId), listLots(tenantId), listClients(tenantId), listDevelopments(tenantId),
  ]);
  const lotLabel = (id?: string) => { const l = lots.find((x) => x.id === id); return l ? (l.lotNumber ? `Lot ${l.lotNumber}` : l.address ?? "Lot") : null; };
  const clientName = (id?: string) => clients.find((c) => c.id === id)?.name ?? "—";

  const open = deals.filter((d) => !CLOSED.has(d.stage ?? ""));
  const settled = deals.filter((d) => d.stage === "settled");
  const pipelineValue = open.reduce((s, d) => s + (d.salePrice ?? 0), 0);
  const pipelineCommission = open.reduce((s, d) => s + commissionFor(d), 0);
  const settledCommission = settled.reduce((s, d) => s + commissionFor(d), 0);

  return (
    <section>
      <h1>Pipeline</h1>
      <p className="sub">Your sales deals by stage, with commission on each and revenue tracked through to settlement.</p>

      <div className="cards">
        <div className="card"><div className="k">Open deals</div><div className="v">{open.length}</div></div>
        <div className="card"><div className="k">Pipeline value</div><div className="v">{money(pipelineValue)}</div></div>
        <div className="card"><div className="k">Pipeline commission</div><div className="v">{money(pipelineCommission)}</div></div>
        <div className="card"><div className="k">Settled commission</div><div className="v">{money(settledCommission)}</div></div>
      </div>

      <div className="panel">
        <h2>Commission calculator</h2>
        <CommissionCalculator />
      </div>

      <div className="panel">
        <h2>Deals</h2>
        <table>
          <thead><tr><th>Property</th><th>Client</th><th>Sale price</th><th>Commission</th><th>Stage</th><th></th></tr></thead>
          <tbody>
            {deals.map((d) => (
              <tr key={d.id}>
                <td><strong>{lotLabel(d.lotId) ?? d.propertyLabel ?? "—"}</strong></td>
                <td>{d.clientId ? clientName(d.clientId) : "—"}</td>
                <td>{money(d.salePrice)}</td>
                <td>{money(commissionFor(d))}{d.commissionPct ? <span className="muted" style={{ fontSize: 12 }}> · {d.commissionPct}%</span> : null}</td>
                <td>
                  <form action={updateDealStageAction} style={{ display: "flex", gap: 6, alignItems: "center", margin: 0 }}>
                    <input type="hidden" name="id" value={d.id} />
                    <select name="stage" defaultValue={d.stage ?? "lead"} style={{ width: "auto" }}>
                      {DEAL_STAGES.map((st) => <option key={st} value={st}>{label(st)}</option>)}
                    </select>
                    <button className="btn ghost" type="submit" style={{ margin: 0, padding: "6px 10px" }}>Set</button>
                  </form>
                </td>
                <td>
                  <form action={deleteDealAction}>
                    <input type="hidden" name="id" value={d.id} />
                    <button className="x" type="submit" aria-label="Delete">×</button>
                  </form>
                </td>
              </tr>
            ))}
            {deals.length === 0 && <tr><td colSpan={6} className="muted">No deals yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Add a deal</h2>
        <form action={createDealAction}>
          <div className="row">
            <label className="f"><span>Lot (from stock)</span>
              <select name="lotId" defaultValue="">
                <option value="">— None / enter manually —</option>
                {lots.map((l) => <option key={l.id} value={l.id}>{(l.lotNumber ? `Lot ${l.lotNumber}` : l.address ?? "Lot")}{l.price ? ` · $${l.price.toLocaleString("en-AU")}` : ""}</option>)}
              </select>
            </label>
            <label className="f"><span>or Property label</span><input name="propertyLabel" placeholder="e.g. 12 Smith St (non-stock)" /></label>
          </div>
          <div className="row">
            <label className="f"><span>Client</span>
              <select name="clientId" defaultValue=""><option value="">— None —</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
            </label>
            <label className="f"><span>Sale price</span><input name="salePrice" type="number" step="1000" placeholder="defaults to the lot price" /></label>
          </div>
          <div className="row">
            <label className="f"><span>Commission %</span><input name="commissionPct" type="number" step="0.1" placeholder="defaults to the development rate" /></label>
            <label className="f"><span>or Commission flat ($)</span><input name="commissionFlat" type="number" step="500" /></label>
          </div>
          <div className="row">
            <label className="f"><span>Stage</span><select name="stage" defaultValue="lead">{DEAL_STAGES.map((st) => <option key={st} value={st}>{label(st)}</option>)}</select></label>
            <label className="f"><span>Expected settlement</span><input name="expectedSettlement" type="date" /></label>
          </div>
          <label className="f"><span>Notes</span><textarea name="notes" rows={2} /></label>
          <button className="btn" type="submit">Add deal</button>
        </form>
        <p className="muted" style={{ fontSize: 12 }}>Pick a lot and the development, sale price and commission rate pre-fill from the stock. Stages run lead → reserved → awaiting pre-approval → finance → contract → title registration → settlement → settled.</p>
      </div>
    </section>
  );
}
