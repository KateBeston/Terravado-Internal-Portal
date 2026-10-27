import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { getContact } from "@/lib/domain/service";
import { listClientShares } from "@/lib/sharing";
import { createShareAction, revokeShareAction } from "@/app/actions";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
const date = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "—");

export default async function PersonSharingTab({ params }: { params: { id: string } }) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const c = await getContact(tenantId, params.id);
  if (!c) notFound();
  const shares = (await listClientShares(c.id)).filter((sh) => sh.status !== "revoked");

  return (
    <>
      <p className="sub">
        Invite an external party — a broker, accountant or solicitor — onto <strong>this deal only</strong>. They see {c.name}&apos;s
        record and nothing else of yours. They accept with the invite link, signing in with the invited email.
      </p>

      <div className="panel">
        <h2>Invite to this deal</h2>
        <form action={createShareAction}>
          <input type="hidden" name="clientId" value={c.id} />
          <div className="row">
            <label className="f"><span>Invite email</span><input name="invitedEmail" type="email" required placeholder="broker@firm.com.au" /></label>
            <label className="f"><span>Access</span>
              <select name="permission" defaultValue="view">
                <option value="view">View only</option>
                <option value="collaborate">Collaborate (coming soon)</option>
              </select>
            </label>
          </div>
          <button className="btn" type="submit">Create invite</button>
        </form>
        <p className="muted" style={{ fontSize: 12 }}>View-only for now — the invited party can see the deal but not change it.</p>
      </div>

      <div className="panel">
        <h2>Shared with</h2>
        <table>
          <thead><tr><th>Email</th><th>Access</th><th>Status</th><th>Invite link</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {shares.map((sh) => (
              <tr key={sh.id}>
                <td><strong>{sh.invitedEmail}</strong></td>
                <td>{sh.permission === "collaborate" ? "Collaborate" : "View"}</td>
                <td><span className="badge">{sh.status}</span></td>
                <td><code style={{ fontSize: 11 }}>/invite/{sh.token}</code></td>
                <td className="muted">{date(sh.createdAt)}</td>
                <td>
                  <form action={revokeShareAction}>
                    <input type="hidden" name="id" value={sh.id} />
                    <input type="hidden" name="clientId" value={c.id} />
                    <button className="x" type="submit" aria-label="Revoke">×</button>
                  </form>
                </td>
              </tr>
            ))}
            {shares.length === 0 && <tr><td colSpan={6} className="muted">Not shared with anyone yet.</td></tr>}
          </tbody>
        </table>
        <p className="muted" style={{ fontSize: 12 }}>
          Send the invite link to the party. They open it, sign in with the invited email, and the deal appears under “Shared with me”.
          Revoking (×) cuts their access immediately.
        </p>
      </div>
    </>
  );
}
