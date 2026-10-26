import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { listClients, getClient } from "@/lib/domain/service";
import { saveClientFinancesAction } from "@/app/actions";
import { runModel, runScenarios, runStressTest, type ModelInputs } from "@/lib/modelling/run";

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

  // Selected client (if any) and their stored financial position.
  const clientId = asStr(searchParams.clientId, "");
  const client = clientId ? (clients.find((c) => c.id === clientId) ?? (await getClient(tenantId, clientId))) : null;
  const fin = client?.finances ?? {};

  // Property inputs — unchanged, and shared by the generic and client runs.
  const property = {
    address: asStr(searchParams.address, "22 Example St, Ashfield NSW 2131"),
    state: asStr(searchParams.state, "NSW"),
    price: numParam(searchParams.price, 1100000),
    weeklyRent: numParam(searchParams.weeklyRent, 720),
    growthPct: numParam(searchParams.growthPct, 5.5),
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
    ...(client ? { clientName: client.name, ...pos } : {}),
  };

  const r = runModel(inputs);
  const scenarios = runScenarios(inputs);
  const stress = runStressTest(inputs);
  const stressColour = stress.verdict === "Holds comfortably" ? "#1f6f54" : stress.verdict === "Tight" ? "#b8860b" : "#b03a2e";

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

          <label className="f"><span>Property</span><input name="address" defaultValue={inputs.address} /></label>
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
          <form action={saveClientFinancesAction} style={{ marginTop: 10 }}>
            <input type="hidden" name="clientId" value={client.id} />
            <input type="hidden" name="grossIncome" value={String(grossIncome)} />
            <input type="hidden" name="partnerIncome" value={String(pos.partnerIncome)} />
            <input type="hidden" name="livingExpMonthly" value={String(pos.livingExpMonthly)} />
            <input type="hidden" name="dependants" value={String(pos.dependants)} />
            <input type="hidden" name="monthlyCommitments" value={String(pos.monthlyCommitments)} />
            <input type="hidden" name="cardLimits" value={String(pos.cardLimits)} />
            <input type="hidden" name="hecsBalance" value={String(pos.hecsBalance)} />
            <button className="btn ghost" type="submit">Save this position to {client.name}</button>
            <span className="muted" style={{ fontSize: 11, marginLeft: 10 }}>Saves the figures currently shown (run first to apply URL changes).</span>
          </form>
        )}
      </div>

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
