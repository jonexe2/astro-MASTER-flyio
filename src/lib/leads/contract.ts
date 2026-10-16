// Shared lead-submission contract (V1). Browser-safe: no secrets, no Node APIs.
// Both lead forms (hero and contact) submit this shape to ONE backend handler.
// Not the database schema: stored fields, IDs and timestamps are frozen in P2.1.
// No lead status and no lead source tracking in V1 (owner decision 2026-10-14).

// Must match `services` in src/content/sections/english/alternative-hero-section.md
// (checked by contract.test.ts).
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
  services: HvacService[]; // required, at least one
  message?: string; // optional (longer form only)
}

export type LeadSubmissionResult =
  | { ok: true; leadId: string } // only after the lead is saved (P2/P3)
  | { ok: false; reason: "invalid"; fieldErrors: Partial<Record<keyof LeadSubmission, string>> }
  | { ok: false; reason: "unavailable" };

// The single backend entry point both forms will use (implemented in P3.1 at
// src/lib/server/leads/handler.ts). Takes untrusted input.
export type LeadSubmissionHandler = (input: unknown) => Promise<LeadSubmissionResult>;

export const isHvacService = (value: unknown): value is HvacService =>
  typeof value === "string" && (HVAC_SERVICES as readonly string[]).includes(value);
