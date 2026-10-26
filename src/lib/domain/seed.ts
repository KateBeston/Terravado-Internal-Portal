import type { Entity } from "@/lib/data/repository";

/** Sample records for local dev mode, so the portal shows data immediately. */
export function seedFor(collection: string, tenantId: string): Entity[] {
  const createdAt = new Date().toISOString();
  switch (collection) {
    case "clients":
      return [
        { id: "seed-client-1", tenantId, createdAt, name: "Sample Client — P. & D. Sharma", email: "sharma@example.com", phone: "0400 000 000", notes: "First investment property; QLD focus." } as Entity,
      ];
    case "contacts":
      return [
        { id: "seed-contact-1", tenantId, createdAt, name: "Ash — Mortgage Broker", role: "Mortgage broker", firm: "—", licence: "Credit Rep ######" } as Entity,
      ];
    case "properties":
      return [
        { id: "seed-prop-1", tenantId, createdAt, address: "14 Sample St, Ashfield NSW 2131", state: "NSW", price: 1250000, status: "considering" } as Entity,
      ];
    default:
      return [];
  }
}
