import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { getEntity, listClients } from "@/lib/domain/service";
import { updateEntityAction, deleteEntityAction } from "@/app/actions";
import { ENTITY_TYPES } from "@/lib/domain/types";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const v = (x?: string) => x ?? "";

export default async function EntityDetailsTab({ params }: { params: { id: string } }) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const [e, clients] = await Promise.all([getEntity(tenantId, params.id), listClients(tenantId)]);
  if (!e) notFound();

  return (
    <>
      <form action={updateEntityAction}>
        <input type="hidden" name="id" value={e.id} />

        <div className="panel">
          <h2>Entity</h2>
          <label className="f"><span>Name</span><input name="name" defaultValue={v(e.name)} required /></label>
          <div className="row">
            <label className="f"><span>Type</span><select name="kind" defaultValue={e.kind ?? "Company"}>{ENTITY_TYPES.map((k) => <option key={k}>{k}</option>)}</select></label>
            <label className="f"><span>State</span><select name="region" defaultValue={e.region ?? "NSW"}>{STATES.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label className="f"><span>ABN</span><input name="abn" defaultValue={v(e.abn)} /></label>
          </div>
          <label className="f"><span>Primary client (optional)</span>
            <select name="clientId" defaultValue={e.clientId ?? ""}><option value="">— None —</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          </label>
        </div>

        <div className="panel">
          <h2>Contact</h2>
          <div className="row">
            <label className="f"><span>Phone</span><input name="phone" defaultValue={v(e.phone)} /></label>
            <label className="f"><span>Email</span><input name="email" type="email" defaultValue={v(e.email)} /></label>
          </div>
          <label className="f"><span>Website</span><input name="website" defaultValue={v(e.website)} /></label>
        </div>

        <div className="panel">
          <h2>Land-tax status</h2>
          <label className="f" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input type="checkbox" name="foreign" defaultChecked={e.foreign ?? false} style={{ width: "auto" }} />
            <span style={{ margin: 0 }}>Foreign person / entity — applies the state land-tax (and duty) surcharge</span>
          </label>
          <label className="f" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <input type="checkbox" name="deedExcludesForeign" defaultChecked={e.deedExcludesForeign ?? false} style={{ width: "auto" }} />
            <span style={{ margin: 0 }}>Trust deed irrevocably excludes foreign persons — avoids the NSW trust no-threshold surcharge</span>
          </label>
          <p className="muted" style={{ fontSize: 12 }}>These drive the land-tax surcharges in the portfolio aggregation. A NSW trust without the exclusion loses the $1.075m threshold.</p>
        </div>

        <div className="panel">
          <h2>Notes</h2>
          <label className="f"><textarea name="notes" rows={3} defaultValue={v(e.notes)} /></label>
        </div>

        <button className="btn" type="submit">Save entity</button>
      </form>

      <form action={deleteEntityAction} style={{ marginTop: 16 }}>
        <input type="hidden" name="id" value={e.id} />
        <button className="x" type="submit" style={{ width: "auto", padding: "6px 12px" }}>Delete this entity</button>
      </form>
    </>
  );
}
