import { requireUser, requireCapability } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { listClients, getClient, listProperties, listDevelopments, listLots, listLenders } from "@/lib/domain/service";
import { deriveAssessableFinances } from "@/lib/domain/finances";
import { assessPosition } from "@/lib/modelling/run";
import { rankForClient, type Candidate, type ShortlistCriteria, type Goal } from "@/lib/shortlist";
import Link from "next/link";

export const dynamic = "force-dynamic";
const STATES = ["", "NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const GOALS: Goal[] = ["balanced", "cashflow", "growth"];
const money = (v?: number | null) => (v === undefined || v === null ? "—" : (v < 0 ? "-$" : "$") + Math.abs(Math.round(v)).toLocaleString("en-AU"));
const asStr = (x?: string | string[]) => (Array.isArray(x) ? x[0] : x) ?? "";
const asNum = (x?: string | string[]) => { const v = Number(asStr(x).replace(/[,$\s]/g, "")); return isFinite(v) && asStr(x) !== "" ? v : undefined; };
const bandColor = (b: string) => /strong|excellent|buy/i.test(b) ? "#1f6f54" : /stretch|avoid|weak/i.test(b) ? "#b03a2e" : "#9a7b1f";

export default async function ShortlistPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  await requireUser();
  await requireCapability("clients");
  const { tenantId } = await getCurrentTenant();
  const [clients, properties, developments, lots, lenders] = await Promise.all([
    listClients(tenantId), listProperties(tenantId), listDevelopments(tenantId), listLots(tenantId), listLenders(tenantId),
  ]);

  const clientId = asStr(searchParams.clientId);
  const client = clientId ? (clients.find((c) => c.id === clientId) ?? (await getClient(tenantId, clientId))) : null;

  const engineLenders = lenders.filter((l) => l.active !== false).map((l) => ({ id: l.id, name: l.name, isTemplate: false, maxDTI: 6, maxLVR: 90, ...(l.policy ?? {}) }));

  const criteria: ShortlistCriteria = {
    minYieldPct: asNum(searchParams.minYield),
    state: asStr(searchParams.state) || undefined,
    minBeds: asNum(searchParams.minBeds),
    goal: (asStr(searchParams.goal) as Goal) || "balanced",
  };

  let capacity = 0;
  let ranked: ReturnType<typeof rankForClient> = [];
  if (client) {
    const fin = deriveAssessableFinances(client.finances ?? {});
    capacity = assessPosition({
      grossIncome: fin.grossIncome ?? 0, partnerIncome: fin.partnerIncome, livingExpMonthly: fin.livingExpMonthly,
      dependants: fin.dependants, monthlyCommitments: fin.monthlyCommitments, cardLimits: fin.cardLimits, hecsBalance: fin.hecsBalance,
    }, engineLenders)[0]?.capacity ?? 0;

    const devById = new Map(developments.map((d) => [d.id, d]));
    const fromProps: Candidate[] = properties.filter((p) => p.status === "considering").map((p) => ({
      id: p.id, source: "property", label: p.address, state: p.state,
      price: p.price, weeklyRent: p.details?.weeklyRent, beds: p.details?.physical?.beds,
      growthPct: p.details?.locality?.annualGrowthPct, buildYear: p.details?.physical?.buildYear,
      href: `/properties/${p.id}`, sublabel: p.details?.locality?.suburb,
    }));
    const fromStock: Candidate[] = lots.filter((l) => l.status === "available" || l.status === "under_offer").map((l) => {
      const dev = l.developmentId ? devById.get(l.developmentId) : undefined;
      return {
        id: l.id, source: "stock", label: l.address || l.lotNumber || "Lot", state: dev?.state,
        price: l.price, weeklyRent: l.advertisedRent, beds: l.beds, href: dev ? `/stock/${dev.id}` : undefined,
        sublabel: dev?.name,
      };
    });
    ranked = rankForClient(client, [...fromProps, ...fromStock], engineLenders, criteria);
  }

  const top = ranked.slice(0, 10);

  return (
    <section>
      <h1>Shortlist</h1>
      <p className="sub">
        The best candidate properties for a client, ranked by the full model against <strong>their</strong> position — serviceability,
        after-tax cashflow, yield and projected equity. A data-backed shortlist to investigate, not a buy instruction.
      </p>

      <div className="panel">
        <h2>Client &amp; criteria</h2>
        <form method="GET">
          <div className="row">
            <label className="f"><span>Client</span>
              <select name="clientId" defaultValue={clientId}>
                <option value="">— Choose a client —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="f"><span>Goal</span>
              <select name="goal" defaultValue={criteria.goal}>{GOALS.map((g) => <option key={g} value={g}>{g[0].toUpperCase() + g.slice(1)}</option>)}</select>
            </label>
          </div>
          <div className="row">
            <label className="f"><span>Min gross yield %</span><input name="minYield" inputMode="numeric" defaultValue={criteria.minYieldPct ?? ""} placeholder="e.g. 4.5" /></label>
            <label className="f"><span>Preferred state</span><select name="state" defaultValue={criteria.state ?? ""}>{STATES.map((s) => <option key={s} value={s}>{s || "Any"}</option>)}</select></label>
            <label className="f"><span>Min beds</span><input name="minBeds" inputMode="numeric" defaultValue={criteria.minBeds ?? ""} placeholder="e.g. 3" /></label>
          </div>
          <button className="btn" type="submit">Rank for client</button>
        </form>
      </div>

      {client && (
        <>
          <div className="cards">
            <div className="card"><div className="k">Borrowing capacity</div><div className="v">{money(capacity)}</div><div className="k">best-fit lender</div></div>
            <div className="card"><div className="k">Candidates ranked</div><div className="v">{ranked.length}</div><div className="k">considering + stock</div></div>
            <div className="card"><div className="k">Top pick</div><div className="v">{top[0]?.score ?? "—"}{top[0] ? "/100" : ""}</div><div className="k">{top[0]?.candidate.label ?? "—"}</div></div>
          </div>

          <div className="panel">
            <h2>Top {Math.min(10, top.length)} for {client.name}</h2>
            {top.length === 0 ? (
              <p className="muted">No candidates to rank yet — add properties with status <em>considering</em>, or stock lots, then rank again.</p>
            ) : (
              <table>
                <thead><tr><th>#</th><th>Property</th><th>Price</th><th>Weekly</th><th>Yield</th><th>Equity yr10</th><th>Serviceable</th><th>Score</th></tr></thead>
                <tbody>
                  {top.map((r) => (
                    <tr key={r.candidate.id}>
                      <td><strong>{r.rank}</strong></td>
                      <td>
                        {r.candidate.href ? <Link href={r.candidate.href}><strong>{r.candidate.label}</strong></Link> : <strong>{r.candidate.label}</strong>}
                        <div className="muted" style={{ fontSize: 11 }}>{[r.candidate.sublabel, r.candidate.state, r.candidate.source === "stock" ? "stock" : "considering"].filter(Boolean).join(" · ")}</div>
                        <details style={{ marginTop: 2 }}><summary style={{ fontSize: 11, color: "var(--muted)", cursor: "pointer" }}>Why</summary>
                          <ul style={{ margin: "4px 0 0", paddingLeft: 16, fontSize: 12 }}>{r.reasons.map((x, i) => <li key={i}>{x}</li>)}</ul>
                        </details>
                      </td>
                      <td>{money(r.candidate.price)}</td>
                      <td style={{ color: r.weekly1 < 0 ? "#b03a2e" : "#1f6f54" }}>{money(r.weekly1)}</td>
                      <td>{r.grossYield != null ? r.grossYield.toFixed(1) + "%" : "—"}</td>
                      <td>{money(r.equityEnd)}</td>
                      <td style={{ color: r.serviceable ? "#1f6f54" : "#b03a2e" }}>{r.serviceable ? "Yes" : "No"}</td>
                      <td><span className="badge" style={{ color: bandColor(r.band), borderColor: bandColor(r.band) }}>{r.score}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="muted" style={{ fontSize: 12 }}>
              Ranked by the engine verdict for {client.name}&apos;s position, tilted by the chosen goal, with <strong>land tax and
              depreciation folded into the after-tax cashflow</strong> (estimated where the record doesn&apos;t carry the real figures —
              see each row&apos;s &ldquo;Why&rdquo;). &ldquo;Best on paper&rdquo; — it models the data, not condition, aspect, flooding or vendor
              circumstances, so treat the list as where to look, then inspect. Not financial advice.
            </p>
          </div>
        </>
      )}
    </section>
  );
}
