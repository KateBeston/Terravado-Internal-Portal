"use client";
/* Lenders view — faithful port of viewLenders(). Admin-configured lender
   templates (not any lender's policy). Each panel edits one template. */
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Field, Panel, type Updater } from "./property/fields";
import { pct } from "@/lib/format";

export default function Lenders() {
  const { ctx, updateLender, addLender, deleteLender } = useStore();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const isOpen = (id: string) => open[id] !== false;
  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: o[id] === false ? true : false }));

  return (
    <>
      <div className="toolbar"><button className="act" onClick={addLender}>+ Add lender template</button></div>
      <div className="note" style={{ marginBottom: 14 }}>Lender servicing calculators are proprietary. These are <b>admin-configured templates</b>. Enter each lender&apos;s parameters from their own broker calculator. The platform ships the framework, never a copy of anyone&apos;s policy.</div>
      {ctx.lenders.map((l, i) => {
        const update: Updater = (mut) => updateLender(l.id, mut);
        const F = (label: string, path: string, o: any = {}) => <Field rec={l} path={path} update={update} label={label} {...o} />;
        const pid = "len" + i;
        return (
          <Panel key={l.id} id={pid} title={l.name} meta={`${pct(l.floorPct)} floor · ${l.maxDTI}× DTI`} open={isOpen(pid)} onToggle={() => toggle(pid)}>
            {F("Lender name", "name", { type: "text" })}
            <div className="eyebrow first">Assessment</div>
            <div className="r3">
              {F("Buffer %", "bufferPct", { step: .05 })}{F("Floor %", "floorPct", { step: .05 })}{F("Actual rate %", "varRate", { step: .01 })}
            </div>
            <div className="eyebrow">Income shading</div>
            <div className="r4">
              {F("Rent %", "rentShadePct")}{F("Overtime %", "otShadePct")}{F("Bonus %", "bonusShadePct")}{F("Comm. %", "commissionShadePct")}
            </div>
            {F("Negative gearing add-back", "ngAddBack", { type: "checkbox" })}
            <div className="eyebrow">Expenses & commitments</div>
            <div className="r3">
              {F("HEM / month", "hemMonthly")}{F("Per dependant", "hemPerDependant")}{F("Card assess %", "cardAssessPct", { step: .1 })}
            </div>
            {F("HECS/HELP assessed", "hecsAssessed", { type: "checkbox" })}
            {F("Existing debt", "existingDebtAssess", { type: "select", options: ["Assessed", "Actual"] })}
            <div className="eyebrow">Limits</div>
            <div className="r2">{F("Max LVR %", "maxLVR")}{F("Max DTI ×", "maxDTI", { step: .1 })}</div>
            {F("Notes", "notes", { type: "textarea", rows: 2 })}
            <button className="act ghost mini" onClick={() => deleteLender(l.id)} disabled={ctx.lenders.length <= 1}>Delete template</button>
          </Panel>
        );
      })}
    </>
  );
}
