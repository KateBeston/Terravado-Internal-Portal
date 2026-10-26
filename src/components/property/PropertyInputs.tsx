"use client";
/* Property input column — faithful React port of inputsColumn() (17 panels). */
import { Field, Panel, Cell, addItem, delItem, type Updater } from "./fields";
import { COUNTRIES, TAX_DATA } from "@/lib/engine/tax-data";
import { DRIVERS, GROUPS, FREQ, assetCagr, portfolioLandTax, standaloneLandTax } from "@/lib/engine/engine";
import type { EngineContext } from "@/lib/engine/engine";
import { money as money0, pct, num } from "@/lib/format";

const delBtn = (update: Updater, path: string, i: number) =>
  <button className="x" onClick={() => delItem(update, path, i)}>×</button>;

export default function PropertyInputs({ p, R, ctx, update, open, toggle }: {
  p: any; R: any; ctx: EngineContext; update: Updater; open: (id: string) => boolean; toggle: (id: string) => void;
}) {
  const C = COUNTRIES[p.loc.country];
  const cc = p.loc.country || "AU";
  const money = (v: number) => money0(v, cc);
  const isComm = p.assetClass === "Commercial";
  const D = R.demand, L = R.ladder;
  const P = (id: string, title: string, meta: React.ReactNode, children: React.ReactNode) =>
    <Panel id={id} title={title} meta={meta} open={open(id)} onToggle={() => toggle(id)}>{children}</Panel>;
  const F = (label: string, path: string, o: any = {}) => <Field rec={p} path={path} update={update} label={label} {...o} />;

  const a = assetCagr(p);

  return (
    <>
      {P("id", "Identity & status", p.status, <>
        {F("Label", "label", { type: "text" })}
        <div className="r2">
          {F("Asset class", "assetClass", { type: "select", options: ["Residential", "Commercial"] })}
          {F("Status", "status", { type: "select", options: ["Pipeline", "Appraised", "Under offer", "Owned", "Under development", "Listed", "Sold"] })}
        </div>
        <div className="r2">
          {F("Owning entity", "entityId", { type: "select", options: ctx.entities.map((e) => [e.id, e.name]) })}
          {F("Client", "clientId", { type: "select", options: ctx.clients.map((c) => [c.id, c.name]) })}
        </div>
        {F("Principal place of residence (land tax exempt)", "isPPOR", { type: "checkbox" })}
      </>)}

      {P("loc", "Location", `${p.loc.suburb} ${p.loc.region}`, <>
        <div className="r2">
          {F("Country", "loc.country", { type: "select", options: Object.entries(COUNTRIES).map(([k, v]) => [k, v.name]) })}
          {F(C.regionLabel, "loc.region", { type: "select", options: C.regions })}
        </div>
        <div className="r2">{F("Suburb", "loc.suburb", { type: "text" })}{F("Postcode", "loc.postcode", { type: "text" })}</div>
        {F("Address", "loc.address", { type: "text" })}
      </>)}

      {P("mkt", "Market & growth", pct(R.g0), <>
        <div className="r2">
          {F("Purchase price", "market.price", { prov: (p.market.provenance || {}).price })}
          {F("Purchase date", "market.purchaseDate", { type: "date" })}
        </div>
        <div className="r2">{F("Suburb median", "market.suburbMedian")}{F(`Median rent / ${C.rentPer}`, "market.suburbMedianRent")}</div>
        <div className="r2">
          {F(`Land rate / ${C.area}`, "market.landRate", { prov: (p.market.provenance || {}).landRate })}
          {F(`Build rate / ${C.area}`, "market.buildRate")}
        </div>
        <div className="r2">
          {F("Suburb CAGR %", "market.suburbCagr", { step: .1, prov: (p.market.provenance || {}).suburbCagr })}
          {F("Long-run anchor %", "market.longRunAnchor", { step: .1 })}
        </div>
        {F("Weight on suburb history vs anchor", "market.anchorBlend", { type: "range", min: 0, max: 100, meta: p.market.anchorBlend + "% suburb" })}
        <div className="r3">
          {F("Rent growth %", "market.rentBase", { step: .1 })}{F("CPI %", "market.cpi", { step: .1 })}{F("Market movement % pa", "market.marketMovement", { step: .1 })}
        </div>
        <div className="hint">Market movement time-adjusts comparable sales to today (§8.4).</div>
      </>)}

      {P("phys", "Property & floorplan", `${p.phys.beds}·${p.phys.baths}·${p.phys.cars}`, <>
        <div className="r2">
          {F("Type", "phys.type", { type: "select", options: ["House", "Townhouse", "Unit / apartment", "Villa", "Duplex", "Land", "Office", "Retail", "Industrial", "Mixed use"] })}
          {F("Build year", "phys.buildYear")}
        </div>
        <div className="r4">{F("Beds", "phys.beds")}{F("Baths", "phys.baths")}{F("Cars", "phys.cars")}{F("Living", "phys.livingAreas")}</div>
        <div className="r2">{F(`Internal area (${C.area})`, "phys.internalArea")}{F(`Land size (${C.area})`, "phys.landSize")}</div>
        <div className="r3">
          {F("Frontage", "phys.frontage")}{F("Depth", "phys.depth")}
          {F("Aspect", "phys.orientation", { type: "select", options: ["North", "North-east", "East", "South-east", "South", "South-west", "West", "North-west"] })}
        </div>
        <div className="eyebrow">Room schedule</div>
        {(p.phys.rooms || []).map((r: any, i: number) => (
          <div key={i} className="erow" style={{ gridTemplateColumns: "1.6fr .6fr .6fr 28px" }}>
            <Cell rec={p} path="phys.rooms" i={i} field="name" update={update} />
            <Cell rec={p} path="phys.rooms" i={i} field="l" update={update} type="number" step={0.1} />
            <Cell rec={p} path="phys.rooms" i={i} field="w" update={update} type="number" step={0.1} />
            {delBtn(update, "phys.rooms", i)}
          </div>
        ))}
        <button className="act ghost mini" onClick={() => addItem(update, "phys.rooms", { name: "", l: 0, w: 0 })}>+ Room</button>
        <div className="hint" style={{ marginTop: 8 }}>Total {(p.phys.rooms || []).reduce((x: number, r: any) => x + num(r.l) * num(r.w), 0).toFixed(1)} {C.area} scheduled · {p.phys.internalArea} {C.area} internal</div>
      </>)}

      {P("title", "Title, easements & encumbrances", `${(p.title.easements || []).length + (p.title.encumbrances || []).length} noted`, <>
        <div className="r2">{F("Zoning", "title.zoning", { type: "text" })}{F("Lot / plan", "title.lotDp", { type: "text" })}</div>
        {F("Heritage listed / conservation area", "title.heritage", { type: "checkbox" })}
        <div className="eyebrow">Easements</div>
        {(p.title.easements || []).map((e: any, i: number) => (
          <div key={i} className="erow" style={{ gridTemplateColumns: "1.2fr 1fr .6fr 28px" }}>
            <Cell rec={p} path="title.easements" i={i} field="type" update={update} placeholder="Type" />
            <Cell rec={p} path="title.easements" i={i} field="beneficiary" update={update} placeholder="Beneficiary" />
            <Cell rec={p} path="title.easements" i={i} field="affectedArea" update={update} type="number" placeholder="m² affected" />
            {delBtn(update, "title.easements", i)}
          </div>
        ))}
        <button className="act ghost mini" onClick={() => addItem(update, "title.easements", { type: "", beneficiary: "", affectedArea: 0 })}>+ Easement</button>
        <div className="eyebrow">Encumbrances & covenants</div>
        {(p.title.encumbrances || []).map((e: any, i: number) => (
          <div key={i} className="erow" style={{ gridTemplateColumns: ".9fr 1.6fr 28px" }}>
            <Cell rec={p} path="title.encumbrances" i={i} field="type" update={update} placeholder="Type" />
            <Cell rec={p} path="title.encumbrances" i={i} field="impact" update={update} placeholder="Impact on use / development" />
            {delBtn(update, "title.encumbrances", i)}
          </div>
        ))}
        <button className="act ghost mini" onClick={() => addItem(update, "title.encumbrances", { type: "", impact: "" })}>+ Encumbrance</button>
        <div className="hint" style={{ marginTop: 8 }}>These feed the zoning driver automatically. Current auto-score: <b>{L.auto.zoning > 0 ? "+" : ""}{L.auto.zoning}</b>.</div>
      </>)}

      {P("sales", "Sale event history", `${(p.saleHistory || []).length} events`, <>
        <div className="hint">The asset&apos;s own price record. Produces its true CAGR, which is the honest growth anchor — not the suburb median.</div>
        {(p.saleHistory || []).map((s: any, i: number) => (
          <div key={i} className="erow" style={{ gridTemplateColumns: ".9fr .9fr .8fr 28px" }}>
            <Cell rec={p} path="saleHistory" i={i} field="date" update={update} type="date" />
            <Cell rec={p} path="saleHistory" i={i} field="price" update={update} type="number" />
            <Cell rec={p} path="saleHistory" i={i} field="method" update={update} placeholder="Method" />
            {delBtn(update, "saleHistory", i)}
          </div>
        ))}
        <button className="act ghost mini" onClick={() => addItem(update, "saleHistory", { date: "", price: 0, method: "" })}>+ Sale event</button>
        {a && <div className="hint" style={{ marginTop: 8 }}>Asset CAGR <b>{pct(a.cagr)}</b> over {a.years} years · suburb {pct(p.market.suburbCagr)} — {a.cagr < num(p.market.suburbCagr) - 1 ? <b>this asset underperforms its suburb</b> : "in line or ahead"}</div>}
      </>)}

      {P("dem", "Rental demand index", `${D.idx} · ${D.band}`, <>
        <div className="meter" style={{ marginBottom: 10 }}><i style={{ width: `${D.idx}%` }} /></div>
        <div className="r2">{F("Vacancy rate %", "demand.vacancyRate", { step: .1 })}{F("Days to lease", "demand.daysToLease")}</div>
        <div className="r2">{F("Applications / listing", "demand.appsPerListing")}{F("Rent-to-income %", "demand.rentToIncome")}</div>
        <div className="r2">{F("Local pop. growth %", "demand.popGrowthPct", { step: .1 })}{F("Rentals as % of stock", "demand.rentalStock")}</div>
        {F("Derive vacancy allowance from the index", "demand.autoVacancy", { type: "checkbox" })}
        {p.demand.autoVacancy
          ? <div className="hint">Implied vacancy: <b>{D.impliedVacancyWeeks} weeks</b> a year.</div>
          : F("Vacancy (weeks / yr)", "demand.vacancyWeeks", { step: .1 })}
      </>)}

      {isComm
        ? P("inc", "Lease & commercial income", money(num(p.comm.annualRent)), <>
          {F("Annual net rent", "comm.annualRent")}
          <div className="r2">{F("Cap rate %", "comm.capRate", { step: .05 })}{F("Cap rate drift % pa", "comm.capRateShift", { step: .05, meta: "+ = softening" })}</div>
          <div className="r2">{F("Review type", "comm.reviewType", { type: "select", options: ["Fixed %", "CPI", "Market"] })}{F("Review %", "comm.reviewPct", { step: .1 })}</div>
          <div className="r2">{F("Lease years remaining", "comm.leaseYearsRemaining")}{F("WALE (years)", "comm.waleYears", { step: .1 })}</div>
          {F("Net lease (outgoings recoverable)", "comm.netLease", { type: "checkbox" })}
          {F("Outgoings recovery %", "comm.outgoingsRecoveryPct")}
          <div className="eyebrow">Re-letting risk</div>
          <div className="r2">{F("Void on expiry (months)", "comm.reLetVoidMonths")}{F("Incentive on re-let (months)", "comm.reLetIncentiveMonths")}</div>
          {F("Make-good cost", "comm.makeGoodCost")}
          <div className="warn" style={{ marginTop: 8 }}>Commercial vacancy is binary. On expiry the asset goes to <b>zero income</b> while outgoings keep running — a {p.comm.reLetVoidMonths}-month void costs {money(num(p.comm.annualRent) * num(p.comm.reLetVoidMonths) / 12)}.</div>
        </>)
        : P("inc", "Rental income", money(num(p.income.weeklyRent)) + "/wk", <>
          <div className="r2">{F(`Rent / ${C.rentPer}`, "income.weeklyRent")}{F("Other income (pa)", "income.otherIncome")}</div>
          <div className="r2">{F("Management fee %", "income.pmFeePct", { step: .1 })}{F("Letting fee (weeks)", "income.lettingWeeks", { step: .5 })}</div>
          <div className="hint">Gross yield {pct(R.metrics.grossYield)} · net {pct(R.metrics.netYield)}</div>
        </>)}

      {P("entry", "Acquisition costs", money(R.acq.cashIn), <>
        {F("Deposit %", "entry.deposit", { type: "range", min: 0, max: 60, meta: p.entry.deposit + "% · " + money(R.acq.depositCash) })}
        <div className="r2">
          {F("Duty", "entry.dutyMode", { type: "select", options: [["auto", "Auto — " + p.loc.region], ["manual", "Manual"]] })}
          {p.entry.dutyMode === "manual" ? F("Duty amount", "entry.dutyManual")
            : <div className="f"><span className="lab"><span>Calculated</span><b>{money(R.acq.duty)}</b></span><input value={money(R.acq.duty)} disabled readOnly /></div>}
        </div>
        {F("First home buyer", "entry.firstHomeBuyer", { type: "checkbox" })}
        {F("Foreign purchaser", "entry.foreignBuyer", { type: "checkbox" })}
        {F("Capitalise LMI into the loan", "entry.capitaliseLmi", { type: "checkbox" })}
        {R.acq.fhbRelief > 0 && <div className="hint">FHB concession {money(R.acq.fhbRelief)} applied ({p.loc.region} schedule).</div>}
        {R.acq.surcharge > 0 && <div className="hint">Foreign surcharge {money(R.acq.surcharge)}.</div>}
        <div className="eyebrow">Itemised costs</div>
        {(p.entry.items || []).map((it: any, i: number) => (
          <div key={i} className="erow">
            <Cell rec={p} path="entry.items" i={i} field="name" update={update} />
            <Cell rec={p} path="entry.items" i={i} field="amount" update={update} type="number" />
            {delBtn(update, "entry.items", i)}
          </div>
        ))}
        <button className="act ghost mini" onClick={() => addItem(update, "entry.items", { name: "", amount: 0 })}>+ Cost</button>
      </>)}

      {P("loan", "Loan structure", pct(R.rateY1), <>
        {F("Lender", "loan.lenderId", { type: "select", options: [["", "— unassigned —"], ...ctx.lenders.map((l) => [l.id, l.name] as [string, string])] })}
        <div className="r2">
          {F("Repayment", "loan.repaymentType", { type: "select", options: ["Principal & interest", "Interest-only, then P&I", "Interest-only (full term)"] })}
          {F("Term (yrs)", "loan.termYears")}
        </div>
        {p.loan.repaymentType === "Interest-only, then P&I" && F("IO period (yrs)", "loan.ioYears")}
        {F("Rate structure", "loan.rateStructure", { type: "select", options: ["Variable", "Fixed", "Split"] })}
        <div className="r2">
          {F("Variable rate %", "loan.varRate", { step: .01 })}
          {["Fixed", "Split"].includes(p.loan.rateStructure) && F("Fixed rate %", "loan.fixedRate", { step: .01 })}
        </div>
        {["Fixed", "Split"].includes(p.loan.rateStructure) && (
          <div className="r2">{F("Fixed term (yrs)", "loan.fixedYears")}{p.loan.rateStructure === "Split" && F("Fixed portion %", "loan.fixedPortion")}</div>
        )}
        <div className="eyebrow">Rate path</div>
        {(p.loan.ratePath || []).map((r: any, i: number) => (
          <div key={i} className="erow" style={{ gridTemplateColumns: "1fr 1fr 28px" }}>
            <Cell rec={p} path="loan.ratePath" i={i} field="year" update={update} type="number" placeholder="Year" />
            <Cell rec={p} path="loan.ratePath" i={i} field="rate" update={update} type="number" step={0.01} placeholder="Rate %" />
            {delBtn(update, "loan.ratePath", i)}
          </div>
        ))}
        <button className="act ghost mini" onClick={() => addItem(update, "loan.ratePath", { year: 0, rate: 0 })}>+ Rate change</button>
        <div className="eyebrow">Offset & extra</div>
        <div className="r2">{F("Offset balance", "loan.offsetBalance")}{F("Added monthly", "loan.offsetMonthly")}</div>
        {F("Extra repayment / month", "loan.extraMonthly")}
        <div className="eyebrow">Deductibility (purpose test)</div>
        {F("Income-producing share of the loan %", "loan.purposeSplit", { type: "range", min: 0, max: 100, meta: p.loan.purposeSplit + "% deductible" })}
        <div className="hint">Deductibility follows the <b>purpose</b> of the borrowing, not the security. If part of the drawing funded a private purchase, that interest is not deductible.</div>
        <div className="r2">{F("Package fee (pa)", "loan.annualPackageFee")}{F("Discharge fee", "loan.dischargeFee")}</div>
        {R.rolloverShock && <div className="warn" style={{ marginTop: 8 }}><b>Rollover shock, year {R.rolloverShock.year}.</b> Monthly repayment {money(R.rolloverShock.from)} → {money(R.rolloverShock.to)} (+{R.rolloverShock.pct}%).</div>}
      </>)}

      {P("exp", "Expense ledger", money(R.rows[0].opex), <>
        <div className="hint">Each line carries its own escalation rate. Insurance and strata have run well ahead of CPI.</div>
        <div className="erow" style={{ gridTemplateColumns: "1.5fr .7fr .8fr .5fr .5fr 28px", fontSize: 9, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--muted)" }}>
          <span>Item</span><span>Amount</span><span>Frequency</span><span>Mth</span><span>Esc%</span><span></span></div>
        {(p.expenses || []).map((e: any, i: number) => (
          <div key={i} className="erow" style={{ gridTemplateColumns: "1.5fr .7fr .8fr .5fr .5fr 28px" }}>
            <Cell rec={p} path="expenses" i={i} field="name" update={update} />
            <Cell rec={p} path="expenses" i={i} field="amount" update={update} type="number" />
            <select value={e.freq} onChange={(ev) => update((d) => { d.expenses[i].freq = ev.target.value; })}>
              {Object.keys(FREQ).map((f) => <option key={f}>{f}</option>)}
            </select>
            <Cell rec={p} path="expenses" i={i} field="startMonth" update={update} type="number" />
            <Cell rec={p} path="expenses" i={i} field="esc" update={update} type="number" step={0.1} />
            {delBtn(update, "expenses", i)}
          </div>
        ))}
        <button className="act ghost mini" onClick={() => addItem(update, "expenses", { name: "", amount: 0, freq: "Annual", startMonth: 1, esc: 3, ded: true })}>+ Expense</button>
        <div className="eyebrow">Maintenance</div>
        {F("Maintenance % of value pa", "maintPct", { type: "range", min: 0, max: 2, step: .1, meta: p.maintPct + "% · " + money(num(p.market.price) * num(p.maintPct) / 100) })}
      </>)}

      {P("dep", "Depreciation", money(R.rows[0].dep) + " yr 1", <>
        {F("Mode", "dep.mode", { type: "select", options: [["assumed", "Assumed — estimate from build cost"], ["schedule", "Schedule — enter the QS report"]] })}
        {p.dep.mode === "assumed" ? <>
          {F("Construction cost (0 = derive)", "dep.constructionCost")}
          {F("Plant eligible (new / substantially renovated)", "dep.plantEligible", { type: "checkbox" })}
          {p.dep.plantEligible ? F("Plant & equipment value", "dep.plantValue")
            : <div className="hint">Established dwellings acquired after 9 May 2017 cannot claim Division 40 on existing plant.</div>}
        </> : <>
          <div className="eyebrow first">Division 43 — capital works</div>
          {(p.dep.div43 || []).map((l: any, i: number) => (
            <div key={i} className="erow" style={{ gridTemplateColumns: "1.4fr .8fr .6fr 28px" }}>
              <Cell rec={p} path="dep.div43" i={i} field="name" update={update} placeholder="Item" />
              <Cell rec={p} path="dep.div43" i={i} field="amount" update={update} type="number" placeholder="Cost" />
              <Cell rec={p} path="dep.div43" i={i} field="yearsClaimed" update={update} type="number" placeholder="Yrs done" />
              {delBtn(update, "dep.div43", i)}
            </div>
          ))}
          <button className="act ghost mini" onClick={() => addItem(update, "dep.div43", { name: "", amount: 0, yearsClaimed: 0 })}>+ Capital works line</button>
          <div className="eyebrow">Division 40 — plant & equipment</div>
          {(p.dep.div40 || []).map((l: any, i: number) => (
            <div key={i} className="erow" style={{ gridTemplateColumns: "1.3fr .7fr .5fr .8fr 28px" }}>
              <select value={l.name} onChange={(ev) => update((d) => { d.dep.div40[i].name = ev.target.value; })}>
                {TAX_DATA.effectiveLives.map(([n]) => <option key={n}>{n}</option>)}
              </select>
              <Cell rec={p} path="dep.div40" i={i} field="value" update={update} type="number" placeholder="Value" />
              <Cell rec={p} path="dep.div40" i={i} field="life" update={update} type="number" placeholder="Life" />
              <select value={l.method} onChange={(ev) => update((d) => { d.dep.div40[i].method = ev.target.value; })}>
                <option>Diminishing value</option><option>Prime cost</option>
              </select>
              {delBtn(update, "dep.div40", i)}
            </div>
          ))}
          <button className="act ghost mini" onClick={() => addItem(update, "dep.div40", { name: TAX_DATA.effectiveLives[0][0], value: 0, life: 10, method: "Diminishing value" })}>+ Plant item</button>
        </>}
        <div className="eyebrow">Scrapping</div>
        <div className="r2">{F("Scrap in year", "dep.scrapYear")}{F("Residual value scrapped", "dep.scrapValue")}</div>
        <div className="hint">When a renovation removes assets, the undeducted value of what&apos;s torn out is immediately deductible. Routinely missed.</div>
      </>)}

      {P("taxp", "Tax & land tax", pct(R.tax.rate, 1), <>
        <div className="note" style={{ marginBottom: 10 }}>{R.tax.entity.name} — {R.tax.entity.type}. {R.tax.note}</div>
        {F("Land tax", "tax.landTaxMode", { type: "select", options: [["auto", "Auto — portfolio aggregated"], ["manual", "Manual override"]] })}
        {p.tax.landTaxMode === "manual" ? F("Land tax amount", "tax.landTaxManual") : F("Land value override (0 = land size × rate)", "tax.landValueManual")}
        <div className="hint">Assessed: <b>{money(portfolioLandTax(1, ctx).byProp[p.id] || 0)}</b> · standalone would be {money(standaloneLandTax(p, 1))}</div>
        {F("PAYG withholding variation", "tax.paygVariation", { type: "checkbox" })}
        <div className="hint">Spreads the refund across the year instead of a lump sum at tax time. Changes weekly affordability materially.</div>
      </>)}

      {P("ev", "Journey — events & infrastructure", `${(p.events || []).length} / ${(p.projects || []).length}`, <>
        <div className="eyebrow first">Value-add events</div>
        {(p.events || []).map((e: any, i: number) => (
          <div key={i} className="erow" style={{ gridTemplateColumns: "1.2fr .5fr .7fr .5fr .5fr 28px" }}>
            <Cell rec={p} path="events" i={i} field="name" update={update} placeholder="Name" />
            <Cell rec={p} path="events" i={i} field="year" update={update} type="number" placeholder="Yr" />
            <Cell rec={p} path="events" i={i} field="cost" update={update} type="number" placeholder="Cost" />
            <Cell rec={p} path="events" i={i} field="upliftPct" update={update} type="number" step={0.1} placeholder="Uplift%" />
            <Cell rec={p} path="events" i={i} field="rentUplift" update={update} type="number" placeholder="Rent+" />
            {delBtn(update, "events", i)}
          </div>
        ))}
        <button className="act ghost mini" onClick={() => addItem(update, "events", { name: "", year: 1, cost: 0, upliftPct: 0, rentUplift: 0, status: "Planned" })}>+ Event</button>
        <div className="eyebrow">Infrastructure</div>
        {(p.projects || []).map((x: any, i: number) => (
          <div key={i} className="erow" style={{ gridTemplateColumns: "1.4fr .5fr .6fr 28px" }}>
            <Cell rec={p} path="projects" i={i} field="name" update={update} />
            <Cell rec={p} path="projects" i={i} field="year" update={update} type="number" />
            <Cell rec={p} path="projects" i={i} field="impact" update={update} type="number" step={0.1} />
            {delBtn(update, "projects", i)}
          </div>
        ))}
        <button className="act ghost mini" onClick={() => addItem(update, "projects", { name: "", year: 1, impact: 0, funded: true })}>+ Project</button>
      </>)}

      {P("plan", "Planning controls", `${p.planning.fsr} FSR`, <>
        <div className="r2">{F("FSR", "planning.fsr", { step: .05 })}{F("Height limit (m)", "planning.heightLimit", { step: .1 })}</div>
        <div className="r2">{F("Min lot size", "planning.minLotSize")}{F("Site coverage %", "planning.siteCoverage")}</div>
        <div className="r2">{F("Front setback", "planning.frontSetback")}{F("Rear setback", "planning.rearSetback")}</div>
        {F("DA status", "planning.daStatus", { type: "select", options: ["None", "Pre-lodgement", "Lodged", "RFI", "Determined", "Refused", "Appeal"] })}
        {(() => {
          const gfa = num(p.phys.landSize) * num(p.planning.fsr);
          const lots = num(p.planning.minLotSize) > 0 ? Math.floor(num(p.phys.landSize) / num(p.planning.minLotSize)) : 0;
          return <div className="hint">Developable GFA ≈ <b>{Math.round(gfa)} {C.area}</b> · theoretical lot yield <b>{lots}</b>{lots > 1 ? " — subdivision may be possible" : ""}</div>;
        })()}
      </>)}

      {P("mod", "Modelling", `${p.horizon}y`, <>
        <div className="r2">{F("Horizon (yrs)", "horizon", { min: 1, max: 40 })}{F("Hurdle IRR %", "hurdle", { step: .5 })}</div>
        <div className="r2">{F("Selling agent %", "agentFeePct", { step: .1 })}{F("Sale legals", "sellLegals")}</div>
      </>)}

      {P("drv", "Growth drivers", `${L.adjCap >= 0 ? "+" : ""}${L.adjCap.toFixed(2)}pp`,
        GROUPS.map((g) => (
          <div key={g}>
            <div className={`eyebrow ${g === GROUPS[0] ? "first" : ""}`}>{g}</div>
            {L.rows.filter((r: any) => r.group === g).map((r: any) => (
              <div key={r.id} className="drv">
                <div className="drv-top">
                  <div><div className="drv-name">{r.label}{r.isAuto && <span className="auto">AUTO</span>}</div>
                    <div className="drv-hint">{r.hint}</div></div>
                  <div className="drv-val">{r.score > 0 ? "+" : ""}{r.score} → {(r.cap >= 0 ? "+" : "")}{(r.cap * 100).toFixed(0)}bp</div>
                </div>
                {!r.isAuto && <input type="range" min={-2} max={2} step={1} value={r.score}
                  onChange={(ev) => update((d) => { d.scores = d.scores || {}; d.scores[r.id] = Number(ev.target.value); })} />}
              </div>
            ))}
          </div>
        )))}
    </>
  );
}
