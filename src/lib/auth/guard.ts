import { redirect } from "next/navigation";
import { getUser, type AppUser } from "./session";
import { getCurrentTenant, getTenantRoles } from "./tenant";
import { effectiveCapabilities, type Capability } from "./capabilities";

/** Require a signed-in user, else redirect to the login page. In dev mode the
    stand-in user is returned so protected pages render without Supabase. */
export async function requireUser(): Promise<AppUser> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

/** Require the current account to hold a capability, else send to /account.
    Enforces the account-type/role gating at the page level, not just the nav. */
export async function requireCapability(cap: Capability): Promise<void> {
  const [tenant, roles] = await Promise.all([getCurrentTenant(), getTenantRoles()]);
  if (!effectiveCapabilities(tenant.accountType, roles).includes(cap)) redirect("/account");
}
