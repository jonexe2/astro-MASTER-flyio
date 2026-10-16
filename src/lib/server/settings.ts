import "./server-only.ts";
import { resolve } from "node:path";
import { ServerError } from "./errors.ts";

// Private settings come from environment variables (see .env.example), never from
// src/config/config.toml (public) and never from PUBLIC_ variables (sent to browsers).
// Functions take the environment as an argument so they can be tested; the caller
// passes process.env.

export type AppEnv = "development" | "production";

// Planned Fly.io volume mount (finalized in P8). Only production may use it.
export const PRODUCTION_DATA_DIR = "/data";
export const DEV_DEFAULT_DATABASE_PATH = ".data/dev.sqlite";

type Env = Record<string, string | undefined>;

export const readAppEnv = (env: Env): AppEnv => {
  const value = env.APP_ENV?.trim();
  if (value === "development" || value === "production") return value;
  throw new ServerError(
    "SETTINGS_APP_ENV",
    'APP_ENV must be set to "development" or "production" (copy .env.example to .env for local work).',
  );
};

// Normalize for comparison only: forward slashes, no Windows drive letter.
const comparable = (path: string) => path.replace(/\\/g, "/").replace(/^[A-Za-z]:/, "");
const inProductionDataDir = (path: string) => {
  const p = comparable(path);
  return p === PRODUCTION_DATA_DIR || p.startsWith(`${PRODUCTION_DATA_DIR}/`);
};

// The only way server code should obtain the SQLite file location (used from P2.2).
// Keeps development and production databases apart:
// - development may not point into the production data directory;
// - production must name an absolute path inside it and has no default.
export const resolveDatabasePath = (env: Env, cwd: string = process.cwd()) => {
  const appEnv = readAppEnv(env);
  const configured = env.DATABASE_PATH?.trim();

  if (appEnv === "production") {
    if (!configured) {
      throw new ServerError("SETTINGS_DATABASE_PATH", "DATABASE_PATH is required when APP_ENV=production.");
    }
    if (!comparable(configured).startsWith("/") || !inProductionDataDir(configured)) {
      throw new ServerError(
        "SETTINGS_DATABASE_PATH",
        `In production, DATABASE_PATH must be an absolute path inside ${PRODUCTION_DATA_DIR}/.`,
      );
    }
    if (!configured.endsWith(".sqlite")) {
      throw new ServerError("SETTINGS_DATABASE_PATH", "DATABASE_PATH must end with .sqlite.");
    }
    return { appEnv, path: configured };
  }

  const raw = configured || DEV_DEFAULT_DATABASE_PATH;
  if (inProductionDataDir(raw) || inProductionDataDir(resolve(cwd, raw))) {
    throw new ServerError(
      "SETTINGS_DATABASE_PATH",
      `In development, DATABASE_PATH must not point into ${PRODUCTION_DATA_DIR}/ (the production data directory).`,
    );
  }
  if (!raw.endsWith(".sqlite")) {
    throw new ServerError("SETTINGS_DATABASE_PATH", "DATABASE_PATH must end with .sqlite.");
  }
  return { appEnv, path: resolve(cwd, raw) };
};
