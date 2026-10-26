"use client";
/* ===========================================================================
   TERRAVADO — Workspace (client shell).
   The complete modelling application, ported from the original Terravado build.
   Its data lives in an in-memory store (seedContext) for now; the store shape
   is a clean seam for Supabase — swap the seed for a tenant loader and the
   module screens are unchanged. Styling is scoped under `.tv-root`.
   =========================================================================== */
import "../../workspace-theme.css";
import { StoreProvider, useStore } from "@/lib/store";
import Masthead from "@/components/Masthead";
import Portfolio from "@/components/Portfolio";
import PropertyWorkspace from "@/components/PropertyWorkspace";
import Clients from "@/components/Clients";
import Serviceability from "@/components/Serviceability";
import EquityChain from "@/components/EquityChain";
import Lenders from "@/components/Lenders";
import Feasibility from "@/components/Feasibility";
import Contacts from "@/components/Contacts";
import Audit from "@/components/Audit";

function comingSoon(label: string) {
  return (
    <div className="empty">
      <strong>{label}</strong> is part of the clean rebuild and lands in an upcoming increment.<br />
      The calculation engine behind every module is already ported and verified.
    </div>
  );
}

function Shell() {
  const { view } = useStore();
  return (
    <>
      <Masthead />
      <div className="wrap">
        {view === "portfolio" ? <Portfolio />
          : view === "property" ? <PropertyWorkspace />
          : view === "clients" ? <Clients />
          : view === "serviceability" ? <Serviceability />
          : view === "equity" ? <EquityChain />
          : view === "lenders" ? <Lenders />
          : view === "feasibility" ? <Feasibility />
          : view === "contacts" ? <Contacts />
          : view === "audit" ? <Audit />
          : comingSoon("This module")}
        <div className="disclaimer">
          Terravado models Australian property investments. Tax outputs are indicative and must be verified against
          the relevant revenue office before being represented to a client. The in-workspace role selector is
          presentation-level; the portal enforces access server-side with row-level security.
        </div>
      </div>
    </>
  );
}

export default function WorkspaceClient() {
  return (
    <div className="tv-root">
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </div>
  );
}
