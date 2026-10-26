"use client";
/* Audit & data view — faithful port of viewAudit(). Ownership entities, the
   versioned tax data block, data export/import/reset, and the append-only log. */
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Panel } from "./property/fields";
import { TAX_DATA } from "@/lib/engine/tax-data";

export default function Audit() {
  const { ctx, updateEntity, addEntity, deleteEntity, audit, exportJson, importJson, resetData } = useStore();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const isOpen = (id: string) => open[id] !== false;
  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: o[id] === false ? true : false }));

  const doExport = () => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "terravado-data.json"; a.click(); URL.revokeObjectURL(url);
  };
  const doImport = (file: File) => {
    const r = new FileReader();
    r.onload = () => { if (!importJson(String(r.result))) alert("That file could not be read as Terravado data."); };
    r.readAsText(file);
  };

  const log = audit.slice().reverse().slice(0, 120);

  return (
    <div className="grid">
      <div>
        <Panel id="ent" title="Ownership entities" meta={String(ctx.entities.length)} open={isOpen("ent")} onToggle={() => toggle("ent")}>
          {ctx.entities.map((e: any, i: number) => (
            <div key={e.id || i} style={{ borderBottom: "1px dotted var(--line)", paddingBottom: 10, marginBottom: 10 }}>
              <div className="erow" style={{ gridTemplateColumns: "1.4fr 1fr 28px" }}>
                <input type="text" value={e.name || ""} onChange={(ev) => updateEntity(i, "name", ev.target.value)} />
                <select value={e.type} onChange={(ev) => updateEntity(i, "type", ev.target.value)}>
                  {["Individual", "Joint", "Company", "Trust", "SMSF"].map((t) => <option key={t}>{t}</option>)}
                </select>
                <button className="x" onClick={() => deleteEntity(i)}>×</button>
              </div>
              <div className="erow" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 5 }}>
                <input type="number" value={e.taxableIncome ?? ""} title="Other taxable income" onChange={(ev) => updateEntity(i, "taxableIncome", ev.target.value)} />
                <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, color: "var(--muted)" }}>
                  <input type="checkbox" checked={!!e.deedExcludesForeign} onChange={(ev) => updateEntity(i, "deedExcludesForeign", ev.target.checked)} style={{ width: "auto" }} />
                  deed excludes foreign persons</label>
              </div>
              {e.type === "Trust" && !e.deedExcludesForeign && <div className="hint" style={{ color: "var(--gold-d)" }}>NSW: no land tax threshold + surcharge applies.</div>}
            </div>
          ))}
          <button className="act ghost mini" onClick={addEntity}>+ Entity</button>
        </Panel>

        <Panel id="dat" title="Tax data block" meta={TAX_DATA.version} open={isOpen("dat")} onToggle={() => toggle("dat")}>
          <div className="note">Version <b>{TAX_DATA.version}</b>, effective {TAX_DATA.effectiveFrom}.<br />{TAX_DATA.source}</div>
          <div className="hint" style={{ marginTop: 10 }}>Duty, land tax and income tax are held in one effective-dated block, not scattered as constants. Rates change every budget; the block is replaced, and every historic report still reproduces against the version it was run on.</div>
        </Panel>

        <Panel id="io" title="Data" meta={`${audit.length} events`} open={isOpen("io")} onToggle={() => toggle("io")}>
          <button className="act ghost" onClick={doExport}>Export all data (JSON)</button>
          <div style={{ height: 8 }} />
          <label className="f"><span className="lab"><span>Import JSON</span></span>
            <input type="file" accept="application/json" onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} /></label>
          <div style={{ height: 8 }} />
          <button className="act ghost" onClick={() => resetData()}>Reset to seed data</button>
          <div className="hint" style={{ marginTop: 8 }}>In this build data lives in memory. Persistent, authenticated storage connects with Supabase in the data-layer increment. Export before leaving the page.</div>
        </Panel>
      </div>
      <div>
        <div className="chartbox">
          <div className="chart-t">Audit log — append-only</div>
          <div className="tblwrap" style={{ maxHeight: 600 }}><table>
            <thead><tr><th>When</th><th>Role</th><th>Action</th><th>Engine</th></tr></thead>
            <tbody>{log.map((a: any, i: number) => (
              <tr key={i}>
                <td className="lbl">{a.ts.replace("T", " ").slice(0, 19)}</td>
                <td>{a.role}</td><td className="lbl">{a.action}</td><td className="mut">{a.engine}</td>
              </tr>
            ))}</tbody>
          </table></div>
        </div>
        <div className="note" style={{ marginTop: 12 }}>Under Best Interests Duty the obligation is not only to act in the client&apos;s interests but to be able to <b>demonstrate</b> it. This log, the assumption snapshot and the growth-driver ladder are the evidence file.</div>
      </div>
    </div>
  );
}
