"use client";
/* Property workspace — faithful port of viewProperty(): toolbar + input column
   + KPI strip + output tabs, recalculating live. */
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { project, portfolioLandTax } from "@/lib/engine/engine";
import PropertyInputs from "./property/PropertyInputs";
import PropertyTabs, { KpiStrip, type PTab } from "./property/PropertyTabs";

const PTABS: [PTab, string][] = [
  ["projection", "Projection"], ["calendar", "Cash calendar"], ["ladder", "Growth ladder"],
  ["valuation", "Valuation"], ["analytics", "Risk analytics"], ["tax", "Tax & structure"],
  ["schedule", "Schedule"], ["record", "Record & title"], ["docs", "Documents"], ["verdict", "Verdict"],
];

export default function PropertyWorkspace() {
  const { ctx, propertyId, setPropertyId, updateProperty, duplicateProperty, deleteProperty, addProperty, bump } = useStore();
  const [tab, setTab] = useState<PTab>("projection");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const isOpen = (id: string) => open[id] !== false;
  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: o[id] === false ? true : false }));

  const p = ctx.properties.find((x) => x.id === propertyId) || ctx.properties[0];

  const R = useMemo(() => {
    if (!p) return null;
    const lt = portfolioLandTax(1, ctx);
    return project(p, { landTaxMap: lt.byProp }, ctx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p, ctx, bump]);

  if (!p || !R) return <div className="empty">No property. <button className="act" onClick={addProperty}>Add one</button></div>;

  const update = (mut: (rec: any) => void) => updateProperty(p.id, mut);

  const exportCsv = () => {
    const header = ["Year", "Value", "Debt", "Equity", "LVR", "Rate", "GrossRent", "Interest", "Opex", "LandTax", "Depreciation", "TaxEffect", "PostTaxCF", "Weekly", "CumCash"];
    const lines = [header.join(",")].concat(R.rows.map((r: any) =>
      [r.year, r.value, r.balance, r.equity, r.lvr, r.rate, r.grossRent, r.interest, r.opex, r.landTax, r.dep, r.taxEffect, r.postTaxCF, r.weekly, r.cumCash].join(",")));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${(p.label || "property").replace(/[^a-z0-9]+/gi, "-")}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="toolbar">
        <select value={p.id} onChange={(e) => setPropertyId(e.target.value)} style={{ width: "auto", minWidth: 260 }}>
          {ctx.properties.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
        </select>
        <div className="seg">
          {["Bear", "Base", "Bull"].map((s) => (
            <button key={s} className={p.scenario === s ? "on" : ""} onClick={() => update((d) => { d.scenario = s; })}>{s}</button>
          ))}
        </div>
        <button className="act ghost" onClick={addProperty}>+ New</button>
        <button className="act ghost" onClick={() => duplicateProperty(p.id)}>Duplicate</button>
        <button className="act ghost" onClick={() => deleteProperty(p.id)} disabled={ctx.properties.length <= 1}>Delete</button>
        <button className="act ghost" onClick={exportCsv}>Export CSV</button>
        <button className="act ghost" onClick={() => window.print()}>Print report</button>
      </div>

      <div className="grid">
        <div className="controls"><PropertyInputs p={p} R={R} ctx={ctx} update={update} open={isOpen} toggle={toggle} /></div>
        <div>
          <KpiStrip p={p} R={R} />
          <div className="tabs">
            {PTABS.map(([k, l]) => <button key={k} className={`tab ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{l}</button>)}
          </div>
          <div id="tabbody"><PropertyTabs tab={tab} p={p} R={R} ctx={ctx} update={update} /></div>
        </div>
      </div>
    </>
  );
}
