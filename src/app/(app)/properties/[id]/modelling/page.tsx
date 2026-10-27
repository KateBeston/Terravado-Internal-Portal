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
  const m = d.modelling ?? {};
  const hasDeep = !!(m.expenses?.length || m.capex?.length || m.repaymentType || m.otherPurchaseCosts !== undefined || m.plantValue !== undefined);

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
          Open this property in the Modeller with its record carried across — address, price, rent
          {hasDeep ? ", and its deep financials (expenses, loan structure, depreciation, capex)" : ""}.
          Pick the client there to assess it against their position, then save the run to their file.
        </p>
        {!hasDeep && (
          <p className="muted" style={{ fontSize: 12 }}>
            No deep financials saved yet — the model will use standard assumptions. Add them on the{" "}
            <Link href={`/properties/${p.id}/financials`}>Financials tab</Link> for a full-depth run.
          </p>
        )}
        <Link className="btn" href={`/modeller?propertyId=${p.id}`}>Open in Modeller →</Link>
      </div>
    </>
  );
}
