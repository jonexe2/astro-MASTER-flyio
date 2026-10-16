import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { openDatabase } from "./connection.ts";

// Database constraints from migration 1, checked with synthetic records in a
// temporary database. They are a last safety net; full validation is in TypeScript.

const freshDb = (t: TestContext) => {
  const dir = mkdtempSync(join(tmpdir(), "p22-schema-"));
  const db = openDatabase(join(dir, "test.sqlite"), "development");
  t.after(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return db;
};

const TIME = "2026-10-16T14:03:22.123Z";
const ID = "3f2b8c1e-9d4a-4b6f-8e21-5a7c0d9e1f42";

const lead = (overrides: Record<string, unknown> = {}) => ({
  id: ID,
  created_at: TIME,
  updated_at: TIME,
  full_name: "Test Person",
  phone: "+1 555 0100",
  email: "test@example.com",
  services: '["AC Repair","Heating Repair"]',
  message: null,
  submission_key: null,
  ...overrides,
});

const insertLead = (db: DatabaseSync, row: Record<string, unknown>) =>
  db
    .prepare(
      `INSERT INTO leads (id, created_at, updated_at, full_name, phone, email, services, message, submission_key)
       VALUES (:id, :created_at, :updated_at, :full_name, :phone, :email, :services, :message, :submission_key)`,
    )
    .run(row as never);

const insertJob = (db: DatabaseSync, overrides: Record<string, unknown> = {}) =>
  db
    .prepare(
      `INSERT INTO integration_jobs (lead_id, kind, status, next_attempt_at, created_at, updated_at)
       VALUES (:lead_id, :kind, :status, :next_attempt_at, :created_at, :updated_at)`,
    )
    .run({
      lead_id: ID,
      kind: "email_new_lead",
      status: "pending",
      next_attempt_at: TIME,
      created_at: TIME,
      updated_at: TIME,
      ...overrides,
    } as never);

const rejects = (db: DatabaseSync, row: Record<string, unknown>, label: string) =>
  assert.throws(() => insertLead(db, row), Error, label);

test("a valid lead is stored exactly, including NULL message and key", (t) => {
  const db = freshDb(t);
  const row = lead({ message: "Line one\nLine two", submission_key: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee" });
  insertLead(db, row);
  insertLead(db, lead({ id: "3f2b8c1e-9d4a-4b6f-8e21-5a7c0d9e1f43", phone: "0123 456 789" }));
  assert.deepEqual({ ...db.prepare("SELECT * FROM leads WHERE id = ?").get(ID) }, row);
  const second = db.prepare("SELECT phone, message, submission_key FROM leads WHERE id LIKE '%43'").get();
  assert.deepEqual({ ...second }, { phone: "0123 456 789", message: null, submission_key: null });
});

test("duplicate lead IDs and duplicate submission keys are rejected; NULL keys may repeat", (t) => {
  const db = freshDb(t);
  insertLead(db, lead());
  rejects(db, lead({ email: "other@example.com" }), "duplicate id");
  insertLead(db, lead({ id: "3f2b8c1e-9d4a-4b6f-8e21-5a7c0d9e1f43" })); // second NULL key
  const key = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
  insertLead(db, lead({ id: "3f2b8c1e-9d4a-4b6f-8e21-5a7c0d9e1f44", submission_key: key }));
  rejects(db, lead({ id: "3f2b8c1e-9d4a-4b6f-8e21-5a7c0d9e1f45", submission_key: key }), "duplicate key");
  assert.equal(db.prepare("SELECT count(*) AS n FROM leads").get()?.n, 3);
});

test("malformed IDs, keys and timestamps are rejected", (t) => {
  const db = freshDb(t);
  rejects(db, lead({ id: ID.toUpperCase() }), "uppercase id");
  rejects(db, lead({ id: "not-a-uuid" }), "bad id");
  rejects(db, lead({ submission_key: "123" }), "bad key");
  rejects(db, lead({ created_at: "2026-10-16 14:03:22" }), "bad created_at");
  rejects(db, lead({ updated_at: "2026-10-16T14:03:22Z" }), "bad updated_at");
  rejects(db, lead({ updated_at: "2026-10-16T14:03:22.122Z" }), "updated_at before created_at");
});

test("required text, lengths, message and services rules are enforced", (t) => {
  const db = freshDb(t);
  rejects(db, lead({ full_name: "" }), "empty name");
  rejects(db, lead({ full_name: "x".repeat(101) }), "long name");
  rejects(db, lead({ phone: "1".repeat(31) }), "long phone");
  rejects(db, lead({ email: "a@" }), "short email");
  rejects(db, lead({ message: "" }), "empty-string message");
  rejects(db, lead({ message: "x".repeat(2001) }), "long message");
  rejects(db, lead({ services: "[]" }), "empty services");
  rejects(db, lead({ services: "AC Repair" }), "services not JSON");
  rejects(db, lead({ services: '{"a":1}' }), "services not a list");
  rejects(db, lead({ full_name: null }), "missing name");
  insertLead(db, lead({ full_name: "x".repeat(100), message: "x".repeat(2000) }));
});

test("STRICT tables refuse values that cannot become the column type; numbers are stored as text", (t) => {
  const db = freshDb(t);
  // SQLite turns a number given for a TEXT column into text; it never stays a number.
  insertLead(db, lead({ phone: 5550100 }));
  assert.equal(db.prepare("SELECT typeof(phone) AS type FROM leads").get()?.type, "text");
  const jobs = db.prepare(
    `INSERT INTO integration_jobs (lead_id, kind, status, attempts, next_attempt_at, created_at, updated_at)
     VALUES (?, 'sheet_sync', 'pending', ?, ?, ?, ?)`,
  );
  assert.throws(() => jobs.run(ID, "many", TIME, TIME, TIME), Error, "text as attempts");
  assert.throws(() => jobs.run(ID, 0, 1, TIME, TIME), Error, "number as a timestamp");
});

test("integration jobs need an existing lead, a known kind/status and are unique per lead and kind", (t) => {
  const db = freshDb(t);
  assert.throws(() => insertJob(db), Error, "job for unknown lead");
  insertLead(db, lead());
  insertJob(db);
  insertJob(db, { kind: "sheet_sync" });
  assert.throws(() => insertJob(db), Error, "second email job for the same lead");
  assert.throws(() => insertJob(db, { lead_id: ID, kind: "sms" }), Error, "unknown kind");
  db.exec("DELETE FROM integration_jobs");
  assert.throws(() => insertJob(db, { status: "queued" }), Error, "unknown status");
});
