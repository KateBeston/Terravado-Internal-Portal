"use client";
/* ===========================================================================
   Portfolio view — faithful React port of the original viewPortfolio +
   portfolioTab (Assets, Land tax aggregation, Projection).
   =========================================================================== */
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  project, portfolioLandTax, standaloneLandTax, landValueOf, verdictOf, entityOf,
} from "@/lib/engine/engine";
import { money as money0, pct, num } from "@/lib/format";
import Chart from "./Chart";

const GOLD = "#B08D2E", BLACK = "#0B0B0A", FAINT = "#A9A49A";

type PTab = "assets" | "landtax" | "growth";

export default function Portfolio() {
  const { ctx, setView, setPropertyId } = useStore();
  const [tab, setTab] = useState<PTab>("assets");
  const money = (v: number) => money0(v, ctx.settings.country || "AU");

  const { results, totVal, totDebt, totEquity, usable, cf, totLT, soloLT, wLVR, lt, agg, groups } = useMemo(() => {
    const props = ctx.properties;
    const lt = portfolioLandTax(1, ctx);
    const results = props.map((p) => ({ p, r: project(p, { landTaxMap: lt.byProp }, ctx) }));
    const totVal = results.reduce((a, x) => a + x.r.rows[0].value, 0);
    const totDebt = results.reduce((a, x) => a + x.r.rows[0].balance, 0);
    const usable = results.reduce((a, x) => a + x.r.rows[0].usableEquity, 0);
    const cf = results.reduce((a, x) => a + x.r.rows[0].postTaxCF, 0);
    const totLT = Object.values(lt.byProp).reduce((a, b) => a + b, 0);
    const soloLT = props.reduce((a, p) => a + standaloneLandTax(p, 1), 0);
    const H = Math.max(...props.map((p) => num(p.horizon, 10)), 10);
    const agg: any[] = [];
    for (let y = 1; y <= H; y++) {
      let v = 0, b = 0, c = 0;
      results.forEach(({ r }) => { const row = r.rows[Math.min(y, r.rows.length) - 1]; if (!row) return; v += row.value; b += row.balance; c += row.postTaxCF; });
      agg.push({ year: y, value: v, debt: b, equity: v - b, cash: c });
    }
    return {
      results, totVal, totDebt, totEquity: totVal - totDebt, usable, cf, totLT, soloLT,
      wLVR: totVal > 0 ? totDebt / totVal * 100 : 0, lt, agg, groups: Object.values(lt.groups) as any[],
    };
  }, [ctx]);

  const openProp = (id: string) => { setPropertyId(id); setView("property"); };

  return (
    <>
      <div className="kpis">
        <div className="kpi"><div className="k">Portfolio value</div><div className="v tnum">{money(totVal)}</div><div className="s">{ctx.properties.length} assets</div></div>
        <div className="kpi"><div className="k">Debt</div><div className="v tnum">{money(totDebt)}</div><div className="s">LVR {pct(wLVR, 1)}</div></div>
        <div className="kpi"><div className="k">Equity</div><div className="v gold tnum">{money(totEquity)}</div><div className="s">usable {money(usable)} @80%</div></div>
        <div className="kpi"><div className="k">Net cash flow yr 1</div><div className={`v tnum ${cf < 0 ? "neg" : "gold"}`}>{money(cf)}</div><div className="s">{money(Math.round(cf / 52))} / week</div></div>
        <div className="kpi"><div className="k">Land tax (aggregated)</div><div className={`v tnum ${totLT > soloLT + 100 ? "neg" : ""}`}>{money(totLT)}</div><div className="s">{totLT > soloLT + 100 ? "+" + money(totLT - soloLT) + " vs standalone" : "at or below threshold"}</div></div>
      </div>

      {totLT > soloLT + 100 && (
        <div className="warn" style={{ marginTop: 14 }}>
          <b>Aggregation effect.</b> Assessed individually these properties would attract {money(soloLT)} of land tax.
          Assessed as a portfolio — which is how the revenue offices actually do it — they attract <b>{money(totLT)}</b>.
          The difference of {money(totLT - soloLT)} a year is the single most commonly missed line in Australian property modelling.
        </div>
      )}

      <div className="tabs">
        <button className={`tab ${tab === "assets" ? "on" : ""}`} onClick={() => setTab("assets")}>Assets</button>
        <button className={`tab ${tab === "landtax" ? "on" : ""}`} onClick={() => setTab("landtax")}>Land tax aggregation</button>
        <button className={`tab ${tab === "growth" ? "on" : ""}`} onClick={() => setTab("growth")}>Projection</button>
      </div>

      {tab === "assets" && (
        <div>
          <div className="toolbar"><button className="act" disabled title="Add property — next increment">+ Add property</button></div>
          <div className="cards">
            {results.map(({ p, r }) => {
              const V = verdictOf(p, r, ctx);
              return (
                <div key={p.id} className="card" onClick={() => openProp(p.id)}>
                  <h4>{p.label || "Untitled"}</h4>
                  <div className="sub">{p.loc.suburb} {p.loc.region} · {p.assetClass} · {p.status}
                    <span className="tag">{(entityOf(p, ctx) || {}).name || ""}</span></div>
                  <div className="mini-kpi"><span>Value</span><b className="tnum">{money(r.rows[0].value)}</b></div>
                  <div className="mini-kpi"><span>Debt / LVR</span><b className="tnum">{money(r.rows[0].balance)} · {pct(r.rows[0].lvr, 0)}</b></div>
                  <div className="mini-kpi"><span>Weekly</span><b className={`tnum ${r.metrics.weekly1 < 0 ? "neg" : "gold"}`}>{money(r.metrics.weekly1)}</b></div>
                  <div className="mini-kpi"><span>IRR {p.horizon}y</span><b className="tnum">{r.metrics.irr === null ? "—" : pct(r.metrics.irr)}</b></div>
                  <div className="mini-kpi"><span>Land tax</span><b className="tnum">{money(lt.byProp[p.id] || 0)}</b></div>
                  <div className="mini-kpi"><span>Verdict</span><b>{V.score} · {V.band}</b></div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "landtax" && (
        <div>
          <div className="note" style={{ marginBottom: 12 }}>
            Land tax is assessed on <b>unimproved land value</b>, aggregated per state <b>per owning entity</b>, with the
            threshold applied once. The liability is then apportioned back across the holdings by land-value share.
            A principal place of residence is exempt and excluded from the aggregate.
          </div>
          {groups.length ? groups.map((g: any, gi: number) => {
            const ent = ctx.entities.find((e) => e.id === g.entityId) || ({} as any);
            const solo = g.props.reduce((a: number, p: any) => a + standaloneLandTax(p, 1), 0);
            return (
              <div key={gi} className="chartbox" style={{ marginBottom: 12 }}>
                <div className="chart-t">{g.region} — {ent.name || "?"} <span className="tag">{ent.type || ""}</span></div>
                <div className="tblwrap"><table>
                  <thead><tr><th>Property</th><th>Land value</th><th>Share</th><th>Apportioned tax</th><th>If assessed alone</th></tr></thead>
                  <tbody>
                    {g.props.map((p: any) => {
                      const lv = landValueOf(p, 1), sh = g.landValue > 0 ? lv / g.landValue : 0;
                      return (<tr key={p.id}><td className="lbl">{p.label}</td><td>{money(lv)}</td><td>{pct(sh * 100, 1)}</td>
                        <td>{money(lt.byProp[p.id] || 0)}</td><td className="mut">{money(standaloneLandTax(p, 1))}</td></tr>);
                    })}
                    <tr className="bold"><td>Aggregate</td><td>{money(g.landValue)}</td><td>100%</td><td>{money(g.tax)}</td><td>{money(solo)}</td></tr>
                  </tbody></table></div>
                {g.tax > solo + 100 && <div className="warn" style={{ marginTop: 10 }}>Aggregation costs an extra <b>{money(g.tax - solo)}</b> a year in this group.</div>}
                {ent.type === "Trust" && g.region === "NSW" && !ent.deedExcludesForeign &&
                  <div className="warn" style={{ marginTop: 10 }}>NSW trust: the deed does not exclude foreign persons, so the land tax threshold is unavailable and the surcharge applies.</div>}
              </div>
            );
          }) : <div className="empty">No land-taxable holdings. Every property is either a PPOR, sold, or on a manual override.</div>}
        </div>
      )}

      {tab === "growth" && (
        <div>
          <div className="chartbox" style={{ marginBottom: 12 }}>
            <div className="chart-t">Portfolio value, debt and equity</div>
            <Chart data={agg} opts={{
              xKey: "year", height: 300, xFmt: (v) => "Y" + v, series: [
                { key: "value", type: "line", color: BLACK, label: "Value", width: 2.4, dots: true, tip: (v) => money(v) },
                { key: "debt", type: "line", color: FAINT, label: "Debt", dash: "5 4", tip: (v) => money(v) },
                { key: "equity", type: "area", color: GOLD, opacity: .28, label: "Equity" }],
            }} />
          </div>
          <div className="chartbox">
            <div className="chart-t">Aggregate net cash flow after tax</div>
            <Chart data={agg} opts={{
              xKey: "year", height: 220, xFmt: (v) => "Y" + v, series: [
                { key: "cash", type: "bar", color: GOLD, colorFn: (v) => v < 0 ? BLACK : GOLD, label: "Net cash", tip: (v) => money(v) }],
            }} />
          </div>
        </div>
      )}
    </>
  );
}
