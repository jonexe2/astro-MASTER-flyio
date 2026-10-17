import { test } from "node:test";
import assert from "node:assert/strict";
import { LEAD_RATE_LIMIT, RateLimiter, clientKey } from "./rate-limit.ts";

test("the approved limit is 10 attempts per 10 minutes", () => {
  assert.equal(LEAD_RATE_LIMIT.max, 10);
  assert.equal(LEAD_RATE_LIMIT.windowMs, 600_000);
});

test("a fixed window allows `max` attempts, then reports seconds until it resets", () => {
  let now = 0;
  const limiter = new RateLimiter({ max: 3, windowMs: 10_000, maxClients: 10 }, () => now);
  assert.deepEqual([1, 2, 3].map(() => limiter.hit("a").ok), [true, true, true]);
  now = 2_500;
  assert.deepEqual(limiter.hit("a"), { ok: false, retryAfterSeconds: 8 });
  assert.equal(limiter.hit("b").ok, true);
  now = 10_000;
  assert.equal(limiter.hit("a").ok, true);
});

test("memory stays capped: expired windows go first, then the oldest", () => {
  let now = 0;
  const limiter = new RateLimiter({ max: 1, windowMs: 1_000, maxClients: 3 }, () => now);
  limiter.hit("old");
  now = 500;
  limiter.hit("b");
  limiter.hit("c");
  now = 1_000; // "old" has expired
  limiter.hit("d");
  assert.equal(limiter.size, 3);
  assert.equal(limiter.hit("b").ok, false, "b kept its window");
  limiter.hit("e"); // none expired: the oldest ("b") is dropped
  assert.equal(limiter.size, 3);
  assert.equal(limiter.hit("b").ok, true, "b starts a new window");
});

test("clientKey: IPv4 as is, IPv4-mapped IPv6 as IPv4, IPv6 by /64, anything else 'unknown'", () => {
  assert.equal(clientKey("203.0.113.7"), "203.0.113.7");
  assert.equal(clientKey("::ffff:203.0.113.7"), "203.0.113.7");
  assert.equal(clientKey("2001:db8:1:2:aaaa:bbbb:cccc:dddd"), "2001:db8:1:2::/64");
  assert.equal(clientKey("2001:DB8:1:2::1"), "2001:db8:1:2::/64");
  assert.equal(clientKey("2001:0db8:0001:0002:0:0:0:9"), "2001:db8:1:2::/64");
  assert.equal(clientKey("2001:db8::1"), "2001:db8:0:0::/64");
  assert.equal(clientKey("::1"), "0:0:0:0::/64");
  assert.equal(clientKey("fe80::1%eth0"), "fe80:0:0:0::/64");
  assert.equal(clientKey("64:ff9b::192.0.2.1"), "64:ff9b:0:0::/64");
  for (const bad of [undefined, "", "localhost", "999.1.1.1", "1.2.3.4, 5.6.7.8"]) assert.equal(clientKey(bad), "unknown");
});
