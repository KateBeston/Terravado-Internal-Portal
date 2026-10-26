import { redirect } from "next/navigation";
import { getUser, type AppUser } from "./session";

/** Require a signed-in user, else redirect to the login page. In dev mode the
    stand-in user is returned so protected pages render without Supabase. */
export async function requireUser(): Promise<AppUser> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}
