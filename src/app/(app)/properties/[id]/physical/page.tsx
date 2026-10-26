import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { getProperty } from "@/lib/domain/service";
import { savePropertyDetailsAction } from "@/app/actions";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
const v = (x?: number | string) => (x === undefined || x === null || x === "" ? "" : String(x));

export default async function PropertyPhysicalTab({ params }: { params: { id: string } }) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const p = await getProperty(tenantId, params.id);
  if (!p) notFound();
  const ph = p.details?.physical ?? {};

  return (
    <div className="panel">
      <h2>Physical attributes</h2>
      <form action={savePropertyDetailsAction}>
        <input type="hidden" name="id" value={p.id} />
        <input type="hidden" name="section" value="physical" />
        <div className="row">
          <label className="f"><span>Dwelling type</span><input name="type" defaultValue={v(ph.type)} placeholder="House / Unit / Townhouse" /></label>
          <label className="f"><span>Construction</span><input name="construction" defaultValue={v(ph.construction)} placeholder="Brick veneer" /></label>
        </div>
        <div className="row">
          <label className="f"><span>Bedrooms</span><input name="beds" inputMode="numeric" defaultValue={v(ph.beds)} /></label>
          <label className="f"><span>Bathrooms</span><input name="baths" inputMode="numeric" defaultValue={v(ph.baths)} /></label>
        </div>
        <div className="row">
          <label className="f"><span>Car spaces</span><input name="cars" inputMode="numeric" defaultValue={v(ph.cars)} /></label>
          <label className="f"><span>Build year</span><input name="buildYear" inputMode="numeric" defaultValue={v(ph.buildYear)} /></label>
        </div>
        <div className="row">
          <label className="f"><span>Land size (m²)</span><input name="landSize" inputMode="numeric" defaultValue={v(ph.landSize)} /></label>
          <label className="f"><span>Internal area (m²)</span><input name="internalArea" inputMode="numeric" defaultValue={v(ph.internalArea)} /></label>
        </div>
        <label className="f"><span>Notes</span><textarea name="notes" rows={2} defaultValue={v(ph.notes)} /></label>
        <button className="btn" type="submit">Save physical</button>
      </form>
    </div>
  );
}
