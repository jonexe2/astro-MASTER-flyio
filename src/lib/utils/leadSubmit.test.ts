import { test } from "node:test";
import assert from "node:assert/strict";
import { UUID_PATTERN } from "../server/leads/validate.ts";
import {
  createSubmissionKeys,
  leadRequestBody,
  newSubmissionKey,
  postLead,
  type LeadOutcome,
  type LeadPayload,
} from "./leadSubmit.ts";

// Fake fetch only; no network and no database. Synthetic customer details.

const lead: LeadPayload = {
  fullName: "Test Person",
  phone: "555-010-0100",
  email: "test@example.com",
  services: ["Heating Repair", "AC Repair"],
  honeypot: "",
};
const KEY = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const LEAD_ID = "11111111-2222-4333-8444-555555555555";

const reply = (status: number, body: unknown, raw = false) =>
  (async () => new Response(raw ? (body as string) : JSON.stringify(body), { status })) as typeof fetch;

test("fallback keys from getRandomValues are lowercase UUID v4 with the RFC 4122 variant", () => {
  const source = { getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) };
  const keys = new Set<string>();
  for (let i = 0; i < 2000; i += 1) {
    const key = newSubmissionKey(source);
    assert.ok(key && UUID_PATTERN.test(key), String(key)); // the server's own pattern
    assert.equal(key[14], "4");
    assert.ok("89ab".includes(key[19]));
    keys.add(key);
  }
  assert.equal(keys.size, 2000);
});

test("fallback key bits and formatting are exact for fixed bytes", () => {
  const fill = (value: number) => ({
    getRandomValues: <T extends ArrayBufferView>(a: T) => {
      (a as unknown as Uint8Array).fill(value);
      return a;
    },
  });
  assert.equal(newSubmissionKey(fill(0xff)), "ffffffff-ffff-4fff-bfff-ffffffffffff");
  assert.equal(newSubmissionKey(fill(0x00)), "00000000-0000-4000-8000-000000000000");
});

test("randomUUID is used when present; a bad result or no crypto gives null", () => {
  const getRandomValues = <T extends ArrayBufferView>(a: T) => a;
  assert.equal(newSubmissionKey({ getRandomValues, randomUUID: () => KEY }), KEY);
  assert.equal(newSubmissionKey({ getRandomValues, randomUUID: () => KEY.toUpperCase() }), null);
  assert.equal(newSubmissionKey({ getRandomValues, randomUUID: () => "not-a-uuid" }), null);
  assert.equal(newSubmissionKey(null), null); // no crypto at all
  const throwing = { getRandomValues: () => { throw new Error("no entropy"); } };
  assert.equal(newSubmissionKey(throwing as never), null);
  const real = newSubmissionKey();
  assert.ok(real && UUID_PATTERN.test(real));
});

test("the request is a JSON POST to /api/leads/ with the key header and exactly five body keys", async () => {
  let seen: { url: string; init: RequestInit } | undefined;
  const fetchImpl = (async (url: string, init: RequestInit) => {
    seen = { url, init };
    return new Response(JSON.stringify({ ok: true, leadId: LEAD_ID }), { status: 200 });
  }) as unknown as typeof fetch;
  await postLead(lead, KEY, { fetchImpl });
  assert.equal(seen?.url, "/api/leads/");
  assert.equal(seen?.init.method, "POST");
  const headers = seen?.init.headers as Record<string, string>;
  assert.equal(headers["Content-Type"], "application/json");
  assert.equal(headers["Idempotency-Key"], KEY);
  const body = JSON.parse(String(seen?.init.body));
  assert.deepEqual(Object.keys(body).sort(), ["email", "fullName", "phone", "services", "website_hp"]);
  assert.deepEqual(body.services, ["Heating Repair", "AC Repair"]);
  assert.equal(body.website_hp, "");
  assert.equal(leadRequestBody(lead), String(seen?.init.body));
});

test("only a 200 with { ok: true, leadId } counts as saved", async () => {
  assert.deepEqual(await postLead(lead, KEY, { fetchImpl: reply(200, { ok: true, leadId: LEAD_ID }) }), {
    kind: "saved",
    leadId: LEAD_ID,
  });
  for (const body of [{ ok: true }, { ok: false, leadId: LEAD_ID }, { ok: true, leadId: "x" }, null, []]) {
    assert.deepEqual(await postLead(lead, KEY, { fetchImpl: reply(200, body) }), { kind: "uncertain" }, JSON.stringify(body));
  }
  assert.deepEqual(await postLead(lead, KEY, { fetchImpl: reply(200, "<html>", true) }), { kind: "uncertain" });
});

test("server answers map to the right outcome", async () => {
  const cases: [number, unknown, unknown][] = [
    [422, { ok: false, reason: "invalid", fieldErrors: { email: "invalid" } }, { kind: "invalid", fieldErrors: { email: "invalid" } }],
    [422, "not json", { kind: "invalid", fieldErrors: {} }],
    [409, { ok: false, reason: "conflict" }, { kind: "conflict" }],
    [429, { ok: false, reason: "rate_limited" }, { kind: "rate_limited" }],
    [503, { ok: false, reason: "unavailable" }, { kind: "unavailable" }],
    [500, { ok: false, reason: "unavailable" }, { kind: "unavailable" }],
    [400, { ok: false, reason: "bad_request" }, { kind: "rejected" }],
    [403, { ok: false, reason: "forbidden" }, { kind: "rejected" }],
    [413, { ok: false, reason: "too_large" }, { kind: "rejected" }],
    [404, "<html>", { kind: "rejected" }],
    [502, "<html>", { kind: "uncertain" }],
    [302, "", { kind: "uncertain" }],
  ];
  for (const [status, body, expected] of cases) {
    const fetchImpl = reply(status, body, typeof body === "string");
    assert.deepEqual(await postLead(lead, KEY, { fetchImpl }), expected, String(status));
  }
});

test("a timeout aborts the request and is uncertain; so is a network error", async () => {
  let aborted = false;
  const hanging = ((_url: string, init: RequestInit) =>
    new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => {
        aborted = true;
        reject(new DOMException("aborted", "AbortError"));
      });
    })) as unknown as typeof fetch;
  assert.deepEqual(await postLead(lead, KEY, { fetchImpl: hanging, timeoutMs: 20 }), { kind: "uncertain" });
  assert.equal(aborted, true);

  const offline = (async () => {
    throw new TypeError("Failed to fetch");
  }) as typeof fetch;
  assert.deepEqual(await postLead(lead, KEY, { fetchImpl: offline }), { kind: "uncertain" });
});

test("message is sent only when the form has one; the hero body stays five keys", () => {
  assert.deepEqual(Object.keys(JSON.parse(leadRequestBody(lead))).sort(), [
    "email",
    "fullName",
    "phone",
    "services",
    "website_hp",
  ]);
  for (const message of ["Furnace is noisy", "", "   "]) {
    const body = JSON.parse(leadRequestBody({ ...lead, message }));
    assert.deepEqual(Object.keys(body).sort(), ["email", "fullName", "message", "phone", "services", "website_hp"]);
    assert.equal(body.message, message); // the server turns blank text into NULL
  }
});

test("submission keys: same data keeps its key; changed data, a save or a conflict get a new one", () => {
  let n = 0;
  const makeKey = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
  const keys = createSubmissionKeys(makeKey);
  const a = leadRequestBody(lead);
  const b = leadRequestBody({ ...lead, phone: "555-010-0199" });

  const first = keys.keyFor(a);
  assert.equal(keys.keyFor(a), first, "double submit before any answer");
  const keeping: LeadOutcome["kind"][] = ["uncertain", "unavailable", "rate_limited", "invalid", "rejected"];
  for (const kind of keeping) {
    keys.settle(kind, a);
    assert.equal(keys.keyFor(a), first, `${kind}: identical retry keeps the key`);
  }

  keys.settle("uncertain", a);
  const edited = keys.keyFor(b);
  assert.notEqual(edited, first, "edit after a failure");
  assert.equal(keys.keyFor(a), edited, "no failure recorded for the new key yet");

  keys.settle("conflict", a);
  const afterConflict = keys.keyFor(a);
  assert.notEqual(afterConflict, edited);

  keys.settle("saved", a);
  const afterSave = keys.keyFor(a);
  assert.notEqual(afterSave, afterConflict, "a separate new inquiry, even with identical data");
});

test("submission keys: no key can be made means null, and a later key is used once available", () => {
  let available = false;
  const keys = createSubmissionKeys(() => (available ? KEY : null));
  assert.equal(keys.keyFor(leadRequestBody(lead)), null);
  available = true;
  assert.equal(keys.keyFor(leadRequestBody(lead)), KEY);
});
