import { createClient } from "@/lib/supabase/server";
import { IS_SUPABASE_CONFIGURED } from "@/lib/supabase/config";

export interface AppUser {
  id: string;
  email: string;
  name: string;
  isDev: boolean;
}

const DEV_USER: AppUser = {
  id: "dev-user",
  email: "dev@terravado.local",
  name: "Dev User",
  isDev: true,
};

/** The signed-in user, or null. In dev mode (Supabase not configured) returns a
    stand-in user so the portal is explorable without auth. */
export async function getUser(): Promise<AppUser | null> {
  if (!IS_SUPABASE_CONFIGURED) return DEV_USER;
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const u = data.user;
  const fullName = (u.user_metadata?.full_name as string | undefined) ?? (u.user_metadata?.name as string | undefined);
  return { id: u.id, email: u.email ?? "", name: fullName ?? u.email ?? "User", isDev: false };
}

export const authEnabled = IS_SUPABASE_CONFIGURED;
