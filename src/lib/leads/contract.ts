// Shared lead contract (V1, frozen in P2.1). Browser-safe: no secrets, no Node APIs.
// Both lead forms (hero and contact) submit `LeadSubmission` to ONE backend handler,
// which saves one `LeadRecord`. Full rules: src/lib/leads/LEAD_CONTRACT.md.
// No lead status and no lead source tracking in V1 (owner decision 2026-10-14).

// Must match `services` in src/content/sections/english/alternative-hero-section.md
// (checked by contract.test.ts). This order is also the stored order.
export const HVAC_SERVICES = [
  "AC Repair",
  "Heating Repair",
  "HVAC Installation",
  "Preventive Maintenance",
  "Indoor Air Quality",
  "Emergency HVAC Service",
] as const;

export type HvacService = (typeof HVAC_SERVICES)[number];

export interface LeadSubmission {
  fullName: string; // required
  phone: string; // required
  email: string; // required
  services: [HvacService, ...HvacService[]]; // required, at least one (checked at runtime in P3.1)
  message?: string; // optional (longer form only)
}

// One saved lead (SQLite row, Sheet row, restored row). Values are stored after
// the one-time cleanup in LEAD_CONTRACT.md and never change afterwards in V1.
export interface LeadRecord {
  id: string; // lowercase UUID v4, server-set, primary key
  createdAt: string; // UTC, exactly `YYYY-MM-DDTHH:mm:ss.sssZ`, server-set
  updatedAt: string; // same format; equals createdAt in V1 (leads are read-only)
  fullName: string;
  phone: string; // text as typed, never a number
  email: string; // case kept as typed
  services: [string, ...string[]]; // at least one; JSON list in the database; any valid label, see LEAD_CONTRACT.md
  message: string | null; // null when not given; never ""
  submissionKey: string | null; // lowercase UUID from the form script; unique when present
}

// Limits in characters (Unicode code points) after cleanup. Over-limit values
// are rejected, never shortened.
export const LEAD_LIMITS = {
  fullName: { min: 1, max: 100 },
  phone: { min: 1, max: 30, minDigits: 7 },
  email: { min: 3, max: 254 },
  message: { max: 2000 },
  services: { min: 1, max: HVAC_SERVICES.length }, // new submissions
  storedServiceLabel: { max: 100 }, // stored and restored leads
} as const;

// Google Sheets recovery format (P7). Written with RAW input; an empty cell
// means null and is allowed only where `nullable` is true.
export const LEAD_SHEET_FORMAT = "lead.v1";

export const LEAD_SHEET_V1_COLUMNS = [
  { header: "format", field: null, nullable: false }, // always LEAD_SHEET_FORMAT
  { header: "lead_id", field: "id", nullable: false },
  { header: "created_at_utc", field: "createdAt", nullable: false },
  { header: "updated_at_utc", field: "updatedAt", nullable: false },
  { header: "full_name", field: "fullName", nullable: false },
  { header: "phone", field: "phone", nullable: false },
  { header: "email", field: "email", nullable: false },
  { header: "services", field: "services", nullable: false }, // stored JSON text
  { header: "message", field: "message", nullable: true },
  { header: "submission_key", field: "submissionKey", nullable: true },
] as const satisfies readonly {
  header: string;
  field: keyof LeadRecord | null;
  nullable: boolean;
}[];

export type LeadSubmissionResult =
  | { ok: true; leadId: string } // only after the lead is saved (P2/P3)
  | { ok: false; reason: "invalid"; fieldErrors: Partial<Record<keyof LeadSubmission, string>> }
  | { ok: false; reason: "unavailable" };

// The single backend entry point both forms will use (implemented in P3.1 at
// src/lib/server/leads/handler.ts). Takes untrusted input.
export type LeadSubmissionHandler = (input: unknown) => Promise<LeadSubmissionResult>;

export const isHvacService = (value: unknown): value is HvacService =>
  typeof value === "string" && (HVAC_SERVICES as readonly string[]).includes(value);
