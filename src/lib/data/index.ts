import { IS_SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { localRepository } from "./local";
import { supabaseRepository } from "./supabase-repo";
import type { Repository } from "./repository";

/** The active repository — Supabase when configured, local-first otherwise. */
export function getRepository(): Repository {
  return IS_SUPABASE_CONFIGURED ? supabaseRepository : localRepository;
}

export type { Entity, Repository } from "./repository";
