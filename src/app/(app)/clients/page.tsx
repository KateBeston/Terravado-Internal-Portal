import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/* Clients and contacts are one record now — a client is a contact carrying the
   Borrower role. The single directory lives at /contacts. */
export default function ClientsRedirect() {
  redirect("/contacts");
}
