import { requireUser } from "@/lib/auth/guard";
import WorkspaceClient from "./WorkspaceClient";

export const dynamic = "force-dynamic";

/* The Workspace is the full Terravado modelling application — portfolio,
   property workspace (17 input panels, 10 output tabs), clients,
   serviceability, equity chain, lenders, feasibility, contacts and audit —
   ported from the original build and run behind the portal's auth. Its own
   editorial styling is scoped under `.tv-root` (see workspace-theme.css) so it
   never collides with the portal's design. */
export default async function WorkspacePage() {
  await requireUser();
  return <WorkspaceClient />;
}
