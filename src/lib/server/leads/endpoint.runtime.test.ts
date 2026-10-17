import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

// Runs the BUILT production server (dist/server/entry.mjs) against a temporary
// database outside the project, with synthetic data only. Needs a prior
// `npm run build`; skipped when dist/ does not exist.

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const entry = join(root, "dist", "server", "entry.mjs");

const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => (typeof address === "object" && address ? resolve(address.port) : reject(new Error("no port"))));
    });
  });

const startServer = async (t: TestContext) => {
  const dir = mkdtempSync(join(tmpdir(), "p31-runtime-"));
  const databasePath = join(dir, "runtime.sqlite");
  const port = await freePort();
  const child = spawn(process.execPath, [entry], {
    cwd: root,
    env: { ...process.env, HOST: "127.0.0.1", PORT: String(port), APP_ENV: "development", DATABASE_PATH: databasePath },
    stdio: ["ignore", "ignore", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => (stderr += chunk));
  t.after(async () => {
    if (child.exitCode === null) {
      const exited = new Promise((resolve) => child.once("exit", resolve));
      child.kill();
      await exited;
    }
    rmSync(dir, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i += 1) {
    try {
      if ((await fetch(`${base}/api/health/`)).ok) return { base, port, databasePath, stderr: () => stderr };
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("server did not start");
};

const lead = {
  fullName: "Runtime Test",
  phone: "555-010-0199",
  email: "runtime@example.com",
  services: ["Preventive Maintenance", "AC Repair"],
  message: "Synthetic runtime check",
};
const KEY = "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff";

test("built server: /api/leads/ saves one lead, answers a retry, and refuses bad requests", { skip: !existsSync(entry) }, async (t) => {
  const { base, port, databasePath, stderr } = await startServer(t);
  // Without security.allowedDomains Astro builds request URLs as localhost:PORT
  // (P8 configures the real domain), so that is the same origin here.
  const origin = `http://localhost:${port}`;
  const post = (body: string, headers: Record<string, string> = {}, path = "/api/leads/") =>
    fetch(`${base}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin, [`idempotency-key`]: KEY, ...headers },
      body,
      redirect: "manual",
    });

  const saved = await post(JSON.stringify(lead));
  assert.equal(saved.status, 200);
  assert.equal(saved.headers.get("cache-control"), "no-store");
  const { ok, leadId } = (await saved.json()) as { ok: boolean; leadId: string };
  assert.equal(ok, true);

  const retry = await post(JSON.stringify(lead));
  assert.deepEqual(await retry.json(), { ok: true, leadId });

  assert.equal((await post(JSON.stringify(lead), { origin: "https://attacker.example" })).status, 403);
  assert.equal((await post(JSON.stringify(lead), { "sec-fetch-site": "cross-site" })).status, 403);
  // Form-type cross-site posts are refused by Astro's own checkOrigin before the handler.
  assert.equal((await post("fullName=x", { "content-type": "application/x-www-form-urlencoded", origin: "https://attacker.example" })).status, 403);
  assert.equal((await post("fullName=x", { "content-type": "text/plain" })).status, 415);
  assert.equal((await post(JSON.stringify({ ...lead, extra: 1 }), { "idempotency-key": "" })).status, 400);

  const get = await fetch(`${base}/api/leads/`);
  assert.equal(get.status, 405);
  assert.equal(get.headers.get("allow"), "POST");

  // Without the trailing slash the request is not handled as a lead.
  assert.notEqual((await post(JSON.stringify(lead), { "idempotency-key": "cccccccc-cccc-4ccc-8ccc-cccccccccccc" }, "/api/leads")).status, 200);

  const db = new DatabaseSync(databasePath, { readOnly: true });
  try {
    assert.equal(Number(db.prepare("SELECT count(*) AS n FROM leads").get()?.n), 1);
    assert.equal(Number(db.prepare("SELECT count(*) AS n FROM integration_jobs WHERE lead_id = ? AND status = 'pending'").get(leadId)?.n), 2);
  } finally {
    db.close();
  }
  assert.ok(!stderr().includes("runtime@example.com"));
});
