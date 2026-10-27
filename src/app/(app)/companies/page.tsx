import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/* Companies and ownership entities are one record now — the unified directory
   lives at /entities. */
export default function CompaniesRedirect() {
  redirect("/entities");
}
