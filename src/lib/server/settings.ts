import "./server-only.ts";
import { isAbsolute, join, posix, relative, resolve, sep } from "node:path";
import { ServerError } from "./errors.ts";

// Private settings come from environment variables (see .env.example), never from
// src/config/config.toml (public) and never from PUBLIC_ variables (sent to browsers).
// Functions take the environment as an argument so they can be tested; the caller
// passes process.env.

export type AppEnv = "development" | "production";

// Planned Fly.io volume mount (finalized in P8). Only production may use it.
export const PRODUCTION_DATA_DIR = "/data";
export const DEV_DATA_DIR = ".data";
export const DEV_DEFAULT_DATABASE_PATH = `${DEV_DATA_DIR}/dev.sqlite`;

type Env = Record<string, string | undefined>;

export const readAppEnv = (env: Env): AppEnv => {
  const value = env.APP_ENV?.trim();
  if (value === "development" || value === "production") return value;
  throw new ServerError(
    "SETTINGS_APP_ENV",
    'APP_ENV must be set to "development" or "production" (copy .env.example to .env for local work).',
  );
};

// Development check: is this path inside the production data directory? Compared
// after lexical normalization (collapses "." and ".."), with forward slashes and
// no Windows drive letter, so "/tmp/../data/x" and "C:\data\x" are both caught.
const inProductionDataDir = (path: string) => {
  const p = posix.normalize(path.replace(/\\/g, "/").replace(/^[A-Za-z]:/, ""));
  return p === PRODUCTION_DATA_DIR || p.startsWith(`${PRODUCTION_DATA_DIR}/`);
};

// Is the absolute `path` inside the absolute `folder` (or the folder itself)?
// Windows paths are compared without case, as its file system does.
const isWithin = (folder: string, path: string) => {
  const fold = (p: string) => (process.platform === "win32" ? p.toLowerCase() : p);
  const rel = relative(fold(folder), fold(path));
  return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
};

// Production check: an absolute POSIX path that stays inside /data/ after lexical
// normalization. Rejects backslashes, drive letters, NUL and any ".." escape.
// Limit: this is lexical only. A symbolic link inside /data that points elsewhere
// is not detected; the contents of the volume are controlled by the deployment (P8).
const productionPath = (configured: string): string | undefined => {
  if (configured.includes("\\") || configured.includes("\0") || !configured.startsWith("/")) return undefined;
  const normalized = posix.normalize(configured);
  return normalized.startsWith(`${PRODUCTION_DATA_DIR}/`) ? normalized : undefined;
};

// The only way server code should obtain the SQLite file location (used from P2.2).
// Keeps development and production databases apart:
// - development may not point into the production data directory, and inside the
//   project only .data/ is allowed (public/ is served, dist/ is replaced on each
//   build, src/ sits next to committed code);
// - production must name an absolute path inside it and has no default.
export const resolveDatabasePath = (env: Env, cwd: string = process.cwd()) => {
  const appEnv = readAppEnv(env);
  const configured = env.DATABASE_PATH?.trim();

  if (appEnv === "production") {
    if (!configured) {
      throw new ServerError("SETTINGS_DATABASE_PATH", "DATABASE_PATH is required when APP_ENV=production.");
    }
    const path = productionPath(configured);
    if (!path) {
      throw new ServerError(
        "SETTINGS_DATABASE_PATH",
        `In production, DATABASE_PATH must be an absolute POSIX path inside ${PRODUCTION_DATA_DIR}/ (no "..", no backslashes or drive letters).`,
      );
    }
    if (!path.endsWith(".sqlite")) {
      throw new ServerError("SETTINGS_DATABASE_PATH", "DATABASE_PATH must end with .sqlite.");
    }
    return { appEnv, path };
  }

  const raw = configured || DEV_DEFAULT_DATABASE_PATH;
  if (inProductionDataDir(raw) || inProductionDataDir(resolve(cwd, raw))) {
    throw new ServerError(
      "SETTINGS_DATABASE_PATH",
      `In development, DATABASE_PATH must not point into ${PRODUCTION_DATA_DIR}/ (the production data directory).`,
    );
  }
  const path = resolve(cwd, raw);
  if (isWithin(cwd, path) && !isWithin(join(cwd, DEV_DATA_DIR), path)) {
    throw new ServerError(
      "SETTINGS_DATABASE_PATH",
      `In development, a DATABASE_PATH inside the project must be inside ${DEV_DATA_DIR}/ (never public/, dist/ or src/).`,
    );
  }
  if (!raw.endsWith(".sqlite")) {
    throw new ServerError("SETTINGS_DATABASE_PATH", "DATABASE_PATH must end with .sqlite.");
  }
  return { appEnv, path };
};
