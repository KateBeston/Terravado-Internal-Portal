"use client";
/* Form primitives — React equivalents of the original fld() / panel() helpers,
   plus array-ledger helpers. Controlled; writes go through update(mutator). */
import React from "react";

export type Updater = (mut: (rec: any) => void) => void;

export function getPath(o: any, path: string): any {
  return path.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
}
export function setPath(o: any, path: string, v: any): void {
  const ks = path.split("."), last = ks.pop()!;
  const t = ks.reduce((a, k) => (a[k] = a[k] || {}, a[k]), o);
  t[last] = v;
}

type Opt = string | [string, string];

export function Field(props: {
  rec: any; path: string; update: Updater; label: string;
  type?: "number" | "text" | "date" | "select" | "checkbox" | "textarea" | "range";
  options?: Opt[]; meta?: string; prov?: string; step?: number; min?: number; max?: number; rows?: number;
}) {
  const { rec, path, update, label, type = "number", options = [], meta, prov, step, min, max, rows } = props;
  const v = getPath(rec, path);
  const commit = (val: any) => update((d) => setPath(d, path, val));

  if (type === "checkbox") {
    return (
      <label className="f" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="checkbox" checked={!!v} onChange={(e) => commit(e.target.checked)} style={{ width: "auto" }} />
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{label}</span>
      </label>
    );
  }

  const lab = (
    <span className="lab">
      <span>{label}{prov && <span className={`prov ${prov}`} title={`Provenance: ${prov}`} />}</span>
      {meta && <b>{meta}</b>}
    </span>
  );

  let input: React.ReactNode;
  if (type === "select") {
    input = (
      <select value={String(v ?? "")} onChange={(e) => commit(e.target.value)}>
        {options.map((o, i) => {
          const val = Array.isArray(o) ? o[0] : o, lb = Array.isArray(o) ? o[1] : o;
          return <option key={i} value={val}>{lb}</option>;
        })}
      </select>
    );
  } else if (type === "textarea") {
    input = <textarea rows={rows || 3} value={v == null ? "" : v} onChange={(e) => commit(e.target.value)} />;
  } else if (type === "range") {
    input = <input type="range" min={min} max={max} step={step} value={Number(v) || 0} onChange={(e) => commit(Number(e.target.value))} />;
  } else {
    input = <input type={type} step={step} min={min} max={max} value={v == null ? "" : v}
      onChange={(e) => commit(type === "number" ? e.target.value : e.target.value)} />;
  }
  return <label className="f">{lab}{input}</label>;
}

export function Panel(props: { id: string; title: string; meta?: React.ReactNode; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <section className="panel" data-open={props.open ? 1 : 0} data-panel={props.id}>
      <div className="ph" onClick={props.onToggle}><h3>{props.title}</h3><span className="meta">{props.meta}</span></div>
      <div className="pb">{props.children}</div>
    </section>
  );
}

/* array-ledger helpers */
export const addItem = (update: Updater, path: string, item: any) =>
  update((d) => { const a = getPath(d, path) || []; a.push(item); setPath(d, path, a); });
export const delItem = (update: Updater, path: string, i: number) =>
  update((d) => { const a = getPath(d, path) || []; a.splice(i, 1); setPath(d, path, a); });
export const setItemField = (update: Updater, path: string, i: number, field: string, val: any) =>
  update((d) => { const a = getPath(d, path) || []; if (a[i]) a[i][field] = val; });

/** small text/number cell used in ledger rows */
export function Cell(props: { rec: any; path: string; i: number; field: string; update: Updater; type?: string; step?: number; placeholder?: string }) {
  const { rec, path, i, field, update, type = "text", step, placeholder } = props;
  const arr = getPath(rec, path) || [];
  const val = arr[i]?.[field];
  return <input type={type} step={step} placeholder={placeholder} value={val == null ? "" : val}
    onChange={(e) => setItemField(update, path, i, field, e.target.value)} />;
}
