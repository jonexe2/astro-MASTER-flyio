import { test } from "node:test";
import assert from "node:assert/strict";
import { ServerError, formatError } from "./errors.ts";

test("ServerError is logged with scope, code and its safe message", () => {
  const line = formatError("leads", new ServerError("SETTINGS_X", "X is missing."), false);
  assert.equal(line, "[leads] SETTINGS_X: X is missing.");
});

test("unexpected errors hide details outside development", () => {
  const error = new Error("insert failed for jane@example.com 555-0100");
  const line = formatError("leads", error, false);
  assert.equal(line, "[leads] UNEXPECTED: Error (details hidden)");
  assert.ok(!line.includes("jane@example.com"));
});

test("development shows a short message and never the cause or stack", () => {
  const error = new TypeError("x".repeat(500), { cause: { password: "hunter2" } });
  const line = formatError("db", error, true);
  assert.ok(line.startsWith("[db] UNEXPECTED: TypeError: xxx"));
  assert.ok(line.length < 260);
  assert.ok(!line.includes("hunter2"));
  assert.ok(!line.includes(" at "));
});

test("non-Error throws are described without their value", () => {
  assert.equal(formatError("s", "secret-token", true), "[s] UNEXPECTED: NonError (details hidden)");
  assert.equal(formatError("s", { apiKey: "k" }, false), "[s] UNEXPECTED: NonError (details hidden)");
});
