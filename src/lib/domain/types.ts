import type { Entity } from "@/lib/data/repository";

export type Role = "owner" | "admin" | "adviser" | "viewer";
export type PropertyStatus = "considering" | "owned" | "sold";

export interface Client extends Entity {
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
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
