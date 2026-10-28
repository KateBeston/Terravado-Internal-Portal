"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { ACCOUNT_TYPES, TEAM_ROLES } from "@/lib/auth/capabilities";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import * as svc from "@/lib/domain/service";
import type { BusinessDocStatus, PropertyStatus } from "@/lib/domain/types";
import { runModel, runStressTest, type ModelInputs } from "@/lib/modelling/run";
import { getPropertyDataProvider } from "@/lib/integrations/property-data";
import { assembleDealPack } from "@/lib/deal/pack";
import { getLodgementProvider } from "@/lib/integrations/lodgement";
import type { LodgementStatus } from "@/lib/domain/types";

const s = (fd: FormData, k: string): string | undefined => {
  const v = fd.get(k);
  const t = typeof v === "string" ? v.trim() : "";
  return t === "" ? undefined : t;
};
const n = (fd: FormData, k: string): number | undefined => {
  const v = s(fd, k);
  if (v === undefined) return undefined;
  const num = Number(v.replace(/[,$\s]/g, ""));
  return isFinite(num) ? num : undefined;
};

/* Build a locality patch from the Google Places autocomplete hidden fields, or
   undefined when the address was typed by hand (no place selected). */
function localityFromGeo(fd: FormData): Record<string, any> | undefined {
  const lat = n(fd, "lat"), lng = n(fd, "lng"), placeId = s(fd, "placeId");
  const suburb = s(fd, "geoSuburb"), region = s(fd, "geoState"), postcode = s(fd, "geoPostcode");
  if (lat === undefined && lng === undefined && !placeId && !suburb && !postcode) return undefined;
  const loc: Record<string, any> = {};
  if (lat !== undefined) loc.lat = lat;
  if (lng !== undefined) loc.lng = lng;
  if (placeId) loc.placeId = placeId;
  if (suburb) loc.suburb = suburb;
  if (region) loc.region = region;
  if (postcode) loc.postcode = postcode;
  return loc;
}

// --- Clients ---
export async function createClientAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const name = s(fd, "name");
  if (!name) return;
  await svc.addClient(tenantId, { name, email: s(fd, "email"), phone: s(fd, "phone"), notes: s(fd, "notes") });
  revalidatePath("/clients");
}
export async function updateClientDetailsAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const id = s(fd, "id");
  if (!id) return;
  await svc.updateClient(tenantId, id, { name: s(fd, "name"), email: s(fd, "email"), phone: s(fd, "phone"), notes: s(fd, "notes") });
  revalidatePath(`/clients/${id}`); revalidatePath("/clients");
}
export async function deleteClientAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const id = s(fd, "id");
  if (id) { await svc.removeClient(tenantId, id); revalidatePath("/clients"); }
}
const newId = (): string =>
  globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/* Read-merge-write a person's finances jsonb so structured lists and the
   summary never clobber each other. */
async function withFinances(id: string | undefined, fn: (f: Record<string, any>) => void) {
  if (!id) return;
  const { tenantId } = await getCurrentTenant();
  const person = await svc.getContact(tenantId, id);
  if (!person) return;
  const finances: Record<string, any> = { ...(person.finances ?? {}) };
  fn(finances);
  await svc.updateContact(tenantId, id, { finances });
  revalidatePath(`/contacts/${id}/financials`);
}

export async function saveClientFinancesAction(fd: FormData) {
  await requireUser();
  const id = s(fd, "clientId");
  await withFinances(id, (f) => {
    f.grossIncome = n(fd, "grossIncome");
    f.partnerIncome = n(fd, "partnerIncome");
    f.livingExpMonthly = n(fd, "livingExpMonthly");
    f.dependants = n(fd, "dependants");
    f.monthlyCommitments = n(fd, "monthlyCommitments");
    f.cardLimits = n(fd, "cardLimits");
    f.hecsBalance = n(fd, "hecsBalance");
  });
  revalidatePath("/modeller");
}

// --- Employment ---
export async function addEmploymentAction(fd: FormData) {
  await requireUser();
  await withFinances(s(fd, "personId"), (f) => {
    f.employment = [...(f.employment ?? []), {
      id: newId(), employer: s(fd, "employer"), status: s(fd, "status"), basis: s(fd, "basis"),
      occupation: s(fd, "occupation"), industry: s(fd, "industry"), startDate: s(fd, "startDate"),
      current: s(fd, "current") === "on", onProbation: s(fd, "onProbation") === "on", notes: s(fd, "notes"),
    }];
  });
}
export async function deleteEmploymentAction(fd: FormData) {
  await requireUser();
  const lineId = s(fd, "lineId");
  await withFinances(s(fd, "personId"), (f) => { f.employment = (f.employment ?? []).filter((x: any) => x.id !== lineId); });
}

// --- Income ---
export async function addIncomeAction(fd: FormData) {
  await requireUser();
  await withFinances(s(fd, "personId"), (f) => {
    f.income = [...(f.income ?? []), {
      id: newId(), type: s(fd, "type"), owner: s(fd, "owner"), amount: n(fd, "amount"), frequency: s(fd, "frequency"),
      priorYearAmount: n(fd, "priorYearAmount"), addBacks: n(fd, "addBacks"), notes: s(fd, "notes"),
    }];
  });
}
export async function deleteIncomeAction(fd: FormData) {
  await requireUser();
  const lineId = s(fd, "lineId");
  await withFinances(s(fd, "personId"), (f) => { f.income = (f.income ?? []).filter((x: any) => x.id !== lineId); });
}

// --- Assets ---
export async function addAssetAction(fd: FormData) {
  await requireUser();
  await withFinances(s(fd, "personId"), (f) => {
    f.assets = [...(f.assets ?? []), {
      id: newId(), type: s(fd, "type"), description: s(fd, "description"), value: n(fd, "value"), owner: s(fd, "owner"),
    }];
  });
}
export async function deleteAssetAction(fd: FormData) {
  await requireUser();
  const lineId = s(fd, "lineId");
  await withFinances(s(fd, "personId"), (f) => { f.assets = (f.assets ?? []).filter((x: any) => x.id !== lineId); });
}

// --- Liabilities ---
export async function addLiabilityAction(fd: FormData) {
  await requireUser();
  await withFinances(s(fd, "personId"), (f) => {
    f.liabilities = [...(f.liabilities ?? []), {
      id: newId(), type: s(fd, "type"), description: s(fd, "description"), limit: n(fd, "limit"),
      balance: n(fd, "balance"), repayment: n(fd, "repayment"), frequency: s(fd, "frequency"), owner: s(fd, "owner"),
    }];
  });
}
export async function deleteLiabilityAction(fd: FormData) {
  await requireUser();
  const lineId = s(fd, "lineId");
  await withFinances(s(fd, "personId"), (f) => { f.liabilities = (f.liabilities ?? []).filter((x: any) => x.id !== lineId); });
}
export async function saveRunAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const clientId = s(fd, "clientId");
  if (!clientId) return;
  const client = await svc.getClient(tenantId, clientId);
  if (!client) return;

  // If a property was modelled, carry its saved deep financials into the run so
  // the snapshot reflects the real expenses/loan/depreciation, not seed defaults.
  const propertyId = s(fd, "propertyId");
  const prop = propertyId ? await svc.getProperty(tenantId, propertyId) : null;

  // Re-run the model server-side from the submitted inputs, so the saved
  // snapshot always matches the engine rather than trusting client-sent figures.
  const inputs: ModelInputs = {
    address: s(fd, "address"),
    state: s(fd, "state") ?? "NSW",
    price: n(fd, "price") ?? 0,
    weeklyRent: n(fd, "weeklyRent") ?? 0,
    growthPct: n(fd, "growthPct") ?? 0,
    ratePct: n(fd, "ratePct") ?? 0,
    depositPct: n(fd, "depositPct") ?? 0,
    grossIncome: n(fd, "grossIncome") ?? 0,
    clientName: client.name,
    partnerIncome: n(fd, "partnerIncome"),
    livingExpMonthly: n(fd, "livingExpMonthly"),
    dependants: n(fd, "dependants"),
    monthlyCommitments: n(fd, "monthlyCommitments"),
    cardLimits: n(fd, "cardLimits"),
    hecsBalance: n(fd, "hecsBalance"),
    modelling: prop?.details?.modelling,
  };
  const r = runModel(inputs);
  const stress = runStressTest(inputs);
  await svc.addReportSnapshot(tenantId, {
    clientId,
    title: inputs.address || "Modelled run",
    provenance: { label: r.provenanceLabel },
    payload: {
      address: inputs.address ?? "", state: inputs.state, price: inputs.price, weeklyRent: inputs.weeklyRent,
      depositPct: inputs.depositPct, growthPct: inputs.growthPct, ratePct: inputs.ratePct,
      verdictBand: r.verdict.band, verdictScore: r.verdict.score,
      irr: r.metrics.irr, weekly1: r.metrics.weekly1, grossYield: r.metrics.grossYield,
      valueEnd: r.metrics.valueEnd, equityEnd: r.metrics.equityEnd,
      loan: r.acq.loan, lvr: r.acq.lvr, capacity: r.serviceability.capacity, dti: r.serviceability.dti,
      stressVerdict: stress.verdict, stressMargin: stress.margin,
    },
  });
  revalidatePath("/modeller");
}

// --- Contacts ---
export async function createContactAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const name = s(fd, "name");
  if (!name) return;
  const roles = fd.getAll("roles").map(String).map((r) => r.trim()).filter(Boolean);
  await svc.addContact(tenantId, { name, roles, firm: s(fd, "firm"), email: s(fd, "email"), phone: s(fd, "phone"), licence: s(fd, "licence"), companyId: s(fd, "companyId") });
  revalidatePath("/contacts");
}
export async function updateContactAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const id = s(fd, "id");
  if (!id) return;
  await svc.updateContact(tenantId, id, { name: s(fd, "name"), role: s(fd, "role"), firm: s(fd, "firm"), email: s(fd, "email"), phone: s(fd, "phone"), licence: s(fd, "licence"), companyId: s(fd, "companyId") });
  revalidatePath(`/contacts/${id}`); revalidatePath("/contacts");
}
export async function deleteContactAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const id = s(fd, "id");
  if (id) { await svc.removeContact(tenantId, id); revalidatePath("/contacts"); }
}

/* The person record's Details tab — core contact fields, roles, and personal
   detail (stored in the `details` jsonb). One action covers the whole form. */
export async function updatePersonAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const id = s(fd, "id");
  if (!id) return;
  const roles = fd.getAll("roles").map(String).map((r) => r.trim()).filter(Boolean);
  const details = {
    firstName: s(fd, "firstName"), lastName: s(fd, "lastName"), dob: s(fd, "dob"),
    residency: s(fd, "residency"), maritalStatus: s(fd, "maritalStatus"),
    addressLine: s(fd, "addressLine"), suburb: s(fd, "suburb"), state: s(fd, "state"), postcode: s(fd, "postcode"),
    preferredContact: s(fd, "preferredContact"), occupation: s(fd, "occupation"),
    idType: s(fd, "idType"), idNumber: s(fd, "idNumber"),
  };
  await svc.updateContact(tenantId, id, {
    name: s(fd, "name"), email: s(fd, "email"), phone: s(fd, "phone"), notes: s(fd, "notes"),
    firm: s(fd, "firm"), licence: s(fd, "licence"), companyId: s(fd, "companyId"), roles, details,
  });
  revalidatePath(`/contacts/${id}`, "layout");
  revalidatePath("/contacts"); revalidatePath("/clients");
}

// --- Person documents (Legal tab) ---
export async function createDocumentAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const clientId = s(fd, "clientId");
  const name = s(fd, "name");
  if (!clientId || !name) return;
  await svc.addDocument(tenantId, { clientId, name, kind: s(fd, "kind"), storagePath: s(fd, "storagePath") });
  revalidatePath(`/contacts/${clientId}/legal`);
}
export async function deleteDocumentAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const id = s(fd, "id");
  const clientId = s(fd, "clientId");
  if (id) { await svc.removeDocument(tenantId, id); if (clientId) revalidatePath(`/contacts/${clientId}/legal`); }
}

// --- Properties ---
export async function createPropertyAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const address = s(fd, "address");
  if (!address) return;
  const geoState = s(fd, "geoState");
  const loc = localityFromGeo(fd);
  await svc.addProperty(tenantId, {
    address, state: geoState ?? s(fd, "state"), price: n(fd, "price"),
    status: (s(fd, "status") as PropertyStatus) ?? "considering", clientId: s(fd, "clientId"),
    ...(loc ? { details: { locality: loc } } : {}),
  });
  revalidatePath("/properties");
  revalidatePath("/portfolio");
}
export async function updatePropertyClientAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const id = s(fd, "id");
  if (!id) return;
  await svc.updateProperty(tenantId, id, { clientId: s(fd, "clientId") ?? undefined });
  revalidatePath(`/properties/${id}`, "layout");
  revalidatePath("/portfolio");
}
export async function updatePropertyCoreAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const id = s(fd, "id");
  if (!id) return;
  const geoState = s(fd, "geoState");
  const loc = localityFromGeo(fd);
  const patch: Record<string, any> = {
    address: s(fd, "address"), state: geoState ?? s(fd, "state"), price: n(fd, "price"),
    status: (s(fd, "status") as PropertyStatus) ?? undefined, entityId: s(fd, "entityId") ?? undefined,
  };
  if (loc) {
    const current = await svc.getProperty(tenantId, id);
    const details = { ...(current?.details ?? {}) };
    details.locality = { ...(details.locality ?? {}), ...loc };
    patch.details = details;
  }
  await svc.updateProperty(tenantId, id, patch);
  revalidatePath(`/properties/${id}`, "layout");
  revalidatePath("/properties");
}
export async function deletePropertyAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const id = s(fd, "id");
  if (id) { await svc.removeProperty(tenantId, id); revalidatePath("/properties"); }
}

// --- Property record detail (tabbed) ---
export async function savePropertyDetailsAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const id = s(fd, "id"); const section = s(fd, "section");
  if (!id || !section) return;
  const p = await svc.getProperty(tenantId, id); if (!p) return;
  const details = { ...(p.details ?? {}) };
  if (section === "title") {
    details.title = { ...(details.title ?? {}),
      titleRef: s(fd, "titleRef"), lotDp: s(fd, "lotDp"), zoning: s(fd, "zoning"),
      heritage: s(fd, "heritage") === "on" || s(fd, "heritage") === "true",
      heritageNote: s(fd, "heritageNote") };
  } else if (section === "locality") {
    details.locality = { ...(details.locality ?? {}),
      suburb: s(fd, "suburb"), locality: s(fd, "locality"), region: s(fd, "region"), postcode: s(fd, "postcode"),
      suburbMedian: n(fd, "suburbMedian"), suburbMedianRent: n(fd, "suburbMedianRent"),
      vacancyPct: n(fd, "vacancyPct"), daysToLease: n(fd, "daysToLease"),
      popGrowthPct: n(fd, "popGrowthPct"), annualGrowthPct: n(fd, "annualGrowthPct"),
      transport: s(fd, "transport"), notes: s(fd, "notes"), source: "manual" };
  } else if (section === "physical") {
    details.physical = { ...(details.physical ?? {}),
      type: s(fd, "type"), beds: n(fd, "beds"), baths: n(fd, "baths"), cars: n(fd, "cars"),
      landSize: n(fd, "landSize"), internalArea: n(fd, "internalArea"), buildYear: n(fd, "buildYear"),
      construction: s(fd, "construction"), notes: s(fd, "notes") };
  } else if (section === "rent") {
    details.weeklyRent = n(fd, "weeklyRent");
  }
  await svc.updateProperty(tenantId, id, { details });
  revalidatePath(`/properties/${id}`, "layout");
}

export async function addPropertyListItemAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const id = s(fd, "id"); const list = s(fd, "list");
  if (!id || !list) return;
  const p = await svc.getProperty(tenantId, id); if (!p) return;
  const details = { ...(p.details ?? {}) };
  if (list === "sales") {
    details.sales = [...(details.sales ?? []), { date: s(fd, "date"), price: n(fd, "price"), method: s(fd, "method"), note: s(fd, "note") }];
  } else if (list === "easements") {
    const title = { ...(details.title ?? {}) };
    title.easements = [...(title.easements ?? []), { type: s(fd, "type"), beneficiary: s(fd, "beneficiary"), width: n(fd, "width"), note: s(fd, "note") }];
    details.title = title;
  } else if (list === "encumbrances") {
    const title = { ...(details.title ?? {}) };
    title.encumbrances = [...(title.encumbrances ?? []), { type: s(fd, "type"), detail: s(fd, "detail"), impact: s(fd, "impact") }];
    details.title = title;
  } else if (list === "expenses") {
    const mod = { ...(details.modelling ?? {}) };
    mod.expenses = [...(mod.expenses ?? []), { name: s(fd, "name"), amount: n(fd, "amount"), freq: s(fd, "freq") ?? "Annual", ded: s(fd, "ded") !== "false" }];
    details.modelling = mod;
  } else if (list === "capex") {
    const mod = { ...(details.modelling ?? {}) };
    mod.capex = [...(mod.capex ?? []), { year: n(fd, "year"), name: s(fd, "name"), cost: n(fd, "cost"), upliftPct: n(fd, "upliftPct"), rentUplift: n(fd, "rentUplift") }];
    details.modelling = mod;
  }
  await svc.updateProperty(tenantId, id, { details });
  revalidatePath(`/properties/${id}`, "layout");
}

export async function removePropertyListItemAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const id = s(fd, "id"); const list = s(fd, "list"); const idx = Number(s(fd, "index"));
  if (!id || !list || !isFinite(idx)) return;
  const p = await svc.getProperty(tenantId, id); if (!p) return;
  const details = { ...(p.details ?? {}) };
  if (list === "sales") {
    const a = [...(details.sales ?? [])]; a.splice(idx, 1); details.sales = a;
  } else if (list === "easements") {
    const title = { ...(details.title ?? {}) }; const a = [...(title.easements ?? [])]; a.splice(idx, 1); title.easements = a; details.title = title;
  } else if (list === "encumbrances") {
    const title = { ...(details.title ?? {}) }; const a = [...(title.encumbrances ?? [])]; a.splice(idx, 1); title.encumbrances = a; details.title = title;
  } else if (list === "expenses") {
    const mod = { ...(details.modelling ?? {}) }; const a = [...(mod.expenses ?? [])]; a.splice(idx, 1); mod.expenses = a; details.modelling = mod;
  } else if (list === "capex") {
    const mod = { ...(details.modelling ?? {}) }; const a = [...(mod.capex ?? [])]; a.splice(idx, 1); mod.capex = a; details.modelling = mod;
  }
  await svc.updateProperty(tenantId, id, { details });
  revalidatePath(`/properties/${id}`, "layout");
}

/* Deep financial inputs for a property — saved per section into details.modelling. */
export async function savePropertyModellingAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const id = s(fd, "id"); const section = s(fd, "section");
  if (!id || !section) return;
  const p = await svc.getProperty(tenantId, id); if (!p) return;
  const details = { ...(p.details ?? {}) };
  const mod = { ...(details.modelling ?? {}) };
  if (section === "income") {
    mod.otherIncome = n(fd, "otherIncome"); mod.pmFeePct = n(fd, "pmFeePct");
    mod.lettingWeeks = n(fd, "lettingWeeks"); mod.vacancyWeeks = n(fd, "vacancyWeeks");
  } else if (section === "loan") {
    mod.repaymentType = s(fd, "repaymentType"); mod.ioYears = n(fd, "ioYears"); mod.termYears = n(fd, "termYears");
    mod.offsetBalance = n(fd, "offsetBalance"); mod.annualPackageFee = n(fd, "annualPackageFee");
  } else if (section === "entry") {
    mod.otherPurchaseCosts = n(fd, "otherPurchaseCosts");
    mod.capitaliseLmi = s(fd, "capitaliseLmi") === "on" || s(fd, "capitaliseLmi") === "true";
  } else if (section === "dep") {
    mod.depMode = s(fd, "depMode"); mod.plantValue = n(fd, "plantValue"); mod.constructionCost = n(fd, "constructionCost");
  }
  details.modelling = mod;
  await svc.updateProperty(tenantId, id, { details });
  revalidatePath(`/properties/${id}`, "layout");
}

/* Integration seam — pull suburb data from the active property-data provider
   (the stub until CoreLogic/VG/ABS keys are configured) into the Locality tab,
   stamped with its source and as-at date. */
export async function pullLocalityAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const id = s(fd, "id"); if (!id) return;
  const p = await svc.getProperty(tenantId, id); if (!p) return;
  const loc = p.details?.locality?.locality || p.details?.locality?.suburb || p.address;
  const state = p.state || p.details?.locality?.region || "NSW";
  const snap = await getPropertyDataProvider().suburbSnapshot(loc, state);
  const details = { ...(p.details ?? {}) };
  details.locality = { ...(details.locality ?? {}),
    suburbMedian: snap.medianPrice ?? details.locality?.suburbMedian,
    vacancyPct: snap.vacancyPct ?? details.locality?.vacancyPct,
    annualGrowthPct: snap.annualGrowthPct ?? details.locality?.annualGrowthPct,
    source: snap.source, asAt: snap.asAt };
  await svc.updateProperty(tenantId, id, { details });
  revalidatePath(`/properties/${id}`, "layout");
}

// --- Business documents ---
export async function createBusinessDocAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const title = s(fd, "title");
  if (!title) return;
  await svc.addBusinessDoc(tenantId, {
    title,
    category: s(fd, "category"),
    summary: s(fd, "summary"),
    status: (s(fd, "status") as BusinessDocStatus) ?? "active",
    link: s(fd, "link"),
    content: s(fd, "content"),
  });
  revalidatePath("/business");
}
export async function updateBusinessDocAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const id = s(fd, "id");
  if (!id) return;
  await svc.updateBusinessDoc(tenantId, id, {
    summary: s(fd, "summary"),
    status: (s(fd, "status") as BusinessDocStatus) ?? undefined,
    link: s(fd, "link"),
    content: s(fd, "content"),
  });
  revalidatePath(`/business/${id}`);
  revalidatePath("/business");
}
export async function deleteBusinessDocAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const id = s(fd, "id");
  if (id) { await svc.removeBusinessDoc(tenantId, id); revalidatePath("/business"); }
}

// --- Lenders (lender / bank products) ---
function lenderPolicyFromForm(fd: FormData) {
  return {
    bufferPct: n(fd, "bufferPct"), floorPct: n(fd, "floorPct"), varRate: n(fd, "varRate"), ioLoading: n(fd, "ioLoading"),
    rentShadePct: n(fd, "rentShadePct"), otShadePct: n(fd, "otShadePct"), bonusShadePct: n(fd, "bonusShadePct"),
    commissionShadePct: n(fd, "commissionShadePct"), selfEmpShadePct: n(fd, "selfEmpShadePct"),
    ngAddBack: s(fd, "ngAddBack") === "on" || s(fd, "ngAddBack") === "true",
    hemMonthly: n(fd, "hemMonthly"), hemPerDependant: n(fd, "hemPerDependant"), hemIncomeScale: n(fd, "hemIncomeScale"),
    cardAssessPct: n(fd, "cardAssessPct"),
    hecsAssessed: s(fd, "hecsAssessed") === "on" || s(fd, "hecsAssessed") === "true",
    existingDebtAssess: s(fd, "existingDebtAssess") ?? "Assessed",
    maxLVR: n(fd, "maxLVR"), maxDTI: n(fd, "maxDTI"),
    estFee: n(fd, "estFee"), valFee: n(fd, "valFee"), annualFee: n(fd, "annualFee"), lmiFactor: n(fd, "lmiFactor"),
  };
}
const DEFAULT_LENDER_POLICY = {
  bufferPct: 3.0, floorPct: 5.5, varRate: 6.1, ioLoading: 0.25,
  rentShadePct: 20, otShadePct: 20, bonusShadePct: 20, commissionShadePct: 20, selfEmpShadePct: 0,
  ngAddBack: true, hemMonthly: 3400, hemPerDependant: 520, hemIncomeScale: 0.06,
  cardAssessPct: 3.8, hecsAssessed: true, existingDebtAssess: "Assessed",
  maxLVR: 90, maxDTI: 7.0, estFee: 600, valFee: 300, annualFee: 395, lmiFactor: 1.0,
};
export async function createLenderAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const name = s(fd, "name");
  if (!name) return;
  // New products start from sensible defaults; the full policy is then tuned on
  // the lender's edit page.
  await svc.addLender(tenantId, {
    name, kind: s(fd, "kind"),
    active: s(fd, "active") !== "false",
    policy: DEFAULT_LENDER_POLICY,
  });
  revalidatePath("/lenders");
}
export async function updateLenderAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const id = s(fd, "id");
  if (!id) return;
  await svc.updateLender(tenantId, id, {
    name: s(fd, "name"), kind: s(fd, "kind"),
    active: s(fd, "active") !== "false",
    policy: lenderPolicyFromForm(fd),
  });
  revalidatePath(`/lenders/${id}`);
  revalidatePath("/lenders");
}
export async function deleteLenderAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const id = s(fd, "id");
  if (id) { await svc.removeLender(tenantId, id); revalidatePath("/lenders"); }
}

// --- Lodgements (deal tracking) ---
export async function lodgeDealAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const clientId = s(fd, "clientId");
  const propertyId = s(fd, "propertyId");
  if (!clientId || !propertyId) return;
  const [client, property] = await Promise.all([svc.getClient(tenantId, clientId), svc.getProperty(tenantId, propertyId)]);
  if (!client || !property) return;
  const engineLenders = (await svc.listLenders(tenantId))
    .filter((l) => l.active !== false)
    .map((l) => ({ id: l.id, name: l.name, isTemplate: false, ...(l.policy ?? {}) }));
  const pack = assembleDealPack(client, property, engineLenders);
  const submission = await getLodgementProvider().submit(pack);
  await svc.addLodgement(tenantId, {
    clientId, propertyId,
    status: submission.status as LodgementStatus,
    channel: submission.channel,
    reference: submission.reference,
    payload: pack as unknown as Record<string, any>,
    notes: submission.validation.ok ? undefined : `Validation: ${submission.validation.issues.join("; ")}`,
  });
  revalidatePath("/lodgements");
}
export async function updateLodgementStatusAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const id = s(fd, "id");
  const status = s(fd, "status") as LodgementStatus | undefined;
  if (!id || !status) return;
  await svc.updateLodgement(tenantId, id, { status, updatedAt: new Date().toISOString() });
  revalidatePath("/lodgements");
}
export async function deleteLodgementAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const id = s(fd, "id");
  if (id) { await svc.removeLodgement(tenantId, id); revalidatePath("/lodgements"); }
}

// --- Companies (network organisations) ---
export async function createCompanyAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const name = s(fd, "name");
  if (!name) return;
  await svc.addCompany(tenantId, { name, kind: s(fd, "kind"), abn: s(fd, "abn"), phone: s(fd, "phone"), email: s(fd, "email"), website: s(fd, "website"), notes: s(fd, "notes") });
  revalidatePath("/companies");
}
export async function updateCompanyAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const id = s(fd, "id");
  if (!id) return;
  await svc.updateCompany(tenantId, id, { name: s(fd, "name"), kind: s(fd, "kind"), abn: s(fd, "abn"), phone: s(fd, "phone"), email: s(fd, "email"), website: s(fd, "website"), notes: s(fd, "notes") });
  revalidatePath(`/companies/${id}`); revalidatePath("/companies");
}
export async function deleteCompanyAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const id = s(fd, "id");
  if (id) { await svc.removeCompany(tenantId, id); revalidatePath("/companies"); }
}

// --- Account settings ---
export async function updateAccountTypeAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const accountType = s(fd, "accountType");
  if (!tenantId || !accountType) return;
  if (!ACCOUNT_TYPES.some((t) => t.value === accountType)) return; // only known types
  const sb = createClient();
  // RLS (tenants_update) restricts this to owners/admins of the tenant.
  await sb.from("tenants").update({ account_type: accountType }).eq("id", tenantId);
  revalidatePath("/", "layout");
  revalidatePath("/account");
}
export async function updateMemberRoleAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const userId = s(fd, "userId");
  const role = s(fd, "role");
  if (!tenantId || !userId || !role) return;
  if (!(TEAM_ROLES as readonly string[]).includes(role)) return;
  const sb = createClient();
  // RLS (memberships_update) restricts this to owners/admins of the tenant.
  await sb.from("memberships").update({ role }).eq("tenant_id", tenantId).eq("user_id", userId);
  revalidatePath("/", "layout");
  revalidatePath("/account");
}

// --- Platform admin (internal Terravado team) — all RPCs re-check admin server-side ---
export async function adminSetAccountTypeAction(fd: FormData) {
  await requireUser();
  const tenant = s(fd, "tenantId");
  const type = s(fd, "accountType");
  if (!tenant || !type) return;
  const sb = createClient();
  await sb.rpc("admin_set_account_type", { p_tenant: tenant, p_type: type });
  revalidatePath("/admin"); revalidatePath(`/admin/${tenant}`); revalidatePath("/", "layout");
}
export async function adminSetMemberRoleAction(fd: FormData) {
  await requireUser();
  const tenant = s(fd, "tenantId");
  const userId = s(fd, "userId");
  const role = s(fd, "role");
  if (!tenant || !userId || !role) return;
  const sb = createClient();
  await sb.rpc("admin_set_member_role", { p_tenant: tenant, p_user: userId, p_role: role });
  revalidatePath(`/admin/${tenant}`); revalidatePath("/", "layout");
}
export async function adminAddMemberAction(fd: FormData) {
  await requireUser();
  const tenant = s(fd, "tenantId");
  const userId = s(fd, "userId");
  const role = s(fd, "role") ?? "viewer";
  if (!tenant || !userId) return;
  const sb = createClient();
  await sb.rpc("admin_add_member", { p_tenant: tenant, p_user: userId, p_role: role });
  revalidatePath(`/admin/${tenant}`);
}

// --- Developments (developer stock) ---
export async function createDevelopmentAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const name = s(fd, "name");
  if (!name) return;
  await svc.addDevelopment(tenantId, {
    name, developer: s(fd, "developer"), suburb: s(fd, "suburb"), state: s(fd, "state"),
    commissionPct: n(fd, "commissionPct"), commissionFlat: n(fd, "commissionFlat"),
    stockListUrl: s(fd, "stockListUrl"), notes: s(fd, "notes"),
  });
  revalidatePath("/stock");
}
export async function updateDevelopmentAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const id = s(fd, "id");
  if (!id) return;
  await svc.updateDevelopment(tenantId, id, {
    name: s(fd, "name"), developer: s(fd, "developer"), suburb: s(fd, "suburb"), state: s(fd, "state"),
    commissionPct: n(fd, "commissionPct"), commissionFlat: n(fd, "commissionFlat"),
    stockListUrl: s(fd, "stockListUrl"), status: s(fd, "status"), notes: s(fd, "notes"),
  });
  revalidatePath(`/stock/${id}`); revalidatePath("/stock");
}
export async function deleteDevelopmentAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const id = s(fd, "id");
  if (id) { await svc.removeDevelopment(tenantId, id); revalidatePath("/stock"); }
}

// --- Lots (stock) ---
export async function createLotAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const developmentId = s(fd, "developmentId");
  if (!developmentId) return;
  await svc.addLot(tenantId, {
    developmentId, lotNumber: s(fd, "lotNumber"), address: s(fd, "address"), stage: s(fd, "stage"),
    price: n(fd, "price"), status: s(fd, "status") ?? "available",
    beds: n(fd, "beds"), baths: n(fd, "baths"), cars: n(fd, "cars"), landSize: n(fd, "landSize"),
    advertisedRent: n(fd, "advertisedRent"), advertisedYieldPct: n(fd, "advertisedYieldPct"),
    advertisedRoi: s(fd, "advertisedRoi"), notes: s(fd, "notes"),
  });
  revalidatePath(`/stock/${developmentId}`);
}
export async function deleteLotAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const id = s(fd, "id");
  const developmentId = s(fd, "developmentId");
  if (id) { await svc.removeLot(tenantId, id); if (developmentId) revalidatePath(`/stock/${developmentId}`); }
}
/* Bulk-create lots from the import confirm table (rows is a JSON array the
   StockImport component builds from pasted/extracted stock). */
export async function importLotsAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const developmentId = s(fd, "developmentId");
  const rowsRaw = s(fd, "rows");
  if (!developmentId || !rowsRaw) return;
  let rows: any[] = [];
  try { rows = JSON.parse(rowsRaw); } catch { return; }
  const str = (x: any) => { const t = typeof x === "string" ? x.trim() : x == null ? "" : String(x).trim(); return t === "" ? undefined : t; };
  const num = (x: any) => { if (x === undefined || x === null || x === "") return undefined; const v = Number(String(x).replace(/[,$\s]/g, "")); return isFinite(v) ? v : undefined; };
  for (const r of Array.isArray(rows) ? rows : []) {
    if (!r || (str(r.lotNumber) === undefined && str(r.address) === undefined && num(r.price) === undefined)) continue;
    await svc.addLot(tenantId, {
      developmentId, lotNumber: str(r.lotNumber), address: str(r.address), stage: str(r.stage),
      price: num(r.price), status: "available",
      beds: num(r.beds), baths: num(r.baths), cars: num(r.cars), landSize: num(r.landSize),
      advertisedRent: num(r.advertisedRent), advertisedYieldPct: num(r.advertisedYieldPct),
    });
  }
  revalidatePath(`/stock/${developmentId}`);
}

// --- Advisor deals (sales pipeline / commissions) ---
export async function createDealAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  let salePrice = n(fd, "salePrice");
  const lotId = s(fd, "lotId");
  const label = s(fd, "propertyLabel");
  if (!salePrice && !lotId && !label) return;
  let developmentId = s(fd, "developmentId");
  let commissionPct = n(fd, "commissionPct");
  let commissionFlat = n(fd, "commissionFlat");
  // Resolve development + default sale price and commission from the chosen lot.
  if (lotId) {
    const lot = await svc.getLot(tenantId, lotId);
    if (lot) {
      developmentId = developmentId ?? lot.developmentId;
      if (salePrice === undefined) salePrice = lot.price;
      if (commissionPct === undefined && commissionFlat === undefined && lot.developmentId) {
        const dev = await svc.getDevelopment(tenantId, lot.developmentId);
        commissionPct = dev?.commissionPct; commissionFlat = dev?.commissionFlat;
      }
    }
  }
  await svc.addDeal(tenantId, {
    lotId, developmentId, clientId: s(fd, "clientId"),
    propertyLabel: label, salePrice, commissionPct, commissionFlat,
    stage: s(fd, "stage") ?? "lead", expectedSettlement: s(fd, "expectedSettlement"), notes: s(fd, "notes"),
  });
  revalidatePath("/pipeline");
}
export async function updateDealStageAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const id = s(fd, "id");
  const stage = s(fd, "stage");
  if (!id || !stage) return;
  await svc.updateDeal(tenantId, id, { stage });
  revalidatePath("/pipeline");
}
export async function deleteDealAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const id = s(fd, "id");
  if (id) { await svc.removeDeal(tenantId, id); revalidatePath("/pipeline"); }
}

// --- Deal sharing (external guests) ---
export async function createShareAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const user = await getUser();
  const clientId = s(fd, "clientId");
  const email = s(fd, "invitedEmail");
  const permission = s(fd, "permission") ?? "view";
  if (!tenantId || !clientId || !email) return;
  const token = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/-/g, "");
  const sb = createClient();
  // RLS (deal_shares_host) restricts inserts to the caller's tenant.
  await sb.from("deal_shares").insert({
    host_tenant_id: tenantId, client_id: clientId, invited_email: email.toLowerCase(),
    permission, status: "invited", token, created_by: user?.id ?? null,
  });
  revalidatePath(`/contacts/${clientId}/sharing`);
}
export async function revokeShareAction(fd: FormData) {
  await requireUser();
  const id = s(fd, "id");
  const clientId = s(fd, "clientId");
  if (!id) return;
  const sb = createClient();
  await sb.from("deal_shares").update({ status: "revoked" }).eq("id", id);
  if (clientId) revalidatePath(`/contacts/${clientId}/sharing`);
}
export async function acceptShareAction(fd: FormData) {
  await requireUser();
  const token = s(fd, "token");
  if (!token) return;
  const sb = createClient();
  const { data, error } = await sb.rpc("accept_deal_share", { p_token: token });
  if (error) redirect("/shared?error=1");
  redirect(data ? `/shared/${data}` : "/shared");
}

// --- Ownership entities ---
export async function createEntityAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const name = s(fd, "name");
  if (!name) return;
  await svc.addEntity(tenantId, { name, kind: s(fd, "kind"), region: s(fd, "region"), abn: s(fd, "abn"), phone: s(fd, "phone"), email: s(fd, "email"), website: s(fd, "website"), clientId: s(fd, "clientId"), notes: s(fd, "notes") });
  revalidatePath("/entities");
}
export async function updateEntityAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const id = s(fd, "id");
  if (!id) return;
  await svc.updateEntity(tenantId, id, { name: s(fd, "name"), kind: s(fd, "kind"), region: s(fd, "region"), abn: s(fd, "abn"), phone: s(fd, "phone"), email: s(fd, "email"), website: s(fd, "website"), clientId: s(fd, "clientId"), notes: s(fd, "notes") });
  revalidatePath(`/entities/${id}`, "layout"); revalidatePath("/entities");
}
export async function deleteEntityAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const id = s(fd, "id");
  if (id) { await svc.removeEntity(tenantId, id); revalidatePath("/entities"); }
}

// --- Entity memberships (person <-> entity, with a role) ---
export async function addMemberAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const entityId = s(fd, "entityId");
  const contactId = s(fd, "contactId");
  if (!entityId || !contactId) return;
  await svc.addMember(tenantId, {
    entityId, contactId, role: s(fd, "role"),
    isPrimary: s(fd, "isPrimary") === "on", maySign: s(fd, "maySign") === "on", notes: s(fd, "notes"),
  });
  revalidatePath(`/entities/${entityId}/people`);
  if (contactId) revalidatePath(`/contacts/${contactId}/company`);
}
export async function deleteMemberAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const id = s(fd, "id");
  const entityId = s(fd, "entityId");
  const contactId = s(fd, "contactId");
  if (id) {
    await svc.removeMember(tenantId, id);
    if (entityId) revalidatePath(`/entities/${entityId}/people`);
    if (contactId) revalidatePath(`/contacts/${contactId}/company`);
  }
}
