"use client";
/* Interactive Australia map — Leaflet choropleth over the state boundaries,
   coloured red (high growth / demand) → blue (slow / stagnation) by a selectable
   metric, with a layer framework (overlay toggles + a development-type filter).
   Fully interactive: scroll-wheel zoom, click-drag pan, double-click zoom, and
   click a state to zoom to it. A search box geocodes any address / suburb /
   street / area / council (OpenStreetMap Nominatim, Australia-scoped) and flies
   there. State-level choropleth now; SA-region and suburb boundary layers add
   finer choropleth + cascading filters as those feeds connect. */
import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap } from "react-leaflet";
import L, { Map as LMap, Layer } from "leaflet";
import type { Feature } from "geojson";

export interface StateMetrics { growthPct?: number; population?: number; popGrowthPct?: number; jobGrowthPct?: number; }
export interface OverlayDef { key: string; label: string; connected: boolean; note: string; }
export interface MapProps {
  geojson: any;
  data: Record<string, StateMetrics>;
  overlays: OverlayDef[];
  devTypes: string[];
  absNote: string;
}

type MetricKey = "growthPct" | "popGrowthPct" | "jobGrowthPct" | "population";
const METRICS: { key: MetricKey; label: string; unit: string; dp: number }[] = [
  { key: "growthPct", label: "Property growth", unit: "% p.a.", dp: 1 },
  { key: "popGrowthPct", label: "Population growth (ABS)", unit: "% p.a.", dp: 1 },
  { key: "jobGrowthPct", label: "Job growth (ABS)", unit: "% p.a.", dp: 1 },
  { key: "population", label: "Population (ABS, ERP)", unit: "", dp: 0 },
];
const SCALE = ["#2c5f9e", "#7FA8D0", "#EADFCE", "#D98C5F", "#B23A2E"]; // low → high : blue → white → red
const NODATA = "#e6e2d8";
const AU_CENTER: [number, number] = [-25.6, 134.3];
const AU_ZOOM = 4;

interface GeoHit { lat: string; lon: string; display_name: string; type: string; boundingbox?: string[]; }

function fmt(v: number | undefined, dp: number) {
  if (v === undefined || v === null) return "—";
  return dp === 0 ? Math.round(v).toLocaleString("en-AU") : v.toFixed(dp);
}

export default function AustraliaMap({ geojson, data, overlays, devTypes, absNote }: MapProps) {
  const [metric, setMetric] = useState<MetricKey>("growthPct");
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [devType, setDevType] = useState("All types");
  const [stateSel, setStateSel] = useState("All");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeoHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [marker, setMarker] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const mapRef = useRef<LMap | null>(null);

  const m = METRICS.find((x) => x.key === metric)!;
  const { min, max } = useMemo(() => {
    const vals = Object.values(data).map((d) => d[metric]).filter((x): x is number => typeof x === "number");
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }, [data, metric]);

  const colorFor = (v?: number) => {
    if (v === undefined || v === null || max <= min) return NODATA;
    const t = (v - min) / (max - min);
    return SCALE[Math.min(SCALE.length - 1, Math.max(0, Math.floor(t * SCALE.length)))];
  };
  const style = (f?: Feature) => {
    const abbr = (f?.properties as any)?.abbr as string;
    return { fillColor: colorFor(data[abbr]?.[metric]), weight: 1, color: "#fff", fillOpacity: 0.82 };
  };
  const onEach = (f: Feature, layer: Layer) => {
    const p = f.properties as any;
    const d = data[p.abbr] ?? {};
    layer.bindTooltip(
      `<strong>${p.name} (${p.abbr})</strong><br/>` +
      `Property growth: ${fmt(d.growthPct, 1)}% p.a.<br/>` +
      `Population: ${fmt(d.population, 0)}<br/>` +
      `Pop. growth: ${fmt(d.popGrowthPct, 1)}% p.a.<br/>` +
      `Job growth: ${fmt(d.jobGrowthPct, 1)}% p.a.`,
      { sticky: true },
    );
    // Click a state to zoom to it.
    layer.on("click", () => { const mp = mapRef.current; if (mp) mp.fitBounds((layer as any).getBounds(), { padding: [20, 20] }); setStateSel(p.abbr); });
  };
  const toggle = (k: string) => setActive((a) => ({ ...a, [k]: !a[k] }));

  const zoomToState = (abbr: string) => {
    setStateSel(abbr);
    const mp = mapRef.current;
    if (!mp) return;
    if (abbr === "All") { mp.setView(AU_CENTER, AU_ZOOM); return; }
    const f = geojson.features.find((x: any) => x.properties?.abbr === abbr);
    if (f) mp.fitBounds(L.geoJSON(f).getBounds(), { padding: [20, 20] });
  };

  const runSearch = async () => {
    if (!q.trim()) return;
    setSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=au&addressdetails=1&limit=6&q=${encodeURIComponent(q)}`;
      const r = await fetch(url, { headers: { "Accept-Language": "en-AU" } });
      setResults(r.ok ? await r.json() : []);
    } catch { setResults([]); }
    setSearching(false);
  };
  const pick = (h: GeoHit) => {
    const lat = +h.lat, lng = +h.lon;
    const mp = mapRef.current;
    setMarker({ lat, lng, label: h.display_name });
    setResults([]);
    setQ(h.display_name);
    if (!mp) return;
    if (h.boundingbox && h.boundingbox.length === 4) {
      const b = h.boundingbox.map(Number); // [south, north, west, east]
      mp.fitBounds([[b[0], b[2]], [b[1], b[3]]], { padding: [20, 20] });
    } else {
      mp.setView([lat, lng], 14);
    }
  };

  function MapController() {
    const map = useMap();
    useEffect(() => { mapRef.current = map; }, [map]);
    return null;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, alignItems: "start" }}>
      <div>
        <div className="panel" style={{ marginTop: 0 }}>
          <h3 style={{ marginTop: 0 }}>Search</h3>
          <div style={{ display: "flex", gap: 6 }}>
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); runSearch(); } }}
              placeholder="Address, suburb, street, council…" style={{ flex: 1 }}
            />
            <button className="btn" type="button" onClick={runSearch}>{searching ? "…" : "Go"}</button>
          </div>
          {results.length > 0 && (
            <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0, border: "1px solid var(--line)", borderRadius: 2, maxHeight: 220, overflow: "auto" }}>
              {results.map((h, i) => (
                <li key={i}>
                  <button type="button" onClick={() => pick(h)} style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 8px", background: "none", border: "none", borderBottom: "1px solid var(--line)", cursor: "pointer", fontSize: 12 }}>
                    {h.display_name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>Finds any address, suburb, street, area or council across Australia and flies there.</p>
        </div>

        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Zoom to state</h3>
          <select value={stateSel} onChange={(e) => zoomToState(e.target.value)} style={{ width: "100%" }}>
            <option value="All">All Australia</option>
            {geojson.features.map((f: any) => <option key={f.properties.abbr} value={f.properties.abbr}>{f.properties.name}</option>)}
          </select>
          <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>Region, suburb &amp; council <em>boundary</em> filters arrive with the finer boundary layers; until then use Search to reach them.</p>
        </div>

        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Colour by</h3>
          <select value={metric} onChange={(e) => setMetric(e.target.value as MetricKey)} style={{ width: "100%" }}>
            {METRICS.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
          </select>
          <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)" }}>
            <div style={{ display: "flex", height: 12, borderRadius: 2, overflow: "hidden" }}>
              {SCALE.map((c) => <div key={c} style={{ background: c, flex: 1 }} />)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span>Slow / stagnant {fmt(min, m.dp)}{m.unit && " " + m.unit}</span>
              <span>High {fmt(max, m.dp)}</span>
            </div>
          </div>
        </div>

        <div className="panel">
          <h3 style={{ marginTop: 0 }}>Overlays</h3>
          {overlays.map((o) => (
            <label key={o.key} className="f" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <input type="checkbox" checked={!!active[o.key]} onChange={() => toggle(o.key)} style={{ width: "auto" }} />
              <span style={{ fontSize: 13 }}>{o.label}{!o.connected && <span className="muted" style={{ fontSize: 11 }}> · not connected</span>}</span>
            </label>
          ))}
          {active["planned-dev"] && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Planned development — type</div>
              <select value={devType} onChange={(e) => setDevType(e.target.value)} style={{ width: "100%" }}>
                {devTypes.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          )}
          {overlays.some((o) => active[o.key]) && (
            <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
              {overlays.filter((o) => active[o.key] && !o.connected).map((o) => o.note).join(" ") || "Layer active."}
            </p>
          )}
        </div>

        <p className="muted" style={{ fontSize: 11 }}>{absNote}</p>
      </div>

      <div className="panel" style={{ marginTop: 0, padding: 0, overflow: "hidden" }}>
        <MapContainer style={{ height: 620, width: "100%" }} center={AU_CENTER} zoom={AU_ZOOM} scrollWheelZoom dragging doubleClickZoom>
          <MapController />
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <GeoJSON key={metric} data={geojson} style={style as any} onEachFeature={onEach} />
          {marker && (
            <CircleMarker center={[marker.lat, marker.lng]} radius={8} pathOptions={{ color: "#B23A2E", fillColor: "#B23A2E", fillOpacity: 0.9 }}>
              <Popup>{marker.label}</Popup>
            </CircleMarker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
