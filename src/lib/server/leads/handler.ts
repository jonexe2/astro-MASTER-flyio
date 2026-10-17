import "../server-only.ts";
import type { DatabaseSync } from "node:sqlite";
import {
  LEAD_HONEYPOT_FIELD,
  LEAD_MAX_BODY_BYTES,
  LEAD_SUBMISSION_KEY_HEADER,
  type LeadEndpointResponse,
  type LeadSubmission,
  type LeadSubmissionHandler,
  type LeadSubmissionResult,
} from "../../leads/contract.ts";
import { getDatabase } from "../db/connection.ts";
import { saveLead } from "../db/leads.ts";
import { logServerError } from "../errors.ts";
import { RateLimiter, clientKey } from "./rate-limit.ts";

// The one backend flow both lead forms use (POST /api/leads/). Checks run in
// this order: method, origin, rate limit, content type, size, JSON shape,
// honeypot; then saveLead() validates and saves the lead and its follow-up
// jobs in one transaction. Responses carry constant codes only: never
// submitted values, stored leads or error details.

const UNAVAILABLE = { ok: false, reason: "unavailable" } as const;
const BAD_REQUEST = { ok: false, reason: "bad_request" } as const;

const STATUS: Record<Exclude<LeadSubmissionResult, { ok: true }>["reason"], number> = {
  invalid: 422,
  bad_request: 400,
  conflict: 409,
  unavailable: 503,
};

const LEAD_FIELDS = ["fullName", "phone", "email", "services", "message"] as const satisfies readonly (keyof LeadSubmission)[];
const ALLOWED_KEYS = new Set<string>([...LEAD_FIELDS, LEAD_HONEYPOT_FIELD]);

const respond = (status: number, body: LeadEndpointResponse, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers,
    },
  });

const submit = (getDb: () => DatabaseSync, input: unknown, submissionKey: unknown): LeadSubmissionResult => {
  let db: DatabaseSync;
  try {
    db = getDb();
  } catch (error) {
    logServerError("leads", error); // bad settings or unopenable database
    return UNAVAILABLE;
  }
  return saveLead(db, input, submissionKey);
};

// LeadSubmissionHandler from the shared contract, on the server's database.
export const submitLead: LeadSubmissionHandler = async (input, submissionKey) =>
  submit(getDatabase, input, submissionKey);

// Same-origin browsers only. Sec-Fetch-Site is set by the browser itself;
// without it, Origin must equal the URL Astro built for this request. Astro's
// own checkOrigin skips JSON requests, so this check is required. Forwarded
// headers are never read. Scripts outside a browser can fake both headers;
// the rate limit and validation still apply to them.
const isSameOrigin = (request: Request) => {
  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
};

// application/json, optionally with charset=utf-8, not compressed.
const isJsonRequest = (request: Request) => {
  const encoding = request.headers.get("content-encoding");
  if (encoding && encoding.trim().toLowerCase() !== "identity") return false;
  const [type, ...params] = (request.headers.get("content-type") ?? "").split(";").map((p) => p.trim().toLowerCase());
  return type === "application/json" && params.every((p) => p === "" || p === "charset=utf-8" || p === 'charset="utf-8"');
};

type Body = { ok: true; text: string } | { ok: false; status: 400 | 413 };

// Reads at most LEAD_MAX_BODY_BYTES (the Node adapter's own limit is 1 GiB).
const readBody = async (request: Request): Promise<Body> => {
  const length = request.headers.get("content-length");
  if (length !== null) {
    if (!/^\d+$/.test(length.trim())) return { ok: false, status: 400 };
    if (Number(length) > LEAD_MAX_BODY_BYTES) return { ok: false, status: 413 };
  }
  if (!request.body) return { ok: true, text: "" };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > LEAD_MAX_BODY_BYTES) {
        await reader.cancel().catch(() => {});
        return { ok: false, status: 413 };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400 }; // connection closed mid-body
  }
  try {
    return { ok: true, text: new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)) };
  } catch {
    return { ok: false, status: 400 }; // not valid UTF-8
  }
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export interface LeadRequestOptions {
  clientAddress?: string; // from Astro; never from request headers
  getDb?: () => DatabaseSync; // tests only
  limiter?: RateLimiter; // tests only
}

const sharedLimiter = new RateLimiter();

export const handleLeadRequest = async (request: Request, options: LeadRequestOptions = {}): Promise<Response> => {
  try {
    if (request.method !== "POST") return respond(405, { ok: false, reason: "method_not_allowed" }, { Allow: "POST" });
    if (!isSameOrigin(request)) return respond(403, { ok: false, reason: "forbidden" });

    const limit = (options.limiter ?? sharedLimiter).hit(clientKey(options.clientAddress));
    if (!limit.ok) {
      return respond(429, { ok: false, reason: "rate_limited" }, { "Retry-After": String(limit.retryAfterSeconds) });
    }

    if (!isJsonRequest(request)) return respond(415, { ok: false, reason: "unsupported_media_type" });
    const body = await readBody(request);
    if (!body.ok) return body.status === 413 ? respond(413, { ok: false, reason: "too_large" }) : respond(400, BAD_REQUEST);

    let input: unknown;
    try {
      input = JSON.parse(body.text);
    } catch {
      return respond(400, BAD_REQUEST);
    }
    if (!isPlainObject(input) || Object.keys(input).some((key) => !ALLOWED_KEYS.has(key))) {
      return respond(400, BAD_REQUEST);
    }

    // A filled honeypot is answered like any malformed request: nothing saved,
    // no fake success, nothing logged.
    const honeypot = input[LEAD_HONEYPOT_FIELD];
    if (honeypot !== undefined && honeypot !== "") return respond(400, BAD_REQUEST);

    const lead = Object.fromEntries(LEAD_FIELDS.filter((key) => key in input).map((key) => [key, input[key]]));
    const result = submit(options.getDb ?? getDatabase, lead, request.headers.get(LEAD_SUBMISSION_KEY_HEADER));
    return respond(result.ok ? 200 : STATUS[result.reason], result);
  } catch (error) {
    logServerError("leads", error);
    return respond(500, UNAVAILABLE);
  }
};
