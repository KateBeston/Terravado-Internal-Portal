"use client";
import { useState } from "react";
import { importLotsAction, extractStockAction } from "@/app/actions";

/* Paste a stock list (copied from the developer's PDF or a spreadsheet); it is
   parsed into an editable table you confirm before the lots are created. Fuzzy
   by design — every developer's layout differs — so every field is editable.
   When AI extraction is connected, a PDF upload will feed this same table. */

interface Row {
  lotNumber: string; address: string; stage: string; price: string;
  beds: string; baths: string; landSize: string; advertisedRent: string; advertisedYieldPct: string;
}
const blank = (): Row => ({ lotNumber: "", address: "", stage: "", price: "", beds: "", baths: "", landSize: "", advertisedRent: "", advertisedYieldPct: "" });

const toNum = (s: string) => { const m = s.replace(/,/g, "").match(/\d+(?:\.\d+)?/); return m ? Number(m[0]) : NaN; };
const isHeader = (line: string) => /\b(lot|price|address|stage|rent|yield|bed|bath)\b/i.test(line) && !/\d{4,}/.test(line);

function splitCells(line: string): string[] {
  // One delimiter per line, chosen so thousands-commas inside prices survive.
  let parts: string[];
  if (line.includes("\t")) parts = line.split("\t");
  else if (/[;|]/.test(line)) parts = line.split(/[;|]/);
  else if (/\s{2,}/.test(line)) parts = line.split(/\s{2,}/);
  else parts = line.split(",");
  return parts.map((c) => c.trim()).filter(Boolean);
}

function parseLine(line: string): Row {
  const cells = splitCells(line);
  const r = blank();
  const used = new Set<number>();
  // Price: the largest money-looking value >= 50,000.
  let priceIdx = -1, priceVal = 0;
  cells.forEach((c, i) => { const n = toNum(c); if (/\$|\d{3,}/.test(c) && isFinite(n) && n >= 50000 && n > priceVal) { priceVal = n; priceIdx = i; } });
  if (priceIdx >= 0) { r.price = String(priceVal); used.add(priceIdx); }
  // Rent: a cell flagged per-week, else a plain number 150–2500.
  let rentIdx = cells.findIndex((c, i) => !used.has(i) && /(pw|p\/w|per week|\/wk|wk)/i.test(c));
  if (rentIdx < 0) rentIdx = cells.findIndex((c, i) => !used.has(i) && toNum(c) >= 150 && toNum(c) <= 2500);
  if (rentIdx >= 0) { r.advertisedRent = String(toNum(cells[rentIdx])); used.add(rentIdx); }
  // Stage.
  const stageIdx = cells.findIndex((c, i) => !used.has(i) && /stage|release/i.test(c));
  if (stageIdx >= 0) { r.stage = cells[stageIdx]; used.add(stageIdx); }
  // Lot number: "Lot 12" or a short leading token with a digit.
  let lotIdx = cells.findIndex((c, i) => !used.has(i) && /^lot\b/i.test(c));
  if (lotIdx < 0) lotIdx = cells.findIndex((c, i) => !used.has(i) && /^\w{1,6}$/.test(c) && /\d/.test(c));
  if (lotIdx >= 0) { r.lotNumber = cells[lotIdx].replace(/^lot\s*/i, ""); used.add(lotIdx); }
  // Beds / baths: small ints, or "N bed" / "N bath".
  const bed = cells.findIndex((c, i) => !used.has(i) && /bed/i.test(c));
  if (bed >= 0) { r.beds = String(toNum(cells[bed])); used.add(bed); }
  const bath = cells.findIndex((c, i) => !used.has(i) && /bath/i.test(c));
  if (bath >= 0) { r.baths = String(toNum(cells[bath])); used.add(bath); }
  if (!r.beds) { const i = cells.findIndex((c, j) => !used.has(j) && /^\d$/.test(c)); if (i >= 0) { r.beds = cells[i]; used.add(i); } }
  if (!r.baths) { const i = cells.findIndex((c, j) => !used.has(j) && /^\d$/.test(c)); if (i >= 0) { r.baths = cells[i]; used.add(i); } }
  // Address: the longest remaining cell containing letters.
  let addrIdx = -1, addrLen = 0;
  cells.forEach((c, i) => { if (!used.has(i) && /[a-z]/i.test(c) && c.length > addrLen) { addrLen = c.length; addrIdx = i; } });
  if (addrIdx >= 0) { r.address = cells[addrIdx]; used.add(addrIdx); }
  return r;
}

const rowFromExtracted = (e: any): Row => ({
  lotNumber: e?.lotNumber != null ? String(e.lotNumber) : "",
  address: e?.address != null ? String(e.address) : "",
  stage: e?.stage != null ? String(e.stage) : "",
  price: e?.price != null ? String(e.price) : "",
  beds: e?.beds != null ? String(e.beds) : "",
  baths: e?.baths != null ? String(e.baths) : "",
  landSize: e?.landSize != null ? String(e.landSize) : "",
  advertisedRent: e?.advertisedRent != null ? String(e.advertisedRent) : "",
  advertisedYieldPct: e?.advertisedYieldPct != null ? String(e.advertisedYieldPct) : "",
});

export default function StockImport({ developmentId, aiEnabled = false }: { developmentId: string; aiEnabled?: boolean }) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const parse = () => {
    const parsed = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).filter((l) => !isHeader(l)).map(parseLine)
      .filter((r) => r.price || r.lotNumber || r.address);
    setRows(parsed.length ? parsed : [blank()]);
  };
  const extract = async (file: File) => {
    setBusy(true); setError("");
    try {
      const fd = new FormData(); fd.set("file", file);
      const res = await extractStockAction(fd);
      if (res.error) { setError(res.error); return; }
      const mapped = (res.rows ?? []).map(rowFromExtracted).filter((r) => r.price || r.lotNumber || r.address);
      setRows(mapped.length ? mapped : [blank()]);
    } catch { setError("Extraction failed — try the paste option."); }
    finally { setBusy(false); }
  };
  const setCell = (i: number, k: keyof Row, val: string) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: val } : r)));
  const removeRow = (i: number) => setRows((rs) => rs.filter((_, j) => j !== i));

  return (
    <div>
      {rows.length === 0 ? (
        <>
          {aiEnabled && (
            <div style={{ marginBottom: 14 }}>
              <label className="f"><span>Upload the stock-list PDF (AI reads it)</span>
                <input type="file" accept="application/pdf,image/*" disabled={busy}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) extract(f); }} />
              </label>
              {busy && <p className="muted" style={{ fontSize: 12 }}>Reading the stock list…</p>}
              <p className="muted" style={{ fontSize: 12 }}>Extracts the lots for you to confirm. Or paste the list below.</p>
            </div>
          )}
          <label className="f"><span>Paste the stock list (from the PDF or a spreadsheet — one lot per line)</span>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6}
              placeholder={"Lot 12\t14 Parkside Ave\tStage 3\t$742,000\t4\t2\t$560pw"} />
          </label>
          <button type="button" className="btn" onClick={parse} disabled={!text.trim() || busy}>Parse into rows</button>
          {error && <p className="err" style={{ fontSize: 12 }}>{error}</p>}
          <p className="muted" style={{ fontSize: 12 }}>
            {aiEnabled ? "AI extraction and paste both land in an editable table — " : "Best-effort parse — "}
            you&apos;ll confirm and fix every row before anything is saved.
            {!aiEnabled && " Direct PDF upload with AI extraction feeds this same table once it's connected."}
          </p>
        </>
      ) : (
        <form action={importLotsAction}>
          <input type="hidden" name="developmentId" value={developmentId} />
          <input type="hidden" name="rows" value={JSON.stringify(rows)} />
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead><tr><th>Lot</th><th>Address</th><th>Stage</th><th>Price</th><th>Beds</th><th>Baths</th><th>Land</th><th>Rent/wk</th><th>Yield %</th><th></th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    {(["lotNumber", "address", "stage", "price", "beds", "baths", "landSize", "advertisedRent", "advertisedYieldPct"] as (keyof Row)[]).map((k) => (
                      <td key={k}><input value={r[k]} onChange={(e) => setCell(i, k, e.target.value)} style={{ minWidth: k === "address" ? 160 : 64 }} /></td>
                    ))}
                    <td><button type="button" className="x" onClick={() => removeRow(i)} aria-label="Remove">×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button type="submit" className="btn">Create {rows.length} lot{rows.length === 1 ? "" : "s"}</button>
            <button type="button" className="btn ghost" onClick={() => { setRows([]); }}>Start over</button>
          </div>
        </form>
      )}
    </div>
  );
}
