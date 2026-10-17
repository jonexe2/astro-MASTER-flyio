import "../server-only.ts";
import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { LeadRecord, LeadSubmissionResult } from "../../leads/contract.ts";
import { ServerError, logServerError } from "../errors.ts";
import {
  localDayStartUtc,
  nextLocalDate,
  parseLocalDate,
  todayAndMonthStartUtc,
} from "../leads/local-time.ts";
import {
  UUID_PATTERN,
  isValidStoredServiceList,
  parseSubmissionKey,
  validateLeadSubmission,
  type CleanLead,
} from "../leads/validate.ts";
import { isBusyError } from "./migrate.ts";

// Saving and reading leads. Every value goes in as a `?` parameter; SQL text is
// never built from submitted or searched text. V1 leads are insert-only:
// nothing here updates or deletes a lead.

const UNAVAILABLE = { ok: false, reason: "unavailable" } as const;
const CONFLICT = { ok: false, reason: "conflict" } as const;
const BAD_REQUEST = { ok: false, reason: "bad_request" } as const;

const FOLLOW_UP_JOBS = ["email_new_lead", "sheet_sync"] as const;

interface LeadRow {
  id: string;
  created_at: string;
  updated_at: string;
  full_name: string;
  phone: string;
  email: string;
  services: string;
  message: string | null;
  submission_key: string | null;
}

interface SaveOptions {
  now?: () => Date; // tests only
  newId?: () => string; // tests only
}

const findBySubmissionKey = (db: DatabaseSync, key: string) =>
  db.prepare("SELECT * FROM leads WHERE submission_key = ?").get(key) as LeadRow | undefined;

// A repeat of an already saved request: same key and the same cleaned data.
const answerForExisting = (row: LeadRow, lead: CleanLead, services: string): LeadSubmissionResult =>
  row.full_name === lead.fullName &&
  row.phone === lead.phone &&
  row.email === lead.email &&
  row.services === services &&
  row.message === lead.message
    ? { ok: true, leadId: row.id }
    : CONFLICT;

const rollback = (db: DatabaseSync) => {
  try {
    if (db.isTransaction) db.exec("ROLLBACK");
  } catch {
    // Nothing more can be done; the transaction was not committed.
  }
};

const logFailure = (error: unknown) =>
  logServerError(
    "leads",
    isBusyError(error) ? new ServerError("DB_BUSY", "The database was locked; the lead was not saved.") : error,
  );

const isSubmissionKeyConflict = (error: unknown) =>
  error instanceof Error && error.message.includes("UNIQUE constraint failed: leads.submission_key");

// Checks, cleans and saves one lead with its email and Sheet follow-up jobs in
// ONE transaction. Returns success only after COMMIT; on any failure nothing is
// saved. Never throws for database problems.
export const saveLead = (
  db: DatabaseSync,
  input: unknown,
  submissionKey: unknown,
  options: SaveOptions = {},
): LeadSubmissionResult => {
  const key = parseSubmissionKey(submissionKey);
  if (!key.ok) return BAD_REQUEST;
  const checked = validateLeadSubmission(input);
  if (!checked.ok) {
    return checked.reason === "bad_request" ? BAD_REQUEST : { ok: false, reason: "invalid", fieldErrors: checked.fieldErrors };
  }
  const lead = checked.value;
  const services = JSON.stringify(lead.services);

  try {
    db.exec("BEGIN IMMEDIATE");
  } catch (error) {
    logFailure(error);
    return UNAVAILABLE;
  }

  try {
    if (key.key) {
      const existing = findBySubmissionKey(db, key.key);
      if (existing) {
        db.exec("ROLLBACK");
        return answerForExisting(existing, lead, services);
      }
    }

    const id = (options.newId ?? randomUUID)();
    const at = (options.now?.() ?? new Date()).toISOString();
    db.prepare(
      `INSERT INTO leads (id, created_at, updated_at, full_name, phone, email, services, message, submission_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, at, at, lead.fullName, lead.phone, lead.email, services, lead.message, key.key);

    const insertJob = db.prepare(
      `INSERT INTO integration_jobs (lead_id, kind, status, attempts, next_attempt_at, created_at, updated_at)
       VALUES (?, ?, 'pending', 0, ?, ?, ?)`,
    );
    for (const kind of FOLLOW_UP_JOBS) insertJob.run(id, kind, at, at, at);

    db.exec("COMMIT");
    return { ok: true, leadId: id };
  } catch (error) {
    rollback(db);
    // Safety net: the write lock should make this impossible, but if another
    // writer saved the same key first, answer as for a repeated request.
    if (key.key && isSubmissionKeyConflict(error)) {
      try {
        const existing = findBySubmissionKey(db, key.key);
        if (existing) return answerForExisting(existing, lead, services);
      } catch {
        // fall through to "unavailable"
      }
    }
    logFailure(error);
    return UNAVAILABLE;
  }
};

// Stored row -> LeadRecord, values unchanged. Services must follow the stored
// format rules (isValidStoredServiceList) but are NOT checked against today's
// list, so older or client-specific labels read back as stored.
const toRecord = (row: LeadRow): LeadRecord => {
  let services: unknown;
  try {
    services = JSON.parse(row.services);
  } catch {
    services = undefined;
  }
  if (!isValidStoredServiceList(services)) {
    throw new ServerError("DB_INVALID_ROW", "A stored lead has an unreadable services list.");
  }
  return {
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    services,
    message: row.message,
    submissionKey: row.submission_key,
  };
};

export const getLeadById = (db: DatabaseSync, id: unknown): LeadRecord | null => {
  if (typeof id !== "string" || !UUID_PATTERN.test(id)) return null;
  const row = db.prepare("SELECT * FROM leads WHERE id = ?").get(id) as LeadRow | undefined;
  return row ? toRecord(row) : null;
};

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;
const MAX_SEARCH_LENGTH = 100;

export interface ListLeadsOptions {
  page?: number; // 1-based
  pageSize?: number;
  search?: string;
  fromDate?: string; // YYYY-MM-DD in timeZone, inclusive
  toDate?: string; // YYYY-MM-DD in timeZone, inclusive
  timeZone?: string; // required with fromDate/toDate
}

const invalidQuery = () => new ServerError("LEADS_QUERY_INVALID", "The lead list request has an invalid page, search or date.");

// Phone text with spaces and common punctuation removed (same rule in SQL and JS).
const PHONE_PUNCTUATION = /[ \-().+]/g;
const PHONE_DIGITS_SQL =
  "replace(replace(replace(replace(replace(replace(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '.', ''), '+', '')";

const isPositiveInteger = (value: unknown) => Number.isInteger(value) && (value as number) >= 1;

// Newest first, page by page, with optional search and date range.
export const listLeads = (db: DatabaseSync, options: ListLeadsOptions = {}) => {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  if (!isPositiveInteger(page) || !isPositiveInteger(pageSize) || pageSize > MAX_PAGE_SIZE) throw invalidQuery();

  // Only constant SQL fragments are joined; every value is a parameter.
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (options.search !== undefined) {
    if (typeof options.search !== "string") throw invalidQuery();
    const search = options.search.normalize("NFC").trim();
    if ([...search].length > MAX_SEARCH_LENGTH) throw invalidQuery();
    if (search !== "") {
      const textMatch = ["full_name", "email", "coalesce(message, '')", "services"]
        .map((column) => `instr(lower(${column}), lower(?)) > 0`)
        .join(" OR ");
      const phoneSearch = search.replace(PHONE_PUNCTUATION, "");
      conditions.push(phoneSearch ? `(${textMatch} OR instr(${PHONE_DIGITS_SQL}, ?) > 0)` : `(${textMatch})`);
      params.push(search, search, search, search);
      if (phoneSearch) params.push(phoneSearch);
    }
  }

  if (options.fromDate !== undefined || options.toDate !== undefined) {
    if (typeof options.timeZone !== "string") throw invalidQuery();
    const from = options.fromDate === undefined ? undefined : parseLocalDate(options.fromDate);
    const to = options.toDate === undefined ? undefined : parseLocalDate(options.toDate);
    if ((options.fromDate !== undefined && !from) || (options.toDate !== undefined && !to)) throw invalidQuery();
    if (from) {
      conditions.push("created_at >= ?");
      params.push(localDayStartUtc(from, options.timeZone));
    }
    if (to) {
      conditions.push("created_at < ?");
      params.push(localDayStartUtc(nextLocalDate(to), options.timeZone));
    }
    if (from && to && localDayStartUtc(from, options.timeZone) > localDayStartUtc(to, options.timeZone)) {
      throw invalidQuery();
    }
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const total = Number(db.prepare(`SELECT count(*) AS total FROM leads ${where}`).get(...params)?.total ?? 0);
  const rows = db
    .prepare(`SELECT * FROM leads ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
    .all(...params, pageSize, (page - 1) * pageSize) as unknown as LeadRow[];
  return { leads: rows.map(toRecord), total, page, pageSize };
};

// All-time, today and this-month counts; "today" and "this month" are measured
// in the business time zone, not the server's.
export const countLeads = (db: DatabaseSync, options: { timeZone: string; now?: Date }) => {
  const { todayStart, monthStart } = todayAndMonthStartUtc(options.now ?? new Date(), options.timeZone);
  const row = db
    .prepare(
      `SELECT count(*) AS total,
              count(*) FILTER (WHERE created_at >= ?) AS today,
              count(*) FILTER (WHERE created_at >= ?) AS this_month
       FROM leads`,
    )
    .get(todayStart, monthStart);
  return { total: Number(row?.total ?? 0), today: Number(row?.today ?? 0), thisMonth: Number(row?.this_month ?? 0) };
};
