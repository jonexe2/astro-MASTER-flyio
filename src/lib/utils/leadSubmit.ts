// Browser helper both lead forms use to send a lead to POST /api/leads/ (P3.1).
// Imports only the browser-safe shared contract; no server code.
import {
  LEAD_ENDPOINT,
  LEAD_HONEYPOT_FIELD,
  LEAD_SUBMISSION_KEY_HEADER,
  type LeadFieldError,
  type LeadSubmission,
} from "../leads/contract.ts";

// Same rule the server applies to submission keys.
const KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type CryptoSource = Pick<Crypto, "getRandomValues"> & { randomUUID?: () => string };

// A random lowercase UUID v4 as the submission key, or null when the browser
// cannot make one. Forms must not send without a key (LEAD_CONTRACT.md §5).
// randomUUID only exists on HTTPS and localhost, so getRandomValues is the fallback.
export const newSubmissionKey = (source: CryptoSource | null = globalThis.crypto ?? null): string | null => {
  try {
    if (!source) return null;
    if (typeof source.randomUUID === "function") {
      const key = source.randomUUID();
      return KEY_PATTERN.test(key) ? key : null;
    }
    const bytes = source.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const key = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    return KEY_PATTERN.test(key) ? key : null;
  } catch {
    return null;
  }
};

export type LeadPayload = Pick<LeadSubmission, "fullName" | "phone" | "email" | "message"> & {
  services: string[];
  honeypot: string;
};

type FieldErrors = Partial<Record<keyof LeadSubmission, LeadFieldError>>;

// What the form should do next. Only "saved" means the lead is in the database.
export type LeadOutcome =
  | { kind: "saved"; leadId: string }
  | { kind: "invalid"; fieldErrors: FieldErrors }
  | { kind: "conflict" } // key reused with different data: nothing saved, make a new key
  | { kind: "rate_limited" }
  | { kind: "unavailable" } // server or database problem: nothing saved
  | { kind: "rejected" } // request refused (400/403/413/415...): nothing saved
  | { kind: "uncertain" }; // no trustworthy answer (timeout, network, odd reply): retry with the SAME key

// The exact JSON body: lead fields plus the honeypot, nothing else. `message`
// is included only when the form has one (the hero form does not).
export const leadRequestBody = (lead: LeadPayload) =>
  JSON.stringify({
    fullName: lead.fullName,
    phone: lead.phone,
    email: lead.email,
    services: lead.services,
    ...(lead.message === undefined ? {} : { message: lead.message }),
    [LEAD_HONEYPOT_FIELD]: lead.honeypot,
  });

// Submission-key rules from LEAD_CONTRACT.md section 5, shared by both forms:
// identical data keeps its key across retries (an uncertain attempt may already
// be saved); changed data, a confirmed save or a conflict get a new key.
export const createSubmissionKeys = (makeKey: () => string | null = newSubmissionKey) => {
  let key = makeKey();
  let lastFailedBody: string | null = null;
  return {
    // The key to send with `body`, or null when no safe key can be made
    // (then the form must not send).
    keyFor(body: string): string | null {
      if (lastFailedBody !== null && lastFailedBody !== body) {
        key = makeKey();
        lastFailedBody = null;
      }
      key ??= makeKey();
      return key;
    },
    // Records the outcome of the attempt that sent `body`.
    settle(kind: LeadOutcome["kind"], body: string) {
      if (kind === "saved" || kind === "conflict") {
        key = makeKey();
        lastFailedBody = null;
      } else {
        lastFailedBody = body;
      }
    },
  };
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
};

// Sends one lead and waits for the server's real answer (or the timeout).
export const postLead = async (
  lead: LeadPayload,
  submissionKey: string,
  { timeoutMs = 20_000, fetchImpl = globalThis.fetch }: { timeoutMs?: number; fetchImpl?: typeof fetch } = {},
): Promise<LeadOutcome> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(LEAD_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        [LEAD_SUBMISSION_KEY_HEADER]: submissionKey,
      },
      body: leadRequestBody(lead),
      cache: "no-store",
      signal: controller.signal,
    });
    const body = await readJson(response);
    switch (response.status) {
      case 200:
        return isObject(body) && body.ok === true && typeof body.leadId === "string" && KEY_PATTERN.test(body.leadId)
          ? { kind: "saved", leadId: body.leadId }
          : { kind: "uncertain" };
      case 422:
        return {
          kind: "invalid",
          fieldErrors: isObject(body) && isObject(body.fieldErrors) ? (body.fieldErrors as FieldErrors) : {},
        };
      case 409:
        return { kind: "conflict" };
      case 429:
        return { kind: "rate_limited" };
      case 500:
      case 503:
        return { kind: "unavailable" };
      default:
        return response.status >= 400 && response.status < 500 ? { kind: "rejected" } : { kind: "uncertain" };
    }
  } catch {
    return { kind: "uncertain" }; // timeout or network failure: the lead may or may not be saved
  } finally {
    clearTimeout(timer);
  }
};
