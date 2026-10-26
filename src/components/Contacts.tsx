"use client";
/* Contacts view — faithful port of viewContacts(). The professional directory. */
import { useStore } from "@/lib/store";

const ROLES = ["Solicitor", "Conveyancer", "Valuer", "Quantity surveyor", "Architect", "Town planner", "Builder", "Buyer's agent", "Property manager", "Accountant", "Mortgage broker", "Trade"];

export default function Contacts() {
  const { ctx, updateContact, addContact, deleteContact } = useStore();
  return (
    <>
      <div className="toolbar"><button className="act" onClick={addContact}>+ Add contact</button></div>
      <div className="tblwrap"><table>
        <thead><tr><th>Name</th><th>Role</th><th>Firm</th><th>Phone</th><th>Email</th><th>Licence</th><th></th></tr></thead>
        <tbody>{ctx.contacts.map((c: any, i: number) => (
          <tr key={c.id || i}>
            <td className="lbl"><input type="text" value={c.name || ""} onChange={(e) => updateContact(i, "name", e.target.value)} style={{ minWidth: 140 }} /></td>
            <td><select value={c.role} onChange={(e) => updateContact(i, "role", e.target.value)}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></td>
            <td><input type="text" value={c.firm || ""} onChange={(e) => updateContact(i, "firm", e.target.value)} /></td>
            <td><input type="text" value={c.phone || ""} onChange={(e) => updateContact(i, "phone", e.target.value)} /></td>
            <td><input type="text" value={c.email || ""} onChange={(e) => updateContact(i, "email", e.target.value)} /></td>
            <td><input type="text" value={c.licence || ""} onChange={(e) => updateContact(i, "licence", e.target.value)} /></td>
            <td><button className="x" onClick={() => deleteContact(i)}>×</button></td>
          </tr>
        ))}</tbody>
      </table></div>
    </>
  );
}
