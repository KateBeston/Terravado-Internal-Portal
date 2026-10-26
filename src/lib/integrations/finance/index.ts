import type { FinanceProvider } from "./provider";
import { stubFinanceProvider } from "./stub";
import { QUICKLI_CONFIGURED, quickliFinanceProvider } from "./quickli";

/** The active finance provider — Quickli when a key is configured, else the
    built-in indicative stub. */
export function getFinanceProvider(): FinanceProvider {
  return QUICKLI_CONFIGURED ? quickliFinanceProvider : stubFinanceProvider;
}

export type { FinanceProvider } from "./provider";
export type { ServiceabilityRequest, ServiceabilityResult, LenderAssessment } from "./types";
