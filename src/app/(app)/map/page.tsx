import { redirect } from "next/navigation";

/* The Map moved into the Atlas section. Keep this path working for any old link. */
export default function MapRedirect() {
  redirect("/atlas/map");
}
