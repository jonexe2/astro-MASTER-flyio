import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { LEAD_HONEYPOT_FIELD, LEAD_MAX_BODY_BYTES, LEAD_SUBMISSION_KEY_HEADER } from "../../leads/contract.ts";
import { openDatabase } from "../db/connection.ts";
import { getLeadById } from "../db/leads.ts";
import { ServerError } from "../errors.ts";
import { handleLeadRequest, type LeadRequestOptions } from "./handler.ts";
import { RateLimiter } from "./rate-limit.ts";

// Real Request objects against the shared handler, with temporary databases
// and synthetic customer details only.

const URL_ = "http://localhost:4321/api/leads/";
const ORIGIN = "http://localhost:4321";
const KEY = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const KEY_2 = "aaaaaaaa-bbbb-4ccc-8ddd-ffffffffffff";

const setup = (t: TestContext, timeout?: number) => {
  const dir = mkdtempSync(join(tmpdir(), "p31-handler-"));
  const path = join(dir, "test.sqlite");
  const db = openDatabase(path, "development", { timeout });
  const others: DatabaseSync[] = [];
  t.after(() => {
    for (const c of [db, ...others]) if (c.isOpen) c.close();
    rmSync(dir, { recursive: true, force: true });
  });
  const connect = () => {
    const c = new DatabaseSync(path);
    others.push(c);
    return c;
  };
  // A fresh, generous limiter per test unless the test passes its own.
  const send = (request: Request, options: LeadRequestOptions = {}) =>
    handleLeadRequest(request, {
      getDb: () => db,
      clientAddress: "203.0.113.7",
      limiter: new RateLimiter({ max: 1000, windowMs: 60_000, maxClients: 100 }),
      ...options,
    });
  return { db, connect, send };
};

const lead = (overrides: Record<string, unknown> = {}) => ({
  fullName: "Test Person",
  phone: "+1 (555) 010-0100",
  email: "test@example.com",
  services: ["Heating Repair", "AC Repair"],
  ...overrides,
});

const post = (body: unknown, headers: Record<string, string | null> = {}) => {
  const all: Record<string, string | null> = {
    "content-type": "application/json",
    "sec-fetch-site": "same-origin",
    origin: ORIGIN,
    ...headers,
  };
  const h = new Headers();
  for (const [name, value] of Object.entries(all)) if (value !== null) h.set(name, value);
  return new Request(URL_, {
    method: "POST",
    headers: h,
    body: (typeof body === "string" || body instanceof Uint8Array ? body : JSON.stringify(body)) as BodyInit,
  });
};

const count = (db: DatabaseSync, table: "leads" | "integration_jobs") =>
  Number(db.prepare(`SELECT count(*) AS n FROM ${table}`).get()?.n);

const json = async (response: Response) => JSON.parse(await response.text());

const quietErrors = (t: TestContext) => t.mock.method(console, "error", () => {});

test("a valid lead is saved with two pending jobs and the response is JSON, no-store", async (t) => {
  const { db, send } = setup(t);
  const response = await send(post(lead({ message: "Furnace\r\nis noisy" })));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  const body = await json(response);
  assert.deepEqual(Object.keys(body).sort(), ["leadId", "ok"]);
  assert.equal(body.ok, true);
  const saved = getLeadById(db, body.leadId);
  assert.deepEqual(saved?.services, ["AC Repair", "Heating Repair"]); // contract order
  assert.equal(saved?.message, "Furnace\nis noisy");
  assert.equal(count(db, "integration_jobs"), 2);
});

test("one service, and message absent, null or blank are all saved with message NULL", async (t) => {
  const { db, send } = setup(t);
  for (const extra of [{}, { message: null }, { message: "   " }]) {
    const body = await json(await send(post(lead({ services: ["Indoor Air Quality"], ...extra }))));
    assert.equal(body.ok, true);
    const saved = getLeadById(db, body.leadId);
    assert.deepEqual(saved?.services, ["Indoor Air Quality"]);
    assert.equal(saved?.message, null);
  }
  assert.equal(count(db, "leads"), 3);
});

test("field problems give 422 with codes only and save nothing", async (t) => {
  const { db, send } = setup(t);
  const cases: [Record<string, unknown>, Record<string, string>][] = [
    [{ fullName: undefined }, { fullName: "required" }],
    [{ fullName: "   " }, { fullName: "required" }],
    [{ fullName: "x".repeat(101) }, { fullName: "too_long" }],
    [{ fullName: "Line\nbreak" }, { fullName: "invalid" }],
    [{ phone: "12345" }, { phone: "invalid" }],
    [{ email: "not-an-email" }, { email: "invalid" }],
    [{ services: [] }, { services: "required" }],
    [{ services: ["Plumbing"] }, { services: "invalid" }],
    [{ services: ["AC Repair", "AC Repair"] }, { services: "invalid" }],
    [{ services: "AC Repair" }, { services: "invalid" }],
    [{ message: "m".repeat(2001) }, { message: "too_long" }],
  ];
  for (const [overrides, fieldErrors] of cases) {
    const body = lead(overrides);
    const response = await send(post(body));
    assert.equal(response.status, 422, JSON.stringify(overrides).slice(0, 60));
    const text = await response.text();
    assert.deepEqual(JSON.parse(text), { ok: false, reason: "invalid", fieldErrors });
    assert.ok(!text.includes("Test Person") && !text.includes("example.com"));
  }
  assert.equal(count(db, "leads"), 0);
});

test("malformed bodies and unknown fields give 400 bad_request", async (t) => {
  const { db, send } = setup(t);
  const bodies: (string | Uint8Array)[] = [
    "",
    "{not json",
    "null",
    "[]",
    '"text"',
    JSON.stringify({ ...lead(), source: "homepage" }),
    '{"__proto__":{},"fullName":"Test Person"}',
    new Uint8Array([0x7b, 0xff, 0xfe, 0x7d]), // invalid UTF-8
  ];
  for (const body of bodies) {
    const response = await send(post(body));
    assert.equal(response.status, 400, String(body).slice(0, 40));
    assert.deepEqual(await json(response), { ok: false, reason: "bad_request" });
  }
  assert.equal(count(db, "leads"), 0);
});

test("only uncompressed application/json is accepted (415)", async (t) => {
  const { db, send } = setup(t);
  const rejected: Record<string, string | null>[] = [
    { "content-type": null },
    { "content-type": "text/plain" },
    { "content-type": "application/x-www-form-urlencoded" },
    { "content-type": "multipart/form-data; boundary=x" },
    { "content-type": "application/json; charset=latin1" },
    { "content-encoding": "gzip" },
  ];
  for (const headers of rejected) {
    const response = await send(post(lead(), headers));
    assert.equal(response.status, 415, JSON.stringify(headers));
    assert.deepEqual(await json(response), { ok: false, reason: "unsupported_media_type" });
  }
  assert.equal((await send(post(lead(), { "content-type": "Application/JSON; charset=UTF-8" }))).status, 200);
  assert.equal(count(db, "leads"), 1);
});

test("bodies over the limit give 413, by Content-Length and by streamed size", async (t) => {
  const { db, send } = setup(t);
  const big = JSON.stringify(lead({ message: "a".repeat(LEAD_MAX_BODY_BYTES) }));
  const declared = post(big, { "content-length": String(big.length) });
  assert.equal((await send(declared)).status, 413);

  // No Content-Length: a stream that keeps sending.
  const chunk = new TextEncoder().encode("a".repeat(4096));
  let sent = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      sent += 1;
      if (sent > 100) controller.close();
      else controller.enqueue(chunk);
    },
  });
  const streamed = new Request(URL_, {
    method: "POST",
    headers: { "content-type": "application/json", "sec-fetch-site": "same-origin" },
    body: stream,
    duplex: "half",
  } as RequestInit);
  const response = await send(streamed);
  assert.equal(response.status, 413);
  assert.deepEqual(await json(response), { ok: false, reason: "too_large" });
  assert.ok(sent < 10, "stopped reading soon after the limit");
  assert.equal(count(db, "leads"), 0);

  // The largest valid lead still fits: 2,000 four-byte characters.
  const largest = lead({ fullName: "é".repeat(100), message: "😀".repeat(2000) });
  assert.equal((await send(post(largest))).status, 200);
});

test("a filled honeypot saves nothing; an empty one is accepted and never stored", async (t) => {
  const { db, send } = setup(t);
  for (const value of ["https://spam.example", " ", 0, false, null, ["x"]]) {
    const response = await send(post({ ...lead(), [LEAD_HONEYPOT_FIELD]: value }));
    assert.equal(response.status, 400, JSON.stringify(value));
    assert.deepEqual(await json(response), { ok: false, reason: "bad_request" });
  }
  assert.equal(count(db, "leads"), 0);

  const body = await json(await send(post({ ...lead(), [LEAD_HONEYPOT_FIELD]: "" })));
  assert.equal(body.ok, true);
  const row = db.prepare("SELECT * FROM leads").get() as Record<string, unknown>;
  assert.ok(!Object.keys(row).some((column) => column.includes("hp") || column.includes("website")));
});

test("origin: same-origin passes; cross-site, 'none', mismatched or missing origin give 403", async (t) => {
  const { db, send } = setup(t);
  const allowed: Record<string, string | null>[] = [
    { "sec-fetch-site": "same-origin" },
    { "sec-fetch-site": null, origin: ORIGIN }, // browsers without Sec-Fetch-Site
  ];
  for (const headers of allowed) assert.equal((await send(post(lead(), headers))).status, 200, JSON.stringify(headers));

  const blocked: Record<string, string | null>[] = [
    { "sec-fetch-site": "cross-site" },
    { "sec-fetch-site": "same-site" },
    { "sec-fetch-site": "none" },
    { "sec-fetch-site": "cross-site", origin: ORIGIN },
    { "sec-fetch-site": null, origin: "https://attacker.example" },
    { "sec-fetch-site": null, origin: "http://localhost:4322" },
    { "sec-fetch-site": null, origin: "null" },
    { "sec-fetch-site": null, origin: null },
  ];
  for (const headers of blocked) {
    const response = await send(post(lead(), headers));
    assert.equal(response.status, 403, JSON.stringify(headers));
    assert.deepEqual(await json(response), { ok: false, reason: "forbidden" });
  }
  assert.equal(count(db, "leads"), 2);
});

test("forwarded headers sent by a visitor change neither the origin decision nor the rate-limit bucket", async (t) => {
  const { db, send } = setup(t);
  const limiter = new RateLimiter({ max: 2, windowMs: 60_000, maxClients: 100 });
  const spoofed = (n: number) => ({
    "x-forwarded-for": `198.51.100.${n}`,
    "fly-client-ip": `198.51.100.${n}`,
    "x-real-ip": `198.51.100.${n}`,
    "x-forwarded-host": "attacker.example",
    "x-forwarded-proto": "https",
  });
  const statuses = [];
  for (let n = 1; n <= 3; n += 1) statuses.push((await send(post(lead(), spoofed(n)), { limiter })).status);
  assert.deepEqual(statuses, [200, 200, 429]);

  // A forwarded host does not make a foreign Origin acceptable.
  const foreign = post(lead(), { "sec-fetch-site": null, origin: "https://attacker.example", ...spoofed(9) });
  assert.equal((await send(foreign)).status, 403);
  assert.equal(count(db, "leads"), 2);
});

test("rate limit: the 11th attempt in the window gets 429 with Retry-After; other clients and later windows are fine", async (t) => {
  const { db, send } = setup(t);
  let now = 1_000_000;
  const limiter = new RateLimiter({ max: 10, windowMs: 600_000, maxClients: 100 }, () => now);
  const statuses = [];
  for (let i = 0; i < 10; i += 1) {
    // Failed attempts count too.
    const body = i % 2 === 0 ? lead() : lead({ email: "bad" });
    statuses.push((await send(post(body), { limiter })).status);
  }
  assert.deepEqual(statuses, [200, 422, 200, 422, 200, 422, 200, 422, 200, 422]);

  const limited = await send(post(lead()), { limiter });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "600");
  assert.deepEqual(await json(limited), { ok: false, reason: "rate_limited" });
  assert.equal(count(db, "leads"), 5);

  assert.equal((await send(post(lead()), { limiter, clientAddress: "203.0.113.8" })).status, 200);
  now += 600_000;
  assert.equal((await send(post(lead()), { limiter })).status, 200);
});

test("submission key: same key and data returns the original ID; different data is 409 without stored values", async (t) => {
  const { db, send } = setup(t);
  const first = await json(await send(post(lead({ message: "First" }), { [LEAD_SUBMISSION_KEY_HEADER]: KEY })));
  assert.equal(first.ok, true);

  const retry = await send(post(lead({ message: "First" }), { [LEAD_SUBMISSION_KEY_HEADER]: KEY }));
  assert.equal(retry.status, 200);
  assert.deepEqual(await json(retry), { ok: true, leadId: first.leadId });

  const other = lead({ fullName: "Other Person", email: "other@example.org", message: "Second" });
  const conflict = await send(post(other, { [LEAD_SUBMISSION_KEY_HEADER]: KEY }));
  assert.equal(conflict.status, 409);
  const text = await conflict.text();
  assert.deepEqual(JSON.parse(text), { ok: false, reason: "conflict" });
  for (const secret of ["Test Person", "test@example.com", "First", first.leadId]) assert.ok(!text.includes(secret));

  assert.equal((await send(post(other, { [LEAD_SUBMISSION_KEY_HEADER]: KEY_2 }))).status, 200);
  assert.equal(count(db, "leads"), 2);
  assert.equal(count(db, "integration_jobs"), 4);
});

test("submission key: absent saves without protection; empty, uppercase or malformed gives 400", async (t) => {
  const { db, send } = setup(t);
  assert.equal((await send(post(lead()))).status, 200);
  assert.equal((await send(post(lead()))).status, 200);
  assert.equal(count(db, "leads"), 2);

  for (const key of ["", KEY.toUpperCase(), "not-a-key", `${KEY}, ${KEY_2}`]) {
    const response = await send(post(lead(), { [LEAD_SUBMISSION_KEY_HEADER]: key }));
    assert.equal(response.status, 400, key);
    assert.deepEqual(await json(response), { ok: false, reason: "bad_request" });
  }
  assert.equal(count(db, "leads"), 2);
});

test("database failures give 503 'unavailable' with no details, and logs hold no customer data", async (t) => {
  const { db, connect, send } = setup(t, 50);
  const errors = quietErrors(t);

  const settings = await send(post(lead()), {
    getDb: () => {
      throw new ServerError("SETTINGS_APP_ENV", "APP_ENV must be set.");
    },
  });
  assert.equal(settings.status, 503);
  assert.deepEqual(await json(settings), { ok: false, reason: "unavailable" });

  const other = connect();
  other.exec("BEGIN IMMEDIATE");
  const locked = await send(post(lead({ fullName: "Locked Person", email: "locked@example.com" })));
  assert.equal(locked.status, 503);
  assert.deepEqual(await json(locked), { ok: false, reason: "unavailable" });
  other.exec("ROLLBACK");
  assert.equal(count(db, "leads"), 0);

  const logged = errors.mock.calls.map((call) => call.arguments.join(" ")).join("\n");
  assert.ok(errors.mock.callCount() >= 2);
  for (const secret of ["Locked Person", "locked@example.com", "555", "203.0.113"]) assert.ok(!logged.includes(secret));
});

test("errors inside the database driver or handler never reach the response or logs", async (t) => {
  const { send } = setup(t);
  const errors = quietErrors(t);
  const response = await send(post(lead()), {
    getDb: () => ({ exec: () => { throw new Error("secret test@example.com"); } }) as unknown as DatabaseSync,
  });
  // saveLead itself reports a failed BEGIN as unavailable.
  assert.equal(response.status, 503);
  assert.ok(!(await response.text()).includes("secret"));

  const broken = await handleLeadRequest(post(lead()), {
    limiter: { hit: () => { throw new Error("secret"); } } as unknown as RateLimiter,
  });
  assert.equal(broken.status, 500);
  assert.deepEqual(await json(broken), { ok: false, reason: "unavailable" });
  assert.ok(!errors.mock.calls.map((c) => c.arguments.join(" ")).join("\n").includes("secret"));
});

test("only POST is allowed; nothing reads leads back", async (t) => {
  const { db, send } = setup(t);
  assert.equal((await send(post(lead()))).status, 200);
  for (const method of ["GET", "HEAD", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
    const response = await send(new Request(URL_, { method, headers: { "sec-fetch-site": "same-origin" } }));
    assert.equal(response.status, 405, method);
    assert.equal(response.headers.get("allow"), "POST");
    const text = await response.text();
    if (method !== "HEAD") assert.deepEqual(JSON.parse(text), { ok: false, reason: "method_not_allowed" });
    assert.ok(!text.includes("Test Person"));
  }
  assert.equal(count(db, "leads"), 1);
});
