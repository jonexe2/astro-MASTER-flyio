import "../server-only.ts";
import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { ServerError } from "../errors.ts";
import { MIGRATIONS, type Migration } from "./migrations/index.ts";

export const migrationChecksum = (sql: string) => createHash("sha256").update(sql).digest("hex");

// SQLITE_BUSY (5) and its extended codes: another connection holds the lock.
export const isBusyError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "errcode" in error &&
  typeof error.errcode === "number" &&
  (error.errcode & 0xff) === 5;

const busy = () =>
  new ServerError("DB_BUSY", "The database is locked by another process. Wait a moment and start again.");
const failed = () =>
  new ServerError("DB_MIGRATION_FAILED", "A database migration failed. Nothing was changed; fix the migration and start again.");
const mismatch = () =>
  new ServerError(
    "DB_MIGRATION_MISMATCH",
    "The database was migrated by different code (an edited migration, or a database newer than this code). Nothing was changed.",
  );

const CREATE_SCHEMA_MIGRATIONS = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  checksum TEXT NOT NULL,
  applied_at TEXT NOT NULL
) STRICT`;

// Brings the database up to date in ONE transaction: validation, every pending
// migration, their records and the foreign-key check are committed together or
// rolled back together. BEGIN IMMEDIATE takes the write lock first, so a second
// process waits (busy timeout) and then finds nothing to do.
// Returns the versions applied by this run.
export const runMigrations = (db: DatabaseSync, migrations: readonly Migration[] = MIGRATIONS): number[] => {
  if (migrations.some((m, index) => m.version !== index + 1)) {
    throw new ServerError("DB_MIGRATION_LIST", "Migration versions must be 1, 2, 3, ... in order with no gaps.");
  }

  try {
    db.exec("BEGIN IMMEDIATE");
  } catch (error) {
    throw isBusyError(error) ? busy() : failed();
  }

  try {
    db.exec(CREATE_SCHEMA_MIGRATIONS);

    const recorded = db.prepare("SELECT version, name, checksum FROM schema_migrations ORDER BY version").all();
    recorded.forEach((row, index) => {
      const known = migrations[index];
      if (
        !known ||
        row.version !== known.version ||
        row.name !== known.name ||
        row.checksum !== migrationChecksum(known.sql)
      ) {
        throw mismatch();
      }
    });

    const pending = migrations.slice(recorded.length);
    const record = db.prepare(
      "INSERT INTO schema_migrations (version, name, checksum, applied_at) VALUES (?, ?, ?, ?)",
    );
    for (const migration of pending) {
      db.exec(migration.sql);
      record.run(migration.version, migration.name, migrationChecksum(migration.sql), new Date().toISOString());
    }

    if (db.prepare("PRAGMA foreign_key_check").all().length > 0) throw failed();

    db.exec("COMMIT");
    return pending.map((m) => m.version);
  } catch (error) {
    try {
      if (db.isTransaction) db.exec("ROLLBACK");
    } catch {
      // The caller closes the connection, which also discards the transaction.
    }
    if (error instanceof ServerError) throw error;
    throw isBusyError(error) ? busy() : failed();
  }
};
