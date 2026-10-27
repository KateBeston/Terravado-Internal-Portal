/* Domain / business operations — the records and the operations on them, one
   layer above the repository. UI and server actions call these, never the
   repository directly. */
import { getRepository } from "@/lib/data";
import type { BusinessDocument, Client, Company, Contact, EntityMember, Lender, Lodgement, OwnershipEntity, PersonDocument, Property, ReportSnapshot } from "./types";

const uid = (): string =>
  globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const nowISO = (): string => new Date().toISOString();

/* --- Clients -------------------------------------------------------------
   Unified since 0011: the person lives in `contacts`; a "client" is a person
   carrying the Borrower role. These names are kept so the Modeller, portfolio,
   deal pack and lodgements (which all key off a client id) are untouched —
   they resolve the same ids against the unified record. */
export const BORROWER_ROLE = "Borrower";
const hasRole = (p: Partial<Contact>, role: string): boolean => (p.roles ?? []).includes(role);

export const listClients = async (tenantId: string): Promise<Client[]> => {
  const people = await getRepository().list<Contact>("contacts", tenantId);
  return people.filter((p) => hasRole(p, BORROWER_ROLE)) as unknown as Client[];
};
export const getClient = (tenantId: string, id: string): Promise<Client | null> =>
  getRepository().get<Client>("contacts", tenantId, id);
export const addClient = (tenantId: string, input: { name: string } & Partial<Client>): Promise<Client> =>
  getRepository().create<Client>("contacts", { roles: [BORROWER_ROLE], ...input, id: uid(), tenantId, createdAt: nowISO() } as unknown as Client);
export const updateClient = (tenantId: string, id: string, patch: Partial<Client>): Promise<Client | null> =>
  getRepository().update<Client>("contacts", tenantId, id, patch);
export const removeClient = (tenantId: string, id: string): Promise<boolean> => getRepository().remove("contacts", tenantId, id);

/* Give an existing person the Borrower role (so they appear as a client and
   gain the financial tabs) without creating a duplicate record. */
export const ensureBorrower = async (tenantId: string, contactId: string): Promise<Contact | null> => {
  const person = await getRepository().get<Contact>("contacts", tenantId, contactId);
  if (!person) return null;
  if (hasRole(person, BORROWER_ROLE)) return person;
  return getRepository().update<Contact>("contacts", tenantId, contactId, { roles: [...(person.roles ?? []), BORROWER_ROLE] });
};

// --- Contacts ---
export const listContacts = (tenantId: string): Promise<Contact[]> => getRepository().list<Contact>("contacts", tenantId);
export const getContact = (tenantId: string, id: string): Promise<Contact | null> => getRepository().get<Contact>("contacts", tenantId, id);
export const addContact = (tenantId: string, input: { name: string } & Partial<Contact>): Promise<Contact> =>
  getRepository().create<Contact>("contacts", { ...input, id: uid(), tenantId, createdAt: nowISO() } as Contact);
export const updateContact = (tenantId: string, id: string, patch: Partial<Contact>): Promise<Contact | null> =>
  getRepository().update<Contact>("contacts", tenantId, id, patch);
export const removeContact = (tenantId: string, id: string): Promise<boolean> => getRepository().remove("contacts", tenantId, id);

/* --- Companies -----------------------------------------------------------
   Unified since 0012: companies and ownership entities are one record, in the
   `entities` collection. These aliases keep the "company" callers (the person
   record's company selector, etc.) resolving against the unified record. */
export const listCompanies = (tenantId: string): Promise<Company[]> =>
  getRepository().list<Company>("entities", tenantId);
export const getCompany = (tenantId: string, id: string): Promise<Company | null> =>
  getRepository().get<Company>("entities", tenantId, id);
export const addCompany = (tenantId: string, input: { name: string } & Partial<Company>): Promise<Company> =>
  getRepository().create<Company>("entities", { ...input, id: uid(), tenantId, createdAt: nowISO() } as Company);
export const updateCompany = (tenantId: string, id: string, patch: Partial<Company>): Promise<Company | null> =>
  getRepository().update<Company>("entities", tenantId, id, patch);
export const removeCompany = (tenantId: string, id: string): Promise<boolean> => getRepository().remove("entities", tenantId, id);

// --- Entity memberships (person <-> entity, each with a role) ---
export const listMembers = (tenantId: string): Promise<EntityMember[]> =>
  getRepository().list<EntityMember>("entity_members", tenantId);
export const addMember = (tenantId: string, input: Partial<EntityMember>): Promise<EntityMember> =>
  getRepository().create<EntityMember>("entity_members", { ...input, id: uid(), tenantId, createdAt: nowISO() } as EntityMember);
export const removeMember = (tenantId: string, id: string): Promise<boolean> => getRepository().remove("entity_members", tenantId, id);

// --- Ownership entities (the unified entity/company record) ---
export const listEntities = (tenantId: string): Promise<OwnershipEntity[]> => getRepository().list<OwnershipEntity>("entities", tenantId);
export const getEntity = (tenantId: string, id: string): Promise<OwnershipEntity | null> => getRepository().get<OwnershipEntity>("entities", tenantId, id);
export const addEntity = (tenantId: string, input: { name: string } & Partial<OwnershipEntity>): Promise<OwnershipEntity> =>
  getRepository().create<OwnershipEntity>("entities", { ...input, id: uid(), tenantId, createdAt: nowISO() } as OwnershipEntity);
export const updateEntity = (tenantId: string, id: string, patch: Partial<OwnershipEntity>): Promise<OwnershipEntity | null> =>
  getRepository().update<OwnershipEntity>("entities", tenantId, id, patch);
export const removeEntity = (tenantId: string, id: string): Promise<boolean> => getRepository().remove("entities", tenantId, id);

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

// --- Person documents (Legal tab — recorded against a person) ---
export const listDocuments = (tenantId: string): Promise<PersonDocument[]> =>
  getRepository().list<PersonDocument>("documents", tenantId);
export const addDocument = (tenantId: string, input: { name: string } & Partial<PersonDocument>): Promise<PersonDocument> =>
  getRepository().create<PersonDocument>("documents", { ...input, id: uid(), tenantId, createdAt: nowISO() } as PersonDocument);
export const removeDocument = (tenantId: string, id: string): Promise<boolean> => getRepository().remove("documents", tenantId, id);

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
