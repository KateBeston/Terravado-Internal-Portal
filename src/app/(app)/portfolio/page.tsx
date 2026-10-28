import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { listClients, getClient, listProperties, listLenders, listEntities } from "@/lib/domain/service";
import { dealInputs } from "@/lib/deal/pack";
import { runModel, assessPosition } from "@/lib/modelling/run";
import { aggregateLandTax, type LandTaxHolding } from "@/lib/engine/landtax";
import { createPropertyAction, saveLandTaxInputsAction } from "@/app/actions";
import Link from "next/link";

const pct = (x: number) => (Math.round(x * 10) / 10).toLocaleString("en-AU") + "%";

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
  const entities = client ? await listEntities(tenantId) : [];
  const entById = new Map(entities.map((e) => [e.id, e]));
  const ownerName = (p: (typeof properties)[number]) => (p.entityId ? entById.get(p.entityId)?.name : undefined) ?? (client ? `${client.name} (personal)` : "—");
  const holdings: LandTaxHolding[] = properties.map((p) => {
    const ent = p.entityId ? entById.get(p.entityId) : undefined;
    return {
      id: p.id, label: p.address, region: p.state ?? "",
      landValue: p.details?.tax?.landValueManual ?? 0,
      ownerKey: p.entityId ?? `personal:${client!.id}`,
      ownerName: ownerName(p), ownerKind: ent?.kind ?? "Individual",
      isPPOR: p.details?.tax?.isPPOR ?? false,
    };
  });
  const landtax = aggregateLandTax(holdings);

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
              Indicative: capacity is assessed on the client&apos;s position across the lender templates. Land-tax aggregation across the portfolio is shown below.
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

          {landtax.difference > 100 && (
            <div className="panel" style={{ borderLeft: "5px solid #b03a2e" }}>
              <h2>Land tax — aggregation effect</h2>
              <p className="muted" style={{ marginTop: -4 }}>
                Assessed individually these holdings would attract <strong>{money(landtax.totalStandalone)}</strong> of land tax a year.
                Assessed as the revenue offices actually do it — per owning entity, per state, threshold applied once —
                they attract <strong>{money(landtax.totalAggregated)}</strong>. The extra <strong style={{ color: "#b03a2e" }}>{money(landtax.difference)}</strong> a
                year is the single most commonly missed line in Australian property modelling.
              </p>
            </div>
          )}

          <div className="panel">
            <h2>Land tax inputs</h2>
            <p className="muted" style={{ marginTop: -4, fontSize: 12 }}>
              Enter each property&apos;s <strong>unimproved land value</strong> from the land-tax / rates notice — not the purchase price.
              Tick PPOR to exempt a principal place of residence. Land tax aggregates per state and per owning entity, so assign ownership on each property&apos;s record.
            </p>
            {properties.length === 0 ? <p className="muted">No properties yet.</p> : (
              <form action={saveLandTaxInputsAction}>
                <input type="hidden" name="clientId" value={client.id} />
                <input type="hidden" name="ids" value={properties.map((p) => p.id).join(",")} />
                <table>
                  <thead><tr><th>Property</th><th>State</th><th>Owner</th><th>Unimproved land value</th><th>PPOR</th></tr></thead>
                  <tbody>
                    {properties.map((p) => (
                      <tr key={p.id}>
                        <td><strong>{p.address}</strong></td>
                        <td>{p.state ?? "—"}</td>
                        <td>{ownerName(p)}</td>
                        <td><input name={`lv_${p.id}`} inputMode="numeric" defaultValue={p.details?.tax?.landValueManual ?? ""} placeholder="e.g. 820,000" style={{ width: 140 }} /></td>
                        <td><input type="checkbox" name={`ppor_${p.id}`} defaultChecked={p.details?.tax?.isPPOR ?? false} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button className="btn" type="submit">Save land values</button>
              </form>
            )}
          </div>

          <div className="panel">
            <h2>Land tax aggregation</h2>
            <p className="muted" style={{ marginTop: -4, fontSize: 12 }}>
              Grouped per state and owning entity. The threshold is applied once to the group total, then apportioned back across the holdings by land-value share.
            </p>
            {landtax.groups.length === 0 ? (
              <p className="muted">No land-taxable holdings yet. Set unimproved land values above — PPORs and properties without a land value are excluded.</p>
            ) : landtax.groups.map((g) => (
              <div key={g.key} style={{ marginBottom: 18 }}>
                <h3 style={{ marginBottom: 6 }}>{g.region || "—"} — {g.ownerName}{g.ownerKind ? ` · ${g.ownerKind}` : ""}</h3>
                <table>
                  <thead><tr><th>Property</th><th>Land value</th><th>Share</th><th>Apportioned tax</th><th>If assessed alone</th></tr></thead>
                  <tbody>
                    {g.props.map((p) => (
                      <tr key={p.id}>
                        <td>{p.label}</td><td>{money(p.landValue)}</td><td>{pct(p.share * 100)}</td>
                        <td>{money(p.apportioned)}</td><td className="muted">{money(p.standalone)}</td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 600 }}>
                      <td>Aggregate</td><td>{money(g.landValue)}</td><td>100%</td><td>{money(g.tax)}</td><td>{money(g.standalone)}</td>
                    </tr>
                  </tbody>
                </table>
                {g.tax > g.standalone + 100 && <p style={{ color: "#b03a2e", fontSize: 13, marginTop: 6 }}>Aggregation costs an extra <strong>{money(g.tax - g.standalone)}</strong> a year in this group.</p>}
                {g.nswTrustFlag && <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>NSW trust: if the trust deed does not exclude foreign persons, the land-tax threshold is unavailable and a surcharge applies — confirm the deed. (Not included in the figures above.)</p>}
              </div>
            ))}
            {landtax.excluded.length > 0 && (
              <p className="muted" style={{ fontSize: 12 }}>
                Excluded: {landtax.excluded.map((e) => `${e.label} (${e.reason.toLowerCase()})`).join("; ")}.
              </p>
            )}
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
