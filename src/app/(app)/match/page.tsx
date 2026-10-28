import { requireUser, requireCapability } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { listClients, getClient, listDevelopments, listLots } from "@/lib/domain/service";
import { deriveAssessableFinances } from "@/lib/domain/finances";
import { assessPosition } from "@/lib/modelling/run";
import { matchStock, type StockItem, type MatchCriteria } from "@/lib/matching";
import Link from "next/link";

export const dynamic = "force-dynamic";
const STATES = ["", "NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const money = (v?: number | null) => (v === undefined || v === null ? "—" : "$" + Math.round(v).toLocaleString("en-AU"));
const asStr = (x?: string | string[]) => (Array.isArray(x) ? x[0] : x) ?? "";
const asNum = (x?: string | string[]) => { const v = Number(asStr(x).replace(/[,$\s]/g, "")); return isFinite(v) ? v : undefined; };
const VERDICT: Record<string, string> = { strong: "Strong fit", possible: "Possible", stretch: "Stretch" };

export default async function MatchPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  await requireUser();
  await requireCapability("stock");
  const { tenantId } = await getCurrentTenant();
  const [clients, developments, lots] = await Promise.all([listClients(tenantId), listDevelopments(tenantId), listLots(tenantId)]);

  const clientId = asStr(searchParams.clientId);
  const client = clientId ? (clients.find((c) => c.id === clientId) ?? (await getClient(tenantId, clientId))) : null;

  // Borrowing capacity from the client's serviceability position.
  let capacity = 0;
  if (client) {
    const fin = deriveAssessableFinances(client.finances ?? {});
    const rows = assessPosition({
      grossIncome: fin.grossIncome ?? 0, partnerIncome: fin.partnerIncome, livingExpMonthly: fin.livingExpMonthly,
      dependants: fin.dependants, monthlyCommitments: fin.monthlyCommitments, cardLimits: fin.cardLimits, hecsBalance: fin.hecsBalance,
    });
    capacity = rows[0]?.capacity ?? 0;
  }

  const deposit = asNum(searchParams.deposit) ?? 100000;
  const criteria: MatchCriteria = {
    maxPrice: client ? capacity + deposit : asNum(searchParams.maxPrice),
    minYieldPct: asNum(searchParams.minYield),
    state: asStr(searchParams.state),
    minBeds: asNum(searchParams.minBeds),
  };

  const devById = new Map(developments.map((d) => [d.id, d]));
  const items: StockItem[] = lots.map((l) => {
    const dev = l.developmentId ? devById.get(l.developmentId) : undefined;
    return { lot: l, developmentName: dev?.name ?? "—", developmentState: dev?.state };
  });
  const results = client || criteria.maxPrice ? matchStock(items, criteria) : [];

  return (
    <section>
      <h1>Match</h1>
      <p className="sub">Score the stock list against a client&apos;s borrowing capacity and criteria to surface best-fit lots. Indicative only — not financial advice.</p>

      <div className="panel">
        <h2>Client &amp; criteria</h2>
        <form method="GET">
          <div className="row">
            <label className="f"><span>Client</span>
              <select name="clientId" defaultValue={clientId}>
                <option value="">— Select a borrower —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="f"><span>Deposit / equity</span><input name="deposit" inputMode="numeric" defaultValue={String(deposit)} /></label>
          </div>
          <div className="row">
            <label className="f"><span>Target gross yield %</span><input name="minYield" inputMode="numeric" defaultValue={asStr(searchParams.minYield)} placeholder="e.g. 5" /></label>
            <label className="f"><span>Preferred state</span>
              <select name="state" defaultValue={asStr(searchParams.state)}>{STATES.map((s) => <option key={s || "any"} value={s}>{s || "Any"}</option>)}</select>
            </label>
            <label className="f"><span>Min beds</span><input name="minBeds" inputMode="numeric" defaultValue={asStr(searchParams.minBeds)} /></label>
          </div>
          <button className="btn" type="submit">Find matches</button>
        </form>
        {client && (
          <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
            {client.name}: borrowing capacity <strong>{money(capacity)}</strong> + deposit {money(deposit)} = max purchase <strong>{money(criteria.maxPrice)}</strong>.
          </p>
        )}
      </div>

      <div className="panel">
        <h2>Best-fit lots</h2>
        <table>
          <thead><tr><th>Lot</th><th>Development</th><th>Price</th><th>Yield</th><th>Fit</th><th>Why</th></tr></thead>
          <tbody>
            {results.map((m) => (
              <tr key={m.lot.id}>
                <td><strong>{m.lot.lotNumber ?? "—"}</strong>{m.lot.address ? ` · ${m.lot.address}` : ""}</td>
                <td>{m.lot.developmentId ? <Link href={`/stock/${m.lot.developmentId}`}>{m.developmentName}</Link> : m.developmentName}{m.developmentState ? ` (${m.developmentState})` : ""}</td>
                <td>{money(m.lot.price)}</td>
                <td>{m.yieldPct != null ? `${m.yieldPct.toFixed(1)}%` : "—"}</td>
                <td><span className="badge">{m.score} · {VERDICT[m.verdict]}</span></td>
                <td className="muted" style={{ fontSize: 12 }}>{m.reasons.join(" · ")}</td>
              </tr>
            ))}
            {results.length === 0 && (
              <tr><td colSpan={6} className="muted">
                {client || criteria.maxPrice ? "No available stock to match. Add lots under Stock." : "Pick a client (and criteria) to rank the stock."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
