"use client";
/* Feasibility editor — persisted port of the retired Workspace Feasibility view.
   Value-add and development modelling: cost stack, GST margin scheme, capitalised
   interest, residual land value, funding and a sensitivity grid. Edits are held in
   local state and written to the record with the Save button (saveFeasibilityAction);
   the engine's feasibility() does the maths, unchanged. */
import { useState } from "react";
import "../app/workspace-theme.css";
import { Field, Panel, Cell, addItem, delItem, type Updater } from "./property/fields";
import { feasibility, type Feasibility as Feas } from "@/lib/engine/engine";
import { COUNTRIES } from "@/lib/engine/tax-data";
import { money as money0, pct, num } from "@/lib/format";
import { saveFeasibilityAction, deleteFeasibilityAction } from "@/app/actions";

const deep = <T,>(o: T): T => JSON.parse(JSON.stringify(o));

export default function FeasibilityEditor({ id, initial }: { id: string; initial: Record<string, unknown> }) {
  const [f, setF] = useState<any>(initial);
  const [dirty, setDirty] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const isOpen = (k: string) => open[k] !== false;
  const toggle = (k: string) => setOpen((o) => ({ ...o, [k]: o[k] === false ? true : false }));

  const money = (v: number) => money0(v, "AU");
  // every edit clones, mutates and flags the record dirty
  const upd: Updater = (mut) => { setDirty(true); setF((prev: any) => { const d = deep(prev); mut(d); return d; }); };
  const F = (label: string, path: string, o: any = {}) => <Field rec={f} path={path} update={upd} label={label} {...o} />;
  const P = (pid: string, title: string, meta: React.ReactNode, children: React.ReactNode) =>
    <Panel id={pid} title={title} meta={meta} open={isOpen(pid)} onToggle={() => toggle(pid)}>{children}</Panel>;

  const R = feasibility(f as Feas);

  return (
    <div className="tv-root">
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <div style={{ fontWeight: 600 }}>{f.name || "Untitled feasibility"}{dirty && <span className="muted" style={{ fontWeight: 400 }}> · unsaved</span>}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <form action={saveFeasibilityAction} onSubmit={() => setDirty(false)}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="data" value={JSON.stringify(f)} />
            <button className="act" type="submit">Save</button>
          </form>
          <form action={deleteFeasibilityAction} onSubmit={(e) => { if (!confirm("Delete this feasibility?")) e.preventDefault(); }}>
            <input type="hidden" name="id" value={id} />
            <button className="act ghost" type="submit">Delete</button>
          </form>
        </div>
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
            {(f.units || []).map((_u: any, i: number) => (
              <div key={i} className="erow" style={{ gridTemplateColumns: "1.1fr .45fr .5fr .6fr .8fr 28px" }}>
                <Cell rec={f} path="units" i={i} field="name" update={upd} />
                <Cell rec={f} path="units" i={i} field="count" update={upd} type="number" placeholder="Count" />
                <Cell rec={f} path="units" i={i} field="gfa" update={upd} type="number" placeholder="GFA" />
                <Cell rec={f} path="units" i={i} field="buildRate" update={upd} type="number" placeholder="$/m²" />
                <Cell rec={f} path="units" i={i} field="salePrice" update={upd} type="number" placeholder="Sale price" />
                <button className="x" type="button" onClick={() => delItem(upd, "units", i)}>×</button>
              </div>
            ))}
            <button className="act ghost mini" type="button" onClick={() => addItem(upd, "units", { name: "", count: 1, gfa: 150, buildRate: 2900, salePrice: 1000000 })}>+ Product</button>
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
                    const g = deep(f) as any; g.units = g.units.map((u: any) => ({ ...u, [key]: num(u[key]) * k }));
                    return feasibility(g).marginOnCost;
                  });
                  return <tr key={key}><td className="lbl">{lab}</td>{vals.map((v, i) => <td key={i} className={v < num(f.targetMarginPct) ? "neg" : "gold"}>{pct(v, 1)}</td>)}</tr>;
                })}
                <tr><td className="lbl">Debt rate ±2%</td>
                  {[-2, 0, 2].map((d) => {
                    const g = deep(f) as any; g.debtRate = num(f.debtRate) + d; const v = feasibility(g).marginOnCost;
                    return <td key={d} className={v < num(f.targetMarginPct) ? "neg" : "gold"}>{pct(v, 1)}</td>;
                  })}</tr>
              </tbody></table></div>
              <div className="hint" style={{ marginTop: 8 }}>Margin on cost against the {pct(f.targetMarginPct, 0)} target.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
