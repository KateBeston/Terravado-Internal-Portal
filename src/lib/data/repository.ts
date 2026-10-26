/* The data-layer contract. Everything above the data layer talks to this
   interface, never to Supabase directly — so persistence is swappable (local
   in dev, Supabase in production) without touching domain or UI code. */

export interface Entity {
  id: string;
  tenantId: string;
  createdAt: string;
}

export interface Repository {
  list<T extends Entity>(collection: string, tenantId: string): Promise<T[]>;
  get<T extends Entity>(collection: string, tenantId: string, id: string): Promise<T | null>;
  create<T extends Entity>(collection: string, item: T): Promise<T>;
  update<T extends Entity>(collection: string, tenantId: string, id: string, patch: Partial<T>): Promise<T | null>;
  remove(collection: string, tenantId: string, id: string): Promise<boolean>;
}
