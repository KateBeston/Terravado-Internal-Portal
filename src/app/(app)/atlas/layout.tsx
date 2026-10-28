import AtlasSectionNav from "@/components/AtlasSectionNav";

/* Atlas — Terravado's national view for monitoring macro (national / state) and
   micro (region / suburb) property growth, with stats, charts and the map. */
export default function AtlasLayout({ children }: { children: React.ReactNode }) {
  return (
    <section>
      <h1>Atlas</h1>
      <AtlasSectionNav />
      {children}
    </section>
  );
}
