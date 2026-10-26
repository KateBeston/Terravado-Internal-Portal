/* Supabase repository — active when a Supabase project is connected. Collection
   names map 1:1 to table names; RLS enforces tenant isolation server-side (the
   tenant_id filter here is defence in depth, not the only guard). */
import { createClient } from "@/lib/supabase/server";
import { keysToCamel, keysToSnake } from "./case";
import type { Entity, Repository } from "./repository";

export const supabaseRepository: Repository = {
  async list<T extends Entity>(collection: string, tenantId: string) {
    const sb = createClient();
    const { data, error } = await sb.from(collection).select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => keysToCamel<T>(r as Record<string, unknown>));
  },
  async get<T extends Entity>(collection: string, tenantId: string, id: string) {
    const sb = createClient();
    const { data, error } = await sb.from(collection).select("*").eq("tenant_id", tenantId).eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? keysToCamel<T>(data as Record<string, unknown>) : null;
  },
  async create<T extends Entity>(collection: string, item: T) {
    const sb = createClient();
    const { data, error } = await sb.from(collection).insert(keysToSnake(item as unknown as Record<string, unknown>)).select().single();
    if (error) throw new Error(error.message);
    return keysToCamel<T>(data as Record<string, unknown>);
  },
  async update<T extends Entity>(collection: string, tenantId: string, id: string, patch: Partial<T>) {
    const sb = createClient();
    const { data, error } = await sb.from(collection).update(keysToSnake(patch as Record<string, unknown>)).eq("tenant_id", tenantId).eq("id", id).select().maybeSingle();
    if (error) throw new Error(error.message);
    return data ? keysToCamel<T>(data as Record<string, unknown>) : null;
  },
  async remove(collection: string, tenantId: string, id: string) {
    const sb = createClient();
    const { error } = await sb.from(collection).delete().eq("tenant_id", tenantId).eq("id", id);
    if (error) throw new Error(error.message);
    return true;
  },
};
