import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { getProperty, listEntities } from "@/lib/domain/service";
import { disposalCgt, cgtEntityOf, type CgtEntity } from "@/lib/engine/cgt";
import { COUNTRIES } from "@/lib/engine/tax-data";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
const money = (v?: number | null) => (v === undefined || v === null ? "—" : (v < 0 ? "-$" : "$") + Math.abs(Math.round(v)).toLocaleString("en-AU"));
const asStr = (x?: string | string[]) => (Array.isArray(x) ? x[0] : x) ?? "";
const asNum = (x?: string | string[], d?: number) => { const v = Number(asStr(x).replace(/[,$\s]/g, "")); return isFinite(v) && asStr(x) !== "" ? v : d; };
const ENTITIES: CgtEntity[] = ["individual", "joint", "trust", "company", "smsf"];
const RATES = [17, 32, 39, 47];

export default async function PropertySaleTab({ params, searchParams }: { params: { id: string }; searchParams: Record<string, string | string[] | undefined> }) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const p = await getProperty(tenantId, params.id);
  if (!p) notFound();

  const entities = await listEntities(tenantId);
  const owner = p.entityId ? entities.find((e) => e.id === p.entityId) : undefined;
  const state = p.state || p.details?.locality?.region || "NSW";
  const purchasePrice = p.price ?? 0;
  const dutyDefault = Math.round(COUNTRIES.AU.duty(purchasePrice, state));

  // Inputs (GET what-if), defaulted from the record.
  const entityType = (asStr(searchParams.entity) as CgtEntity) || cgtEntityOf(owner?.kind);
  const salePrice = asNum(searchParams.salePrice, purchasePrice)!;
  const yearsHeld = asNum(searchParams.years, 10)!;
  const sellingCostsPct = asNum(searchParams.sellPct, 2.2)!;
  const acquisitionCosts = asNum(searchParams.acq, dutyDefault + 2000)!;
  const capitalImprovements = asNum(searchParams.improv, 0)!;
  const capitalWorksClaimed = asNum(searchParams.div43, 0)!;
  const marginalRatePct = asNum(searchParams.rate, 39)!;
  const priorCapitalLosses = asNum(searchParams.losses, 0)!;
  const isMainResidence = asStr(searchParams.ppor) === "on";
  const exemptFraction = (asNum(searchParams.exempt, 100)! ) / 100;
  const foreignResident = asStr(searchParams.foreign) === "on";

  const r = disposalCgt({
    entityType, salePrice, sellingCosts: Math.round(salePrice * sellingCostsPct / 100),
    purchasePrice, acquisitionCosts, capitalImprovements, capitalWorksClaimed,
    heldMonths: Math.round(yearsHeld * 12), marginalRatePct, priorCapitalLosses,
    isMainResidence, mainResidenceExemptFraction: exemptFraction, foreignResident,
  });

  return (
    <>
      <p className="muted" style={{ marginTop: -6 }}>
        Model the CGT on selling this property by entity type — cost base, the discount, exemptions, carried losses and (for
        foreign residents) the 15% withholding. A what-if; defaults come from the record. Not tax advice.
      </p>

      <div className="panel">
        <h2>Sale assumptions</h2>
        <form method="GET">
          <div className="row">
            <label className="f"><span>Expected sale price</span><input name="salePrice" inputMode="numeric" defaultValue={salePrice} /></label>
            <label className="f"><span>Years held</span><input name="years" inputMode="numeric" defaultValue={yearsHeld} /></label>
            <label className="f"><span>Selling costs %</span><input name="sellPct" inputMode="numeric" defaultValue={sellingCostsPct} /></label>
          </div>
          <div className="row">
            <label className="f"><span>Owner / entity</span>
              <select name="entity" defaultValue={entityType}>{ENTITIES.map((e) => <option key={e} value={e}>{e[0].toUpperCase() + e.slice(1)}</option>)}</select>
            </label>
            <label className="f"><span>Marginal rate % (incl. Medicare)</span>
              <select name="rate" defaultValue={marginalRatePct}>{RATES.map((x) => <option key={x} value={x}>{x}%</option>)}</select>
            </label>
          </div>
          <div className="row">
            <label className="f"><span>Acquisition costs (duty + legals)</span><input name="acq" inputMode="numeric" defaultValue={acquisitionCosts} /></label>
            <label className="f"><span>Capital improvements</span><input name="improv" inputMode="numeric" defaultValue={capitalImprovements} /></label>
          </div>
          <div className="row">
            <label className="f"><span>Capital-works (Div 43) claimed</span><input name="div43" inputMode="numeric" defaultValue={capitalWorksClaimed} /></label>
            <label className="f"><span>Carried-forward capital losses</span><input name="losses" inputMode="numeric" defaultValue={priorCapitalLosses} /></label>
          </div>
          <div className="row">
            <label className="f" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><input type="checkbox" name="ppor" defaultChecked={isMainResidence} style={{ width: "auto" }} /><span style={{ margin: 0 }}>Was a main residence</span></label>
            {isMainResidence && <label className="f"><span>Exempt %</span><input name="exempt" inputMode="numeric" defaultValue={Math.round(exemptFraction * 100)} /></label>}
            <label className="f" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><input type="checkbox" name="foreign" defaultChecked={foreignResident} style={{ width: "auto" }} /><span style={{ margin: 0 }}>Foreign resident</span></label>
          </div>
          <button className="btn" type="submit">Calculate CGT</button>
        </form>
      </div>

      <div className="cards">
        <div className="card"><div className="k">Gross capital gain</div><div className="v">{money(r.grossGain)}</div><div className="k">proceeds − cost base</div></div>
        <div className="card"><div className="k">Taxable gain</div><div className="v">{money(r.taxableGain)}</div><div className="k">after {r.discountPct}% discount</div></div>
        <div className="card"><div className="k">CGT payable</div><div className="v" style={{ color: "#b03a2e" }}>{money(r.cgtPayable)}</div><div className="k">eff. {r.effectiveCgtRatePct}% of gain</div></div>
        <div className="card"><div className="k">Net proceeds after CGT</div><div className="v" style={{ color: "#1f6f54" }}>{money(r.netProceedsAfterCgt)}</div></div>
      </div>

      <div className="panel">
        <h2>Breakdown</h2>
        <table>
          <tbody>
            <tr><td className="lbl">Sale price</td><td>{money(salePrice)}</td></tr>
            <tr><td className="lbl">Less selling costs ({sellingCostsPct}%)</td><td>{money(-(salePrice - r.capitalProceeds))}</td></tr>
            <tr style={{ fontWeight: 600 }}><td>Capital proceeds</td><td>{money(r.capitalProceeds)}</td></tr>
            <tr><td className="lbl">Purchase price</td><td>{money(purchasePrice)}</td></tr>
            <tr><td className="lbl">+ Acquisition costs</td><td>{money(acquisitionCosts)}</td></tr>
            <tr><td className="lbl">+ Capital improvements</td><td>{money(capitalImprovements)}</td></tr>
            <tr><td className="lbl">− Capital-works (Div 43) claimed</td><td>{money(-capitalWorksClaimed)}</td></tr>
            <tr style={{ fontWeight: 600 }}><td>Cost base</td><td>{money(r.costBase)}</td></tr>
            <tr style={{ fontWeight: 600 }}><td>Gross capital gain</td><td>{money(r.grossGain)}</td></tr>
            {r.mainResidenceExempt > 0 && <tr><td className="lbl">Less main residence exemption</td><td>{money(-r.mainResidenceExempt)}</td></tr>}
            {r.lossesApplied > 0 && <tr><td className="lbl">Less carried-forward losses</td><td>{money(-r.lossesApplied)}</td></tr>}
            <tr><td className="lbl">Less {r.discountPct}% CGT discount</td><td>{money(-r.discountAmount)}</td></tr>
            <tr style={{ fontWeight: 600 }}><td>Taxable capital gain</td><td>{money(r.taxableGain)}</td></tr>
            <tr style={{ fontWeight: 600 }}><td>CGT payable</td><td>{money(r.cgtPayable)}</td></tr>
            {r.frcgwWithheld > 0 && <tr><td className="lbl">FRCGW withheld at settlement (15%)</td><td>{money(r.frcgwWithheld)}</td></tr>}
            {r.capitalLoss > 0 && <tr style={{ fontWeight: 600 }}><td>Capital loss (carries forward)</td><td>{money(r.capitalLoss)}</td></tr>}
          </tbody>
        </table>
        <ul style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>{r.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
        <p className="muted" style={{ fontSize: 12 }}>
          50% discount for individuals/trusts and 1/3 for SMSFs held &gt;12 months; none for companies or foreign residents.
          Foreign-resident sales also have 15% withheld at settlement (from 1 Jan 2025). General information, not tax advice.
        </p>
      </div>
    </>
  );
}
