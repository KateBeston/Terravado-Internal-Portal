import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { getEntity, listProperties } from "@/lib/domain/service";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";
const money = (v?: number | null) => (v === undefined || v === null ? "—" : "$" + Math.round(v).toLocaleString("en-AU"));

export default async function EntityPropertiesTab({ params }: { params: { id: string } }) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const e = await getEntity(tenantId, params.id);
  if (!e) notFound();
  const held = (await listProperties(tenantId)).filter((p) => p.entityId === e.id);
  const total = held.reduce((s, p) => s + (p.price ?? 0), 0);

  return (
    <>
      <p className="sub">Properties held by {e.name}. {held.length} on record · {money(total)} total. Attribute a property to this entity from the property&apos;s Overview tab.</p>

      <div className="panel">
        <h2>Properties held</h2>
        <table>
          <thead><tr><th>Address</th><th>State</th><th>Price</th><th>Status</th></tr></thead>
          <tbody>
            {held.map((p) => (
              <tr key={p.id}>
                <td><Link href={`/properties/${p.id}`}><strong>{p.address}</strong></Link></td>
                <td>{p.state ?? "—"}</td>
                <td>{money(p.price)}</td>
                <td><span className="badge">{p.status ?? "—"}</span></td>
              </tr>
            ))}
            {held.length === 0 && <tr><td colSpan={4} className="muted">No properties attributed to this entity yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
