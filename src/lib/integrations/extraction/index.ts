/* Stock-list extraction seam — turn a developer's stock list into proposed lot
   rows. Two tiers, both ending in a human confirm step:
   - Fallback (always on): the advisor pastes the stock list and the app parses
     it client-side into an editable table. Reliable, no key.
   - AI (gated): upload a PDF/image and an LLM reads it into lot rows. Every
     developer's layout differs, so this is extract -> confirm, not blind import.
   Server-side only. */

export const STOCK_EXTRACTION_PROVIDER = process.env.STOCK_EXTRACTION_PROVIDER ?? ""; // "anthropic"
export const STOCK_EXTRACTION_CONFIGURED = Boolean(STOCK_EXTRACTION_PROVIDER);
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY ?? "";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_EXTRACTION_MODEL ?? "claude-sonnet-4-5";

export interface ExtractedLot {
  lotNumber?: string; address?: string; stage?: string; price?: number;
  beds?: number; baths?: number; cars?: number; landSize?: number;
  advertisedRent?: number; advertisedYieldPct?: number;
}

export interface ExtractionInput { base64?: string; mediaType?: string; text?: string; fileName?: string; }

export interface ExtractionProvider {
  readonly name: string;
  extractLots(input: ExtractionInput): Promise<ExtractedLot[]>;
}

const PROMPT =
  "You are extracting a property developer's stock list (lots / house-and-land / off-the-plan). " +
  "Return ONLY a JSON array — no prose, no markdown fences. Each element is ONE lot/property with any of these keys you can find: " +
  "lotNumber (string), address (string), stage (string), price (number, AUD, digits only), beds (number), baths (number), " +
  "cars (number), landSize (number, m2), advertisedRent (number, weekly AUD, digits only), advertisedYieldPct (number). " +
  "Omit keys you can't find for a row. Include only real stock rows — skip headers, totals, sold-out markers and marketing blurb.";

function parseJsonArray(text: string): ExtractedLot[] {
  let t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = t.indexOf("["), end = t.lastIndexOf("]");
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  const parsed = JSON.parse(t);
  return Array.isArray(parsed) ? (parsed as ExtractedLot[]) : [];
}

const noneProvider: ExtractionProvider = {
  name: "none",
  async extractLots() {
    throw new Error("AI stock-list extraction not enabled. Paste the stock list to import it, or set STOCK_EXTRACTION_PROVIDER + ANTHROPIC_API_KEY.");
  },
};

/* Anthropic: send the PDF/image (or text) to Claude and get a JSON array back.
   Claude reads PDFs natively, so no PDF-parsing library is needed. */
const anthropicProvider: ExtractionProvider = {
  name: "anthropic",
  async extractLots(input) {
    if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_API_KEY is not set.");
    const content: any[] = [];
    if (input.base64) {
      const mt = input.mediaType || "application/pdf";
      content.push(
        mt === "application/pdf"
          ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: input.base64 } }
          : { type: "image", source: { type: "base64", media_type: mt, data: input.base64 } },
      );
    }
    if (input.text) content.push({ type: "text", text: `Stock list:\n${input.text}` });
    content.push({ type: "text", text: PROMPT });

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: 4096, messages: [{ role: "user", content }] }),
    });
    if (!res.ok) throw new Error(`Extraction failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    const text = (data?.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
    try { return parseJsonArray(text); } catch { throw new Error("Could not read the extracted rows — try the paste option."); }
  },
};

/** The active extraction provider — the configured LLM when set, else "none"
    (the paste-to-import fallback carries the feature until then). */
export function getExtractionProvider(): ExtractionProvider {
  if (!STOCK_EXTRACTION_CONFIGURED) return noneProvider;
  if (STOCK_EXTRACTION_PROVIDER === "anthropic") return anthropicProvider;
  return noneProvider;
}
