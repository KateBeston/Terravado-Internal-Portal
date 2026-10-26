/* Domain / business operations — the records and the operations on them, one
   layer above the repository. UI and server actions call these, never the
   repository directly. */
import { getRepository } from "@/lib/data";
import type { BusinessDocument, Client, Contact, Property } from "./types";

const uid = (): string =>
  globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const nowISO = (): string => new Date().toISOString();

// --- Clients ---
export const listClients = (tenantId: string): Promise<Client[]> => getRepository().list<Client>("clients", tenantId);
export const getClient = (tenantId: string, id: string): Promise<Client | null> => getRepository().get<Client>("clients", tenantId, id);
export const addClient = (tenantId: string, input: { name: string } & Partial<Client>): Promise<Client> =>
  getRepository().create<Client>("clients", { ...input, id: uid(), tenantId, createdAt: nowISO() } as Client);
export const updateClient = (tenantId: string, id: string, patch: Partial<Client>): Promise<Client | null> =>
  getRepository().update<Client>("clients", tenantId, id, patch);
export const removeClient = (tenantId: string, id: string): Promise<boolean> => getRepository().remove("clients", tenantId, id);

// --- Contacts ---
export const listContacts = (tenantId: string): Promise<Contact[]> => getRepository().list<Contact>("contacts", tenantId);
export const addContact = (tenantId: string, input: { name: string } & Partial<Contact>): Promise<Contact> =>
  getRepository().create<Contact>("contacts", { ...input, id: uid(), tenantId, createdAt: nowISO() } as Contact);
export const removeContact = (tenantId: string, id: string): Promise<boolean> => getRepository().remove("contacts", tenantId, id);

// --- Properties ---
export const listProperties = (tenantId: string): Promise<Property[]> => getRepository().list<Property>("properties", tenantId);
export const addProperty = (tenantId: string, input: { address: string } & Partial<Property>): Promise<Property> =>
  getRepository().create<Property>("properties", { ...input, id: uid(), tenantId, createdAt: nowISO() } as Property);
export const removeProperty = (tenantId: string, id: string): Promise<boolean> => getRepository().remove("properties", tenantId, id);

// --- Business documents (business development log) ---
export const listBusinessDocs = (tenantId: string): Promise<BusinessDocument[]> =>
  getRepository().list<BusinessDocument>("business_documents", tenantId);
export const addBusinessDoc = (tenantId: string, input: { title: string } & Partial<BusinessDocument>): Promise<BusinessDocument> =>
  getRepository().create<BusinessDocument>("business_documents", { ...input, id: uid(), tenantId, createdAt: nowISO() } as BusinessDocument);
export const removeBusinessDoc = (tenantId: string, id: string): Promise<boolean> =>
  getRepository().remove("business_documents", tenantId, id);
