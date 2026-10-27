import { requireUser } from "@/lib/auth/guard";
import { listSharedWithMe } from "@/lib/sharing";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SharedWithMePage({ searchParams }: { searchParams: { error?: string } }) {
  await requireUser();
  const deals = await listSharedWithMe();

  return (
    <section>
      <h1>Shared with me</h1>
      <p className="sub">Deals other accounts have invited you onto. You see only these — nothing else of theirs.</p>

      {searchParams?.error && (
        <div className="devbanner">That invite couldn&apos;t be accepted — it may be for a different email address, or it was revoked.</div>
      )}

      <div className="panel">
        <h2>Shared deals</h2>
        <table>
          <thead><tr><th>Deal</th><th>Access</th><th></th></tr></thead>
          <tbody>
            {deals.map((d) => (
              <tr key={d.clientId}>
                <td><Link href={`/shared/${d.clientId}`}><strong>{d.clientName}</strong></Link></td>
                <td><span className="badge">{d.permission === "collaborate" ? "Collaborate" : "View"}</span></td>
                <td><Link className="btn ghost" href={`/shared/${d.clientId}`} style={{ padding: "6px 12px" }}>Open →</Link></td>
              </tr>
            ))}
            {deals.length === 0 && <tr><td colSpan={3} className="muted">No deals shared with you yet. Open an invite link to accept one.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
