import { requireUser } from "@/lib/auth/guard";
import { getUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { acceptShareAction } from "@/app/actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function InviteAcceptPage({ params }: { params: { token: string } }) {
  await requireUser();
  const [user, sb] = [await getUser(), createClient()];
  // RLS lets the invited email (or the host) see this row.
  const { data: share } = await sb.from("deal_shares")
    .select("invited_email, status, permission").eq("token", params.token).maybeSingle();

  const emailMatches = !!(share && user?.email && share.invited_email.toLowerCase() === user.email.toLowerCase());

  return (
    <section>
      <h1>Deal invite</h1>

      {!share && (
        <div className="panel">
          <p className="muted">This invite link isn&apos;t valid for your account. It may be for a different email address, or it was revoked.
          You&apos;re signed in as <strong>{user?.email}</strong>. If the invite was sent to another address, sign in with that one.</p>
        </div>
      )}

      {share && share.status === "revoked" && (
        <div className="panel"><p className="muted">This invite has been revoked.</p></div>
      )}

      {share && share.status === "accepted" && (
        <div className="panel"><p>You&apos;ve already accepted this invite. <Link href="/shared">Go to Shared with me →</Link></p></div>
      )}

      {share && share.status === "invited" && (
        <div className="panel">
          <h2>You&apos;ve been invited onto a deal</h2>
          <p className="sub">Invited as <strong>{share.invited_email}</strong> · {share.permission === "collaborate" ? "Collaborate" : "View only"} access.</p>
          {emailMatches ? (
            <form action={acceptShareAction}>
              <input type="hidden" name="token" value={params.token} />
              <button className="btn" type="submit">Accept &amp; open the deal</button>
            </form>
          ) : (
            <p className="muted">This invite was sent to <strong>{share.invited_email}</strong>, but you&apos;re signed in as <strong>{user?.email}</strong>.
            Sign in with the invited email to accept.</p>
          )}
        </div>
      )}
    </section>
  );
}
