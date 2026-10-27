/* Domain / business operations — the records and the operations on them, one
   layer above the repository. UI and server actions call these, never the
   repository directly. */
import { getRepository } from "@/lib/data";
import type { BusinessDocument, Client, Contact, Lender, Lodgement, Property, ReportSnapshot } from "./types";

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
export const getProperty = (tenantId: string, id: string): Promise<Property | null> => getRepository().get<Property>("properties", tenantId, id);
export const addProperty = (tenantId: string, input: { address: string } & Partial<Property>): Promise<Property> =>
  getRepository().create<Property>("properties", { ...input, id: uid(), tenantId, createdAt: nowISO() } as Property);
export const updateProperty = (tenantId: string, id: string, patch: Partial<Property>): Promise<Property | null> =>
  getRepository().update<Property>("properties", tenantId, id, patch);
export const removeProperty = (tenantId: string, id: string): Promise<boolean> => getRepository().remove("properties", tenantId, id);

// --- Lenders (lender / bank products for serviceability) ---
export const listLenders = (tenantId: string): Promise<Lender[]> => getRepository().list<Lender>("lenders", tenantId);
export const getLender = (tenantId: string, id: string): Promise<Lender | null> => getRepository().get<Lender>("lenders", tenantId, id);
export const addLender = (tenantId: string, input: { name: string } & Partial<Lender>): Promise<Lender> =>
  getRepository().create<Lender>("lenders", { ...input, id: uid(), tenantId, createdAt: nowISO() } as Lender);
export const updateLender = (tenantId: string, id: string, patch: Partial<Lender>): Promise<Lender | null> =>
  getRepository().update<Lender>("lenders", tenantId, id, patch);
export const removeLender = (tenantId: string, id: string): Promise<boolean> => getRepository().remove("lenders", tenantId, id);

// --- Lodgements (deal tracking) ---
export const listLodgements = (tenantId: string): Promise<Lodgement[]> => getRepository().list<Lodgement>("lodgements", tenantId);
export const getLodgement = (tenantId: string, id: string): Promise<Lodgement | null> => getRepository().get<Lodgement>("lodgements", tenantId, id);
export const addLodgement = (tenantId: string, input: { payload: Record<string, any>; status: Lodgement["status"] } & Partial<Lodgement>): Promise<Lodgement> =>
  getRepository().create<Lodgement>("lodgements", { ...input, id: uid(), tenantId, createdAt: nowISO() } as Lodgement);
export const updateLodgement = (tenantId: string, id: string, patch: Partial<Lodgement>): Promise<Lodgement | null> =>
  getRepository().update<Lodgement>("lodgements", tenantId, id, patch);
export const removeLodgement = (tenantId: string, id: string): Promise<boolean> => getRepository().remove("lodgements", tenantId, id);

// --- Report snapshots (saved modelling runs on a client's file; append-only) ---
export const listReportSnapshots = (tenantId: string): Promise<ReportSnapshot[]> =>
  getRepository().list<ReportSnapshot>("report_snapshots", tenantId);
export const addReportSnapshot = (
  tenantId: string,
  input: { payload: ReportSnapshot["payload"] } & Partial<ReportSnapshot>,
): Promise<ReportSnapshot> =>
  getRepository().create<ReportSnapshot>("report_snapshots", { ...input, id: uid(), tenantId, createdAt: nowISO() } as ReportSnapshot);

// --- Business documents (business development log) ---
export const listBusinessDocs = (tenantId: string): Promise<BusinessDocument[]> =>
  getRepository().list<BusinessDocument>("business_documents", tenantId);
export const getBusinessDoc = (tenantId: string, id: string): Promise<BusinessDocument | null> =>
  getRepository().get<BusinessDocument>("business_documents", tenantId, id);
export const addBusinessDoc = (tenantId: string, input: { title: string } & Partial<BusinessDocument>): Promise<BusinessDocument> =>
  getRepository().create<BusinessDocument>("business_documents", { ...input, id: uid(), tenantId, createdAt: nowISO() } as BusinessDocument);
export const updateBusinessDoc = (tenantId: string, id: string, patch: Partial<BusinessDocument>): Promise<BusinessDocument | null> =>
  getRepository().update<BusinessDocument>("business_documents", tenantId, id, patch);
export const removeBusinessDoc = (tenantId: string, id: string): Promise<boolean> =>
  getRepository().remove("business_documents", tenantId, id);
