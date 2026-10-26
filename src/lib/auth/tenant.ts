import { getUser } from "./session";

export interface CurrentTenant {
  tenantId: string;
  name: string;
}

/** Resolve the current tenant for the signed-in user. Increment one keys one
    workspace per user; multi-firm membership resolution (a user belonging to
    several firms) lands with the domain layer and the memberships table. */
export async function getCurrentTenant(): Promise<CurrentTenant> {
  const user = await getUser();
  return {
    tenantId: user ? `tenant-${user.id}` : "tenant-anon",
    name: "My workspace",
  };
}
