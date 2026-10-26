"use client";
/* Feasibility view — faithful port of viewFeasibility(). Value-add and
   development modelling: cost stack, GST margin scheme, capitalised interest,
   residual land value, funding and a sensitivity grid. */
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Field, Panel, Cell, addItem, delItem, type Updater } from "./property/fields";
import { feasibility, type Feasibility as Feas } from "@/lib/engine/engine";
import { COUNTRIES } from "@/lib/engine/tax-data";
import { money as money0, pct, num } from "@/lib/format";

const deep = <T,>(o: T): T => JSON.parse(JSON.stringify(o));

export default function Feasibility() {
  const { ctx, feasId, setFeasId, updateFeasibility, addFeasibility } = useStore();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const isOpen = (id: string) => open[id] !== false;
  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: o[id] === false ? true : false }));

  const f = ctx.feasibilities.find((x) => x.id === feasId) || ctx.feasibilities[0];
  const money = (v: number) => money0(v, ctx.settings.country || "AU");
  const update: Updater = (mut) => updateFeasibility(f.id, mut);
  const F = (label: string, path: string, o: any = {}) => <Field rec={f} path={path} update={update} label={label} {...o} />;
  const P = (id: string, title: string, meta: React.ReactNode, children: React.ReactNode) =>
    <Panel id={id} title={title} meta={meta} open={isOpen(id)} onToggle={() => toggle(id)}>{children}</Panel>;

  const R = feasibility(f);

  return (
    <>
      <div className="toolbar">
        <select value={f.id} onChange={(e) => setFeasId(e.target.value)} style={{ width: "auto", minWidth: 220 }}>
          {ctx.feasibilities.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        <button className="act ghost" onClick={addFeasibility}>+ New</button>
      </div>
      <div className="grid">
        <div>
          {P("f1", "Scheme", f.type, <>
            {F("Name", "name", { type: "text" })}
            <div className="r2">
              {F("Type", "type", { type: "select", options: ["Value-add", "Development"] })}
              {F("State", "region", { type: "select", options: COUNTRIES.AU.regions })}
            </div>
            <div className="eyebrow">Land</div>
            <div className="r2">{F("Land cost", "landCost")}{F("Acq. costs %", "landAcqCostsPct", { step: .1 })}</div>
            {F("Demolition", "demolition")}
            <div className="eyebrow">Product mix</div>
            {(f.units || []).map((u: any, i: number) => (
              <div key={i} className="erow" style={{ gridTemplateColumns: "1.1fr .45fr .5fr .6fr .8fr 28px" }}>
                <Cell rec={f} path="units" i={i} field="name" update={update} />
                <Cell rec={f} path="units" i={i} field="count" update={update} type="number" placeholder="Count" />
                <Cell rec={f} path="units" i={i} field="gfa" update={update} type="number" placeholder="GFA" />
                <Cell rec={f} path="units" i={i} field="buildRate" update={update} type="number" placeholder="$/m²" />
                <Cell rec={f} path="units" i={i} field="salePrice" update={update} type="number" placeholder="Sale price" />
                <button className="x" onClick={() => delItem(update, "units", i)}>×</button>
              </div>
            ))}
            <button className="act ghost mini" onClick={() => addItem(update, "units", { name: "", count: 1, gfa: 150, buildRate: 2900, salePrice: 1000000 })}>+ Product</button>
          </>)}

          {P("f2", "Costs", money(R.tdc), <>
            <div className="r2">{F("Professional fees %", "profFeesPct", { step: .1 })}{F("Contingency %", "contingencyPct", { step: .1 })}</div>
            <div className="r2">{F("Authority fees", "authorityFees")}{F("Contributions (s7.11)", "contributions")}</div>
            <div className="r2">{F("Headworks", "headworks")}{F("Holding costs pa", "holdingRatesPa")}</div>
            <div className="r2">{F("Marketing %", "marketingPct", { step: .1 })}{F("Selling %", "sellingPct", { step: .1 })}</div>
          </>)}

          {P("f3", "Funding", pct(f.debtRate), <>
            <div className="r2">{F("Debt limit — LVR %", "debtLVRpct")}{F("Debt limit — LTC %", "debtLTCpct")}</div>
            <div className="r2">{F("Debt rate %", "debtRate", { step: .1 })}{F("Line fee %", "lineFeePct", { step: .1 })}</div>
            <div className="r2">{F("Build months", "buildMonths")}{F("Sell months", "sellMonths")}</div>
            <div className="warn">Construction interest is <b>capitalised</b>, drawn on an S-curve — not paid monthly as a cash expense. Treating it as cash is a classic and expensive error.</div>
          </>)}

          {P("f4", "GST & target", f.marginScheme ? "Margin scheme" : "Full GST", <>
            {F("GST applies (new residential)", "gstApplies", { type: "checkbox" })}
            {F("Margin scheme", "marginScheme", { type: "checkbox" })}
            {F("Target margin on cost %", "targetMarginPct", { step: .5 })}
            <div className="hint">The margin scheme charges GST on the <b>margin</b> (sale less land cost), not the full price. It can swing a feasibility by 5–8% of gross realisation.</div>
          </>)}
        </div>
        <div>
          <div className="kpis">
            <div className="kpi"><div className="k">Gross realisation</div><div className="v tnum">{money(R.gr)}</div><div className="s">{R.unitsCount} units · {Math.round(R.gfa)} m²</div></div>
            <div className="kpi"><div className="k">Total dev. cost</div><div className="v tnum">{money(R.tdc)}</div><div className="s">incl. {money(R.interest)} capitalised interest</div></div>
            <div className="kpi"><div className="k">Profit</div><div className={`v tnum ${R.profit < 0 ? "neg" : "gold"}`}>{money(R.profit)}</div></div>
            <div className="kpi"><div className="k">Margin on cost</div><div className={`v tnum ${R.marginOnCost < num(f.targetMarginPct) ? "neg" : "gold"}`}>{pct(R.marginOnCost, 1)}</div><div className="s">target {pct(f.targetMarginPct, 0)}</div></div>
            <div className="kpi"><div className="k">Residual land value</div><div className="v tnum">{money(R.rlv)}</div>
              <div className="s">{R.rlv < num(f.landCost) ? "you are paying " + money(num(f.landCost) - R.rlv) + " too much" : "headroom of " + money(R.rlv - num(f.landCost))}</div></div>
          </div>

          {R.rlv < num(f.landCost) && <div className="warn" style={{ marginTop: 12 }}><b>The site does not support this scheme at this land price.</b> At a {pct(f.targetMarginPct, 0)} target margin the land is worth {money(R.rlv)}, not {money(num(f.landCost))}. Residual land value is the number developers actually want.</div>}

          <div className="chartbox" style={{ marginTop: 12 }}>
            <div className="chart-t">Cost stack</div>
            <div className="tblwrap"><table><tbody>
              <tr><td className="lbl">Land</td><td>{money(num(f.landCost))}</td></tr>
              <tr><td className="lbl">Acquisition costs & duty</td><td>{money(R.landAcq)}</td></tr>
              <tr><td className="lbl">Demolition</td><td>{money(num(f.demolition))}</td></tr>
              <tr><td className="lbl">Construction</td><td>{money(R.construction)}</td></tr>
              <tr><td className="lbl">Professional fees</td><td>{money(R.profFees)}</td></tr>
              <tr><td className="lbl">Authority fees & contributions</td><td>{money(num(f.authorityFees) + num(f.contributions) + num(f.headworks))}</td></tr>
              <tr><td className="lbl">Contingency</td><td>{money(R.contingency)}</td></tr>
              <tr><td className="lbl">Holding costs</td><td>{money(R.holding)}</td></tr>
              <tr><td className="lbl">Marketing & selling</td><td>{money(R.marketing + R.selling)}</td></tr>
              <tr><td className="lbl">Finance — capitalised interest</td><td className="gold">{money(R.interest)}</td></tr>
              <tr><td className="lbl">Line fee</td><td>{money(R.lineFee)}</td></tr>
              <tr><td className="lbl">GST payable{f.marginScheme ? " (margin scheme)" : ""}</td><td>{money(R.gstPayable)}</td></tr>
              <tr><td className="lbl">Less input tax credits</td><td className="gold">{money(-R.inputCredits)}</td></tr>
              <tr className="bold"><td>Total development cost</td><td>{money(R.tdc)}</td></tr>
              <tr className="bold"><td>Gross realisation</td><td>{money(R.gr)}</td></tr>
              <tr className="bold"><td>Profit · margin on GRV</td><td>{money(R.profit)} · {pct(R.marginOnGRV, 1)}</td></tr>
            </tbody></table></div>
          </div>

          <div className="split" style={{ marginTop: 12 }}>
            <div className="chartbox">
              <div className="chart-t">Funding</div>
              <div className="tblwrap"><table><tbody>
                <tr><td className="lbl">Debt limit (lower of LVR / LTC)</td><td>{money(R.debtLimit)}</td></tr>
                <tr><td className="lbl">Peak debt</td><td>{money(R.peakDebt)}</td></tr>
                <tr><td className="lbl">Equity required</td><td><b>{money(R.equityRequired)}</b></td></tr>
                <tr><td className="lbl">Project IRR (annualised)</td><td>{R.irr === null ? "—" : pct(R.irr, 1)}</td></tr>
                <tr><td className="lbl">Breakeven per unit</td><td>{money(R.breakevenPerUnit)}</td></tr>
                <tr><td className="lbl">Duration</td><td>{R.projMonths} months</td></tr>
              </tbody></table></div>
            </div>
            <div className="chartbox">
              <div className="chart-t">Sensitivity</div>
              <div className="tblwrap"><table><thead><tr><th></th><th>−10%</th><th>Base</th><th>+10%</th></tr></thead><tbody>
                {([["Sale price", "salePrice"], ["Build cost", "buildRate"]] as [string, string][]).map(([lab, key]) => {
                  const vals = [0.9, 1, 1.1].map((k) => {
                    const g = deep(f) as Feas; g.units = g.units.map((u: any) => ({ ...u, [key]: num(u[key]) * k }));
                    return feasibility(g).marginOnCost;
                  });
                  return <tr key={key}><td className="lbl">{lab}</td>{vals.map((v, i) => <td key={i} className={v < num(f.targetMarginPct) ? "neg" : "gold"}>{pct(v, 1)}</td>)}</tr>;
                })}
                <tr><td className="lbl">Debt rate ±2%</td>
                  {[-2, 0, 2].map((d) => {
                    const g = deep(f) as Feas; g.debtRate = num(f.debtRate) + d; const v = feasibility(g).marginOnCost;
                    return <td key={d} className={v < num(f.targetMarginPct) ? "neg" : "gold"}>{pct(v, 1)}</td>;
                  })}</tr>
              </tbody></table></div>
              <div className="hint" style={{ marginTop: 8 }}>Margin on cost against the {pct(f.targetMarginPct, 0)} target.</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
