import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/* The client record is now the unified person record. A client is a person
   carrying the Borrower role, so their file lives at /contacts/[id]. */
export default function ClientRecordRedirect({ params }: { params: { id: string } }) {
  redirect(`/contacts/${params.id}`);
}
