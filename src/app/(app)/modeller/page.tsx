import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { listClients, getClient, listReportSnapshots, listProperties, getProperty, listLenders } from "@/lib/domain/service";
import { saveClientFinancesAction, saveRunAction } from "@/app/actions";
import { runModel, runScenarios, runStressTest, runLenderCompare, type ModelInputs } from "@/lib/modelling/run";
import { deriveAssessableFinances } from "@/lib/domain/finances";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const money = (v: number) => (v < 0 ? "-$" : "$") + Math.abs(Math.round(v)).toLocaleString("en-AU");
const pct = (v: number | null) => (v === null ? "—" : v.toFixed(2) + "%");
const asStr = (v: string | string[] | undefined, d = ""): string => (typeof v === "string" ? v : d);
const numParam = (v: string | string[] | undefined, d: number): number => {
  if (typeof v !== "string" || v.trim() === "") return d;
  const n = Number(v.replace(/[,$\s%]/g, ""));
  return isFinite(n) ? n : d;
};

const BAND_COLOUR: Record<string, string> = {
  Strong: "#1f6f54", Viable: "#3f8f5f", Marginal: "#b8860b",
};
const bandColour = (band: string) => BAND_COLOUR[band] ?? "#b03a2e";

export default async function ModellerPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const clients = await listClients(tenantId);
  const properties = await listProperties(tenantId);

  // The tenant's active lender products (manual setup) drive the comparison;
  // the engine falls back to built-in templates when none are set up.
  const engineLenders = (await listLenders(tenantId))
    .filter((l) => l.active !== false)
    .map((l) => ({ id: l.id, name: l.name, isTemplate: false, ...(l.policy ?? {}) }));

  // Selected client (if any) and their stored financial position.
  const clientId = asStr(searchParams.clientId, "");
  const client = clientId ? (clients.find((c) => c.id === clientId) ?? (await getClient(tenantId, clientId))) : null;
  const fin = deriveAssessableFinances(client?.finances);

  // Selected property (if any) and its stored record / deep financials.
  const propertyId = asStr(searchParams.propertyId, "");
  const selProp = propertyId ? (properties.find((p) => p.id === propertyId) ?? (await getProperty(tenantId, propertyId))) : null;
  const pd = selProp?.details ?? {};

  // Property inputs — prefill from the selected property when present, else the
  // sample defaults; an explicit URL value always wins.
  const property = {
    address: asStr(searchParams.address, selProp?.address ?? "22 Example St, Ashfield NSW 2131"),
    state: asStr(searchParams.state, selProp?.state ?? "NSW"),
    price: numParam(searchParams.price, selProp?.price ?? 1100000),
    weeklyRent: numParam(searchParams.weeklyRent, pd.weeklyRent ?? 720),
    growthPct: numParam(searchParams.growthPct, pd.locality?.annualGrowthPct ?? 5.5),
    ratePct: numParam(searchParams.ratePct, 6.1),
    depositPct: numParam(searchParams.depositPct, 20),
  };

  // Resolved gross income: URL -> client finances -> default.
  const grossIncome = numParam(searchParams.grossIncome, fin.grossIncome ?? 185000);

  // Client position — only resolved/applied when a client is selected, so the
  // generic (no-client) run keeps the sample serviceability position untouched.
  const pos = client
    ? {
        partnerIncome: numParam(searchParams.partnerIncome, fin.partnerIncome ?? 0),
        livingExpMonthly: numParam(searchParams.livingExpMonthly, fin.livingExpMonthly ?? 4200),
        dependants: numParam(searchParams.dependants, fin.dependants ?? 0),
        monthlyCommitments: numParam(searchParams.monthlyCommitments, fin.monthlyCommitments ?? 0),
        cardLimits: numParam(searchParams.cardLimits, fin.cardLimits ?? 0),
        hecsBalance: numParam(searchParams.hecsBalance, fin.hecsBalance ?? 0),
      }
    : null;

  const inputs: ModelInputs = {
    ...property,
    grossIncome,
    ...(engineLenders.length ? { lenders: engineLenders } : {}),
    ...(selProp ? { modelling: pd.modelling } : {}),
    ...(client ? { clientName: client.name, ...pos } : {}),
  };

  const r = runModel(inputs);
  const scenarios = runScenarios(inputs);
  const stress = runStressTest(inputs);
  const lenders = runLenderCompare(inputs);
  const stressColour = stress.verdict === "Holds comfortably" ? "#1f6f54" : stress.verdict === "Tight" ? "#b8860b" : "#b03a2e";

  // Saved runs on this client's file (newest first from the repository).
  const snaps = client ? (await listReportSnapshots(tenantId)).filter((x) => x.clientId === client.id) : [];

  // Shared hidden fields so "Save position" and "Save run" persist exactly what
  // is currently on screen (run first to apply any URL changes).
  const runFields: [string, string][] = client && pos ? [
    ["clientId", client.id],
    ["propertyId", selProp?.id ?? ""],
    ["address", inputs.address ?? ""],
    ["state", inputs.state],
    ["price", String(inputs.price)],
    ["weeklyRent", String(inputs.weeklyRent)],
    ["growthPct", String(inputs.growthPct)],
    ["ratePct", String(inputs.ratePct)],
    ["depositPct", String(inputs.depositPct)],
    ["grossIncome", String(grossIncome)],
    ["partnerIncome", String(pos.partnerIncome)],
    ["livingExpMonthly", String(pos.livingExpMonthly)],
    ["dependants", String(pos.dependants)],
    ["monthlyCommitments", String(pos.monthlyCommitments)],
    ["cardLimits", String(pos.cardLimits)],
    ["hecsBalance", String(pos.hecsBalance)],
  ] : [];

  return (
    <section>
      <h1>Modeller</h1>
      <p className="sub">A property and a client&apos;s position, run through the full engine — projection, risk, serviceability and a verdict.</p>

      <div className="panel">
        <h2>Inputs</h2>
        <form method="get">
          <label className="f"><span>Model for</span>
            <select name="clientId" defaultValue={clientId}>
              <option value="">— Generic (no client) —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          {client
            ? <p className="muted" style={{ fontSize: 12, marginTop: -4, marginBottom: 14 }}>Serviceability is assessed against <strong>{client.name}</strong>&apos;s position below. Change a figure and run; use “Save to client” to store it on their file.</p>
            : <p className="muted" style={{ fontSize: 12, marginTop: -4, marginBottom: 14 }}>Pick a client to model this property against their real serviceability, or leave generic.</p>}

          <label className="f"><span>Property record</span>
            <select name="propertyId" defaultValue={propertyId}>
              <option value="">— None (ad-hoc entry) —</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.address}</option>)}
            </select>
          </label>
          {selProp && (
            <p className="muted" style={{ fontSize: 12, marginTop: -4, marginBottom: 14 }}>
              Modelling <strong>{selProp.address}</strong> with its saved record{pd.modelling ? " and deep financials (expenses, loan structure, depreciation, capex)" : " — add deep financials on its Financials tab for a full-depth run"}.
            </p>
          )}

          <label className="f"><span>Property address</span><input name="address" defaultValue={inputs.address} /></label>
          <div className="row">
            <label className="f"><span>Purchase price</span><input name="price" inputMode="numeric" defaultValue={String(inputs.price)} /></label>
            <label className="f"><span>Weekly rent</span><input name="weeklyRent" inputMode="numeric" defaultValue={String(inputs.weeklyRent)} /></label>
          </div>
          <div className="row">
            <label className="f"><span>State</span>
              <select name="state" defaultValue={inputs.state}>{STATES.map((s) => <option key={s}>{s}</option>)}</select>
            </label>
            <label className="f"><span>Deposit %</span><input name="depositPct" inputMode="numeric" defaultValue={String(inputs.depositPct)} /></label>
          </div>
          <div className="row">
            <label className="f"><span>Growth % p.a.</span><input name="growthPct" inputMode="numeric" defaultValue={String(inputs.growthPct)} /></label>
            <label className="f"><span>Interest rate %</span><input name="ratePct" inputMode="numeric" defaultValue={String(inputs.ratePct)} /></label>
          </div>

          <div className="eyebrow">{client ? `${client.name} — financial position` : "Client position"}</div>
          <label className="f"><span>Client gross income (annual)</span><input name="grossIncome" inputMode="numeric" defaultValue={String(grossIncome)} /></label>
          {client && pos && (
            <>
              <div className="row">
                <label className="f"><span>Partner income (annual)</span><input name="partnerIncome" inputMode="numeric" defaultValue={String(pos.partnerIncome)} /></label>
                <label className="f"><span>Living expenses (monthly)</span><input name="livingExpMonthly" inputMode="numeric" defaultValue={String(pos.livingExpMonthly)} /></label>
              </div>
              <div className="row">
                <label className="f"><span>Dependants</span><input name="dependants" inputMode="numeric" defaultValue={String(pos.dependants)} /></label>
                <label className="f"><span>Other repayments (monthly)</span><input name="monthlyCommitments" inputMode="numeric" defaultValue={String(pos.monthlyCommitments)} /></label>
              </div>
              <div className="row">
                <label className="f"><span>Credit-card limits (total)</span><input name="cardLimits" inputMode="numeric" defaultValue={String(pos.cardLimits)} /></label>
                <label className="f"><span>HECS/HELP balance</span><input name="hecsBalance" inputMode="numeric" defaultValue={String(pos.hecsBalance)} /></label>
              </div>
            </>
          )}
          <button className="btn" type="submit">Run the model</button>
        </form>

        {client && pos && (
          <>
            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <form action={saveRunAction}>
                {runFields.map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
                <button className="btn" type="submit">Save this run to {client.name}</button>
              </form>
              <form action={saveClientFinancesAction}>
                {runFields.map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
                <button className="btn ghost" type="submit">Save position to {client.name}</button>
              </form>
            </div>
            <span className="muted" style={{ fontSize: 11 }}>Both save the figures currently shown — run first to apply any changes.</span>
          </>
        )}
        {client && selProp && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
            <Link className="btn" href={`/deal/${client.id}/${selProp.id}`}>Export deal →</Link>
            <span className="muted" style={{ fontSize: 11, marginLeft: 10 }}>Application-ready deal pack for {client.name} · {selProp.address}.</span>
          </div>
        )}
      </div>

      {/* Saved runs on this client's file */}
      {client && (
        <div className="panel">
          <h2>Saved runs for {client.name}</h2>
          {snaps.length === 0
            ? <p className="muted">No saved runs yet. Model a property above and “Save this run” to start building {client.name}&apos;s file.</p>
            : <table>
                <thead><tr><th>Date</th><th>Property</th><th>Verdict</th><th>IRR</th><th>Yr-1 weekly</th><th>Capacity</th><th>Stress</th></tr></thead>
                <tbody>
                  {snaps.map((snap) => (
                    <tr key={snap.id}>
                      <td className="lbl">{new Date(snap.createdAt).toLocaleDateString("en-AU")}</td>
                      <td className="lbl">{snap.payload.address || snap.title || "—"}</td>
                      <td><span className="badge" style={{ background: "#eef3f0", color: bandColour(snap.payload.verdictBand) }}>{snap.payload.verdictBand}</span> {snap.payload.verdictScore}</td>
                      <td>{pct(snap.payload.irr)}</td>
                      <td style={{ color: snap.payload.weekly1 < 0 ? "#b03a2e" : "#1f6f54" }}>{money(snap.payload.weekly1)}</td>
                      <td>{money(snap.payload.capacity)}</td>
                      <td>{snap.payload.stressVerdict}</td>
                    </tr>
                  ))}
                </tbody>
              </table>}
        </div>
      )}

      {/* Verdict */}
      <div className="panel" style={{ borderLeft: `5px solid ${bandColour(r.verdict.band)}` }}>
        <h2>Verdict{client ? ` — for ${client.name}` : ""}</h2>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 12 }}>
          <span style={{ fontSize: 26, fontWeight: 700, color: bandColour(r.verdict.band) }}>{r.verdict.band}</span>
          <span className="muted">score {r.verdict.score}/100</span>
        </div>
        {r.verdict.flags.length === 0
          ? <p className="muted">No material flags on these inputs.</p>
          : r.verdict.flags.map((f, i) => (
              <div key={i} style={{ fontSize: 13, marginBottom: 6 }}>
                <span className="badge" style={{ background: f[0] === "High" ? "#f6e3e0" : "#f3eecf", color: f[0] === "High" ? "#b03a2e" : "#7a5a12" }}>{f[0]}</span>{" "}{f[1]}
              </div>
            ))}
      </div>

      {/* Headline metrics */}
      <div className="cards">
        <div className="card"><div className="k">IRR (10yr)</div><div className="v">{pct(r.metrics.irr)}</div></div>
        <div className="card"><div className="k">Year-1 cashflow</div><div className="v" style={{ color: r.metrics.weekly1 < 0 ? "#b03a2e" : "#1f6f54" }}>{money(r.metrics.weekly1)}<span style={{ fontSize: 14, fontWeight: 400 }}>/wk</span></div></div>
        <div className="card"><div className="k">Gross yield</div><div className="v">{r.metrics.grossYield.toFixed(2)}%</div></div>
      </div>

      <div className="panel">
        <h2>Acquisition & serviceability</h2>
        <table>
          <tbody>
            <tr><td className="muted">Loan required</td><td><strong>{money(r.acq.loan)}</strong> at {Math.round(r.acq.lvr * 100)}% LVR</td>
                <td className="muted">Cash to complete</td><td><strong>{money(r.acq.cashIn)}</strong></td></tr>
            <tr><td className="muted">Transfer duty</td><td>{money(r.acq.duty)}</td>
                <td className="muted">Borrowing capacity</td><td><strong>{money(r.serviceability.capacity)}</strong> ({r.serviceability.dti.toFixed(1)}× DTI)</td></tr>
            <tr><td className="muted">End value (yr 10)</td><td>{money(r.metrics.valueEnd)}</td>
                <td className="muted">End equity (yr 10)</td><td><strong>{money(r.metrics.equityEnd)}</strong></td></tr>
          </tbody>
        </table>
        <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          Assessed against {r.serviceability.lender}{client ? ` for ${client.name}` : ""}.
        </div>
      </div>

      {/* Lender comparison */}
      <div className="panel">
        <h2>Lender comparison — best-fit finance</h2>
        <p className="muted" style={{ marginTop: -4, marginBottom: 12 }}>
          Borrowing capacity for {client ? <strong>{client.name}</strong> : "this position"} across our lender templates,
          for the {money(lenders.loanRequired)} loan this purchase needs.
        </p>
        <table>
          <thead><tr><th>Lender template</th><th>Capacity</th><th>DTI (cap)</th><th>Max LVR</th><th>Verdict</th></tr></thead>
          <tbody>
            {lenders.rows.map((l) => (
              <tr key={l.name} style={{ background: l.bestFit ? "var(--primary-tint)" : undefined }}>
                <td className="lbl">{l.name}{l.bestFit && <span className="badge" style={{ marginLeft: 6 }}>Best fit</span>}</td>
                <td>{money(l.capacity)}</td>
                <td>{l.dti.toFixed(1)}× ({l.maxDTI}×)</td>
                <td>{l.maxLVR}%</td>
                <td style={{ color: l.pass ? "#1f6f54" : "#b03a2e" }}>{l.pass ? "Serviceable" : "Short"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          Template lenders pending the live Quickli / lender-policy integration. Method recorded in The Business → “Lender comparison — methodology”.
        </p>
      </div>

      {/* Monte Carlo */}
      <div className="panel">
        <h2>Risk — Monte Carlo (300 runs)</h2>
        <div className="cards">
          <div className="card"><div className="k">Downside (p10 IRR)</div><div className="v">{pct(r.mc.p10)}</div></div>
          <div className="card"><div className="k">Median (p50 IRR)</div><div className="v">{pct(r.mc.p50)}</div></div>
          <div className="card"><div className="k">Upside (p90 IRR)</div><div className="v">{pct(r.mc.p90)}</div></div>
        </div>
        <p className="muted" style={{ marginTop: 10 }}>
          Chance of a year with a cash shortfall: <strong>{Math.round(r.mc.probCashShortfall)}%</strong>. The range is the
          spread of outcomes across 300 simulated paths — not a prediction, a map of how wide the outcomes genuinely are.
        </p>
      </div>

      {/* Stress test */}
      <div className="panel" style={{ borderLeft: `5px solid ${stressColour}` }}>
        <h2>Stress test — can they hold it?</h2>
        <p className="muted" style={{ marginTop: -6, marginBottom: 12 }}>Shock applied: {stress.shock}.</p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: stressColour }}>{stress.verdict}</span>
          <span className="muted">serviceability holds at {Math.round(stress.margin * 100)}% of the loan under stress</span>
        </div>
        <table>
          <tbody>
            <tr><td className="muted">Year-1 weekly cashflow</td><td>{money(stress.baseWeekly1)}/wk → <strong style={{ color: "#b03a2e" }}>{money(stress.stressedWeekly1)}/wk</strong> under stress</td></tr>
            <tr><td className="muted">Stressed IRR</td><td>{pct(stress.stressedIrr)}</td></tr>
            <tr><td className="muted">Borrowing capacity vs loan</td><td>{money(stress.capacity)} vs {money(stress.loanRequired)} required</td></tr>
          </tbody>
        </table>
      </div>

      {/* Scenarios */}
      <div className="panel">
        <h2>Scenarios</h2>
        <p className="muted" style={{ marginTop: -6, marginBottom: 12 }}>The same property under discrete &quot;what ifs&quot; — the cases a client actually understands.</p>
        <table>
          <thead><tr><th>Scenario</th><th>IRR</th><th>Year-1 weekly</th><th>End equity</th><th>Verdict</th></tr></thead>
          <tbody>
            {scenarios.map((s) => (
              <tr key={s.name}>
                <td className="lbl">{s.name}</td>
                <td>{pct(s.irr)}</td>
                <td style={{ color: s.weekly1 < 0 ? "#b03a2e" : "#1f6f54" }}>{money(s.weekly1)}</td>
                <td>{money(s.equityEnd)}</td>
                <td><span className="badge">{s.band}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Projection */}
      <div className="panel">
        <h2>10-year projection</h2>
        <table>
          <thead><tr><th>Year</th><th>Value</th><th>Equity</th><th>LVR</th><th>Weekly cashflow</th></tr></thead>
          <tbody>
            {r.rows.map((row) => (
              <tr key={row.year}>
                <td className="lbl">{row.year}</td>
                <td>{money(row.value)}</td>
                <td>{money(row.equity)}</td>
                <td>{row.lvr}%</td>
                <td style={{ color: row.weekly < 0 ? "#b03a2e" : "#1f6f54" }}>{money(row.weekly)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="muted" style={{ fontSize: 12 }}>
        Modelled result · {r.provenanceLabel}. Indicative — serviceability uses a template lender pending the Quickli
        integration; figures must be verified before being relied on.
      </div>
    </section>
  );
}
