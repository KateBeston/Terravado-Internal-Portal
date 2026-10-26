/* Local-first repository — in-memory, seeded, the default in dev mode so the
   portal runs and shows data without Supabase connected. State is per server
   process (resets on restart); real persistence is the Supabase repository. */
import type { Entity, Repository } from "./repository";
import { seedFor } from "@/lib/domain/seed";

type Bucket = Map<string, Entity>;
const store = new Map<string, Bucket>();
const keyOf = (collection: string, tenantId: string) => `${collection}:${tenantId}`;

function bucket(collection: string, tenantId: string): Bucket {
  const k = keyOf(collection, tenantId);
  let m = store.get(k);
  if (!m) {
    m = new Map();
    for (const e of seedFor(collection, tenantId)) m.set(e.id, e);
    store.set(k, m);
  }
  return m;
}

export const localRepository: Repository = {
  async list<T extends Entity>(collection: string, tenantId: string) {
    return Array.from(bucket(collection, tenantId).values()) as T[];
  },
  async get<T extends Entity>(collection: string, tenantId: string, id: string) {
    return (bucket(collection, tenantId).get(id) ?? null) as T | null;
  },
  async create<T extends Entity>(collection: string, item: T) {
    bucket(collection, item.tenantId).set(item.id, item);
    return item;
  },
  async update<T extends Entity>(collection: string, tenantId: string, id: string, patch: Partial<T>) {
    const m = bucket(collection, tenantId);
    const cur = m.get(id);
    if (!cur) return null;
    const next = { ...cur, ...patch } as Entity;
    m.set(id, next);
    return next as T;
  },
  async remove(collection: string, tenantId: string, id: string) {
    return bucket(collection, tenantId).delete(id);
  },
};
