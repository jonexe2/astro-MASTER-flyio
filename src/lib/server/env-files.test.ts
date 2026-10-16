import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const example = readFileSync(join(root, ".env.example"), "utf8");
const entries = example
  .split(/\r?\n/)
  .filter((line) => /^[A-Z][A-Z0-9_]*=/.test(line))
  .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)] as const);

const gitAvailable = (() => {
  try {
    execFileSync("git", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();
const ignored = (path: string) => {
  try {
    execFileSync("git", ["check-ignore", "-q", path], { cwd: root, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

test(".env.example holds placeholders only and no PUBLIC_ variables", () => {
  assert.ok(entries.length > 0);
  for (const [name] of entries) assert.ok(!name.startsWith("PUBLIC_"), `${name} must not be PUBLIC_`);
  const values = Object.fromEntries(entries);
  assert.equal(values.APP_ENV, "development");
  assert.equal(values.DATABASE_PATH, ".data/dev.sqlite");
  // Every other setting is reserved and must be empty (no real secrets in git).
  for (const [name, value] of entries) {
    if (name !== "APP_ENV" && name !== "DATABASE_PATH") assert.equal(value, "", `${name} must be empty`);
  }
});

test("private env files and local databases are git-ignored; the example is not", { skip: !gitAvailable }, () => {
  for (const path of [".env", ".env.local", ".env.development", ".env.production", ".env.staging", ".data/dev.sqlite", "x.sqlite", "x.sqlite-wal"]) {
    assert.equal(ignored(path), true, `${path} should be ignored`);
  }
  assert.equal(ignored(".env.example"), false);
});

// Needs a prior `npm run build`; skipped when dist/client does not exist.
const client = join(root, "dist", "client");
test("built browser output contains no private setting names", { skip: !existsSync(client) }, () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
  const text = walk(client)
    .filter((f) => /\.(js|mjs|html|css|json|map|txt|xml)$/.test(f))
    .map((f) => readFileSync(f, "utf8"))
    .join("\n");
  for (const [name] of entries) assert.ok(!text.includes(name), `${name} found in browser output`);
  assert.ok(!text.includes(".data/dev.sqlite"));
});
