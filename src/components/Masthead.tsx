"use client";
import { BRAND } from "@/config/brand";
import { useStore, ROLES, type Role, type View } from "@/lib/store";
import { TAX_DATA, ENGINE_VERSION } from "@/lib/engine/tax-data";

const NAV: [View, string][] = [
  ["portfolio", "Portfolio"], ["property", "Property"], ["clients", "Clients"],
  ["serviceability", "Serviceability"], ["equity", "Equity chain"], ["lenders", "Lenders"],
  ["feasibility", "Feasibility"], ["contacts", "Contacts"], ["audit", "Audit & data"],
];

// Modules delivered so far in the clean rebuild; others are navigable but show
// a short "next increment" note so nothing looks broken.
const READY = new Set<View>(["portfolio", "property", "clients", "serviceability", "equity", "lenders", "feasibility", "contacts", "audit"]);

export default function Masthead() {
  const { ctx, role, setRole, view, setView } = useStore();
  return (
    <header className="mast">
      <div className="mast-in">
        <div className="brand">
          {BRAND.name}<em>.</em>
          <small>{BRAND.tagline}</small>
        </div>
        <div className="mast-right">
          <span>{ctx.properties.length} properties · {TAX_DATA.version} · {ENGINE_VERSION}</span>
          <label style={{ display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
            <span style={{ fontSize: 9, letterSpacing: ".14em", textTransform: "uppercase" }}>Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {(Object.entries(ROLES) as [Role, { label: string }][]).map(([k, r]) => (
                <option key={k} value={k}>{r.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <nav className="nav">
        {NAV.map(([k, l]) => (
          <button key={k} className={view === k ? "on" : ""} onClick={() => setView(k)}>
            {l}{!READY.has(k) && <span style={{ opacity: .5 }}> ·</span>}
          </button>
        ))}
      </nav>
    </header>
  );
}
