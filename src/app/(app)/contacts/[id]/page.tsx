import { requireUser } from "@/lib/auth/guard";
import { getCurrentTenant } from "@/lib/auth/tenant";
import { getContact, listCompanies } from "@/lib/domain/service";
import { updatePersonAction, deleteContactAction } from "@/app/actions";
import { PERSON_ROLES } from "@/lib/domain/types";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
const RESIDENCY = ["Citizen", "Permanent resident", "Visa", "Other"];
const MARITAL = ["Single", "Married", "De facto", "Separated", "Divorced", "Widowed"];
const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
const CONTACT_PREF = ["Email", "Phone", "SMS"];
const ID_TYPES = ["Driver licence", "Passport", "Medicare", "Other"];
const v = (x?: string) => x ?? "";

export default async function PersonDetailsTab({ params }: { params: { id: string } }) {
  await requireUser();
  const { tenantId } = await getCurrentTenant();
  const [c, companies] = await Promise.all([getContact(tenantId, params.id), listCompanies(tenantId)]);
  if (!c) notFound();
  const roles = c.roles ?? [];
  const d = c.details ?? {};

  return (
    <>
      <form action={updatePersonAction}>
        <input type="hidden" name="id" value={c.id} />

        <div className="panel">
          <h2>Contact</h2>
          <div className="row">
            <label className="f"><span>Display name</span><input name="name" defaultValue={v(c.name)} required /></label>
            <label className="f"><span>Preferred contact</span>
              <select name="preferredContact" defaultValue={d.preferredContact ?? "Email"}>{CONTACT_PREF.map((x) => <option key={x}>{x}</option>)}</select>
            </label>
          </div>
          <div className="row">
            <label className="f"><span>Email</span><input name="email" type="email" defaultValue={v(c.email)} /></label>
            <label className="f"><span>Phone</span><input name="phone" defaultValue={v(c.phone)} /></label>
          </div>
        </div>

        <div className="panel">
          <h2>Roles</h2>
          <p className="sub" style={{ marginTop: -6 }}>What this person is to you. The Borrower role unlocks their financial tabs.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px" }}>
            {PERSON_ROLES.map((r) => (
              <label key={r} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, margin: 0 }}>
                <input type="checkbox" name="roles" value={r} defaultChecked={roles.includes(r)} style={{ width: "auto", margin: 0 }} />
                {r}
              </label>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2>Personal details</h2>
          <div className="row">
            <label className="f"><span>First name</span><input name="firstName" defaultValue={v(d.firstName)} /></label>
            <label className="f"><span>Last name</span><input name="lastName" defaultValue={v(d.lastName)} /></label>
          </div>
          <div className="row">
            <label className="f"><span>Date of birth</span><input name="dob" type="date" defaultValue={v(d.dob)} /></label>
            <label className="f"><span>Residency</span>
              <select name="residency" defaultValue={d.residency ?? "Citizen"}>{RESIDENCY.map((x) => <option key={x}>{x}</option>)}</select>
            </label>
            <label className="f"><span>Marital status</span>
              <select name="maritalStatus" defaultValue={d.maritalStatus ?? "Single"}>{MARITAL.map((x) => <option key={x}>{x}</option>)}</select>
            </label>
          </div>
          <label className="f"><span>Occupation (headline)</span><input name="occupation" defaultValue={v(d.occupation)} /></label>
          <div className="row">
            <label className="f"><span>ID type</span>
              <select name="idType" defaultValue={d.idType ?? "Driver licence"}>{ID_TYPES.map((x) => <option key={x}>{x}</option>)}</select>
            </label>
            <label className="f"><span>ID number</span><input name="idNumber" defaultValue={v(d.idNumber)} /></label>
          </div>
        </div>

        <div className="panel">
          <h2>Address</h2>
          <label className="f"><span>Street address</span><input name="addressLine" defaultValue={v(d.addressLine)} /></label>
          <div className="row">
            <label className="f"><span>Suburb</span><input name="suburb" defaultValue={v(d.suburb)} /></label>
            <label className="f"><span>State</span>
              <select name="state" defaultValue={d.state ?? "NSW"}>{STATES.map((x) => <option key={x}>{x}</option>)}</select>
            </label>
            <label className="f"><span>Postcode</span><input name="postcode" defaultValue={v(d.postcode)} /></label>
          </div>
        </div>

        <div className="panel">
          <h2>Professional / firm</h2>
          <p className="sub" style={{ marginTop: -6 }}>For people in your network — brokers, agents, accountants, solicitors.</p>
          <div className="row">
            <label className="f"><span>Firm</span><input name="firm" defaultValue={v(c.firm)} /></label>
            <label className="f"><span>Licence</span><input name="licence" defaultValue={v(c.licence)} /></label>
          </div>
          <label className="f"><span>Company</span>
            <select name="companyId" defaultValue={c.companyId ?? ""}><option value="">— None —</option>{companies.map((co) => <option key={co.id} value={co.id}>{co.name}</option>)}</select>
          </label>
        </div>

        <div className="panel">
          <h2>Notes</h2>
          <label className="f"><textarea name="notes" rows={3} defaultValue={v(c.notes)} /></label>
        </div>

        <button className="btn" type="submit">Save details</button>
      </form>

      <form action={deleteContactAction} style={{ marginTop: 16 }}>
        <input type="hidden" name="id" value={c.id} />
        <button className="x" type="submit" style={{ width: "auto", padding: "6px 12px" }}>Delete this person</button>
      </form>
    </>
  );
}
