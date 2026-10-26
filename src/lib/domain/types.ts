import type { Entity } from "@/lib/data/repository";

export type Role = "owner" | "admin" | "adviser" | "viewer";
export type PropertyStatus = "considering" | "owned" | "sold";

/* A client's financial position — drives serviceability when a property is
   modelled for this client. All annual figures unless the name says monthly. */
export interface ClientFinances {
  grossIncome?: number;        // annual gross, primary
  partnerIncome?: number;      // annual gross, partner
  livingExpMonthly?: number;   // declared monthly living expenses
  dependants?: number;
  monthlyCommitments?: number; // existing loan / other repayments per month
  cardLimits?: number;         // total credit-card limits
  hecsBalance?: number;        // HECS/HELP balance
}

export interface Client extends Entity {
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  finances?: ClientFinances;
}

export interface Contact extends Entity {
  name: string;
  role?: string;
  firm?: string;
  email?: string;
  phone?: string;
  licence?: string;
}

export interface Property extends Entity {
  address: string;
  state?: string;
  price?: number;
  status?: PropertyStatus;
  clientId?: string;
}

export type BusinessDocStatus = "active" | "draft" | "archived";

export interface BusinessDocument extends Entity {
  title: string;
  category?: string;
  summary?: string;
  status?: BusinessDocStatus;
  link?: string;
}
