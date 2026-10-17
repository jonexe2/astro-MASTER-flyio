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

const development = (DATABASE_PATH: string) => resolveDatabasePath({ APP_ENV: "development", DATABASE_PATH }, cwd).path;

test("development accepts .sqlite paths inside .data/ or outside the project", () => {
  assert.equal(development(".data/a.sqlite"), resolve(cwd, ".data/a.sqlite"));
  assert.equal(development("./.data/sub/a.sqlite"), resolve(cwd, ".data/sub/a.sqlite"));
  assert.equal(development("../elsewhere/a.sqlite"), resolve(cwd, "../elsewhere/a.sqlite"));
  const outside = resolve(cwd, "..", "other-folder", "a.sqlite");
  assert.equal(development(outside), outside);
});

test("development refuses project folders other than .data/ (public, dist, src, root)", () => {
  const bad = [
    "public/leads.sqlite", "dist/client/leads.sqlite", "src/leads.sqlite", "node_modules/x.sqlite", "leads.sqlite",
    "tmp/a.sqlite", ".data/../public/x.sqlite", ".datax/a.sqlite", resolve(cwd, "public", "x.sqlite"),
  ];
  for (const value of bad) {
    const error = codeOf(() => development(value));
    assert.equal(error.code, "SETTINGS_DATABASE_PATH", value);
    assert.ok(!error.message.includes(value), value);
  }
});

test("on Windows, a different letter case does not bypass the project-folder rule", { skip: process.platform !== "win32" }, () => {
  assert.equal(codeOf(() => development(resolve(cwd, "public", "x.sqlite").toUpperCase())).code, "SETTINGS_DATABASE_PATH");
  assert.equal(development(resolve(cwd, ".DATA", "x.sqlite")), resolve(cwd, ".DATA", "x.sqlite"));
});

test("development refuses the production data directory in every spelling", () => {
  for (const bad of ["/data/leads.sqlite", "/data", "\\data\\leads.sqlite", "C:\\data\\leads.sqlite", "../../data/leads.sqlite", "/data/../data/x.sqlite"]) {
    const error = codeOf(() => resolveDatabasePath({ APP_ENV: "development", DATABASE_PATH: bad }, "/work/project"));
    assert.equal(error.code, "SETTINGS_DATABASE_PATH", bad);
  }
});

test("database file must end with .sqlite", () => {
  assert.equal(codeOf(() => resolveDatabasePath({ APP_ENV: "development", DATABASE_PATH: ".data/.env" }, cwd)).code, "SETTINGS_DATABASE_PATH");
  assert.equal(codeOf(() => resolveDatabasePath({ APP_ENV: "production", DATABASE_PATH: "/data/leads.db" }, cwd)).code, "SETTINGS_DATABASE_PATH");
});

const production = (DATABASE_PATH?: string) => resolveDatabasePath({ APP_ENV: "production", DATABASE_PATH }, cwd).path;

test("production accepts normal absolute paths inside /data", () => {
  assert.equal(production("/data/leads.sqlite"), "/data/leads.sqlite");
  assert.equal(production("/data/sub/dir/leads.sqlite"), "/data/sub/dir/leads.sqlite");
  assert.equal(production("/data//leads.sqlite"), "/data/leads.sqlite");
  assert.equal(production("/data/./leads.sqlite"), "/data/leads.sqlite");
  assert.equal(production("/data/a/../leads.sqlite"), "/data/leads.sqlite"); // stays inside /data
});

test("production rejects missing, relative, outside and traversal paths", () => {
  const bad = [
    undefined, "", ".data/dev.sqlite", "data/leads.sqlite", "/tmp/leads.sqlite",
    "/data/../tmp/leads.sqlite", "/data/a/../../tmp/leads.sqlite", "/data/a/b/../../../leads.sqlite",
    "/data/../data/../etc/x.sqlite", "/data/..", "/data/../leads.sqlite", "/datax/leads.sqlite",
    "/data", "/data/", "/data/.sqlite/..", "//data/leads.sqlite/../../x.sqlite",
  ];
  for (const value of bad) {
    assert.equal(codeOf(() => production(value)).code, "SETTINGS_DATABASE_PATH", String(value));
  }
});

test("production rejects Windows-style, backslash and NUL paths", () => {
  for (const value of ["C:\\data\\leads.sqlite", "C:/data/leads.sqlite", "\\data\\leads.sqlite", "/data\\..\\tmp\\x.sqlite", "/data/leads.sqlite\0.txt"]) {
    assert.equal(codeOf(() => production(value)).code, "SETTINGS_DATABASE_PATH", JSON.stringify(value));
  }
});

test("production requires the .sqlite extension", () => {
  assert.equal(codeOf(() => production("/data/leads.db")).code, "SETTINGS_DATABASE_PATH");
});

test("rejection messages never contain the submitted path", () => {
  for (const value of ["/data/../tmp/hidden-name.sqlite", "C:\\hidden-name\\x.sqlite", "/hidden-name/x.sqlite"]) {
    assert.ok(!codeOf(() => production(value)).message.includes("hidden-name"));
  }
});

test("error messages never contain the configured value", () => {
  const secretish = "/data/super-secret-name.txt";
  const error = codeOf(() => resolveDatabasePath({ APP_ENV: "production", DATABASE_PATH: secretish }, cwd));
  assert.ok(!error.message.includes("super-secret-name"));
});
