import { test } from "node:test";
import assert from "node:assert/strict";
import { getHealthPayload } from "./health.ts";

test("server modules load in Node and health payload has no extra data", () => {
  const payload = getHealthPayload();
  assert.deepEqual(Object.keys(payload).sort(), ["serverTime", "status"]);
  assert.equal(payload.status, "ok");
  assert.ok(!Number.isNaN(Date.parse(payload.serverTime)));
});

test("server-only guard throws when a browser global exists", async () => {
  const url = new URL("./server-only.ts?browser", import.meta.url).href;
  (globalThis as Record<string, unknown>).window = {};
  try {
    await assert.rejects(import(url), /must never be imported in browser code/);
  } finally {
    delete (globalThis as Record<string, unknown>).window;
  }
});
