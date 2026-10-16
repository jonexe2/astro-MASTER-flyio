import "../server-only.ts";
import { logServerError } from "../errors.ts";
import { resolveDatabasePath } from "../settings.ts";
import { openDatabase } from "./connection.ts";

// `npm run db:migrate`: creates the database if needed and applies pending
// migrations, using APP_ENV and DATABASE_PATH from the environment or .env.
// Safe to run repeatedly.
try {
  const { appEnv, path } = resolveDatabasePath(process.env);
  const db = openDatabase(path, appEnv);
  const { version } = db.prepare("SELECT max(version) AS version FROM schema_migrations").get() ?? {};
  db.close();
  console.log(`Database ready (schema version ${version}).`);
} catch (error) {
  logServerError("db:migrate", error);
  process.exitCode = 1;
}
