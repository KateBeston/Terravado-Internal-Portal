/* Stock-list extraction seam — turn a developer's stock list into proposed lot
   rows. Two tiers, both ending in a human confirm step:
   - Fallback (always on): the advisor pastes the stock list and the app parses
     it client-side into an editable table. Reliable, no key.
   - AI (gated): upload a PDF and an LLM maps it to lot rows. Every developer's
     PDF is laid out differently, so this is extract -> confirm, not blind import.
   Server-side only. */

export const STOCK_EXTRACTION_PROVIDER = process.env.STOCK_EXTRACTION_PROVIDER ?? ""; // e.g. "anthropic"
export const STOCK_EXTRACTION_CONFIGURED = Boolean(STOCK_EXTRACTION_PROVIDER);

export interface ExtractedLot {
  lotNumber?: string; address?: string; stage?: string; price?: number;
  beds?: number; baths?: number; cars?: number; landSize?: number;
  advertisedRent?: number; advertisedYieldPct?: number;
}

export interface ExtractionProvider {
  readonly name: string;
  extractLots(input: { text?: string; fileName?: string; dataUrl?: string }): Promise<ExtractedLot[]>;
}

const noneProvider: ExtractionProvider = {
  name: "none",
  async extractLots() {
    throw new Error("AI stock-list extraction not enabled. Paste the stock list to import it, or set STOCK_EXTRACTION_PROVIDER to connect an LLM.");
  },
};

const aiProvider: ExtractionProvider = {
  name: STOCK_EXTRACTION_PROVIDER || "ai",
  async extractLots() {
    // TODO: extract text from the uploaded PDF, send to the LLM with a schema,
    // and return ExtractedLot[] for the advisor to confirm.
    throw new Error(`Extraction provider "${STOCK_EXTRACTION_PROVIDER}" selected but not implemented yet.`);
  },
};

/** The active extraction provider — the AI one when configured, else "none"
    (the paste-to-import fallback carries the feature until then). */
export function getExtractionProvider(): ExtractionProvider {
  return STOCK_EXTRACTION_CONFIGURED ? aiProvider : noneProvider;
}
