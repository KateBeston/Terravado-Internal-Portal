"use client";
/* Client wrapper — Leaflet touches `window` on import, so the map is loaded
   dynamically with SSR disabled. The server page assembles the data and passes
   it straight through. */
import dynamic from "next/dynamic";
import type { MapProps } from "@/components/AustraliaMap";

const AustraliaMap = dynamic(() => import("@/components/AustraliaMap"), {
  ssr: false,
  loading: () => <div className="panel" style={{ height: 620, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>Loading map…</div>,
});

export default function MapClient(props: MapProps) {
  return <AustraliaMap {...props} />;
}
