import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/* A company is an entity — its record lives at /entities/[id] (ids preserved
   in the 0012 migration). */
export default function CompanyRecordRedirect({ params }: { params: { id: string } }) {
  redirect(`/entities/${params.id}`);
}
