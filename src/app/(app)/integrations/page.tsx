import { redirect } from "next/navigation";

/* Integrations folded into the richer Data Sources section. Keep this path
   working for any existing link. */
export default function IntegrationsRedirect() {
  redirect("/data-sources");
}
