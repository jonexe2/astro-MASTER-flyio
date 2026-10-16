import { test } from "node:test";
import assert from "node:assert/strict";
import { ServerError, formatError } from "./errors.ts";

// Synthetic, dummy values only.
const EMAIL = "jane.doe@example.com";
const SECRET = "dummy-secret-abc123";

test("ServerError is logged with scope, code and its predefined message", () => {
  assert.equal(formatError("leads", new ServerError("SETTINGS_X", "X is missing.")), "[leads] SETTINGS_X: X is missing.");
});

test("unexpected errors never reveal their message, name, stack or cause", () => {
  class CustomerError extends Error {
    constructor(message: string, options?: ErrorOptions) {
      super(message, options);
      this.name = `CustomerError(${EMAIL})`;
    }
  }
  const error = new CustomerError(`insert failed for ${EMAIL} token=${SECRET}`, { cause: { password: SECRET, email: EMAIL } });
  const line = formatError("leads", error);
  assert.equal(line, "[leads] UNEXPECTED: details hidden");
  for (const leaked of [EMAIL, SECRET, "insert failed", "CustomerError", "password", " at "]) {
    assert.ok(!line.includes(leaked), `leaked: ${leaked}`);
  }
});

test("non-Error throws and look-alikes are not described", () => {
  for (const thrown of [SECRET, { apiKey: SECRET, email: EMAIL }, null, undefined, Object.assign(new Error(SECRET), { code: "LOOKS_SAFE" })]) {
    const line = formatError("s", thrown);
    assert.equal(line, "[s] UNEXPECTED: details hidden");
    assert.ok(!line.includes(SECRET) && !line.includes(EMAIL));
  }
});

test("scope and code must be simple labels, otherwise they are not printed", () => {
  assert.equal(formatError(`leads ${EMAIL}`, new Error(SECRET)), "[unknown] UNEXPECTED: details hidden");
  assert.equal(formatError("leads", new ServerError(`CODE ${EMAIL}`, "m")), "[leads] UNEXPECTED: details hidden");
});
