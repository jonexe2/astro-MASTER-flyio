import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSubmissionKey, validateLeadSubmission } from "./validate.ts";

// Synthetic customer details only.

const valid = {
  fullName: "Test Person",
  phone: "+1 (555) 010-0100",
  email: "Test.Person@Example.com",
  services: ["AC Repair"],
};

const errorsFor = (input: unknown) => {
  const result = validateLeadSubmission(input);
  assert.equal(result.ok, false);
  assert.ok(!result.ok && result.reason === "invalid", "expected field errors");
  return result.fieldErrors;
};

test("hero-style input (no message) is cleaned and kept as typed", () => {
  const result = validateLeadSubmission({ ...valid, fullName: "  Test Person  " });
  assert.deepEqual(result, {
    ok: true,
    value: {
      fullName: "Test Person",
      phone: "+1 (555) 010-0100",
      email: "Test.Person@Example.com",
      services: ["AC Repair"],
      message: null,
    },
  });
});

test("longer-form input: NFC, CRLF to LF, inner lines kept, services in fixed order", () => {
  const decomposed = "René Test"; // "René" written as e + combining accent
  const result = validateLeadSubmission({
    ...valid,
    fullName: decomposed,
    services: ["Emergency HVAC Service", "AC Repair", "Heating Repair"],
    message: "  First line\r\nSecond line\rThird\twith tab  ",
  });
  assert.ok(result.ok);
  assert.equal(result.value.fullName, "René Test");
  assert.deepEqual(result.value.services, ["AC Repair", "Heating Repair", "Emergency HVAC Service"]);
  assert.equal(result.value.message, "First line\nSecond line\nThird\twith tab");
});

test("blank or missing message becomes null, never an empty string", () => {
  for (const message of [undefined, null, "", "   ", "\r\n\t "]) {
    const result = validateLeadSubmission({ ...valid, message });
    assert.ok(result.ok);
    assert.equal(result.value.message, null);
  }
});

test("leading zeros, plus signs, formulas and date-like text pass unchanged", () => {
  const result = validateLeadSubmission({
    ...valid,
    fullName: "=SUM(A1)",
    phone: "0044 20 7946 0000",
    message: "2026-01-02",
  });
  assert.ok(result.ok);
  assert.equal(result.value.fullName, "=SUM(A1)");
  assert.equal(result.value.phone, "0044 20 7946 0000");
  assert.equal(result.value.message, "2026-01-02");
});

test("required fields: missing, blank and wrong types", () => {
  assert.deepEqual(errorsFor({}), { fullName: "required", phone: "required", email: "required", services: "required" });
  assert.deepEqual(errorsFor({ ...valid, fullName: "   " }), { fullName: "required" });
  assert.deepEqual(errorsFor({ ...valid, fullName: 42, phone: ["5550100"], message: 7 }), {
    fullName: "invalid",
    phone: "invalid",
    message: "invalid",
  });
});

test("limits count code points and values are never shortened", () => {
  const emoji = "\u{1F600}"; // one code point, two UTF-16 units
  assert.ok(validateLeadSubmission({ ...valid, fullName: emoji.repeat(100) }).ok);
  assert.deepEqual(errorsFor({ ...valid, fullName: emoji.repeat(101) }), { fullName: "too_long" });
  assert.deepEqual(errorsFor({ ...valid, phone: "1".repeat(31) }), { phone: "too_long" });
  assert.deepEqual(errorsFor({ ...valid, email: `${"a".repeat(250)}@b.co` }), { email: "too_long" });
  assert.ok(validateLeadSubmission({ ...valid, message: "x".repeat(2000) }).ok);
  assert.deepEqual(errorsFor({ ...valid, message: "x".repeat(2001) }), { message: "too_long" });
});

test("line breaks and control characters are rejected in one-line fields and controls in message", () => {
  assert.deepEqual(errorsFor({ ...valid, fullName: "Test\nPerson" }), { fullName: "invalid" });
  assert.deepEqual(errorsFor({ ...valid, phone: "555\u00000100" }), { phone: "invalid" });
  assert.deepEqual(errorsFor({ ...valid, email: "a@b.co\u2028" + "x" }), { email: "invalid" });
  assert.deepEqual(errorsFor({ ...valid, message: "bell\u0007" }), { message: "invalid" });
});

test("phone needs at least 7 digits; email needs one @ and no spaces", () => {
  assert.deepEqual(errorsFor({ ...valid, phone: "555-010" }), { phone: "invalid" });
  assert.ok(validateLeadSubmission({ ...valid, phone: "555-0100" }).ok);
  for (const email of ["no-at-sign", "a@@b.co", "a b@c.co", "@b.co", "a@", "a@b@c"]) {
    assert.deepEqual(errorsFor({ ...valid, email }), { email: "invalid" }, email);
  }
});

test("services: at least one known service, at most six, no duplicates", () => {
  assert.deepEqual(errorsFor({ ...valid, services: [] }), { services: "required" });
  assert.deepEqual(errorsFor({ ...valid, services: "AC Repair" }), { services: "invalid" });
  assert.deepEqual(errorsFor({ ...valid, services: ["Plumbing"] }), { services: "invalid" });
  assert.deepEqual(errorsFor({ ...valid, services: ["ac repair"] }), { services: "invalid" });
  assert.deepEqual(errorsFor({ ...valid, services: ["AC Repair", "AC Repair"] }), { services: "invalid" });
  const all = ["AC Repair", "Heating Repair", "HVAC Installation", "Preventive Maintenance", "Indoor Air Quality", "Emergency HVAC Service"];
  assert.ok(validateLeadSubmission({ ...valid, services: all }).ok);
  assert.deepEqual(errorsFor({ ...valid, services: [...all, "AC Repair"] }), { services: "invalid" });
});

test("input that is not an object is a bad request; unknown fields are ignored", () => {
  for (const input of [null, undefined, "text", 1, [valid]]) {
    assert.deepEqual(validateLeadSubmission(input), { ok: false, reason: "bad_request" });
  }
  const result = validateLeadSubmission({ ...valid, website: "spam", status: "new", source: "x" });
  assert.ok(result.ok);
  assert.deepEqual(Object.keys(result.value).sort(), ["email", "fullName", "message", "phone", "services"]);
});

test("submission key: only undefined or null count as missing; anything present must be a lowercase UUID", () => {
  const key = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
  assert.deepEqual(parseSubmissionKey(undefined), { ok: true, key: null });
  assert.deepEqual(parseSubmissionKey(null), { ok: true, key: null });
  assert.deepEqual(parseSubmissionKey(key), { ok: true, key });
  for (const bad of ["", " ", ` ${key}`, `${key} `, key.toUpperCase(), key.slice(1), `${key}0`, key.replaceAll("-", ""), 123, [key], { key }]) {
    assert.deepEqual(parseSubmissionKey(bad), { ok: false }, JSON.stringify(bad));
  }
});
