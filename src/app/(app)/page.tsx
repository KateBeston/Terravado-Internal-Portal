import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { listClients, listContacts, listProperties } from "@/lib/domain/service";
import { IS_SUPABASE_CONFIGURED } from "@/lib/supabase/config";
import { ENGINE_VERSION, TAX_DATA } from "@/lib/engine/tax-data";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await requireUser();
  const { tenantId, name } = await getCurrentTenant();
  const [clients, contacts, properties] = await Promise.all([
    listClients(tenantId),
    listContacts(tenantId),
    listProperties(tenantId),
  ]);

  return (
    <section>
      <h1>Dashboard</h1>
      <p className="sub">{name} · welcome, {user.name.split(" ")[0]}</p>

      {!IS_SUPABASE_CONFIGURED && (
        <div className="devbanner">
          <strong>Local dev mode.</strong> Supabase isn&apos;t connected, so data is in-memory
          (resets on restart) and auth is bypassed. Add your Supabase keys to <code>.env.local</code>
          to turn on real auth and persistence.
        </div>
      )}

      <div className="cards">
        <div className="card"><div className="k">Clients</div><div className="v">{clients.length}</div></div>
        <div className="card"><div className="k">Contacts</div><div className="v">{contacts.length}</div></div>
        <div className="card"><div className="k">Properties</div><div className="v">{properties.length}</div></div>
      </div>

      <div className="panel">
        <h2>Backend</h2>
        <p className="muted">
          Modelling engine <strong>{ENGINE_VERSION}</strong> and tax data{" "}
          <strong>{TAX_DATA.version}</strong> (effective {TAX_DATA.effectiveFrom}) are ported in and
          verified by the assurance suite. The data layer is{" "}
          <strong>{IS_SUPABASE_CONFIGURED ? "Supabase (multi-tenant, RLS)" : "local-first (in-memory)"}</strong>.
          This portal is the source of truth; client-facing surfaces will read from the same backend.
        </p>
      </div>
    </section>
  );
}
