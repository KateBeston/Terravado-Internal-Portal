"use client";
/* Lender comparison — faithful port of lenderCompare(). Shared by the Clients
   view (right column) and the Serviceability view. */
import { useStore } from "@/lib/store";
import { acquisition, project, serviceability, totalIncome, type EngineContext } from "@/lib/engine/engine";
import { money as money0, pct, num } from "@/lib/format";
import Chart from "./Chart";

const GOLD = "#B08D2E", BLACK = "#0B0B0A", LINE = "#E4E0D6";

export default function LenderCompare({ c }: { c: any }) {
  const { ctx } = useStore();
  const money = (v: number) => money0(v, ctx.settings.country || "AU");

  const owned = ctx.properties.filter((p) => p.status === "Owned");
  const target = ctx.properties.find((p) => p.status !== "Owned" && p.status !== "Sold") || ctx.properties[0];
  const acq = target ? acquisition(target) : ({ loan: 0 } as any);
  const newRent = target ? project(target, {}, ctx).rows[0].grossRent : 0;

  const results = ctx.lenders.map((l) => serviceability(c, l, { proposedLoan: acq.loan, newAnnualRent: newRent, excludePropertyId: target ? target.id : null }, ctx));
  const best = results.slice().sort((a, b) => b.capacity - a.capacity)[0];
  const minCap = Math.min(...results.map((r) => r.capacity));

  return (
    <>
      <div className="kpis">
        <div className="kpi"><div className="k">Assessed income</div><div className="v tnum">{money(totalIncome(c))}</div><div className="s">before shading</div></div>
        <div className="kpi"><div className="k">Existing debt</div><div className="v tnum">{money(results[0] ? results[0].existingDebt : 0)}</div><div className="s">{owned.length} properties</div></div>
        <div className="kpi"><div className="k">Best capacity</div><div className="v gold tnum">{money(best ? best.capacity : 0)}</div><div className="s">{best ? best.lender.name : ""}</div></div>
        <div className="kpi"><div className="k">Spread across lenders</div><div className="v tnum">{money((best ? best.capacity : 0) - minCap)}</div><div className="s">same client, same property</div></div>
      </div>

      <div className="chartbox" style={{ marginTop: 12 }}>
        <div className="chart-t">Lender comparison — {target ? target.label : "no target property"}</div>
        <div className="tblwrap"><table>
          <thead><tr><th>Lender</th><th>Assess rate</th><th>Net income</th><th>HEM</th><th>Commitments</th><th>Surplus</th><th>Capacity</th><th>DTI</th><th>Outcome</th></tr></thead>
          <tbody>{results.map((r, i) => (
            <tr key={i}>
              <td className="lbl">{r.lender.name}</td>
              <td>{pct(r.assessRate)}</td>
              <td>{money(r.netIncome)}</td>
              <td className="mut">{money(r.hem)}</td>
              <td>{money(r.commitments)}</td>
              <td className={r.surplus < 0 ? "neg" : "gold"}>{money(r.surplus)}</td>
              <td><b>{money(r.capacity)}</b></td>
              <td className={r.dti > num(r.lender.maxDTI) ? "neg" : ""}>{r.dti.toFixed(1)}×</td>
              <td className={r.pass ? "gold" : "neg"}><b>{r.pass ? "Pass" : "Fail"}</b></td>
            </tr>
          ))}</tbody>
        </table></div>
        <div className="hint" style={{ marginTop: 8 }}>Loan required: <b>{money(acq.loan)}</b>. Capacity varies by <b>{money((best ? best.capacity : 0) - minCap)}</b> across these templates on identical inputs — which is the entire argument for lender selection.</div>
      </div>

      <div className="chartbox" style={{ marginTop: 12 }}>
        <div className="chart-t">Capacity by lender</div>
        <Chart data={results.map((r) => ({ name: r.lender.name.replace(" (template)", ""), cap: Math.round(r.capacity), req: Math.round(acq.loan) }))}
          opts={{ xKey: "name", height: 200, series: [
            { key: "cap", type: "bar", color: GOLD, label: "Capacity", tip: money },
            { key: "req", type: "line", color: BLACK, label: "Loan required", tip: money }] }} />
      </div>
      <div className="disclaimer">These are <b>configurable templates</b>, not any lender&apos;s actual policy. Lender servicing calculators are proprietary. An authorised admin enters each lender&apos;s parameters from that lender&apos;s own broker calculator. Nothing here is a credit decision.</div>
    </>
  );
}
