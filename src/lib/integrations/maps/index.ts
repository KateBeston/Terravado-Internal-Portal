/* Google Maps seam — geography & imagery for the property record. Uses the
   Static Maps and Street View Static APIs, whose key travels in the image URL,
   so it's a NEXT_PUBLIC_ key (restrict it by HTTP referrer + to those two APIs
   in the Google Cloud console). Retention is reference-only: nothing is stored,
   images are fetched by the browser from Google on view. Without a key the UI
   falls back to a plain "view on Google Maps" link (no key needed). */
export const GOOGLE_MAPS_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY);
const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";

export function staticMapUrl(
  address: string,
  opts?: { maptype?: "roadmap" | "satellite" | "hybrid"; zoom?: number; size?: string },
): string | null {
  if (!GOOGLE_MAPS_CONFIGURED || !address) return null;
  const p = new URLSearchParams({
    center: address,
    zoom: String(opts?.zoom ?? 18),
    size: opts?.size ?? "640x360",
    scale: "2",
    maptype: opts?.maptype ?? "hybrid",
    markers: `color:0x2D3A21|${address}`,
    key: KEY,
  });
  return `https://maps.googleapis.com/maps/api/staticmap?${p.toString()}`;
}

export function streetViewUrl(address: string, opts?: { size?: string }): string | null {
  if (!GOOGLE_MAPS_CONFIGURED || !address) return null;
  const p = new URLSearchParams({ location: address, size: opts?.size ?? "640x360", fov: "80", key: KEY });
  return `https://maps.googleapis.com/maps/api/streetview?${p.toString()}`;
}

/** An interactive Google Maps embed (Maps Embed API). Enable "Maps Embed API"
    on the same key. Pan/zoom, unlike the static image. */
export function embedMapUrl(query: string): string | null {
  if (!GOOGLE_MAPS_CONFIGURED || !query) return null;
  const p = new URLSearchParams({ key: KEY, q: query, zoom: "17" });
  return `https://www.google.com/maps/embed/v1/place?${p.toString()}`;
}

/** A plain Google Maps search link — works with no API key, so it's the fallback. */
export function mapsLinkUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
