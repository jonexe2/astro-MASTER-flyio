import "../server-only.ts";
import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { ServerError } from "../errors.ts";
import { resolveDatabasePath, type AppEnv } from "../settings.ts";
import { isBusyError, runMigrations } from "./migrate.ts";
import { MIGRATIONS, type Migration } from "./migrations/index.ts";

// All SQLite access goes through this folder (built-in node:sqlite, Node >= 24.15).

export const BUSY_TIMEOUT_MS = 5000;

interface OpenOptions {
  migrations?: readonly Migration[]; // tests only
  timeout?: number; // tests only
}

// Opens the database at an explicit path and brings its schema up to date.
// Tests pass a temporary path; the server uses getDatabase().
export const openDatabase = (path: string, appEnv: AppEnv, options: OpenOptions = {}): DatabaseSync => {
  const folder = dirname(path);
  if (!existsSync(folder)) {
    // In production a missing folder means the data volume is not mounted;
    // creating it would put leads on disposable disk.
    if (appEnv === "production") {
      throw new ServerError(
        "DB_DATA_DIR",
        "The database folder does not exist. In production the data volume must be mounted; the folder is never created automatically.",
      );
    }
    mkdirSync(folder, { recursive: true });
  }

  const timeout = options.timeout ?? BUSY_TIMEOUT_MS;
  let db: DatabaseSync;
  try {
    db = new DatabaseSync(path, {
      timeout,
      enableForeignKeyConstraints: true,
      defensive: true,
    });
  } catch {
    throw new ServerError("DB_OPEN", "The database file could not be opened. Check DATABASE_PATH and file permissions.");
  }

  try {
    // These pragmas are ignored inside a transaction, so they run before migrations.
    enableWal(db, timeout);
    if (db.prepare("PRAGMA journal_mode").get()?.journal_mode !== "wal") {
      throw new ServerError("DB_OPEN", "The database could not be switched to WAL mode.");
    }
    db.exec("PRAGMA synchronous = FULL");
    runMigrations(db, options.migrations ?? MIGRATIONS);
    return db;
  } catch (error) {
    db.close();
    if (error instanceof ServerError) throw error;
    if (isBusyError(error)) {
      throw new ServerError("DB_BUSY", "The database is locked by another process. Wait a moment and start again.");
    }
    throw new ServerError("DB_OPEN", "The database could not be prepared. Check DATABASE_PATH and file permissions.");
  }
};

// Switching a new file to WAL needs a brief exclusive lock, and SQLite reports
// "busy" for it at once instead of using the busy timeout (seen when two
// processes create the same database). So retry just this step until the timeout.
const enableWal = (db: DatabaseSync, timeout: number) => {
  const deadline = Date.now() + timeout;
  const pause = new Int32Array(new SharedArrayBuffer(4));
  for (;;) {
    try {
      if (db.prepare("PRAGMA journal_mode").get()?.journal_mode !== "wal") db.exec("PRAGMA journal_mode = WAL");
      return;
    } catch (error) {
      if (!isBusyError(error) || Date.now() >= deadline) throw error;
      Atomics.wait(pause, 0, 0, 20);
    }
  }
};

let shared: DatabaseSync | undefined;

// The one shared connection for server code. Location comes only from
// resolveDatabasePath (src/lib/server/settings.ts).
export const getDatabase = (): DatabaseSync => {
  if (!shared) {
    const { appEnv, path } = resolveDatabasePath(process.env);
    shared = openDatabase(path, appEnv);
  }
  return shared;
};
