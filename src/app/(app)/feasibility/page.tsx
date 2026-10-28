import { requireUser, requireCapability } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { listFeasibilities, getFeasibility } from "@/lib/domain/service";
import { createFeasibilityAction } from "@/app/actions";
import FeasibilityEditor from "@/components/FeasibilityEditor";
import Link from "next/link";

export const dynamic = "force-dynamic";

/* Development feasibility studies — persisted port of the retired Workspace
   Feasibility view. Gated on the "stock" capability (advisor / developer tooling). */
export default async function FeasibilityPage({ searchParams }: { searchParams: { id?: string } }) {
  await requireUser();
  await requireCapability("stock");
  const { tenantId } = await getCurrentTenant();

  const feasibilities = await listFeasibilities(tenantId);
  const selectedId = searchParams.id && feasibilities.some((x) => x.id === searchParams.id)
    ? searchParams.id
    : feasibilities[0]?.id;
  const selected = selectedId ? await getFeasibility(tenantId, selectedId) : null;

  return (
    <section>
      <h1>Feasibility</h1>
      <p className="sub">
        Development &amp; value-add feasibility — land, product mix, the full cost stack, capitalised construction
        interest, GST margin scheme, funding and residual land value, with a sensitivity grid. {feasibilities.length} saved.
      </p>

      <div className="panel" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        {feasibilities.map((x) => (
          <Link key={x.id} href={`/feasibility?id=${x.id}`}
            className={`badge${x.id === selectedId ? " on" : ""}`}
            style={{ textDecoration: "none", padding: "6px 12px", border: "1px solid var(--line)" }}>
            {x.name || "Untitled"}
          </Link>
        ))}
        <form action={createFeasibilityAction} style={{ marginLeft: "auto" }}>
          <button className="btn" type="submit">+ New feasibility</button>
        </form>
      </div>

      {selected
        ? <FeasibilityEditor key={selected.id} id={selected.id} initial={selected.data ?? {}} />
        : <div className="panel"><p className="muted">No feasibility studies yet. Create one to start modelling a development — the residual land value tells you what the site is actually worth at your target margin.</p></div>}
    </section>
  );
}
