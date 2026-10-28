import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { getProperty } from "@/lib/domain/service";
import { savePropertyModellingAction, addPropertyListItemAction, removePropertyListItemAction } from "@/app/actions";
import { modelDepreciation, type DepInput } from "@/lib/engine/depreciation";
import { TAX_DATA } from "@/lib/engine/tax-data";
import { DIV40_METHODS } from "@/lib/domain/types";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";
const v = (x?: number | string) => (x === undefined || x === null || x === "" ? "" : String(x));
const money = (x?: number) => (x === undefined || x === null ? "—" : "$" + Math.round(x).toLocaleString("en-AU"));
const LIVES: [string, number][] = TAX_DATA.effectiveLives as [string, number][];

export default async function PropertyDepreciationTab({ params, searchParams }: { params: { id: string }; searchParams: { rate?: string } }) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const p = await getProperty(tenantId, params.id);
  if (!p) notFound();
  const d = p.details ?? {};
  const m = d.modelling ?? {};
  const phys = d.physical ?? {};
  const mode = (m.depMode as DepInput["mode"]) ?? "assumed";
  const div43 = m.div43 ?? [];
  const div40 = m.div40 ?? [];
  const rate = Number(searchParams.rate ?? "39") || 39;

  const dep = modelDepreciation({
    mode, constructionCost: m.constructionCost, plantValue: m.plantValue, buildRate: m.buildRate,
    buildYear: phys.buildYear, internalArea: phys.internalArea,
    div43, div40, scrapYear: m.scrapYear, scrapValue: m.scrapValue,
  }, 15);
  const taxSaving = (x: number) => x * rate / 100;

  return (
    <>
      <p className="muted" style={{ marginTop: -6 }}>
        Div 43 capital works (the building, 2.5% p.a. over 40 years) and Div 40 plant &amp; equipment (removable assets over
        their effective life). Use <strong>Assumed</strong> for a quick estimate, or <strong>Schedule</strong> to enter a quantity
        surveyor&apos;s line items. These flow into the Modeller&apos;s projection and after-tax position.
      </p>

      <div className="panel">
        <h2>Basis</h2>
        <form action={savePropertyModellingAction}>
          <input type="hidden" name="id" value={p.id} /><input type="hidden" name="section" value="dep" />
          <div className="row">
            <label className="f"><span>Depreciation basis</span>
              <select name="depMode" defaultValue={mode}>
                <option value="assumed">Assumed (estimate)</option>
                <option value="schedule">Schedule (QS report)</option>
                <option value="none">None</option>
              </select>
            </label>
            <label className="f"><span>Construction cost (Div 43 basis)</span><input name="constructionCost" inputMode="numeric" defaultValue={v(m.constructionCost)} placeholder="e.g. 320,000" /></label>
          </div>
          <div className="row">
            <label className="f"><span>Plant &amp; equipment value (assumed)</span><input name="plantValue" inputMode="numeric" defaultValue={v(m.plantValue)} placeholder="18,000" /></label>
            <label className="f"><span>Build rate $/m² (if no construction cost)</span><input name="buildRate" inputMode="numeric" defaultValue={v(m.buildRate)} placeholder="2,900" /></label>
          </div>
          <div className="row">
            <label className="f"><span>Scrapping — year</span><input name="scrapYear" inputMode="numeric" defaultValue={v(m.scrapYear)} placeholder="e.g. 4 (on a reno)" /></label>
            <label className="f"><span>Scrapping — residual value written off</span><input name="scrapValue" inputMode="numeric" defaultValue={v(m.scrapValue)} /></label>
          </div>
          <button className="btn" type="submit">Save basis</button>
        </form>
        <p className="muted" style={{ fontSize: 12 }}>
          Build year <strong>{phys.buildYear ?? "—"}</strong> and internal area <strong>{phys.internalArea ? phys.internalArea + " m²" : "—"}</strong> come from the{" "}
          <Link href={`/properties/${p.id}/physical`}>Physical tab</Link>. Div 43 needs construction after 15 Sep 1987.
          {mode === "assumed" && !m.constructionCost && !(phys.internalArea && m.buildRate) && <> No construction cost or area×rate yet, so Div 43 reads nil.</>}
        </p>
      </div>

      <div className="panel">
        <h2>Div 43 — capital works {mode !== "schedule" && <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>(used when basis = Schedule)</span>}</h2>
        <table>
          <thead><tr><th>Item</th><th>Amount</th><th>Years already claimed</th><th></th></tr></thead>
          <tbody>
            {div43.map((l, i) => (
              <tr key={i}>
                <td className="lbl">{l.name ?? "—"}</td><td>{money(l.amount)}</td><td>{l.yearsClaimed ?? 0}</td>
                <td>
                  <form action={removePropertyListItemAction}>
                    <input type="hidden" name="id" value={p.id} /><input type="hidden" name="list" value="div43" /><input type="hidden" name="index" value={i} />
                    <button className="x" type="submit" aria-label="Remove">×</button>
                  </form>
                </td>
              </tr>
            ))}
            {div43.length === 0 && <tr><td colSpan={4} className="muted">No capital-works items.</td></tr>}
          </tbody>
        </table>
        <form action={addPropertyListItemAction} style={{ marginTop: 12 }}>
          <input type="hidden" name="id" value={p.id} /><input type="hidden" name="list" value="div43" />
          <div className="row">
            <label className="f"><span>Item</span><input name="name" placeholder="Building structure" /></label>
            <label className="f"><span>Amount</span><input name="amount" inputMode="numeric" placeholder="320,000" /></label>
            <label className="f"><span>Years already claimed</span><input name="yearsClaimed" inputMode="numeric" placeholder="0" /></label>
          </div>
          <button className="btn" type="submit">Add capital-works item</button>
        </form>
      </div>

      <div className="panel">
        <h2>Div 40 — plant &amp; equipment {mode !== "schedule" && <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>(used when basis = Schedule)</span>}</h2>
        <table>
          <thead><tr><th>Asset</th><th>Value</th><th>Effective life</th><th>Method</th><th></th></tr></thead>
          <tbody>
            {div40.map((l, i) => (
              <tr key={i}>
                <td className="lbl">{l.name ?? "—"}</td><td>{money(l.value)}</td><td>{l.life ? l.life + " yrs" : "—"}</td><td>{l.method ?? "—"}</td>
                <td>
                  <form action={removePropertyListItemAction}>
                    <input type="hidden" name="id" value={p.id} /><input type="hidden" name="list" value="div40" /><input type="hidden" name="index" value={i} />
                    <button className="x" type="submit" aria-label="Remove">×</button>
                  </form>
                </td>
              </tr>
            ))}
            {div40.length === 0 && <tr><td colSpan={5} className="muted">No plant &amp; equipment items.</td></tr>}
          </tbody>
        </table>
        <form action={addPropertyListItemAction} style={{ marginTop: 12 }}>
          <input type="hidden" name="id" value={p.id} /><input type="hidden" name="list" value="div40" />
          <div className="row">
            <label className="f"><span>Asset</span>
              <input name="name" list="dep-lives" placeholder="Air conditioner (split)" />
              <datalist id="dep-lives">{LIVES.map(([nm]) => <option key={nm} value={nm} />)}</datalist>
            </label>
            <label className="f"><span>Value</span><input name="value" inputMode="numeric" placeholder="3,200" /></label>
          </div>
          <div className="row">
            <label className="f"><span>Effective life (years)</span><input name="life" inputMode="numeric" placeholder="10" /></label>
            <label className="f"><span>Method</span><select name="method" defaultValue="Diminishing value">{DIV40_METHODS.map((x) => <option key={x}>{x}</option>)}</select></label>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: -2 }}>
            Typical effective lives: {LIVES.slice(0, 6).map(([nm, yr]) => `${nm} ${yr}y`).join(" · ")}…
          </p>
          <button className="btn" type="submit">Add plant &amp; equipment</button>
        </form>
      </div>

      <div className="panel">
        <h2>Depreciation schedule</h2>
        <div className="cards">
          <div className="card"><div className="k">Year 1 deduction</div><div className="v">{money(dep.firstYear)}</div></div>
          <div className="card"><div className="k">First 5 years</div><div className="v">{money(dep.firstFiveTotal)}</div></div>
          <div className="card"><div className="k">First 15 years</div><div className="v">{money(dep.horizonTotal)}</div></div>
          <div className="card"><div className="k">Year 1 tax saving @ {rate}%</div><div className="v" style={{ color: "#1f6f54" }}>{money(taxSaving(dep.firstYear))}</div></div>
        </div>
        <form method="get" style={{ margin: "10px 0" }}>
          <label className="f" style={{ maxWidth: 260 }}><span>Marginal tax rate (incl. Medicare)</span>
            <select name="rate" defaultValue={String(rate)}>
              <option value="21">21% (to $45k)</option>
              <option value="34.5">34.5% ($45k–$135k)</option>
              <option value="39">39% ($135k–$190k)</option>
              <option value="47">47% ($190k+)</option>
            </select>
          </label>
          <button className="btn" type="submit">Apply rate</button>
        </form>
        <table>
          <thead><tr><th>Year</th><th>Div 43</th><th>Div 40</th><th>Scrapping</th><th>Total deduction</th><th>Tax saving @ {rate}%</th></tr></thead>
          <tbody>
            {dep.rows.map((r) => (
              <tr key={r.year}>
                <td>{r.year}</td><td>{money(r.div43)}</td><td>{money(r.div40)}</td>
                <td className="muted">{r.scrap ? money(r.scrap) : "—"}</td>
                <td><strong>{money(r.total)}</strong></td>
                <td style={{ color: "#1f6f54" }}>{money(taxSaving(r.total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ fontSize: 12 }}>
          Div 40 uses diminishing value by default (declines each year); Div 43 is straight-line at 2.5%. Since 1 July 2017,
          second-hand plant &amp; equipment in residential property is generally not deductible for the buyer — a QS schedule
          splits this out, which is why Schedule mode is the accurate basis. Not tax advice.
        </p>
      </div>
    </>
  );
}
