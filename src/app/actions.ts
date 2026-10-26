"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import * as svc from "@/lib/domain/service";
import type { BusinessDocStatus, PropertyStatus } from "@/lib/domain/types";

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
