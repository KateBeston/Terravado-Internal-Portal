"use client";
import { useState } from "react";

const money = (v: number) => "$" + Math.round(v).toLocaleString("en-AU");

/* Quick commission calculator — sale price × rate (e.g. $750,000 at 5% =
   $37,500). Standalone; doesn't save anything. */
export default function CommissionCalculator() {
  const [price, setPrice] = useState("");
  const [rate, setRate] = useState("5");
  const p = Number(price.replace(/[,$\s]/g, ""));
  const r = Number(rate.replace(/[%\s]/g, ""));
  const commission = isFinite(p) && isFinite(r) ? (p * r) / 100 : 0;

  return (
    <div>
      <div className="row">
        <label className="f"><span>Sale price</span><input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" placeholder="e.g. 750000" /></label>
        <label className="f"><span>Commission rate %</span><input value={rate} onChange={(e) => setRate(e.target.value)} inputMode="numeric" /></label>
      </div>
      <p style={{ fontSize: 15, margin: "4px 0" }}>
        Commission: <strong>{commission > 0 ? money(commission) : "—"}</strong>
        {commission > 0 && <span className="muted" style={{ fontSize: 13 }}> &nbsp;({money(p)} at {r}%)</span>}
      </p>
    </div>
  );
}
