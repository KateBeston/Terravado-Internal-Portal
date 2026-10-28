import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { listClients, getClient, listProperties, listLenders } from "@/lib/domain/service";
import { dealInputs } from "@/lib/deal/pack";
import { runEquityChain, type EquityChainCfg } from "@/lib/modelling/run";
import { saveLoanBalancesAction } from "@/app/actions";
import type { Property } from "@/lib/domain/types";

export const dynamic = "force-dynamic";

const money = (v?: number | null) => (v === undefined || v === null ? "—" : (v < 0 ? "-$" : "$") + Math.abs(Math.round(v)).toLocaleString("en-AU"));
const asStr = (v: string | string[] | undefined, d = ""): string => (typeof v === "string" ? v : d);
const asNum = (v: string | string[] | undefined, d: number): number => {
  const n = Number(asStr(v).replace(/[,$\s]/g, ""));
  return isFinite(n) && asStr(v) !== "" ? n : d;
};

/* Equity chain — when the client can fund the NEXT acquisition. Projects usable
   equity across the owned portfolio (the equity test) against the lender's
   capacity for the new loan (the serviceability test), and names the blocker.
   Ported from the retired Workspace; runs on the persisted client + holdings. */
export default async function EquityPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const clients = await listClients(tenantId);

  const clientId = asStr(searchParams.clientId);
  const client = clientId ? (clients.find((c) => c.id === clientId) ?? (await getClient(tenantId, clientId))) : null;

  const engineLenders = (await listLenders(tenantId))
    .filter((l) => l.active !== false)
    .map((l) => ({ id: l.id, name: l.name, isTemplate: false, maxDTI: 6, maxLVR: 90, ...(l.policy ?? {}) }));

  const cfg: EquityChainCfg = {
    targetPrice: asNum(searchParams.targetPrice, 850000),
    depositPct: asNum(searchParams.depositPct, 20),
    costsPct: asNum(searchParams.costsPct, 6),
    targetLVR: asNum(searchParams.targetLVR, 80),
    horizon: asNum(searchParams.horizon, 15),
    rentYield: asNum(searchParams.rentYield, 4.2),
    lenderId: asStr(searchParams.lenderId) || undefined,
  };

  let E: ReturnType<typeof runEquityChain> | null = null;
  let ownedProps: Property[] = [];
  if (client) {
    const all = (await listProperties(tenantId)).filter((p) => p.clientId === client.id);
    ownedProps = all.filter((p) => p.status === "owned");
    const lendersArg = engineLenders.length ? engineLenders : undefined;
    const placeholder = { id: "_ph", address: "", state: "NSW", price: 0, details: {} } as unknown as Property;
    const base = dealInputs(client, ownedProps[0] ?? placeholder, lendersArg);
    const ownedInputs = ownedProps.map((p) => {
      const inp = dealInputs(client, p, lendersArg);
      const bal = p.details?.currentLoanBalance;
      // Use the actual outstanding balance where set: back it out to a deposit %
      // so the modelled loan starts at the real figure, with no LMI on a held asset.
      if (bal !== undefined && bal !== null && (p.price ?? 0) > 0) {
        inp.depositPct = Math.min(100, Math.max(0, (1 - bal / (p.price as number)) * 100));
        inp.modelling = { ...(inp.modelling ?? {}), capitaliseLmi: false };
      }
      return inp;
    });
    E = runEquityChain(base, ownedInputs, cfg);
  }
  const owned = ownedProps.length;

  return (
    <section>
      <h1>Equity chain</h1>
      <p className="sub">When the client can fund their next purchase — usable equity across the portfolio against the lender&apos;s capacity. Equity without capacity is not a purchase.</p>

      <div className="panel">
        <h2>Client</h2>
        <form method="get">
          <label className="f"><span>Equity chain for</span>
            <select name="clientId" defaultValue={clientId}>
              <option value="">— Choose a client —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <button className="btn" type="submit">Load</button>
        </form>
      </div>

      {client && E && (
        <>
          <div className="panel">
            <h2>Next acquisition</h2>
            <form method="get">
              <input type="hidden" name="clientId" value={client.id} />
              <div className="row">
                <label className="f"><span>Target price</span><input name="targetPrice" inputMode="numeric" defaultValue={cfg.targetPrice} /></label>
                <label className="f"><span>Deposit %</span><input name="depositPct" type="number" step="0.5" defaultValue={cfg.depositPct} /></label>
              </div>
              <div className="row">
                <label className="f"><span>Acquisition costs %</span><input name="costsPct" type="number" step="0.1" defaultValue={cfg.costsPct} /></label>
                <label className="f"><span>Release at LVR %</span><input name="targetLVR" type="number" step="1" defaultValue={cfg.targetLVR} /></label>
              </div>
              <div className="row">
                <label className="f"><span>Expected gross yield %</span><input name="rentYield" type="number" step="0.1" defaultValue={cfg.rentYield} /></label>
                <label className="f"><span>Horizon (yrs)</span><input name="horizon" type="number" step="1" defaultValue={cfg.horizon} /></label>
              </div>
              {engineLenders.length > 0 && (
                <label className="f"><span>Lender</span>
                  <select name="lenderId" defaultValue={cfg.lenderId ?? ""}>
                    <option value="">Best-fit / first</option>
                    {engineLenders.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </label>
              )}
              <button className="btn" type="submit">Recalculate</button>
            </form>
            <p className="muted" style={{ fontSize: 12 }}>
              Cash required <strong>{money(E.cashNeeded)}</strong> · new loan <strong>{money(E.newLoan)}</strong> · new rent {money(E.newRent)} pa.
              Based on {owned} owned propert{owned === 1 ? "y" : "ies"} in {client.name}&apos;s portfolio.
            </p>
          </div>

          <div className="panel">
            <h2>Current loan balances</h2>
            <p className="muted" style={{ marginTop: -4, fontSize: 12 }}>
              The actual outstanding loan on each owned property today. Where set, the chain uses it; otherwise it falls back to
              the modelled balance from the property&apos;s assumptions. Current value is the property&apos;s price on its record.
            </p>
            {ownedProps.length === 0 ? <p className="muted">No owned properties to set balances for.</p> : (
              <form action={saveLoanBalancesAction}>
                <input type="hidden" name="clientId" value={client.id} />
                <input type="hidden" name="ids" value={ownedProps.map((p) => p.id).join(",")} />
                <table>
                  <thead><tr><th>Property</th><th>Current value</th><th>Current loan balance</th></tr></thead>
                  <tbody>
                    {ownedProps.map((p) => (
                      <tr key={p.id}>
                        <td><strong>{p.address}</strong></td>
                        <td>{money(p.price)}</td>
                        <td><input name={`bal_${p.id}`} inputMode="numeric" defaultValue={p.details?.currentLoanBalance ?? ""} placeholder="modelled" style={{ width: 140 }} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button className="btn" type="submit">Save balances</button>
              </form>
            )}
          </div>

          <div className="cards">
            <div className="card"><div className="k">Equity ready</div><div className="v">{E.readyYear ? "Year " + E.readyYear : "—"}</div></div>
            <div className="card"><div className="k">Serviceability</div><div className="v">{E.servYear ? "Year " + E.servYear : "—"}</div></div>
            <div className="card"><div className="k">Go year</div><div className="v" style={{ color: E.goYear ? "#1f6f54" : "#b03a2e" }}>{E.goYear ? "Year " + E.goYear : "Blocked"}</div></div>
          </div>

          {E.blocker === "serviceability" && (
            <div className="panel" style={{ borderLeft: "5px solid #b03a2e" }}>
              <strong>Equity without capacity is not a purchase.</strong> The equity is there, but {E.lender?.name ?? "the lender"} will not
              lend against it inside the horizon. This is the wall investors hit at property three or four — and the reason an
              equity-release plan that ignores serviceability is fiction.
            </div>
          )}
          {E.blocker === "equity" && (
            <div className="panel" style={{ borderLeft: "5px solid #b03a2e" }}>
              Usable equity never reaches {money(E.cashNeeded)} inside the horizon on the current growth assumptions.
            </div>
          )}

          <div className="panel">
            <h2>Year by year</h2>
            <table>
              <thead><tr><th>Year</th><th>Usable equity</th><th>Cash needed</th><th>Equity test</th><th>Capacity</th><th>DTI</th><th>Serviceability</th><th>Go</th></tr></thead>
              <tbody>
                {E.rows.map((r) => (
                  <tr key={r.year}>
                    <td>{r.year}</td>
                    <td>{money(r.usable)}</td>
                    <td className="muted">{money(r.needed)}</td>
                    <td style={{ color: r.equityOk ? "#1f6f54" : "#b03a2e" }}>{r.equityOk ? "Pass" : "Short"}</td>
                    <td>{money(r.capacity)}</td>
                    <td>{r.dti}×</td>
                    <td style={{ color: r.servOk ? "#1f6f54" : "#b03a2e" }}>{r.servOk ? "Pass" : "Fail"}</td>
                    <td><strong>{r.equityOk && r.servOk ? "●" : "—"}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {owned === 0
              ? <p className="muted" style={{ fontSize: 12 }}>{client.name} has no properties marked <em>owned</em> yet, so there is no equity to recycle — mark holdings as owned on their records to model the chain.</p>
              : <p className="muted" style={{ fontSize: 12 }}>Usable equity = projected value × release LVR − loan balance, per owned property, using the actual balance where set above.</p>}
          </div>
        </>
      )}
    </section>
  );
}
