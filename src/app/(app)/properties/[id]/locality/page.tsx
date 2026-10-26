import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { getProperty } from "@/lib/domain/service";
import { savePropertyDetailsAction, pullLocalityAction } from "@/app/actions";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
const v = (x?: number | string) => (x === undefined || x === null || x === "" ? "" : String(x));

export default async function PropertyLocalityTab({ params }: { params: { id: string } }) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const p = await getProperty(tenantId, params.id);
  if (!p) notFound();
  const l = p.details?.locality ?? {};

  return (
    <>
      <div className="panel">
        <h2>Locality &amp; suburb</h2>
        <form action={savePropertyDetailsAction}>
          <input type="hidden" name="id" value={p.id} />
          <input type="hidden" name="section" value="locality" />
          <div className="row">
            <label className="f"><span>Suburb</span><input name="suburb" defaultValue={v(l.suburb)} /></label>
            <label className="f"><span>Locality / LGA</span><input name="locality" defaultValue={v(l.locality)} /></label>
          </div>
          <div className="row">
            <label className="f"><span>State / region</span><input name="region" defaultValue={v(l.region) || (p.state ?? "")} /></label>
            <label className="f"><span>Postcode</span><input name="postcode" defaultValue={v(l.postcode)} /></label>
          </div>
          <div className="row">
            <label className="f"><span>Suburb median price</span><input name="suburbMedian" inputMode="numeric" defaultValue={v(l.suburbMedian)} /></label>
            <label className="f"><span>Median weekly rent</span><input name="suburbMedianRent" inputMode="numeric" defaultValue={v(l.suburbMedianRent)} /></label>
          </div>
          <div className="row">
            <label className="f"><span>Vacancy rate %</span><input name="vacancyPct" inputMode="numeric" defaultValue={v(l.vacancyPct)} /></label>
            <label className="f"><span>Days to lease</span><input name="daysToLease" inputMode="numeric" defaultValue={v(l.daysToLease)} /></label>
          </div>
          <div className="row">
            <label className="f"><span>Population growth % p.a.</span><input name="popGrowthPct" inputMode="numeric" defaultValue={v(l.popGrowthPct)} /></label>
            <label className="f"><span>Suburb growth % p.a.</span><input name="annualGrowthPct" inputMode="numeric" defaultValue={v(l.annualGrowthPct)} /></label>
          </div>
          <label className="f"><span>Transport &amp; amenity</span><textarea name="transport" rows={2} defaultValue={v(l.transport)} placeholder="Metro 1.2km, schools, retail strip…" /></label>
          <label className="f"><span>Notes</span><textarea name="notes" rows={2} defaultValue={v(l.notes)} /></label>
          <button className="btn" type="submit">Save locality</button>
        </form>
      </div>

      <div className="panel">
        <h2>Data provider</h2>
        <p className="muted" style={{ marginTop: -4 }}>
          Pull suburb figures (median, vacancy, growth) from the connected property-data provider.
          {l.source ? <> Last source: <strong>{l.source}</strong>{l.asAt ? ` · as at ${l.asAt}` : ""}.</> : " Not pulled yet."}
        </p>
        <form action={pullLocalityAction}>
          <input type="hidden" name="id" value={p.id} />
          <button className="btn ghost" type="submit">Pull suburb data</button>
        </form>
        <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
          The active provider is the built-in indicative stub until CoreLogic / Valuer-General / ABS keys are
          configured — pulled values are placeholders, not sourced data, and are stamped with their source.
        </p>
      </div>
    </>
  );
}
