"use client";
/* Property output tabs — faithful React port of kpiStrip + the 10 tab renderers. */
import { useState } from "react";
import Chart from "../Chart";
import { Field, Cell, addItem, delItem, type Updater } from "./fields";
import { COUNTRIES, TAX_DATA, ENGINE_VERSION } from "@/lib/engine/tax-data";
import {
  valuation, tornado, monteCarlo, portfolioLandTax, standaloneLandTax,
  serviceability, verdictOf, requiredGrowth, assetCagr, clientOf, type EngineContext,
} from "@/lib/engine/engine";
import { money as money0, pct, short, num } from "@/lib/format";

const GOLD = "#B08D2E", GOLD_L = "#E3CE8C", BLACK = "#0B0B0A", FAINT = "#A9A49A";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type PTab = "projection" | "calendar" | "ladder" | "valuation" | "analytics" | "tax" | "schedule" | "record" | "docs" | "verdict";

export function KpiStrip({ p, R }: { p: any; R: any }) {
  const money = (v: number) => money0(v, p.loc.country);
  const m = R.metrics;
  return (
    <div className="kpis">
      <div className="kpi"><div className="k">Weekly position yr 1</div><div className={`v tnum ${m.weekly1 < 0 ? "neg" : "gold"}`}>{money(m.weekly1)}</div>
        <div className="s">{p.tax.paygVariation ? "PAYG varied: " + money(m.weeklyPayg1) : "after tax"}</div></div>
      <div className="kpi"><div className="k">IRR {p.horizon}y</div><div className="v tnum">{m.irr === null ? "—" : pct(m.irr)}</div><div className="s">hurdle {pct(p.hurdle, 1)}</div></div>
      <div className="kpi"><div className="k">Growth applied</div><div className="v tnum">{pct(R.g0)}</div><div className="s">base {pct(R.baseGrowth)} · ladder {(R.ladder.adjCap >= 0 ? "+" : "")}{R.ladder.adjCap.toFixed(2)}</div></div>
      <div className="kpi"><div className="k">Cash to close</div><div className="v tnum">{money(R.acq.cashIn)}</div><div className="s">LVR {pct(R.acq.lvr * 100, 1)}{R.acq.lmi > 0 ? " · LMI " + money(R.acq.lmi) : ""}</div></div>
      <div className="kpi"><div className="k">Equity at year {p.horizon}</div><div className="v gold tnum">{money(m.equityEnd)}</div><div className="s">value {money(m.valueEnd)}</div></div>
    </div>
  );
}

export default function PropertyTabs({ tab, p, R, ctx, update }: {
  tab: PTab; p: any; R: any; ctx: EngineContext; update: Updater;
}) {
  const cc = p.loc.country || "AU";
  const money = (v: number) => money0(v, cc);
  const C = COUNTRIES[cc];
  const rows = R.rows;

  const [mc, setMc] = useState<any>(null);
  const runMc = () => setMc(monteCarlo(p, { runs: 400 }, ctx));

  if (tab === "projection") return (
    <>
      <div className="chartbox"><div className="chart-t">Value, debt and equity</div>
        <Chart data={rows} opts={{ xKey: "year", height: 290, xFmt: (v) => "Y" + v, series: [
          { key: "value", type: "line", color: BLACK, label: "Value", width: 2.4, dots: true, tip: money },
          { key: "balance", type: "line", color: FAINT, label: "Debt", dash: "5 4", tip: money },
          { key: "equity", type: "area", color: GOLD, opacity: .28, label: "Equity" }] }} />
      </div>
      <div className="split" style={{ marginTop: 12 }}>
        <div className="chartbox"><div className="chart-t">Cash flow after tax</div>
          <Chart data={rows} opts={{ xKey: "year", height: 220, xFmt: (v) => "Y" + v, y2Fmt: short, series: [
            { key: "postTaxCF", type: "bar", colorFn: (v) => v < 0 ? BLACK : GOLD, color: GOLD, label: "Net cash", tip: money },
            { key: "cumCash", type: "line", color: GOLD_L, label: "Cumulative", axis: "right", tip: money }] }} />
        </div>
        <div className="chartbox"><div className="chart-t">Rent vs interest vs outgoings</div>
          <Chart data={rows} opts={{ xKey: "year", height: 220, xFmt: (v) => "Y" + v, series: [
            { key: "grossRent", type: "line", color: GOLD, label: "Gross rent", dots: true, tip: money },
            { key: "interest", type: "line", color: BLACK, label: "Interest", tip: money },
            { key: "opex", type: "line", color: FAINT, label: "Outgoings", dash: "4 3", tip: money }] }} />
        </div>
      </div>
      <div className="split" style={{ marginTop: 12 }}>
        <div className="chartbox"><div className="chart-t">Interest rate path</div>
          <Chart data={rows} opts={{ xKey: "year", height: 180, xFmt: (v) => "Y" + v, yFmt: (v) => v.toFixed(1) + "%", series: [
            { key: "rate", type: "line", color: BLACK, step: true, label: "Rate applied", width: 2.2 }] }} />
        </div>
        <div className="chartbox"><div className="chart-t">Usable equity at 80% LVR</div>
          <Chart data={rows} opts={{ xKey: "year", height: 180, xFmt: (v) => "Y" + v, series: [
            { key: "usableEquity", type: "bar", color: GOLD, label: "Usable equity", tip: money }] }} />
        </div>
      </div>
    </>
  );

  if (tab === "calendar") {
    const mx = Math.max(...R.cal.map((c: any) => Math.max(c.inflow, c.out)));
    const minCum = Math.min(...R.cal.map((x: any) => x.cum));
    return (
      <>
        <div className="chartbox">
          <div className="chart-t">Year-one cash calendar — when the money actually leaves</div>
          <div className="cal">{R.cal.map((c: any) => (
            <div key={c.month} className={`cell ${c.cum === minCum ? "trough" : ""}`}>
              <div className="mo">{MONTHS[c.month - 1]}</div>
              <div className="bar">
                <i style={{ height: `${(c.out / mx * 46).toFixed(0)}px`, background: BLACK }} />
                <i style={{ height: `${(c.inflow / mx * 46).toFixed(0)}px`, background: GOLD, marginTop: 2 }} />
              </div>
              <div className={`n ${c.net < 0 ? "neg" : "gold"}`}>{money(c.net)}</div>
              <div className="n" style={{ color: "var(--muted)", fontSize: 8.5 }}>{money(c.cum)}</div>
            </div>
          ))}</div>
          <div className="legend"><span><i style={{ background: GOLD }} />Rent in</span><span><i style={{ background: BLACK }} />Cash out</span></div>
        </div>
        <div className="warn" style={{ marginTop: 12 }}>Deepest cumulative trough: <b>{money(R.trough)}</b>. This is the cash the bank account must actually absorb — the annual average hides it.</div>
      </>
    );
  }

  if (tab === "ladder") {
    const L = R.ladder, mx = Math.max(0.6, ...L.rows.map((r: any) => Math.abs(r.cap)));
    const GROUPS = [...new Set(L.rows.map((r: any) => r.group))] as string[];
    return (
      <>
        <div className="chartbox">
          <div className="chart-t">Growth-driver ladder — every basis point attributed</div>
          <div className="ladder">
            {GROUPS.map((g) => (
              <div key={g}>
                <div className="lg">{g}</div>
                {L.rows.filter((r: any) => r.group === g).map((r: any) => {
                  const w = Math.abs(r.cap) / mx * 49;
                  return (
                    <div key={r.id} className="lrow">
                      <div className="nm">{r.label}</div>
                      <div className="lbar"><i style={r.cap >= 0 ? { left: "50%", width: `${w}%`, background: GOLD } : { right: "50%", width: `${w}%`, background: BLACK }} /></div>
                      <div className="bp">{r.cap >= 0 ? "+" : "−"}{Math.abs(r.cap * 100).toFixed(0)}bp</div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div className="lsum">
              <div>Base {pct(R.baseGrowth)} + ladder</div>
              <div style={{ textAlign: "center" }}>{L.rawCap !== L.adjCap ? `capped from ${(L.rawCap >= 0 ? "+" : "")}${L.rawCap.toFixed(2)}pp` : ""}</div>
              <div className="bp">{(L.adjCap >= 0 ? "+" : "")}{(L.adjCap * 100).toFixed(0)}bp</div>
            </div>
            <div className="lsum" style={{ borderTop: "1px solid var(--line)", fontFamily: "var(--fd)", fontSize: 17 }}>
              <div>Growth applied</div><div></div><div className="bp">{pct(R.g0)}</div>
            </div>
          </div>
        </div>
        <div className="note" style={{ marginTop: 12 }}>This is the compliance artefact. Every point of forecast growth traces to a named driver, so the basis of the projection is on the record — not a number pulled from the air. Print it on every client report.</div>
      </>
    );
  }

  if (tab === "valuation") {
    const V = valuation(p);
    const F = (label: string, path: string, o: any = {}) => <Field rec={p} path={path} update={update} label={label} {...o} />;
    return (
      <>
        <div className="kpis">
          <div className="kpi"><div className="k">Blended valuation</div><div className="v tnum">{money(V.blended)}</div></div>
          <div className="kpi"><div className="k">Price paid</div><div className="v tnum">{money(num(p.market.price))}</div></div>
          <div className="kpi"><div className="k">Variance</div><div className={`v tnum ${V.variance > 3 ? "neg" : "gold"}`}>{pct(V.variance, 1)}</div>
            <div className="s">{V.variance > 3 ? "paying above the model" : "at or below the model"}</div></div>
        </div>
        <div className="chartbox" style={{ marginTop: 12 }}>
          <div className="chart-t">Triangulation</div>
          <div className="tblwrap"><table><thead><tr><th>Method</th><th>Value</th><th>vs price</th></tr></thead><tbody>
            {V.parts.map((x: any, i: number) => (
              <tr key={i}><td className="lbl">{x.k}</td><td>{money(x.v)}</td>
                <td className={x.v < num(p.market.price) ? "neg" : "gold"}>{pct((x.v / num(p.market.price) - 1) * 100, 1)}</td></tr>
            ))}
            <tr className="bold"><td>Blended</td><td>{money(V.blended)}</td><td>{pct((V.blended / num(p.market.price) - 1) * 100, 1)}</td></tr>
          </tbody></table></div>
        </div>
        <div className="chartbox" style={{ marginTop: 12 }}>
          <div className="chart-t">Comparable adjustments — weights exposed</div>
          <div className="r4" style={{ marginBottom: 12 }}>
            {F("Land weight", "compWeights.land", { step: .05 })}{F("Internal weight", "compWeights.internal", { step: .05 })}
            {F("Bed % each", "compWeights.bed", { step: .1 })}{F("Bath % each", "compWeights.bath", { step: .1 })}
          </div>
          {F("Time-adjust comparables to today", "compWeights.timeAdjust", { type: "checkbox" })}
          <div className="tblwrap"><table>
            <thead><tr><th>Comparable</th><th>Sold</th><th>Price</th><th>Land</th><th>Internal</th><th>Beds</th><th>Cond</th><th>Adjusted</th></tr></thead>
            <tbody>{V.adjusted.map((c: any, i: number) => (
              <tr key={i}><td className="lbl">{c.addr}</td><td>{c.date}</td><td>{money(num(c.price))}</td>
                <td className="mut">{money(c.adjLand)}</td><td className="mut">{money(c.adjInt)}</td>
                <td className="mut">{money(c.adjBed)}</td><td className="mut">{money(c.adjCond)}</td>
                <td><b>{money(c.adjusted)}</b></td></tr>
            ))}</tbody>
          </table></div>
          <div className="hint" style={{ marginTop: 8 }}>Comparables are time-adjusted at {pct(p.market.marketMovement, 1)} pa to today&apos;s date. A valuer will not accept undisclosed weights.</div>
          <div className="eyebrow">Edit comparables</div>
          {(p.comps || []).map((c: any, i: number) => (
            <div key={i} className="erow" style={{ gridTemplateColumns: "1.2fr .7fr .8fr .5fr .6fr .5fr 28px" }}>
              <Cell rec={p} path="comps" i={i} field="addr" update={update} />
              <Cell rec={p} path="comps" i={i} field="date" update={update} placeholder="YYYY-MM" />
              <Cell rec={p} path="comps" i={i} field="price" update={update} type="number" />
              <Cell rec={p} path="comps" i={i} field="beds" update={update} type="number" />
              <Cell rec={p} path="comps" i={i} field="land" update={update} type="number" />
              <Cell rec={p} path="comps" i={i} field="cond" update={update} type="number" />
              <button className="x" onClick={() => delItem(update, "comps", i)}>×</button>
            </div>
          ))}
          <button className="act ghost mini" onClick={() => addItem(update, "comps", { addr: "", date: "", price: 0, beds: 0, land: 0, cond: 0 })}>+ Comparable</button>
        </div>
      </>
    );
  }

  if (tab === "analytics") {
    const T = tornado(p, ctx);
    return (
      <>
        <div className="chartbox">
          <div className="chart-t">Sensitivity — effect on IRR (base {pct(T.base)})</div>
          <div className="tornado">
            {T.rows.map((r: any, i: number) => {
              const lw = Math.abs(r.low) / T.max * 49, hw = Math.abs(r.high) / T.max * 49;
              return (
                <div key={i} className="trow">
                  <div className="nm" style={{ fontFamily: "var(--fb)", fontSize: 12 }}>{r.label} <span style={{ color: "var(--faint)" }}>{r.range}</span></div>
                  <div className="tbar"><i style={{ right: "50%", width: `${lw}%`, background: BLACK }} /><i style={{ left: "50%", width: `${hw}%`, background: GOLD }} /></div>
                  <div style={{ textAlign: "right" }}>{r.low >= 0 ? "+" : ""}{r.low.toFixed(1)} / {r.high >= 0 ? "+" : ""}{r.high.toFixed(1)}</div>
                </div>
              );
            })}
          </div>
          <div className="hint" style={{ marginTop: 10 }}>Ranked by swing. The variable at the top is the one this deal actually lives or dies on{T.rows[0] ? <> — here, <b>{T.rows[0].label.toLowerCase()}</b></> : ""}.</div>
        </div>
        <div className="chartbox" style={{ marginTop: 12 }}>
          <div className="chart-t">Monte Carlo — discrete void events, stochastic rates and growth</div>
          {!mc ? (
            <div className="empty" style={{ border: "none", padding: 24 }}>
              <button className="act" onClick={runMc}>Run 400 simulations</button>
              <div className="hint" style={{ marginTop: 10 }}>Vacancy is modelled as a <b>discrete event</b> — a year either has a void or it doesn&apos;t. An eight-week void in year three is what breaks people; two weeks averaged annually is not.</div>
            </div>
          ) : (
            <>
              <div className="kpis" style={{ marginBottom: 12 }}>
                <div className="kpi"><div className="k">P10 IRR</div><div className="v neg tnum">{pct(mc.p10)}</div></div>
                <div className="kpi"><div className="k">P50 IRR</div><div className="v tnum">{pct(mc.p50)}</div></div>
                <div className="kpi"><div className="k">P90 IRR</div><div className="v gold tnum">{pct(mc.p90)}</div></div>
                <div className="kpi"><div className="k">Below hurdle</div><div className="v tnum">{mc.probBelowHurdle}%</div><div className="s">of {mc.runs} runs</div></div>
                <div className="kpi"><div className="k">Cash shortfall risk</div><div className={`v tnum ${mc.probCashShortfall > 20 ? "neg" : ""}`}>{mc.probCashShortfall}%</div>
                  <div className="s">worst yr (95th) {money(mc.worstCase95)}</div></div>
              </div>
              <Chart data={mc.hist} opts={{ xKey: "x", height: 200, xFmt: (v) => v + "%", yFmt: (v) => String(Math.round(v)), series: [{ key: "n", type: "bar", color: GOLD, label: "Runs" }] }} />
              <div className="warn" style={{ marginTop: 12 }}>In {mc.probCashShortfall}% of simulations the worst year demands more cash than the client&apos;s stated capacity plus buffer. That is the number that predicts distress — not the average.</div>
              <div className="toolbar" style={{ marginTop: 10 }}><button className="act ghost" onClick={runMc}>Re-run</button></div>
            </>
          )}
        </div>
      </>
    );
  }

  if (tab === "tax") {
    const T = R.tax, agg = portfolioLandTax(1, ctx), solo = standaloneLandTax(p, 1);
    return (
      <>
        <div className="kpis">
          <div className="kpi"><div className="k">Effective rate</div><div className="v tnum">{pct(T.rate, 1)}</div><div className="s">{T.entity.type}</div></div>
          <div className="kpi"><div className="k">Yr-1 tax effect</div><div className={`v tnum ${rows[0].taxEffect < 0 ? "neg" : "gold"}`}>{money(rows[0].taxEffect)}</div>
            <div className="s">{rows[0].taxable < 0 ? "loss " + money(rows[0].taxable) : "taxable"}</div></div>
          <div className="kpi"><div className="k">Depreciation yr 1</div><div className="v gold tnum">{money(rows[0].dep)}</div>
            <div className="s">D43 {money(rows[0].d43)} · D40 {money(rows[0].d40)}</div></div>
          <div className="kpi"><div className="k">Land tax</div><div className="v tnum">{money(agg.byProp[p.id] || 0)}</div><div className="s">standalone {money(solo)}</div></div>
          <div className="kpi"><div className="k">CGT on exit</div><div className="v tnum">{money(R.exit.cgt)}</div><div className="s">gain {money(R.exit.gain)}</div></div>
        </div>
        {T.trapped && rows[0].taxable < 0 && <div className="warn" style={{ marginTop: 12 }}><b>Losses are trapped in this structure.</b> The {money(-rows[0].taxable)} annual loss cannot offset personal income. It carries forward against future income of the {T.entity.type.toLowerCase()} only.</div>}
        {(agg.byProp[p.id] || 0) > solo + 200 && <div className="warn" style={{ marginTop: 12 }}><b>Portfolio aggregation.</b> Assessed alone this property would attract {money(solo)} of land tax. Aggregated with the other holdings of {T.entity.name} in {p.loc.region}, its share is <b>{money(agg.byProp[p.id])}</b>.</div>}
        <div className="chartbox" style={{ marginTop: 12 }}>
          <div className="chart-t">Depreciation profile</div>
          <Chart data={rows} opts={{ xKey: "year", height: 200, xFmt: (v) => "Y" + v, series: [
            { key: "d43", type: "bar", color: BLACK, label: "Division 43 capital works", tip: money },
            { key: "d40", type: "bar", color: GOLD, label: "Division 40 plant", tip: money }] }} />
        </div>
        <div className="chartbox" style={{ marginTop: 12 }}>
          <div className="chart-t">Exit</div>
          <div className="tblwrap"><table><tbody>
            <tr><td className="lbl">Sale value, year {p.horizon}</td><td>{money(R.exit.saleValue)}</td></tr>
            <tr><td className="lbl">Selling costs</td><td>{money(-R.exit.sellCosts)}</td></tr>
            <tr><td className="lbl">Loan payout</td><td>{money(-rows[rows.length - 1].balance)}</td></tr>
            <tr><td className="lbl">Cost base (incl. capex, less depreciation clawback)</td><td className="mut">{money(R.exit.costBase)}</td></tr>
            <tr><td className="lbl">Capital gain</td><td>{money(R.exit.gain)}</td></tr>
            <tr><td className="lbl">CGT at {pct(T.rate, 1)} after {Math.round(T.cgt * 100)}% discount</td><td>{money(-R.exit.cgt)}</td></tr>
            <tr className="bold"><td>Net proceeds</td><td>{money(R.exit.netProceeds)}</td></tr>
          </tbody></table></div>
        </div>
      </>
    );
  }

  if (tab === "schedule") return (
    <div className="tblwrap"><table>
      <thead><tr><th>Yr</th><th>Value</th><th>Debt</th><th>Equity</th><th>LVR</th><th>Rate</th><th>Gross rent</th>
        <th>Interest</th><th>Outgoings</th><th>Land tax</th><th>Dep&apos;n</th><th>Tax</th><th>Net cash</th><th>Weekly</th><th>Cum.</th></tr></thead>
      <tbody>{rows.map((r: any) => (
        <tr key={r.year}>
          <td>{r.year}</td><td>{money(r.value)}</td><td>{money(r.balance)}</td><td>{money(r.equity)}</td>
          <td>{r.lvr}%</td><td>{r.rate}%</td><td>{money(r.grossRent)}</td><td>{money(-r.interest)}</td>
          <td>{money(-r.opex)}</td><td className="mut">{money(-r.landTax)}</td><td className="gold">{money(r.dep)}</td>
          <td className={r.taxEffect < 0 ? "" : "gold"}>{money(r.taxEffect)}</td>
          <td className={r.postTaxCF < 0 ? "neg" : "gold"}><b>{money(r.postTaxCF)}</b></td>
          <td className={r.weekly < 0 ? "neg" : "gold"}>{money(r.weekly)}</td>
          <td className="mut">{money(r.cumCash)}</td></tr>
      ))}</tbody>
    </table></div>
  );

  if (tab === "record") {
    const a = assetCagr(p);
    return (
      <>
        {a ? (
          <div className="chartbox" style={{ marginBottom: 12 }}>
            <div className="chart-t">Sale event history — this asset&apos;s own record</div>
            <Chart data={a.points.map((s: any) => ({ label: s.date.slice(0, 4), price: num(s.price) }))} opts={{ xKey: "label", height: 200, series: [{ key: "price", type: "line", color: BLACK, dots: true, label: "Sale price", tip: money }] }} />
            <div className="kpis" style={{ marginTop: 12 }}>
              <div className="kpi"><div className="k">Asset CAGR</div><div className="v tnum">{pct(a.cagr)}</div><div className="s">{a.years} years</div></div>
              <div className="kpi"><div className="k">Suburb CAGR</div><div className="v tnum">{pct(p.market.suburbCagr)}</div></div>
              <div className="kpi"><div className="k">Difference</div><div className={`v tnum ${a.cagr < num(p.market.suburbCagr) ? "neg" : "gold"}`}>{(a.cagr - num(p.market.suburbCagr) >= 0 ? "+" : "")}{(a.cagr - num(p.market.suburbCagr)).toFixed(2)}pp</div>
                <div className="s">{a.cagr < num(p.market.suburbCagr) ? "underperforms its street" : "outperforms its street"}</div></div>
            </div>
          </div>
        ) : <div className="empty" style={{ marginBottom: 12 }}>Add two or more sale events to derive this asset&apos;s own CAGR.</div>}
        <div className="split">
          <div className="chartbox">
            <div className="chart-t">Room schedule</div>
            <div className="tblwrap"><table><thead><tr><th>Room</th><th>L</th><th>W</th><th>Area</th></tr></thead><tbody>
              {(p.phys.rooms || []).map((r: any, i: number) => <tr key={i}><td className="lbl">{r.name}</td><td>{r.l}</td><td>{r.w}</td><td>{(num(r.l) * num(r.w)).toFixed(1)}</td></tr>)}
              <tr className="bold"><td>Scheduled</td><td></td><td></td><td>{(p.phys.rooms || []).reduce((x: number, r: any) => x + num(r.l) * num(r.w), 0).toFixed(1)}</td></tr>
            </tbody></table></div>
          </div>
          <div className="chartbox">
            <div className="chart-t">Title constraints</div>
            {(p.title.easements || []).map((e: any, i: number) => <div key={"e" + i} className="flag Med"><span className="dot">Ease</span><span><b>{e.type}</b> — {e.beneficiary || ""}. {num(e.affectedArea)} {C.area} affected. {e.note || ""}</span></div>)}
            {(p.title.encumbrances || []).map((e: any, i: number) => <div key={"n" + i} className="flag"><span className="dot">Enc</span><span><b>{e.type}</b> — {e.detail || ""} {e.impact || ""}</span></div>)}
            {p.title.heritage && <div className="flag"><span className="dot">Her</span><span>Heritage listed — development upside heavily constrained.</span></div>}
            {!(p.title.easements || []).length && !(p.title.encumbrances || []).length && !p.title.heritage && <div className="hint">Clean title on the record. Verify against a title search.</div>}
            <div className="hint" style={{ marginTop: 10 }}>Auto zoning driver: <b>{R.ladder.auto.zoning > 0 ? "+" : ""}{R.ladder.auto.zoning}</b> · land ratio {pct(R.ladder.auto._landRatio * 100, 0)} → driver {R.ladder.auto.landRatio > 0 ? "+" : ""}{R.ladder.auto.landRatio}</div>
          </div>
        </div>
      </>
    );
  }

  if (tab === "docs") return (
    <div className="chartbox">
      <div className="chart-t">Documents</div>
      <div className="note" style={{ marginBottom: 10 }}>Document upload connects to Supabase Storage (Sydney) in the data-layer increment. The list below reflects document metadata on the record.</div>
      {(p.docs || []).length ? (p.docs || []).map((d: any, i: number) => (
        <div key={i} className="docrow"><span><b>{d.type}</b> — {d.name}</span><span className="dmeta">{(d.size / 1024).toFixed(0)} KB · {(d.added || "").slice(0, 10)}</span></div>
      )) : <div className="empty">No documents attached.</div>}
    </div>
  );

  if (tab === "verdict") {
    const SV = p.loan.lenderId ? serviceability(clientOf(p.clientId, ctx) || ctx.clients[0], ctx.lenders.find((l) => l.id === p.loan.lenderId), { proposedLoan: R.acq.loan, newAnnualRent: R.rows[0].grossRent, excludePropertyId: p.id }, ctx) : null;
    const V = verdictOf(p, R, ctx, SV);
    const rg = requiredGrowth(p, ctx);
    return (
      <>
        <div className="verdict">
          <div><div className="vscore">{V.score}</div><div className="vband">{V.band}</div></div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontFamily: "var(--fd)", fontSize: 19, marginBottom: 8 }}>
              {R.metrics.irr === null ? "IRR unsolvable" : `IRR ${pct(R.metrics.irr)} against a ${pct(p.hurdle, 1)} hurdle`}
            </div>
            <div className="note">Growth of <b>{pct(rg)}</b> a year is required to clear the hurdle. The ladder currently supports <b>{pct(R.g0)}</b>.
              {rg > R.g0 + 0.5 ? " The deal needs more growth than the drivers justify." : " The drivers support the required growth."}</div>
          </div>
        </div>
        <div className="chartbox" style={{ marginTop: 12 }}>
          <div className="chart-t">Risk register</div>
          {V.flags.length ? V.flags.map((f: any, i: number) => <div key={i} className={`flag ${f[0]}`}><span className="dot">{f[0]}</span><span>{f[1]}</span></div>)
            : <div className="hint">No material flags on these inputs.</div>}
        </div>
        {SV ? (
          <div className="chartbox" style={{ marginTop: 12 }}>
            <div className="chart-t">Serviceability — {SV.lender.name}</div>
            <div className="kpis">
              <div className="kpi"><div className="k">Capacity</div><div className="v tnum">{money(SV.capacity)}</div><div className="s">assessed at {pct(SV.assessRate)}</div></div>
              <div className="kpi"><div className="k">Loan required</div><div className="v tnum">{money(R.acq.loan)}</div></div>
              <div className="kpi"><div className="k">Headroom</div><div className={`v tnum ${SV.headroom < 0 ? "neg" : "gold"}`}>{money(SV.headroom)}</div></div>
              <div className="kpi"><div className="k">DTI</div><div className={`v tnum ${SV.dti > num(SV.lender.maxDTI) ? "neg" : ""}`}>{SV.dti.toFixed(1)}×</div><div className="s">limit {SV.lender.maxDTI}×</div></div>
              <div className="kpi"><div className="k">Outcome</div><div className={`v ${SV.pass ? "gold" : "neg"}`}>{SV.pass ? "Passes" : "Fails"}</div><div className="s">indicative only</div></div>
            </div>
          </div>
        ) : <div className="note" style={{ marginTop: 12 }}>Assign a lender in the loan panel to test serviceability.</div>}
        <div className="disclaimer">Indicative modelling only. Duty, land tax and income tax use the {TAX_DATA.version} data block (effective {TAX_DATA.effectiveFrom}) and must be confirmed with the relevant revenue office. Serviceability outputs are estimates from configurable templates — not credit decisions, and not any lender&apos;s policy. Verify in the lender&apos;s own calculator before anything is represented to a client. Engine {ENGINE_VERSION}.</div>
      </>
    );
  }

  return null;
}
