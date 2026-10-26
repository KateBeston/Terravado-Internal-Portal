/* ===========================================================================
   TERRAVADO — Brand configuration
   The platform name lives HERE, in one place. Every surface (UI, PWA manifest,
   metadata, emails) reads from this module. To rename the product, change these
   values and nothing else. Chosen as a swappable config value by design.
   =========================================================================== */

export const BRAND = {
  /** Public product name. */
  name: "Terravado",
  /** Short name (PWA / home-screen icon label). */
  shortName: "Terravado",
  /** One-line descriptor. */
  tagline: "Property investment modelling",
  /** Longer description for metadata. */
  description:
    "Terravado models Australian property investments end to end — projection, serviceability, land tax, depreciation, risk and feasibility.",
  /** Primary domain (not yet registered; update when live). */
  domain: "terravado.com",
  /** Theme colour for the PWA / browser chrome. */
  themeColor: "#1f6f54",
  backgroundColor: "#0e1512",
} as const;

export type Brand = typeof BRAND;
