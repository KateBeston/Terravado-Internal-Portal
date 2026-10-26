"use client";
/* Clients view — faithful port of viewClients(). Identity, income, liabilities,
   living expenses & goals, assets (left) + live lender comparison (right). */
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Field, Panel, Cell, addItem, delItem, type Updater } from "./property/fields";
import { totalIncome } from "@/lib/engine/engine";
import { money as money0, num } from "@/lib/format";
import LenderCompare from "./LenderCompare";

export default function Clients() {
  const { ctx, clientId, setClientId, updateClient, addClient } = useStore();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const isOpen = (id: string) => open[id] !== false;
  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: o[id] === false ? true : false }));

  const c = ctx.clients.find((x) => x.id === clientId) || ctx.clients[0];
  if (!c) return <div className="empty">No clients. <button className="act" onClick={addClient}>Add one</button></div>;

  const money = (v: number) => money0(v, ctx.settings.country || "AU");
  const update: Updater = (mut) => updateClient(c.id, mut);
  const ti = totalIncome(c);
  const F = (label: string, path: string, o: any = {}) => <Field rec={c} path={path} update={update} label={label} {...o} />;
  const P = (id: string, title: string, meta: React.ReactNode, children: React.ReactNode) =>
    <Panel id={id} title={title} meta={meta} open={isOpen(id)} onToggle={() => toggle(id)}>{children}</Panel>;

  return (
    <>
      <div className="toolbar">
        <select value={c.id} onChange={(e) => setClientId(e.target.value)} style={{ width: "auto", minWidth: 220 }}>
          {ctx.clients.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
        <button className="act ghost" onClick={addClient}>+ New client</button>
      </div>
      <div className="grid">
        <div>
          {P("cid", "Identity", c.buyerStatus, <>
            {F("Name", "name", { type: "text" })}
            <div className="r2">{F("Date of birth", "dob", { type: "date" })}{F("Dependants", "dependants")}</div>
            <div className="r2">{F("Phone", "phone", { type: "text" })}{F("Email", "email", { type: "text" })}</div>
            {F("Residency", "residency", { type: "select", options: ["Australian resident", "Foreign resident", "Temporary resident"] })}
            {F("Buyer status", "buyerStatus", { type: "select", options: ["First home buyer", "PPOR upgrader", "First-time investor", "Portfolio investor", "SMSF trustee", "Developer", "Commercial investor", "Foreign purchaser"] })}
          </>)}

          {P("cinc", "Income", money(ti), <>
            {F("Base salary", "income.base")}
            <div className="r2">{F("Overtime", "income.overtime")}{F("Bonus", "income.bonus")}</div>
            <div className="r2">{F("Commission", "income.commission")}{F("Self-employed", "income.selfEmployed")}</div>
            <div className="r2">{F("Dividends", "income.dividends")}{F("Other", "income.otherIncome")}</div>
            <div className="eyebrow">Partner</div>
            <div className="r2">{F("Partner name", "partner.name", { type: "text" })}{F("Partner income", "partner.base")}</div>
            <div className="hint">Each income type is shaded differently by each lender. This is the single largest driver of a serviceability answer.</div>
          </>)}

          {P("cliab", "Liabilities", `${(c.liabilities || []).length} lines`, <>
            <div className="erow" style={{ gridTemplateColumns: "1fr .7fr .7fr .7fr 28px", fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)" }}>
              <span>Type</span><span>Limit</span><span>Balance</span><span>Repay/mo</span><span></span></div>
            {(c.liabilities || []).map((l: any, i: number) => (
              <div key={i} className="erow" style={{ gridTemplateColumns: "1fr .7fr .7fr .7fr 28px" }}>
                <select value={l.type} onChange={(e) => update((d) => { d.liabilities[i].type = e.target.value; })}>
                  {["Credit card", "Car loan", "Personal loan", "HECS/HELP", "BNPL", "Other mortgage", "Other"].map((t) => <option key={t}>{t}</option>)}
                </select>
                <Cell rec={c} path="liabilities" i={i} field="limit" update={update} type="number" />
                <Cell rec={c} path="liabilities" i={i} field="balance" update={update} type="number" />
                <Cell rec={c} path="liabilities" i={i} field="repayment" update={update} type="number" />
                <button className="x" onClick={() => delItem(update, "liabilities", i)}>×</button>
              </div>
            ))}
            <button className="act ghost mini" onClick={() => addItem(update, "liabilities", { type: "Credit card", limit: 0, balance: 0, repayment: 0, rate: 0, lender: "" })}>+ Liability</button>
            <div className="hint" style={{ marginTop: 8 }}>Lenders assess the <b>credit card limit</b>, not the balance. HECS is routinely forgotten and materially reduces capacity.</div>
          </>)}

          {P("cexp", "Living expenses & goals", money(num(c.livingExpMonthly) * 12) + " pa", <>
            {F("Declared living expenses / month", "livingExpMonthly")}
            <div className="hint">The lender takes the higher of this and their HEM benchmark.</div>
            <div className="eyebrow">Goals</div>
            <div className="r2">{F("Target properties", "goals.targetProperties")}{F("Timeframe (yrs)", "goals.timeframe")}</div>
            <div className="r2">{F("Cash capacity / week", "goals.cashCapacityWeekly")}{F("Retirement income target", "goals.retirementIncome")}</div>
          </>)}

          {P("cass", "Assets", money(Object.values(c.assets || {}).reduce((a: number, b: any) => a + num(b), 0)), <>
            <div className="r2">{F("Cash", "assets.cash")}{F("Shares", "assets.shares")}</div>
            <div className="r2">{F("Superannuation", "assets.super")}{F("Vehicles", "assets.vehicles")}</div>
          </>)}
        </div>
        <div><LenderCompare c={c} /></div>
      </div>
    </>
  );
}
