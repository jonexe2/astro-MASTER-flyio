import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { ServerError } from "../errors.ts";
import { openDatabase } from "./connection.ts";
import { countLeads, getLeadById, listLeads, saveLead } from "./leads.ts";

// Temporary databases with synthetic customer details only.

const setup = (t: TestContext, timeout?: number) => {
  const dir = mkdtempSync(join(tmpdir(), "p23-leads-"));
  const path = join(dir, "test.sqlite");
  const db = openDatabase(path, "development", { timeout });
  const others: DatabaseSync[] = [];
  t.after(() => {
    for (const c of [db, ...others]) if (c.isOpen) c.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const connect = () => {
    const c = new DatabaseSync(path);
    others.push(c);
    return c;
  };
  return { db, path, connect };
};

const input = (overrides: Record<string, unknown> = {}) => ({
  fullName: "Test Person",
  phone: "+1 (555) 010-0100",
  email: "test@example.com",
  services: ["Heating Repair", "AC Repair"],
  ...overrides,
});

const KEY = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const KEY_2 = "aaaaaaaa-bbbb-4ccc-8ddd-ffffffffffff";

const count = (db: DatabaseSync, table: "leads" | "integration_jobs") =>
  Number(db.prepare(`SELECT count(*) AS n FROM ${table}`).get()?.n);

const leadIdOf = (result: ReturnType<typeof saveLead>) => {
  assert.ok(result.ok, `expected success, got ${JSON.stringify(result)}`);
  return result.leadId;
};

// Silence the expected "[leads] ..." error log lines during failure tests.
const quietErrors = (t: TestContext) => t.mock.method(console, "error", () => {});

test("a saved lead reads back exactly, in the contract's stored format, with two pending jobs", (t) => {
  const { db } = setup(t);
  const now = new Date("2026-10-16T14:03:22.123Z");
  const id = leadIdOf(saveLead(db, input({ message: "Line one\r\nLine two" }), KEY, { now: () => now }));

  assert.deepEqual(getLeadById(db, id), {
    id,
    createdAt: "2026-10-16T14:03:22.123Z",
    updatedAt: "2026-10-16T14:03:22.123Z",
    fullName: "Test Person",
    phone: "+1 (555) 010-0100",
    email: "test@example.com",
    services: ["AC Repair", "Heating Repair"],
    message: "Line one\nLine two",
    submissionKey: KEY,
  });
  const row = db.prepare("SELECT services, typeof(phone) AS phone_type FROM leads WHERE id = ?").get(id);
  assert.equal(row?.services, '["AC Repair","Heating Repair"]');
  assert.equal(row?.phone_type, "text");
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

  const jobs = db.prepare("SELECT lead_id, kind, status, attempts, next_attempt_at FROM integration_jobs ORDER BY kind").all();
  assert.deepEqual(
    jobs.map((j) => ({ ...j })),
    [
      { lead_id: id, kind: "email_new_lead", status: "pending", attempts: 0, next_attempt_at: "2026-10-16T14:03:22.123Z" },
      { lead_id: id, kind: "sheet_sync", status: "pending", attempts: 0, next_attempt_at: "2026-10-16T14:03:22.123Z" },
    ],
  );
});

test("a hero-style lead without message or key stores NULLs", (t) => {
  const { db } = setup(t);
  const id = leadIdOf(saveLead(db, input(), undefined));
  const lead = getLeadById(db, id);
  assert.equal(lead?.message, null);
  assert.equal(lead?.submissionKey, null);
  leadIdOf(saveLead(db, input(), null)); // null = header absent
  assert.equal(count(db, "leads"), 2);
});

test("invalid input saves nothing", (t) => {
  const { db } = setup(t);
  const result = saveLead(db, input({ email: "not-an-email", services: [] }), KEY);
  assert.deepEqual(result, { ok: false, reason: "invalid", fieldErrors: { email: "invalid", services: "required" } });
  assert.deepEqual(saveLead(db, "not an object", undefined), { ok: false, reason: "bad_request" });
  assert.equal(count(db, "leads"), 0);
  assert.equal(count(db, "integration_jobs"), 0);
});

test("a present but empty or malformed key is a bad request even with valid details", (t) => {
  const { db } = setup(t);
  for (const key of ["", " ", KEY.toUpperCase(), "123", 5]) {
    assert.deepEqual(saveLead(db, input(), key), { ok: false, reason: "bad_request" }, JSON.stringify(key));
  }
  assert.equal(count(db, "leads"), 0);
  assert.equal(count(db, "integration_jobs"), 0);
});

test("repeating a request with the same key and same data returns the original lead", (t) => {
  const { db } = setup(t);
  const first = leadIdOf(saveLead(db, input(), KEY));
  // Double-click / retry: same key, same details (services in another order, extra spaces).
  const again = saveLead(db, input({ fullName: "  Test Person ", services: ["AC Repair", "Heating Repair"] }), KEY);
  assert.deepEqual(again, { ok: true, leadId: first });
  assert.equal(count(db, "leads"), 1);
  assert.equal(count(db, "integration_jobs"), 2);
});

test("the same key with different data is a conflict and the original lead is untouched", (t) => {
  const { db } = setup(t);
  const id = leadIdOf(saveLead(db, input(), KEY));
  const before = getLeadById(db, id);
  assert.deepEqual(saveLead(db, input({ phone: "555-010-9999" }), KEY), { ok: false, reason: "conflict" });
  assert.deepEqual(saveLead(db, input({ message: "Added later" }), KEY), { ok: false, reason: "conflict" });
  assert.deepEqual(getLeadById(db, id), before);
  assert.equal(count(db, "leads"), 1);
});

test("separate inquiries with identical details stay separate leads", (t) => {
  const { db } = setup(t);
  const a = leadIdOf(saveLead(db, input(), undefined));
  const b = leadIdOf(saveLead(db, input(), undefined));
  const c = leadIdOf(saveLead(db, input(), KEY));
  const d = leadIdOf(saveLead(db, input(), KEY_2));
  assert.equal(new Set([a, b, c, d]).size, 4);
  assert.equal(count(db, "leads"), 4);
  assert.equal(count(db, "integration_jobs"), 8);
});

test("if saving a job fails, the lead is not saved either", (t) => {
  quietErrors(t);
  const { db } = setup(t);
  db.exec("CREATE TRIGGER test_fail_jobs BEFORE INSERT ON integration_jobs BEGIN SELECT RAISE(ABORT, 'test'); END");
  assert.deepEqual(saveLead(db, input(), KEY), { ok: false, reason: "unavailable" });
  assert.equal(count(db, "leads"), 0);
  assert.equal(count(db, "integration_jobs"), 0);
  assert.equal(db.isTransaction, false);
  db.exec("DROP TRIGGER test_fail_jobs");
  leadIdOf(saveLead(db, input(), KEY)); // the retry with the same key now saves
  assert.equal(count(db, "leads"), 1);
});

test("an ID collision fails the save and never overwrites the existing lead", (t) => {
  quietErrors(t);
  const { db } = setup(t);
  const fixedId = "3f2b8c1e-9d4a-4b6f-8e21-5a7c0d9e1f42";
  leadIdOf(saveLead(db, input(), undefined, { newId: () => fixedId }));
  const before = getLeadById(db, fixedId);
  const result = saveLead(db, input({ fullName: "Other Person" }), KEY, { newId: () => fixedId });
  assert.deepEqual(result, { ok: false, reason: "unavailable" });
  assert.deepEqual(getLeadById(db, fixedId), before);
  assert.equal(count(db, "leads"), 1);
  assert.equal(count(db, "integration_jobs"), 2);
});

test("a database locked by another connection gives 'unavailable', then works once released", (t) => {
  const log = quietErrors(t);
  const { db, connect } = setup(t, 50);
  const other = connect();
  other.exec("BEGIN IMMEDIATE");
  assert.deepEqual(saveLead(db, input(), KEY), { ok: false, reason: "unavailable" });
  assert.match(String(log.mock.calls.at(-1)?.arguments[0]), /\[leads\] DB_BUSY/);
  other.exec("ROLLBACK");
  assert.equal(count(db, "leads"), 0);
  leadIdOf(saveLead(db, input(), KEY));
});

test("error logs never contain customer details", (t) => {
  const log = quietErrors(t);
  const { db } = setup(t);
  db.exec("CREATE TRIGGER test_fail_leads BEFORE INSERT ON leads BEGIN SELECT RAISE(ABORT, 'secret test@example.com'); END");
  saveLead(db, input(), undefined);
  const printed = log.mock.calls.map((c) => c.arguments.join(" ")).join("\n");
  assert.match(printed, /\[leads\] UNEXPECTED: details hidden/);
  assert.doesNotMatch(printed, /test@example\.com|Test Person|555/);
});

// Two Node processes save at the same moment.
const saveInChild = (path: string, startAt: number, key: string | null) =>
  new Promise<string>((resolve) => {
    const here = (file: string) => pathToFileURL(join(import.meta.dirname, file)).href;
    const code = `
      import { openDatabase } from ${JSON.stringify(here("connection.ts"))};
      import { saveLead } from ${JSON.stringify(here("leads.ts"))};
      const db = openDatabase(${JSON.stringify(path)}, "development");
      while (Date.now() < ${startAt}) {}
      const result = saveLead(db, ${JSON.stringify(input())}, ${JSON.stringify(key)});
      db.close();
      process.stdout.write(JSON.stringify(result));`;
    const child = spawn(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", code]);
    let out = "";
    child.stdout.on("data", (chunk) => (out += chunk));
    child.on("exit", () => resolve(out));
  });

test("two processes saving the same key at once create one lead and both get its ID", async (t) => {
  const { db, path } = setup(t);
  const startAt = Date.now() + 1500;
  const results = (await Promise.all([saveInChild(path, startAt, KEY), saveInChild(path, startAt, KEY)])).map((r) =>
    JSON.parse(r),
  );
  assert.ok(results.every((r) => r.ok), JSON.stringify(results));
  assert.equal(results[0].leadId, results[1].leadId);
  assert.equal(count(db, "leads"), 1);
  assert.equal(count(db, "integration_jobs"), 2);
});

test("two processes saving at once with different keys create two leads", async (t) => {
  const { db, path } = setup(t);
  const startAt = Date.now() + 1500;
  const results = (await Promise.all([saveInChild(path, startAt, KEY), saveInChild(path, startAt, KEY_2)])).map((r) =>
    JSON.parse(r),
  );
  assert.ok(results.every((r) => r.ok), JSON.stringify(results));
  assert.notEqual(results[0].leadId, results[1].leadId);
  assert.equal(count(db, "leads"), 2);
});

// --- Reading -------------------------------------------------------------

const insertDirect = (db: DatabaseSync, id: string, createdAt: string, fields: Record<string, string | null> = {}) =>
  db
    .prepare(
      `INSERT INTO leads (id, created_at, updated_at, full_name, phone, email, services, message, submission_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    )
    .run(
      id,
      createdAt,
      createdAt,
      fields.full_name ?? "Test Person",
      fields.phone ?? "555-010-0100",
      fields.email ?? "test@example.com",
      fields.services ?? '["AC Repair"]',
      fields.message ?? null,
    );

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

test("getLeadById: unknown or malformed IDs return null", (t) => {
  const { db } = setup(t);
  assert.equal(getLeadById(db, id(1)), null);
  for (const bad of ["", "x", id(1).toUpperCase(), 5, null, "' OR 1=1 --"]) assert.equal(getLeadById(db, bad), null);
});

test("historical or client-specific service labels read back unchanged", (t) => {
  const { db } = setup(t);
  insertDirect(db, id(1), "2025-01-01T12:00:00.000Z", { services: '["Air Conditioning Repair","Drain Cleaning"]' });
  assert.deepEqual(getLeadById(db, id(1))?.services, ["Air Conditioning Repair", "Drain Cleaning"]);
});

test("a stored row with unreadable services is reported, not shown", (t) => {
  const { db } = setup(t);
  insertDirect(db, id(1), "2025-01-01T12:00:00.000Z", { services: "[1, 2]" });
  assert.throws(() => getLeadById(db, id(1)), (e) => e instanceof ServerError && e.code === "DB_INVALID_ROW");
});

test("listLeads: newest first, stable order and page by page", (t) => {
  const { db } = setup(t);
  for (let n = 1; n <= 30; n++) insertDirect(db, id(n), `2026-10-${String(n).padStart(2, "0")}T12:00:00.000Z`);
  insertDirect(db, id(31), "2026-10-30T12:00:00.000Z"); // same time as id(30): the ID decides the order
  const first = listLeads(db, { pageSize: 10 });
  assert.equal(first.total, 31);
  assert.deepEqual(first.leads.slice(0, 3).map((l) => l.id), [id(31), id(30), id(29)]);
  const pages = [1, 2, 3, 4].flatMap((page) => listLeads(db, { page, pageSize: 10 }).leads.map((l) => l.id));
  assert.equal(pages.length, 31);
  assert.equal(new Set(pages).size, 31);
  assert.equal(listLeads(db).leads.length, 25);
  assert.equal(listLeads(db, { page: 5, pageSize: 10 }).leads.length, 0);
});

test("listLeads: invalid page, size, search or dates are rejected", (t) => {
  const { db } = setup(t);
  const invalid = (e: unknown) => e instanceof ServerError && e.code === "LEADS_QUERY_INVALID";
  for (const options of [
    { page: 0 },
    { page: 1.5 },
    { pageSize: 101 },
    { pageSize: 0 },
    { search: "x".repeat(101) },
    { fromDate: "2026-10-01" }, // no time zone
    { fromDate: "2026-02-30", timeZone: "UTC" },
    { fromDate: "2026-10-05", toDate: "2026-10-01", timeZone: "UTC" },
  ]) {
    assert.throws(() => listLeads(db, options), invalid, JSON.stringify(options));
  }
});

test("listLeads: search in name, email, phone (punctuation ignored), message and services", (t) => {
  const { db } = setup(t);
  insertDirect(db, id(1), "2026-10-01T12:00:00.000Z", { full_name: "Alice Example", phone: "+1 (555) 010-0100" });
  insertDirect(db, id(2), "2026-10-02T12:00:00.000Z", {
    phone: "617-555-0199",
    email: "Bob@Example.net",
    message: "Furnace makes noise",
  });
  insertDirect(db, id(3), "2026-10-03T12:00:00.000Z", {
    phone: "617-555-0188",
    services: '["Indoor Air Quality"]',
    message: "100% sure_ok",
  });
  const found = (search: string) => listLeads(db, { search }).leads.map((l) => l.id).sort();
  assert.deepEqual(found("alice"), [id(1)]);
  assert.deepEqual(found("bob@example"), [id(2)]);
  assert.deepEqual(found("555-0100"), [id(1)]);
  assert.deepEqual(found("(555) 010 0100"), [id(1)]);
  assert.deepEqual(found("(617) 555.0199"), [id(2)]);
  assert.deepEqual(found("FURNACE"), [id(2)]);
  assert.deepEqual(found("indoor air"), [id(3)]);
  // % and _ are plain text, not wildcards: "a_i" would match "Alice" as a LIKE pattern.
  assert.deepEqual(found("%"), [id(3)]);
  assert.deepEqual(found("a_i"), []);
  assert.deepEqual(found("e_o"), [id(3)]);
  assert.equal(found("   ").length, 3); // blank search = no filter
});

test("listLeads: date range is inclusive, in the business time zone", (t) => {
  const { db } = setup(t);
  // 1 Oct 03:59 UTC is still 30 Sep in New York; 1 Oct 04:00 UTC is midnight 1 Oct there.
  insertDirect(db, id(1), "2026-10-01T03:59:59.999Z");
  insertDirect(db, id(2), "2026-10-01T04:00:00.000Z");
  insertDirect(db, id(3), "2026-10-02T03:59:59.999Z"); // 1 Oct 23:59 in New York
  insertDirect(db, id(4), "2026-10-02T04:00:00.000Z"); // 2 Oct
  const ids = (options: Parameters<typeof listLeads>[1]) => listLeads(db, options).leads.map((l) => l.id).sort();
  const NY = "America/New_York";
  assert.deepEqual(ids({ fromDate: "2026-10-01", toDate: "2026-10-01", timeZone: NY }), [id(2), id(3)]);
  assert.deepEqual(ids({ fromDate: "2026-10-02", timeZone: NY }), [id(4)]);
  assert.deepEqual(ids({ toDate: "2026-09-30", timeZone: NY }), [id(1)]);
  // In UTC, id(3) (02 Oct 03:59 UTC) already belongs to 2 October.
  assert.deepEqual(ids({ fromDate: "2026-10-01", toDate: "2026-10-01", timeZone: "UTC" }), [id(1), id(2)]);
});

test("countLeads: total, today and this month in the business time zone", (t) => {
  const { db } = setup(t);
  insertDirect(db, id(1), "2026-09-30T12:00:00.000Z"); // September
  insertDirect(db, id(2), "2026-10-01T04:00:00.000Z"); // 1 Oct 00:00 New York
  insertDirect(db, id(3), "2026-10-16T03:59:59.999Z"); // 15 Oct 23:59 New York
  insertDirect(db, id(4), "2026-10-16T04:00:00.000Z"); // 16 Oct 00:00 New York
  insertDirect(db, id(5), "2026-10-16T15:00:00.000Z"); // 16 Oct 11:00 New York
  const now = new Date("2026-10-16T16:00:00.000Z");
  assert.deepEqual(countLeads(db, { timeZone: "America/New_York", now }), { total: 5, today: 2, thisMonth: 4 });
  assert.deepEqual(countLeads(db, { timeZone: "UTC", now }), { total: 5, today: 3, thisMonth: 4 });
  assert.throws(() => countLeads(db, { timeZone: "Nowhere/City", now }), (e) => e instanceof ServerError && e.code === "LEADS_TIME_ZONE");
});
