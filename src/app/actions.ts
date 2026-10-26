"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import * as svc from "@/lib/domain/service";
import type { BusinessDocStatus, PropertyStatus } from "@/lib/domain/types";
import { runModel, runStressTest, type ModelInputs } from "@/lib/modelling/run";
import { getPropertyDataProvider } from "@/lib/integrations/property-data";

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

// --- Clients ---
export async function createClientAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const name = s(fd, "name");
  if (!name) return;
  await svc.addClient(tenantId, { name, email: s(fd, "email"), phone: s(fd, "phone"), notes: s(fd, "notes") });
  revalidatePath("/clients");
}
export async function deleteClientAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const id = s(fd, "id");
  if (id) { await svc.removeClient(tenantId, id); revalidatePath("/clients"); }
}
export async function saveClientFinancesAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const id = s(fd, "clientId");
  if (!id) return;
  const finances = {
    grossIncome: n(fd, "grossIncome"),
    partnerIncome: n(fd, "partnerIncome"),
    livingExpMonthly: n(fd, "livingExpMonthly"),
    dependants: n(fd, "dependants"),
    monthlyCommitments: n(fd, "monthlyCommitments"),
    cardLimits: n(fd, "cardLimits"),
    hecsBalance: n(fd, "hecsBalance"),
  };
  await svc.updateClient(tenantId, id, { finances });
  revalidatePath("/modeller");
}
export async function saveRunAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const clientId = s(fd, "clientId");
  if (!clientId) return;
  const client = await svc.getClient(tenantId, clientId);
  if (!client) return;

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
  await svc.addContact(tenantId, { name, role: s(fd, "role"), firm: s(fd, "firm"), email: s(fd, "email"), phone: s(fd, "phone"), licence: s(fd, "licence") });
  revalidatePath("/contacts");
}
export async function deleteContactAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const id = s(fd, "id");
  if (id) { await svc.removeContact(tenantId, id); revalidatePath("/contacts"); }
}

// --- Properties ---
export async function createPropertyAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const address = s(fd, "address");
  if (!address) return;
  await svc.addProperty(tenantId, { address, state: s(fd, "state"), price: n(fd, "price"), status: (s(fd, "status") as PropertyStatus) ?? "considering" });
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
  }
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
  });
  revalidatePath("/business");
}
export async function deleteBusinessDocAction(fd: FormData) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const id = s(fd, "id");
  if (id) { await svc.removeBusinessDoc(tenantId, id); revalidatePath("/business"); }
}
