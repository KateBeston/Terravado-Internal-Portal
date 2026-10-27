import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { getClient, getProperty, listLenders } from "@/lib/domain/service";
import { assembleDealPack } from "@/lib/deal/pack";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";
const money = (v?: number) => (v === undefined || v === null ? "—" : (v < 0 ? "-$" : "$") + Math.abs(Math.round(v)).toLocaleString("en-AU"));
const pct = (v?: number | null) => (v === undefined || v === null ? "—" : v.toFixed(2) + "%");

export default async function DealPackPage({ params }: { params: { clientId: string; propertyId: string } }) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const [client, property] = await Promise.all([
    getClient(tenantId, params.clientId),
    getProperty(tenantId, params.propertyId),
  ]);
  if (!client || !property) notFound();

  const engineLenders = (await listLenders(tenantId))
    .filter((l) => l.active !== false)
    .map((l) => ({ id: l.id, name: l.name, isTemplate: false, ...(l.policy ?? {}) }));

  const pack = assembleDealPack(client, property, engineLenders);

  return (
    <section>
      <div className="sub" style={{ marginBottom: 6 }}><Link href={`/modeller?clientId=${client.id}&propertyId=${property.id}`}>← Back to the Modeller</Link></div>
      <h1 style={{ marginBottom: 6 }}>Deal pack</h1>
      <p className="sub">{client.name} · {property.address}</p>

      <div className="panel">
        <h2>Applicant &amp; position</h2>
        <table>
          <tbody>
            <tr><td className="muted">Applicant</td><td><strong>{pack.applicant.name}</strong></td>
                <td className="muted">Contact</td><td>{[pack.applicant.email, pack.applicant.phone].filter(Boolean).join(" · ") || "—"}</td></tr>
            <tr><td className="muted">Gross income</td><td>{money(pack.applicant.grossIncome)}</td>
                <td className="muted">Partner income</td><td>{money(pack.applicant.partnerIncome)}</td></tr>
            <tr><td className="muted">Living expenses</td><td>{money(pack.applicant.livingExpMonthly)}/mo</td>
                <td className="muted">Dependants</td><td>{pack.applicant.dependants}</td></tr>
            <tr><td className="muted">Card limits</td><td>{money(pack.liabilities.cardLimits)}</td>
                <td className="muted">HECS / other</td><td>{money(pack.liabilities.hecsBalance)} / {money(pack.liabilities.otherMonthlyRepayments)}/mo</td></tr>
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Security</h2>
        <table>
          <tbody>
            <tr><td className="muted">Property</td><td><strong>{pack.security.address}</strong></td>
                <td className="muted">State</td><td>{pack.security.state}</td></tr>
            <tr><td className="muted">Purchase price</td><td>{money(pack.security.price)}</td>
                <td className="muted">Purpose</td><td>{pack.security.purpose}</td></tr>
            <tr><td className="muted">Type</td><td>{pack.security.propertyType ?? "—"}</td>
                <td className="muted">Beds / baths / land</td><td>{pack.security.beds ?? "—"} / {pack.security.baths ?? "—"} / {pack.security.landSize ? pack.security.landSize + " m²" : "—"}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Proposed loan</h2>
        <table>
          <tbody>
            <tr><td className="muted">Loan required</td><td><strong>{money(pack.loan.amountRequired)}</strong> at {pack.loan.lvrPct}% LVR</td>
                <td className="muted">Cash to complete</td><td>{money(pack.loan.cashToComplete)}</td></tr>
            <tr><td className="muted">Transfer duty</td><td>{money(pack.loan.transferDuty)}</td>
                <td className="muted">Repayment / term</td><td>{pack.loan.repaymentType ?? "—"}{pack.loan.termYears ? ` · ${pack.loan.termYears}y` : ""}</td></tr>
            <tr><td className="muted">Proposed product</td><td colSpan={3}><strong>{pack.loan.productName}</strong></td></tr>
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Serviceability &amp; lender shortlist</h2>
        <p className="muted" style={{ marginTop: -4 }}>
          Best fit: <strong>{pack.serviceability.lender}</strong> — capacity {money(pack.serviceability.borrowingCapacity)}, DTI {pack.serviceability.dti.toFixed(1)}×, {pack.serviceability.serviceable ? "serviceable" : "short"}.
        </p>
        <table>
          <thead><tr><th>Lender</th><th>Capacity</th><th>Verdict</th></tr></thead>
          <tbody>
            {pack.lenderShortlist.map((l) => (
              <tr key={l.name} style={l.bestFit ? { background: "var(--primary-tint)" } : undefined}>
                <td className="lbl">{l.name}{l.bestFit && <span className="badge" style={{ marginLeft: 6 }}>best fit</span>}</td>
                <td>{money(l.capacity)}</td>
                <td style={{ color: l.serviceable ? "#1f6f54" : "#b03a2e" }}>{l.serviceable ? "Serviceable" : "Short"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <h2>Projection summary</h2>
        <div className="cards">
          <div className="card"><div className="k">Year-1 weekly</div><div className="v" style={{ color: pack.projection.year1WeeklyCashflow < 0 ? "#b03a2e" : "#1f6f54" }}>{money(pack.projection.year1WeeklyCashflow)}</div></div>
          <div className="card"><div className="k">IRR (10yr)</div><div className="v">{pct(pack.projection.irr)}</div></div>
          <div className="card"><div className="k">End equity (yr 10)</div><div className="v">{money(pack.projection.endEquity)}</div></div>
        </div>
      </div>

      <div className="panel">
        <h2>Structured export</h2>
        <p className="muted" style={{ marginTop: -4 }}>
          Application-ready data, grouped to LIXI CAL sections. <Link href={`/deal/${client.id}/${property.id}/data`}>Download JSON →</Link>
        </p>
        <details>
          <summary style={{ cursor: "pointer", color: "var(--muted)", fontSize: 13 }}>View structured data</summary>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 11, lineHeight: 1.5, marginTop: 10, overflowX: "auto" }}>{JSON.stringify(pack, null, 2)}</pre>
        </details>
      </div>

      <div className="muted" style={{ fontSize: 12 }}>{pack.meta.disclaimer} · {pack.meta.lixiMapping} · engine {pack.meta.engineVersion}</div>
    </section>
  );
}
