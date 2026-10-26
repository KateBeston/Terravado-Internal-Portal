"use client";
/* ===========================================================================
   TERRAVADO — application store.
   Holds the engine data context + UI state (role, current view, selected
   records). Seeded in-memory for now; the shape is a clean seam for Supabase:
   swap `seedContext()` for a loader that reads the tenant's rows, and the
   `update` calls for writes, without touching the views.
   =========================================================================== */
import React, { createContext, useContext, useMemo, useState, useCallback } from "react";
import type { EngineContext } from "./engine/engine";
import { seedContext } from "./engine/seeds";
import { ENGINE_VERSION } from "./engine/tax-data";

export type Role = "admin" | "advisor" | "broker" | "client" | "public";
export const ROLES: Record<Role, { label: string; rank: number }> = {
  admin: { label: "Admin / principal", rank: 5 },
  advisor: { label: "Property investment advisor", rank: 4 },
  broker: { label: "Mortgage broker", rank: 3 },
  client: { label: "Client (investor)", rank: 2 },
  public: { label: "Public / prospect", rank: 1 },
};

export type View =
  | "portfolio" | "property" | "clients" | "serviceability"
  | "equity" | "lenders" | "feasibility" | "contacts" | "audit";

interface StoreValue {
  ctx: EngineContext;
  role: Role;
  setRole: (r: Role) => void;
  view: View;
  setView: (v: View) => void;
  propertyId: string | null;
  setPropertyId: (id: string | null) => void;
  /** Mutate a property by id with a producer, triggering a re-render. */
  updateProperty: (id: string, mut: (p: any) => void) => void;
  duplicateProperty: (id: string) => void;
  deleteProperty: (id: string) => void;
  addProperty: () => void;
  clientId: string | null;
  setClientId: (id: string | null) => void;
  updateClient: (id: string, mut: (c: any) => void) => void;
  addClient: () => void;
  updateLender: (id: string, mut: (l: any) => void) => void;
  addLender: () => void;
  deleteLender: (id: string) => void;
  feasId: string | null;
  setFeasId: (id: string | null) => void;
  updateFeasibility: (id: string, mut: (f: any) => void) => void;
  addFeasibility: () => void;
  updateContact: (i: number, field: string, val: any) => void;
  addContact: () => void;
  deleteContact: (i: number) => void;
  updateEntity: (i: number, field: string, val: any) => void;
  addEntity: () => void;
  deleteEntity: (i: number) => void;
  audit: any[];
  logEvent: (action: string) => void;
  exportJson: () => string;
  importJson: (text: string) => boolean;
  resetData: () => void;
  bump: number;
}

let _uid = 0;
const uid = (p = "id") => `${p}_${Date.now().toString(36)}${(_uid++).toString(36)}`;

const Ctx = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<EngineContext>(() => seedContext());
  const [audit, setAudit] = useState<any[]>(() => [{ ts: new Date().toISOString(), role: "admin", action: "Session started", engine: ENGINE_VERSION }]);
  const [role, setRole] = useState<Role>("admin");
  const [view, setView] = useState<View>("portfolio");
  const [propertyId, setPropertyId] = useState<string | null>(() => data.properties[0]?.id ?? null);
  const [clientId, setClientId] = useState<string | null>(() => data.clients[0]?.id ?? null);
  const [feasId, setFeasId] = useState<string | null>(() => data.feasibilities[0]?.id ?? null);
  const [bump, setBump] = useState(0);

  const updateProperty = useCallback((id: string, mut: (p: any) => void) => {
    const p = data.properties.find((x) => x.id === id);
    if (p) { mut(p); setBump((b) => b + 1); }
  }, [data]);

  const duplicateProperty = useCallback((id: string) => {
    const p = data.properties.find((x) => x.id === id);
    if (!p) return;
    const copy = JSON.parse(JSON.stringify(p));
    copy.id = uid("prop");
    copy.label = (p.label || "Property") + " (copy)";
    copy.status = "Appraised";
    data.properties.push(copy);
    setPropertyId(copy.id);
    setBump((b) => b + 1);
  }, [data]);

  const deleteProperty = useCallback((id: string) => {
    const i = data.properties.findIndex((x) => x.id === id);
    if (i < 0 || data.properties.length <= 1) return;
    data.properties.splice(i, 1);
    setPropertyId(data.properties[0]?.id ?? null);
    setBump((b) => b + 1);
  }, [data]);

  const addProperty = useCallback(() => {
    const base = data.properties[0];
    const fresh = JSON.parse(JSON.stringify(base));
    fresh.id = uid("prop");
    fresh.label = "New property";
    fresh.status = "Pipeline";
    data.properties.push(fresh);
    setPropertyId(fresh.id);
    setBump((b) => b + 1);
  }, [data]);

  const updateClient = useCallback((id: string, mut: (c: any) => void) => {
    const c = data.clients.find((x) => x.id === id);
    if (c) { mut(c); setBump((b) => b + 1); }
  }, [data]);

  const addClient = useCallback(() => {
    const base = data.clients[0];
    const fresh = JSON.parse(JSON.stringify(base));
    fresh.id = uid("cli");
    fresh.name = "New client";
    data.clients.push(fresh);
    setClientId(fresh.id);
    setBump((b) => b + 1);
  }, [data]);

  const updateLender = useCallback((id: string, mut: (l: any) => void) => {
    const l = data.lenders.find((x) => x.id === id);
    if (l) { mut(l); setBump((b) => b + 1); }
  }, [data]);

  const addLender = useCallback(() => {
    const base = data.lenders[0];
    const fresh = JSON.parse(JSON.stringify(base));
    fresh.id = uid("len");
    fresh.name = "New lender template";
    data.lenders.push(fresh);
    setBump((b) => b + 1);
  }, [data]);

  const deleteLender = useCallback((id: string) => {
    const i = data.lenders.findIndex((x) => x.id === id);
    if (i < 0 || data.lenders.length <= 1) return;
    data.lenders.splice(i, 1);
    setBump((b) => b + 1);
  }, [data]);

  const updateFeasibility = useCallback((id: string, mut: (f: any) => void) => {
    const f = data.feasibilities.find((x) => x.id === id);
    if (f) { mut(f); setBump((b) => b + 1); }
  }, [data]);

  const addFeasibility = useCallback(() => {
    const fresh = JSON.parse(JSON.stringify(data.feasibilities[0]));
    fresh.id = uid("fs");
    fresh.name = "New feasibility";
    data.feasibilities.push(fresh);
    setFeasId(fresh.id);
    setBump((b) => b + 1);
  }, [data]);

  const logEvent = useCallback((action: string) => {
    setAudit((a) => [...a, { ts: new Date().toISOString(), role, action, engine: ENGINE_VERSION }]);
  }, [role]);

  const updateContact = useCallback((i: number, field: string, val: any) => {
    if (data.contacts[i]) { data.contacts[i][field] = val; setBump((b) => b + 1); }
  }, [data]);
  const addContact = useCallback(() => {
    data.contacts.push({ id: uid("con"), name: "", role: "Conveyancer", firm: "", phone: "", email: "", licence: "", notes: "", propertyIds: [] });
    setBump((b) => b + 1);
  }, [data]);
  const deleteContact = useCallback((i: number) => { data.contacts.splice(i, 1); setBump((b) => b + 1); }, [data]);

  const updateEntity = useCallback((i: number, field: string, val: any) => {
    if (data.entities[i]) { data.entities[i][field] = val; setBump((b) => b + 1); }
  }, [data]);
  const addEntity = useCallback(() => {
    data.entities.push({ id: uid("ent"), name: "New entity", type: "Individual", region: "NSW", owners: [], taxableIncome: 0, foreign: false, deedExcludesForeign: true });
    setBump((b) => b + 1);
  }, [data]);
  const deleteEntity = useCallback((i: number) => {
    if (data.entities.length <= 1) return;
    data.entities.splice(i, 1); setBump((b) => b + 1);
  }, [data]);

  const exportJson = useCallback(() => JSON.stringify({ ...data, audit }, null, 2), [data, audit]);
  const importJson = useCallback((text: string) => {
    try {
      const parsed = JSON.parse(text);
      if (!parsed || !Array.isArray(parsed.properties)) return false;
      setData(parsed);
      setPropertyId(parsed.properties[0]?.id ?? null);
      setClientId(parsed.clients?.[0]?.id ?? null);
      setFeasId(parsed.feasibilities?.[0]?.id ?? null);
      logEvent("Imported data");
      setBump((b) => b + 1);
      return true;
    } catch { return false; }
  }, [logEvent]);
  const resetData = useCallback(() => {
    const seed = seedContext();
    setData(seed);
    setPropertyId(seed.properties[0]?.id ?? null);
    setClientId(seed.clients[0]?.id ?? null);
    setFeasId(seed.feasibilities[0]?.id ?? null);
    logEvent("Reset to seed data");
    setBump((b) => b + 1);
  }, [logEvent]);

  const value = useMemo<StoreValue>(() => ({
    ctx: data, role, setRole, view, setView, propertyId, setPropertyId,
    updateProperty, duplicateProperty, deleteProperty, addProperty,
    clientId, setClientId, updateClient, addClient,
    updateLender, addLender, deleteLender,
    feasId, setFeasId, updateFeasibility, addFeasibility,
    updateContact, addContact, deleteContact,
    updateEntity, addEntity, deleteEntity,
    audit, logEvent, exportJson, importJson, resetData, bump,
  }), [data, role, view, propertyId, updateProperty, duplicateProperty, deleteProperty, addProperty, clientId, updateClient, addClient, updateLender, addLender, deleteLender, feasId, updateFeasibility, addFeasibility, updateContact, addContact, deleteContact, updateEntity, addEntity, deleteEntity, audit, logEvent, exportJson, importJson, resetData, bump]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used within StoreProvider");
  return v;
}
