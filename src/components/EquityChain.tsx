"use client";
/* Equity chain view — faithful port of viewEquity(). Models equity recycling
   constrained by serviceability, naming the blocker (equity vs capacity). */
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Field, Panel, type Updater } from "./property/fields";
import { equityChain } from "@/lib/engine/engine";
import { money as money0, pct } from "@/lib/format";
import Chart from "./Chart";

const GOLD = "#B08D2E", BLACK = "#0B0B0A", LINE = "#E4E0D6";

export default function EquityChain() {
  const { ctx } = useStore();
  const [cfg, setCfg] = useState<any>(() => ({
    targetPrice: 850000, depositPct: 20, costsPct: 6, targetLVR: 80, horizon: 15, rentYield: 4.2,
    clientId: (ctx.clients[0] || {}).id, lenderId: (ctx.lenders[0] || {}).id,
  }));
  const [open, setOpen] = useState(true);
  const money = (v: number) => money0(v, ctx.settings.country || "AU");

  const update: Updater = (mut) => setCfg((prev: any) => { const next = { ...prev }; mut(next); return next; });
  const F = (label: string, path: string, o: any = {}) => <Field rec={cfg} path={path} update={update} label={label} {...o} />;

  const E = equityChain(cfg, ctx);

  return (
    <div className="grid">
      <div>
        <Panel id="eq" title="Next acquisition" meta={money(E.cashNeeded)} open={open} onToggle={() => setOpen((o) => !o)}>
          <div className="r2">{F("Target price", "targetPrice")}{F("Deposit %", "depositPct")}</div>
          <div className="r2">{F("Acquisition costs %", "costsPct", { step: .1 })}{F("Release at LVR %", "targetLVR")}</div>
          <div className="r2">{F("Expected gross yield %", "rentYield", { step: .1 })}{F("Horizon (yrs)", "horizon")}</div>
          {F("Lender", "lenderId", { type: "select", options: ctx.lenders.map((l) => [l.id, l.name]) })}
          {F("Client", "clientId", { type: "select", options: ctx.clients.map((c) => [c.id, c.name]) })}
          <div className="hint">Cash required <b>{money(E.cashNeeded)}</b> · new loan <b>{money(E.newLoan)}</b> · new rent {money(E.newRent)} pa</div>
        </Panel>
      </div>
      <div>
        <div className="kpis">
          <div className="kpi"><div className="k">Equity ready</div><div className="v tnum">{E.readyYear ? "Year " + E.readyYear : "—"}</div><div className="s">usable equity covers the cash</div></div>
          <div className="kpi"><div className="k">Serviceability</div><div className="v tnum">{E.servYear ? "Year " + E.servYear : "—"}</div><div className="s">{E.lender.name}</div></div>
          <div className="kpi"><div className="k">Go year</div><div className={`v tnum ${E.goYear ? "gold" : "neg"}`}>{E.goYear ? "Year " + E.goYear : "Blocked"}</div><div className="s">{E.blocker ? "blocked on " + E.blocker : "both tests pass"}</div></div>
        </div>
        {E.blocker === "serviceability" && <div className="warn" style={{ marginTop: 12 }}><b>Equity without capacity is not a purchase.</b> The equity is there, but {E.lender.name} will not lend against it. This is the wall investors hit at property three or four — and the reason an equity-release plan that ignores serviceability is fiction.</div>}
        {E.blocker === "equity" && <div className="warn" style={{ marginTop: 12 }}>Usable equity never reaches {money(E.cashNeeded)} inside the horizon on the current growth assumptions.</div>}
        <div className="chartbox" style={{ marginTop: 12 }}>
          <div className="chart-t">Usable equity vs cash required</div>
          <Chart data={E.rows} opts={{ xKey: "year", height: 260, xFmt: (v) => "Y" + v, series: [
            { key: "usable", type: "bar", color: GOLD, colorFn: (v) => v >= E.cashNeeded ? GOLD : LINE, label: "Usable equity", tip: money },
            { key: "needed", type: "line", color: BLACK, label: "Cash required", width: 2, tip: money }] }} />
        </div>
        <div className="chartbox" style={{ marginTop: 12 }}>
          <div className="chart-t">Year by year</div>
          <div className="tblwrap"><table>
            <thead><tr><th>Year</th><th>Usable equity</th><th>Cash needed</th><th>Equity test</th><th>Capacity</th><th>DTI</th><th>Serviceability</th><th>Go</th></tr></thead>
            <tbody>{E.rows.map((r: any) => (
              <tr key={r.year}>
                <td>{r.year}</td><td>{money(r.usable)}</td><td className="mut">{money(r.needed)}</td>
                <td className={r.equityOk ? "gold" : "neg"}>{r.equityOk ? "Pass" : "Short"}</td>
                <td>{money(r.capacity)}</td><td>{r.dti}×</td>
                <td className={r.servOk ? "gold" : "neg"}>{r.servOk ? "Pass" : "Fail"}</td>
                <td><b>{r.equityOk && r.servOk ? "●" : "—"}</b></td>
              </tr>
            ))}</tbody>
          </table></div>
        </div>
      </div>
    </div>
  );
}
