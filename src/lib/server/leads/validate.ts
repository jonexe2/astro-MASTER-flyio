import "../server-only.ts";
import {
  HVAC_SERVICES,
  LEAD_LIMITS,
  isHvacService,
  type HvacService,
  type LeadFieldError,
  type LeadSubmission,
} from "../../leads/contract.ts";

// Checks and cleans untrusted lead input exactly as LEAD_CONTRACT.md section 2
// says. No database access. Values are never shortened or guessed: anything
// outside the rules is an error.

export interface CleanLead {
  fullName: string;
  phone: string;
  email: string;
  services: [HvacService, ...HvacService[]]; // HVAC_SERVICES order, no duplicates
  message: string | null; // null when not given; never ""
}

export type FieldErrors = Partial<Record<keyof LeadSubmission, LeadFieldError>>;

export type ValidationResult =
  | { ok: true; value: CleanLead }
  | { ok: false; reason: "invalid"; fieldErrors: FieldErrors }
  | { ok: false; reason: "bad_request" };

// Lowercase UUID (lead IDs and submission keys).
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Control characters (including line breaks) and the Unicode line/paragraph separators.
const CONTROL = /[\p{Cc}\p{Zl}\p{Zp}]/u;
// The same, but newline and tab are allowed (message only).
const CONTROL_EXCEPT_NEWLINE_TAB = /(?![\n\t])[\p{Cc}\p{Zl}\p{Zp}]/u;
const EMAIL = /^[^\s@]+@[^\s@]+$/u;

const codePoints = (text: string) => [...text].length;

type Checked = { value: string } | { error: LeadFieldError };

const singleLine = (input: unknown, limits: { min: number; max: number }): Checked => {
  if (input === undefined || input === null) return { error: "required" };
  if (typeof input !== "string") return { error: "invalid" };
  const value = input.normalize("NFC").trim();
  if (value === "") return { error: "required" };
  if (CONTROL.test(value)) return { error: "invalid" };
  const length = codePoints(value);
  if (length > limits.max) return { error: "too_long" };
  if (length < limits.min) return { error: "invalid" };
  return { value };
};

const checkMessage = (input: unknown): { value: string | null } | { error: LeadFieldError } => {
  if (input === undefined || input === null) return { value: null };
  if (typeof input !== "string") return { error: "invalid" };
  const value = input.normalize("NFC").replace(/\r\n?/g, "\n").trim();
  if (value === "") return { value: null };
  if (CONTROL_EXCEPT_NEWLINE_TAB.test(value)) return { error: "invalid" };
  if (codePoints(value) > LEAD_LIMITS.message.max) return { error: "too_long" };
  return { value };
};

const checkServices = (input: unknown): { value: CleanLead["services"] } | { error: LeadFieldError } => {
  if (input === undefined || input === null) return { error: "required" };
  if (!Array.isArray(input)) return { error: "invalid" };
  if (input.length < LEAD_LIMITS.services.min) return { error: "required" };
  if (input.length > LEAD_LIMITS.services.max) return { error: "invalid" };
  if (!input.every(isHvacService) || new Set(input).size !== input.length) return { error: "invalid" };
  const ordered = HVAC_SERVICES.filter((service) => input.includes(service));
  return { value: ordered as CleanLead["services"] };
};

export const validateLeadSubmission = (input: unknown): ValidationResult => {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, reason: "bad_request" };
  }
  // Unknown extra fields are ignored and never stored; the endpoint (P3.1)
  // decides which request fields it accepts.
  const raw = input as Record<string, unknown>;
  const fieldErrors: FieldErrors = {};

  const fullName = singleLine(raw.fullName, LEAD_LIMITS.fullName);
  if ("error" in fullName) fieldErrors.fullName = fullName.error;

  let phone = singleLine(raw.phone, LEAD_LIMITS.phone);
  if ("value" in phone && (phone.value.match(/[0-9]/g)?.length ?? 0) < LEAD_LIMITS.phone.minDigits) {
    phone = { error: "invalid" };
  }
  if ("error" in phone) fieldErrors.phone = phone.error;

  let email = singleLine(raw.email, LEAD_LIMITS.email);
  if ("value" in email && !EMAIL.test(email.value)) email = { error: "invalid" };
  if ("error" in email) fieldErrors.email = email.error;

  const services = checkServices(raw.services);
  if ("error" in services) fieldErrors.services = services.error;

  const message = checkMessage(raw.message);
  if ("error" in message) fieldErrors.message = message.error;

  if ("error" in fullName || "error" in phone || "error" in email || "error" in services || "error" in message) {
    return { ok: false, reason: "invalid", fieldErrors };
  }
  return {
    ok: true,
    value: {
      fullName: fullName.value,
      phone: phone.value,
      email: email.value,
      services: services.value,
      message: message.value,
    },
  };
};

// The submission key comes from a request header: `undefined` or `null` (header
// absent) means "missing" and the lead is saved without duplicate protection.
// Any value that IS present must be exactly a lowercase UUID; "" is rejected.
export const parseSubmissionKey = (value: unknown): { ok: true; key: string | null } | { ok: false } => {
  if (value === undefined || value === null) return { ok: true, key: null };
  if (typeof value === "string" && UUID_PATTERN.test(value)) return { ok: true, key: value };
  return { ok: false };
};
