import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { ServerError } from "./errors.ts";
import { DEV_DEFAULT_DATABASE_PATH, readAppEnv, resolveDatabasePath } from "./settings.ts";

const cwd = resolve("project-root");
const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof ServerError, "expected a ServerError");
    return error;
  }
  assert.fail("expected an error");
};

test("APP_ENV is required and must be development or production", () => {
  assert.equal(readAppEnv({ APP_ENV: "development" }), "development");
  assert.equal(readAppEnv({ APP_ENV: " production " }), "production");
  for (const env of [{}, { APP_ENV: "" }, { APP_ENV: "staging" }, { APP_ENV: "Production" }]) {
    assert.equal(codeOf(() => readAppEnv(env)).code, "SETTINGS_APP_ENV");
  }
});

test("development uses a project-local default database", () => {
  const { appEnv, path } = resolveDatabasePath({ APP_ENV: "development" }, cwd);
  assert.equal(appEnv, "development");
  assert.equal(path, resolve(cwd, DEV_DEFAULT_DATABASE_PATH));
});

test("development accepts other local .sqlite paths", () => {
  assert.equal(resolveDatabasePath({ APP_ENV: "development", DATABASE_PATH: "tmp/a.sqlite" }, cwd).path, resolve(cwd, "tmp/a.sqlite"));
});

test("development refuses the production data directory in every spelling", () => {
  for (const bad of ["/data/leads.sqlite", "/data", "\\data\\leads.sqlite", "C:\\data\\leads.sqlite", "../../data/leads.sqlite", "/data/../data/x.sqlite"]) {
    const error = codeOf(() => resolveDatabasePath({ APP_ENV: "development", DATABASE_PATH: bad }, "/work/project"));
    assert.equal(error.code, "SETTINGS_DATABASE_PATH", bad);
  }
});

test("database file must end with .sqlite", () => {
  assert.equal(codeOf(() => resolveDatabasePath({ APP_ENV: "development", DATABASE_PATH: ".env" }, cwd)).code, "SETTINGS_DATABASE_PATH");
  assert.equal(codeOf(() => resolveDatabasePath({ APP_ENV: "production", DATABASE_PATH: "/data/leads.db" }, cwd)).code, "SETTINGS_DATABASE_PATH");
});

test("production requires an absolute path inside /data", () => {
  assert.equal(resolveDatabasePath({ APP_ENV: "production", DATABASE_PATH: "/data/leads.sqlite" }, cwd).path, "/data/leads.sqlite");
  for (const env of [{}, { DATABASE_PATH: "" }, { DATABASE_PATH: ".data/dev.sqlite" }, { DATABASE_PATH: "/tmp/leads.sqlite" }, { DATABASE_PATH: "data/leads.sqlite" }]) {
    assert.equal(codeOf(() => resolveDatabasePath({ APP_ENV: "production", ...env }, cwd)).code, "SETTINGS_DATABASE_PATH");
  }
});

test("error messages never contain the configured value", () => {
  const secretish = "/data/super-secret-name.txt";
  const error = codeOf(() => resolveDatabasePath({ APP_ENV: "production", DATABASE_PATH: secretish }, cwd));
  assert.ok(!error.message.includes("super-secret-name"));
});
