import type { TitlesProvider } from "./provider";
import { stubTitlesProvider } from "./stub";

/* A titles broker is configured by naming it in TITLES_PROVIDER (e.g. "globalx",
   "infotrack"). Until then Smart Search uses the indicative stub. The adapter
   itself (auth, per-search billing, the state registry behind the broker) slots
   in here when the commercial arrangement is in place. */
export const TITLES_CONFIGURED = Boolean(process.env.TITLES_PROVIDER);

export function getTitlesProvider(): TitlesProvider {
  // Real broker adapters register here once TITLES_PROVIDER is set and built.
  return stubTitlesProvider;
}

export type { TitlesProvider } from "./provider";
export type { TitleParticulars } from "./types";
