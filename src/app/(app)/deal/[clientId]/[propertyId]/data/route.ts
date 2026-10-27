import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { getClient, getProperty, listLenders } from "@/lib/domain/service";
import { assembleDealPack } from "@/lib/deal/pack";

export const dynamic = "force-dynamic";

/* Downloadable structured deal pack (JSON), grouped to LIXI CAL sections. The
   broker/dev maps this into the lodgement platform's LIXI format once partner
   access is in place. */
export async function GET(_req: Request, { params }: { params: { clientId: string; propertyId: string } }) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const [client, property] = await Promise.all([
    getClient(tenantId, params.clientId),
    getProperty(tenantId, params.propertyId),
  ]);
  if (!client || !property) return new Response("Not found", { status: 404 });

  const engineLenders = (await listLenders(tenantId))
    .filter((l) => l.active !== false)
    .map((l) => ({ id: l.id, name: l.name, isTemplate: false, ...(l.policy ?? {}) }));

  const pack = assembleDealPack(client, property, engineLenders);
  const safe = (property.address || "deal").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 40).toLowerCase();
  return new Response(JSON.stringify(pack, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="terravado-deal-${safe || "export"}.json"`,
    },
  });
}
