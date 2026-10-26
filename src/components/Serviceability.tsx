"use client";
/* Serviceability view — faithful port of viewServiceability(): client picker +
   the live lender comparison. */
import { useStore } from "@/lib/store";
import LenderCompare from "./LenderCompare";

export default function Serviceability() {
  const { ctx, clientId, setClientId } = useStore();
  const c = ctx.clients.find((x) => x.id === clientId) || ctx.clients[0];
  if (!c) return <div className="empty">Add a client first.</div>;
  return (
    <>
      <div className="toolbar">
        <select value={c.id} onChange={(e) => setClientId(e.target.value)} style={{ width: "auto", minWidth: 220 }}>
          {ctx.clients.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
      </div>
      <LenderCompare c={c} />
    </>
  );
}
