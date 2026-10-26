import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { getProperty } from "@/lib/domain/service";
import { savePropertyDetailsAction } from "@/app/actions";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PropertyModellingTab({ params }: { params: { id: string } }) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const p = await getProperty(tenantId, params.id);
  if (!p) notFound();
  const d = p.details ?? {};

  const q = new URLSearchParams();
  q.set("address", p.address);
  if (p.state) q.set("state", p.state);
  if (p.price) q.set("price", String(p.price));
  if (d.weeklyRent) q.set("weeklyRent", String(d.weeklyRent));
  if (d.locality?.annualGrowthPct) q.set("growthPct", String(d.locality.annualGrowthPct));

  return (
    <>
      <div className="panel">
        <h2>Rent assumption</h2>
        <form action={savePropertyDetailsAction}>
          <input type="hidden" name="id" value={p.id} />
          <input type="hidden" name="section" value="rent" />
          <label className="f"><span>Expected weekly rent</span><input name="weeklyRent" inputMode="numeric" defaultValue={d.weeklyRent ? String(d.weeklyRent) : ""} placeholder="720" /></label>
          <button className="btn" type="submit">Save rent</button>
        </form>
      </div>

      <div className="panel">
        <h2>Run the model</h2>
        <p className="muted" style={{ marginTop: -4 }}>
          Open this property in the Modeller with its address, price{d.weeklyRent ? ", rent" : ""}
          {d.locality?.annualGrowthPct ? " and suburb growth" : ""} carried across. Pick the client there to assess it
          against their position, then save the run to their file.
        </p>
        <Link className="btn" href={`/modeller?${q.toString()}`}>Open in Modeller →</Link>
      </div>
    </>
  );
}
