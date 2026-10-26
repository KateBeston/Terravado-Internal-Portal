import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { getProperty } from "@/lib/domain/service";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const money = (v?: number | null) => (v === undefined || v === null ? "—" : "$" + Math.round(v).toLocaleString("en-AU"));

export default async function PropertyOverview({ params }: { params: { id: string } }) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const p = await getProperty(tenantId, params.id);
  if (!p) notFound();

  const d = p.details ?? {};
  const t = d.title ?? {}; const l = d.locality ?? {}; const ph = d.physical ?? {};
  const sales = d.sales ?? []; const easements = t.easements ?? []; const encumbrances = t.encumbrances ?? [];
  const lastSale = sales.filter((s) => s.date).sort((a, b) => (a.date! < b.date! ? 1 : -1))[0];

  return (
    <>
      <div className="cards">
        <div className="card"><div className="k">Zoning</div><div className="v">{t.zoning ?? "—"}</div></div>
        <div className="card"><div className="k">Land size</div><div className="v">{ph.landSize ? `${ph.landSize} m²` : "—"}</div></div>
        <div className="card"><div className="k">Suburb median</div><div className="v">{money(l.suburbMedian)}</div></div>
        <div className="card"><div className="k">Last sale</div><div className="v">{lastSale ? money(lastSale.price) : "—"}</div></div>
      </div>

      <div className="panel">
        <h2>This record</h2>
        <table>
          <tbody>
            <tr><td className="muted">Title</td><td>{t.titleRef || t.lotDp || "Not entered"}</td>
                <td className="muted">Easements / encumbrances</td><td>{easements.length} / {encumbrances.length}</td></tr>
            <tr><td className="muted">Locality</td><td>{[l.suburb, l.region, l.postcode].filter(Boolean).join(" ") || "Not entered"}</td>
                <td className="muted">Sales recorded</td><td>{sales.length}</td></tr>
            <tr><td className="muted">Dwelling</td><td>{ph.type ? `${ph.type}${ph.beds ? `, ${ph.beds} bed` : ""}` : "Not entered"}</td>
                <td className="muted">Weekly rent</td><td>{d.weeklyRent ? `$${d.weeklyRent}/wk` : "Not entered"}</td></tr>
          </tbody>
        </table>
        <div style={{ marginTop: 14 }}>
          <Link className="btn" href={`/properties/${p.id}/modelling`}>Model this property →</Link>
        </div>
      </div>

      <p className="muted" style={{ fontSize: 12 }}>
        Each tab holds one part of the record. Title, locality, physical and sales can be entered by hand now;
        the Locality tab can also pull suburb figures from the connected data provider.
      </p>
    </>
  );
}
