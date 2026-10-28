/* ===========================================================================
   DEPRECIATION MODELLER (persisted-model helper)
   ---------------------------------------------------------------------------
   Projects an investment property's depreciation deductions year by year:
     • Div 43 — capital works (the building): 2.5% p.a. straight line over 40
       years from construction, only where construction is post-15 Sep 1987.
     • Div 40 — plant & equipment (removable assets): written off over each
       asset's effective life, by prime cost or diminishing value.
   Two bases: "assumed" (estimate from construction cost + a plant allowance)
   and "schedule" (the line items from a quantity surveyor's report). "none"
   yields nil.

   Runs on the lean inputs built from the persisted property record, reusing the
   engine's depreciationFor() so the tab and the Modeller agree to the dollar.
   Note (not enforced here): since 1 July 2017 second-hand plant & equipment in
   residential property is generally not deductible for the buyer — a QS splits
   the schedule accordingly, which is why schedule mode is the accurate basis.
   =========================================================================== */
import { depreciationFor } from "./engine";
import type { Div43Line, Div40Line } from "@/lib/domain/types";

export interface DepInput {
  mode: "assumed" | "schedule" | "none";
  constructionCost?: number;
  plantValue?: number;
  buildRate?: number;
  buildYear?: number;
  internalArea?: number;
  div43?: Div43Line[];
  div40?: Div40Line[];
  scrapYear?: number;
  scrapValue?: number;
}

export interface DepRow { year: number; div43: number; div40: number; scrap: number; total: number; }
export interface DepResult {
  rows: DepRow[];
  firstYear: number;
  firstFiveTotal: number;
  horizonTotal: number;
}

export function modelDepreciation(inp: DepInput, years = 15): DepResult {
  const p = {
    dep: {
      // "none" is an empty schedule → nil deductions
      mode: inp.mode === "none" ? "schedule" : inp.mode,
      constructionCost: inp.constructionCost ?? 0,
      plantValue: inp.plantValue ?? 0,
      plantEligible: (inp.plantValue ?? 0) > 0,
      div43: inp.mode === "schedule" ? (inp.div43 ?? []) : [],
      div40: inp.mode === "schedule" ? (inp.div40 ?? []) : [],
      scrapYear: inp.scrapYear ?? 0,
      scrapValue: inp.scrapValue ?? 0,
    },
    phys: { buildYear: inp.buildYear ?? 0, internalArea: inp.internalArea ?? 0 },
    market: { buildRate: inp.buildRate ?? 0 },
  };
  const rows: DepRow[] = [];
  for (let y = 1; y <= years; y++) {
    const r = depreciationFor(p as never, y);
    rows.push({ year: y, div43: r.d43, div40: r.d40, scrap: r.scrap, total: r.total });
  }
  return {
    rows,
    firstYear: rows[0]?.total ?? 0,
    firstFiveTotal: rows.slice(0, 5).reduce((a, r) => a + r.total, 0),
    horizonTotal: rows.reduce((a, r) => a + r.total, 0),
  };
}
