import { requireUser, requireCapability } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { listLenders } from "@/lib/domain/service";
import { createLenderAction, deleteLenderAction } from "@/app/actions";
import { QUICKLI_CONFIGURED } from "@/lib/integrations/finance/quickli";
import { getBankProducts } from "@/lib/integrations/bank-products";
import Link from "next/link";

export const dynamic = "force-dynamic";
const KINDS = ["Major bank", "Non-bank", "Specialist", "Credit union", "Other"];
const pct = (v?: number) => (v === undefined || v === null ? "—" : v + "%");
const money = (v?: number) => (v === undefined || v === null ? "—" : "$" + Math.round(v).toLocaleString("en-AU"));

export default async function LendersPage() {
  await requireUser();
  await requireCapability("lenders");
  const { tenantId } = await getCurrentTenant();
  const lenders = await listLenders(tenantId);
  const cdr = await getBankProducts();

  return (
    <section>
      <h1>Lenders</h1>
      <p className="sub">Lender and bank products used for serviceability. {lenders.length} set up.</p>

      <div className="panel" style={{ borderLeft: `4px solid ${QUICKLI_CONFIGURED ? "var(--success)" : "var(--warning-border)"}` }}>
        <h2>Finance provider — Quickli</h2>
        {QUICKLI_CONFIGURED
          ? <p className="muted" style={{ marginTop: -4 }}>Quickli is connected. Live lender serviceability is used where available; your manual products below are the fallback.</p>
          : <p className="muted" style={{ marginTop: -4 }}>
              Quickli is <strong>not connected</strong>. The Modeller&apos;s lender comparison and the Finance page use the manual lender
              products below. Connecting Quickli replaces these with each lender&apos;s live serviceability calculator — set the
              <code> QUICKLI_API_KEY</code> environment variable (server-side) under a Quickli API agreement, and it takes over automatically.
            </p>}
      </div>

      <div className="panel">
        <h2>Live product rates — CDR Open Banking</h2>
        <p className="muted" style={{ marginTop: -4, fontSize: 13 }}>{cdr.note}</p>
        {cdr.products.length > 0 && (
          <table>
            <thead><tr><th>Lender</th><th>Product</th><th>Variable rate</th><th>Comparison</th><th>Annual fee</th></tr></thead>
            <tbody>
              {cdr.products.map((p, i) => (
                <tr key={i}>
                  <td><strong>{p.lender}</strong></td>
                  <td>{p.name}</td>
                  <td>{p.ratePct !== undefined ? p.ratePct + "%" : "—"}</td>
                  <td>{p.comparisonRatePct !== undefined ? p.comparisonRatePct + "%" : "—"}</td>
                  <td>{money(p.annualFee)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="muted" style={{ fontSize: 11 }}>
          Public CDR Product Reference Data — no key, no consent. Representative residential-mortgage products, polled
          server-side and cached. Bank base URIs are configurable via <code>CDR_BANKS</code>; <code>CDR_PRODUCTS_ENABLED=off</code> disables it.
        </p>
      </div>

      <div className="panel">
        <h2>Add a lender product</h2>
        <form action={createLenderAction}>
          <label className="f"><span>Name</span><input name="name" required placeholder="e.g. Major bank — standard variable" /></label>
          <div className="row">
            <label className="f"><span>Kind</span>
              <select name="kind" defaultValue="Major bank">{KINDS.map((k) => <option key={k}>{k}</option>)}</select>
            </label>
            <label className="f"><span>Active</span>
              <select name="active" defaultValue="true"><option value="true">Yes</option><option value="false">No</option></select>
            </label>
          </div>
          <button className="btn" type="submit">Add product</button>
          <span className="muted" style={{ fontSize: 11, marginLeft: 10 }}>Starts from sensible defaults — tune the full policy on its page.</span>
        </form>
      </div>

      <div className="panel">
        <h2>Lender products</h2>
        <table>
          <thead><tr><th>Product</th><th>Kind</th><th>Buffer</th><th>Floor</th><th>Max DTI</th><th>Max LVR</th><th>Active</th><th></th></tr></thead>
          <tbody>
            {lenders.map((l) => (
              <tr key={l.id}>
                <td><Link href={`/lenders/${l.id}`}><strong>{l.name}</strong></Link></td>
                <td>{l.kind ?? "—"}</td>
                <td>{pct(l.policy?.bufferPct)}</td>
                <td>{pct(l.policy?.floorPct)}</td>
                <td>{l.policy?.maxDTI ?? "—"}×</td>
                <td>{pct(l.policy?.maxLVR)}</td>
                <td>{l.active === false ? "No" : "Yes"}</td>
                <td>
                  <form action={deleteLenderAction}>
                    <input type="hidden" name="id" value={l.id} />
                    <button className="x" type="submit" aria-label="Delete">×</button>
                  </form>
                </td>
              </tr>
            ))}
            {lenders.length === 0 && <tr><td colSpan={8} className="muted">No lender products yet — the modelling falls back to built-in templates until you add some.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
