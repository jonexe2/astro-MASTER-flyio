import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { ServerError } from "../errors.ts";
import { openDatabase } from "./connection.ts";
import { MIGRATIONS, type Migration } from "./migrations/index.ts";

// Temporary databases with synthetic records only; never .env or a real database.

// Connections opened by a test; closed before its folder is removed (Windows
// cannot delete open database files).
const openConnections = new WeakMap<TestContext, DatabaseSync[]>();

const tempPath = (t: TestContext) => {
  const dir = mkdtempSync(join(tmpdir(), "p22-migrate-"));
  openConnections.set(t, []);
  t.after(() => {
    for (const db of openConnections.get(t) ?? []) if (db.isOpen) db.close();
    rmSync(dir, { recursive: true, force: true });
  });
  return join(dir, "test.sqlite");
};

const track = <T extends DatabaseSync>(t: TestContext, db: T) => {
  openConnections.get(t)?.push(db);
  return db;
};

const open = (t: TestContext, path: string, migrations: readonly Migration[] = MIGRATIONS, timeout?: number) =>
  track(t, openDatabase(path, "development", { migrations, timeout }));

const errorCode = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof ServerError, "expected a ServerError");
    return error.code;
  }
  assert.fail("expected an error");
};

// Schema listing, migration records and leads, read with a separate connection.
const snapshot = (path: string) => {
  const db = new DatabaseSync(path);
  try {
    const schema = db.prepare("SELECT type, name, sql FROM sqlite_master ORDER BY type, name").all();
    const has = (name: string) => schema.some((row) => row.name === name);
    return {
      schema,
      migrations: has("schema_migrations")
        ? db.prepare("SELECT version, name, checksum FROM schema_migrations ORDER BY version").all()
        : [],
      leads: has("leads") ? db.prepare("SELECT * FROM leads ORDER BY id").all() : [],
    };
  } finally {
    db.close();
  }
};

const insertLead = (db: DatabaseSync, id: string) =>
  db
    .prepare(
      `INSERT INTO leads (id, created_at, updated_at, full_name, phone, email, services, message, submission_key)
       VALUES (?, '2026-10-16T14:03:22.123Z', '2026-10-16T14:03:22.123Z', 'Test Person', '+1 555 0100',
               'test@example.com', '["AC Repair"]', NULL, NULL)`,
    )
    .run(id);

const LEAD_A = "00000000-0000-4000-8000-00000000000a";
const LEAD_B = "00000000-0000-4000-8000-00000000000b";

const addTable: Migration = { version: 2, name: "test_add_table", sql: "CREATE TABLE test_extra (x TEXT) STRICT;" };
const broken: Migration = { version: 3, name: "test_broken", sql: "CREATE TABLE test_broken (;" };

test("fresh database: tables, index, migration record and WAL", (t) => {
  const path = tempPath(t);
  const db = open(t, path);
  const names = db.prepare("SELECT name FROM sqlite_master WHERE type IN ('table', 'index') ORDER BY name").all();
  const list = names.map((r) => r.name);
  for (const name of ["integration_jobs", "leads", "leads_created_at", "schema_migrations"]) assert.ok(list.includes(name), name);
  assert.deepEqual(
    db.prepare("SELECT version, name FROM schema_migrations").all().map((r) => ({ ...r })),
    [{ version: 1, name: "initial" }],
  );
  assert.equal(db.prepare("PRAGMA journal_mode").get()?.journal_mode, "wal");
  assert.equal(db.isTransaction, false);
});

test("fresh database with a failing migration keeps no tables at all", (t) => {
  const path = tempPath(t);
  const failing = { ...broken, version: 2 };
  assert.equal(errorCode(() => open(t, path, [...MIGRATIONS, failing])), "DB_MIGRATION_FAILED");
  assert.deepEqual(snapshot(path).schema, []);
});

test("repeat initialization changes nothing", (t) => {
  const path = tempPath(t);
  const first = open(t, path);
  insertLead(first, LEAD_A);
  first.close();
  const before = snapshot(path);
  open(t, path).close();
  assert.deepEqual(snapshot(path), before);
  assert.equal(before.migrations.length, 1);
  assert.equal(before.leads.length, 1);
});

test("upgrade applies only the new migration and keeps leads", (t) => {
  const path = tempPath(t);
  const v1 = open(t, path);
  insertLead(v1, LEAD_A);
  insertLead(v1, LEAD_B);
  v1.close();
  const before = snapshot(path);
  open(t, path, [...MIGRATIONS, addTable]).close();
  const after = snapshot(path);
  assert.deepEqual(after.migrations.map((r) => r.version), [1, 2]);
  assert.ok(after.schema.some((r) => r.name === "test_extra"));
  assert.deepEqual(after.leads, before.leads);
});

test("failed upgrade with several pending migrations rolls back all of them", (t) => {
  const path = tempPath(t);
  const v1 = open(t, path);
  insertLead(v1, LEAD_A);
  v1.close();
  const before = snapshot(path);
  assert.equal(errorCode(() => open(t, path, [...MIGRATIONS, addTable, broken])), "DB_MIGRATION_FAILED");
  const after = snapshot(path);
  assert.deepEqual(after, before);
  assert.ok(!after.schema.some((r) => r.name === "test_extra"), "migration 2 must be rolled back too");
});

test("a foreign-key problem found by the final check rolls everything back", (t) => {
  const path = tempPath(t);
  open(t, path).close();
  const before = snapshot(path);
  const orphanJob: Migration = {
    version: 2,
    name: "test_orphan_job",
    sql: `PRAGMA defer_foreign_keys = ON;
      INSERT INTO integration_jobs (lead_id, kind, status, next_attempt_at, created_at, updated_at)
      VALUES ('${LEAD_A}', 'sheet_sync', 'pending', '2026-10-16T14:03:22.123Z', '2026-10-16T14:03:22.123Z', '2026-10-16T14:03:22.123Z');`,
  };
  assert.equal(errorCode(() => open(t, path, [...MIGRATIONS, orphanJob])), "DB_MIGRATION_FAILED");
  assert.deepEqual(snapshot(path), before);
});

test("an edited migration or a database newer than the code is refused", (t) => {
  const path = tempPath(t);
  const db = open(t, path, [...MIGRATIONS, addTable]);
  insertLead(db, LEAD_A);
  db.close();
  const before = snapshot(path);
  const edited = [{ ...MIGRATIONS[0], sql: `${MIGRATIONS[0].sql}\n-- edited` }, addTable];
  assert.equal(errorCode(() => open(t, path, edited)), "DB_MIGRATION_MISMATCH");
  assert.equal(errorCode(() => open(t, path, MIGRATIONS)), "DB_MIGRATION_MISMATCH");
  assert.deepEqual(snapshot(path), before);
});

test("a migration list with gaps is refused before touching the database", (t) => {
  const path = tempPath(t);
  assert.equal(errorCode(() => open(t, path, [...MIGRATIONS, broken])), "DB_MIGRATION_LIST");
  assert.deepEqual(snapshot(path).schema, []);
});

test("a lock held by another connection gives DB_BUSY, then succeeds once released", (t) => {
  const path = tempPath(t);
  open(t, path).close();
  const before = snapshot(path);
  const other = track(t, new DatabaseSync(path));
  other.exec("BEGIN IMMEDIATE");
  assert.equal(errorCode(() => open(t, path, [...MIGRATIONS, addTable], 50)), "DB_BUSY");
  other.exec("ROLLBACK");
  assert.deepEqual(snapshot(path), before);
  open(t, path, [...MIGRATIONS, addTable]).close();
  assert.deepEqual(snapshot(path).migrations.map((r) => r.version), [1, 2]);
});

// Two separate Node processes initialize the same fresh file at the same moment.
const runChild = (path: string, startAt: number) =>
  new Promise<number>((resolve) => {
    const connection = pathToFileURL(join(import.meta.dirname, "connection.ts")).href;
    const code = `
      import { openDatabase } from ${JSON.stringify(connection)};
      while (Date.now() < ${startAt}) {}
      openDatabase(${JSON.stringify(path)}, "development").close();`;
    const child = spawn(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", code], {
      stdio: "ignore",
    });
    child.on("exit", (status) => resolve(status ?? -1));
  });

test("two processes initializing at once both succeed and apply each migration once", async (t) => {
  const path = tempPath(t);
  const startAt = Date.now() + 1500;
  const statuses = await Promise.all([runChild(path, startAt), runChild(path, startAt)]);
  assert.deepEqual(statuses, [0, 0]);
  const after = snapshot(path);
  assert.deepEqual(after.migrations.map((r) => r.version), MIGRATIONS.map((m) => m.version));
  assert.ok(after.schema.some((r) => r.name === "leads"));
});

test("production never creates a missing data folder; development does", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "p22-folder-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const missing = join(dir, "not-mounted");
  assert.equal(errorCode(() => openDatabase(join(missing, "app.sqlite"), "production")), "DB_DATA_DIR");
  assert.equal(existsSync(missing), false);
  openDatabase(join(missing, "dev.sqlite"), "development").close();
  assert.equal(existsSync(join(missing, "dev.sqlite")), true);
});

test("real migration list: versions 1..N, unique names, no transaction or forbidden statements", () => {
  assert.deepEqual(MIGRATIONS.map((m) => m.version), MIGRATIONS.map((_, i) => i + 1));
  assert.equal(new Set(MIGRATIONS.map((m) => m.name)).size, MIGRATIONS.length);
  const forbidden = /\b(BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE|VACUUM)\b|\bPRAGMA\s+(journal_mode|foreign_keys)\b/i;
  for (const m of MIGRATIONS) assert.doesNotMatch(m.sql, forbidden, `migration ${m.version}`);
});
