import { requireUser } from "@/lib/auth/guard";
import { runModel, type ModelInputs } from "@/lib/modelling/run";

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

  const inputs: ModelInputs = {
    address: asStr(searchParams.address, "22 Example St, Ashfield NSW 2131"),
    state: asStr(searchParams.state, "NSW"),
    price: numParam(searchParams.price, 1100000),
    weeklyRent: numParam(searchParams.weeklyRent, 720),
    growthPct: numParam(searchParams.growthPct, 5.5),
    ratePct: numParam(searchParams.ratePct, 6.1),
    depositPct: numParam(searchParams.depositPct, 20),
    grossIncome: numParam(searchParams.grossIncome, 185000),
  };

  const r = runModel(inputs);

  return (
    <section>
      <h1>Modeller</h1>
      <p className="sub">A property and a client&apos;s position, run through the full engine — projection, risk, serviceability and a verdict.</p>

      <div className="panel">
        <h2>Inputs</h2>
        <form method="get">
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
          <label className="f"><span>Client gross income (annual)</span><input name="grossIncome" inputMode="numeric" defaultValue={String(inputs.grossIncome)} /></label>
          <button className="btn" type="submit">Run the model</button>
        </form>
      </div>

      {/* Verdict */}
      <div className="panel" style={{ borderLeft: `5px solid ${bandColour(r.verdict.band)}` }}>
        <h2>Verdict</h2>
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
        <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>Assessed against {r.serviceability.lender}.</div>
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
