import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { listClients, getClient, listProperties, listLenders } from "@/lib/domain/service";
import { dealInputs } from "@/lib/deal/pack";
import { runModel, assessPosition } from "@/lib/modelling/run";
import { createPropertyAction } from "@/app/actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const STATUSES = ["considering", "owned", "sold"];
const money = (v?: number | null) => (v === undefined || v === null ? "—" : (v < 0 ? "-$" : "$") + Math.abs(Math.round(v)).toLocaleString("en-AU"));
const asStr = (v: string | string[] | undefined, d = ""): string => (typeof v === "string" ? v : d);

export default async function PortfolioPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const clients = await listClients(tenantId);

  const clientId = asStr(searchParams.clientId);
  const client = clientId ? (clients.find((c) => c.id === clientId) ?? (await getClient(tenantId, clientId))) : null;

  const engineLenders = (await listLenders(tenantId))
    .filter((l) => l.active !== false)
    .map((l) => ({ id: l.id, name: l.name, isTemplate: false, ...(l.policy ?? {}) }));

  const properties = client ? (await listProperties(tenantId)).filter((p) => p.clientId === client.id) : [];

  const rows = client ? properties.map((p) => {
    const r = runModel(dealInputs(client, p, engineLenders));
    return {
      id: p.id, address: p.address, price: p.price ?? 0,
      valueEnd: r.metrics.valueEnd, equityEnd: r.metrics.equityEnd, weekly1: r.metrics.weekly1, loan: r.acq.loan,
    };
  }) : [];

  const totals = rows.reduce((t, r) => ({
    price: t.price + r.price, valueEnd: t.valueEnd + r.valueEnd, equityEnd: t.equityEnd + r.equityEnd,
    weekly1: t.weekly1 + r.weekly1, loan: t.loan + r.loan,
  }), { price: 0, valueEnd: 0, equityEnd: 0, weekly1: 0, loan: 0 });

  const fin = client?.finances ?? {};
  const capacity = client ? (assessPosition({
    grossIncome: fin.grossIncome ?? 0, partnerIncome: fin.partnerIncome, livingExpMonthly: fin.livingExpMonthly,
    dependants: fin.dependants, monthlyCommitments: fin.monthlyCommitments, cardLimits: fin.cardLimits, hecsBalance: fin.hecsBalance,
  }, engineLenders)[0]?.capacity ?? 0) : 0;
  const serviceable = capacity >= totals.loan;

  return (
    <section>
      <h1>Portfolio</h1>
      <p className="sub">A client&apos;s whole position across every property they hold or are considering.</p>

      <div className="panel">
        <h2>Client</h2>
        <form method="get">
          <label className="f"><span>Portfolio for</span>
            <select name="clientId" defaultValue={clientId}>
              <option value="">— Choose a client —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <button className="btn" type="submit">View portfolio</button>
        </form>
      </div>

      {client && (
        <>
          <div className="cards">
            <div className="card"><div className="k">Properties</div><div className="v">{rows.length}</div></div>
            <div className="card"><div className="k">Current value</div><div className="v">{money(totals.price)}</div></div>
            <div className="card"><div className="k">Projected equity (yr 10)</div><div className="v">{money(totals.equityEnd)}</div></div>
            <div className="card"><div className="k">Combined weekly</div><div className="v" style={{ color: totals.weekly1 < 0 ? "#b03a2e" : "#1f6f54" }}>{money(totals.weekly1)}</div></div>
          </div>

          <div className="panel" style={{ borderLeft: `5px solid ${serviceable ? "#1f6f54" : "#b03a2e"}` }}>
            <h2>Portfolio serviceability</h2>
            <p className="muted" style={{ marginTop: -4 }}>
              Total borrowing <strong>{money(totals.loan)}</strong> against {client.name}&apos;s capacity of <strong>{money(capacity)}</strong> (best-fit lender) —
              <strong style={{ color: serviceable ? "#1f6f54" : "#b03a2e" }}> {serviceable ? "within capacity" : "over capacity"}</strong>.
            </p>
            <p className="muted" style={{ fontSize: 12 }}>
              Indicative: capacity is assessed on the client&apos;s position across the lender templates; combined land-tax aggregation is a later refinement.
            </p>
          </div>

          <div className="panel">
            <h2>Properties</h2>
            <table>
              <thead><tr><th>Property</th><th>Current price</th><th>End value (yr10)</th><th>End equity</th><th>Weekly</th><th>Loan</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td><Link href={`/properties/${r.id}`}><strong>{r.address}</strong></Link></td>
                    <td>{money(r.price)}</td>
                    <td>{money(r.valueEnd)}</td>
                    <td>{money(r.equityEnd)}</td>
                    <td style={{ color: r.weekly1 < 0 ? "#b03a2e" : "#1f6f54" }}>{money(r.weekly1)}</td>
                    <td>{money(r.loan)}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={6} className="muted">No properties assigned to {client.name} yet. Add one below, or assign an existing property on its record.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="panel">
            <h2>Add a property to {client.name}</h2>
            <form action={createPropertyAction}>
              <input type="hidden" name="clientId" value={client.id} />
              <label className="f"><span>Address</span><input name="address" required placeholder="Street, suburb, state, postcode" /></label>
              <div className="row">
                <label className="f"><span>State</span><select name="state" defaultValue="NSW">{STATES.map((s) => <option key={s}>{s}</option>)}</select></label>
                <label className="f"><span>Price</span><input name="price" inputMode="numeric" placeholder="1,250,000" /></label>
              </div>
              <label className="f"><span>Status</span><select name="status" defaultValue="considering">{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
              <button className="btn" type="submit">Add property</button>
            </form>
          </div>
        </>
      )}
    </section>
  );
}
