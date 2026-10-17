import "../server-only.ts";
import { isIP } from "node:net";

// Simple in-memory submission limit for the lead endpoint: a fixed window per
// client, kept in this process only (one app on one Machine). It resets when
// the app restarts. Every attempt counts, including rejected ones.

export interface RateLimitOptions {
  max: number; // attempts allowed per window
  windowMs: number;
  maxClients: number; // memory cap; expired, then oldest windows are dropped first
}

export const LEAD_RATE_LIMIT: RateLimitOptions = { max: 10, windowMs: 10 * 60 * 1000, maxClients: 10_000 };

// "a:b:c:d::1.2.3.4" style IPv6 text -> eight lowercase hextets.
const ipv6Groups = (address: string): string[] => {
  let text = address.toLowerCase();
  const ipv4Tail = /(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(text);
  if (ipv4Tail) {
    const [a, b, c, d] = ipv4Tail.slice(1).map(Number);
    text = `${text.slice(0, ipv4Tail.index)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const [head, tail] = text.split("::");
  const start = head ? head.split(":") : [];
  if (tail === undefined) return start.map((g) => parseInt(g, 16).toString(16));
  const end = tail ? tail.split(":") : [];
  const zeros = Array<string>(8 - start.length - end.length).fill("0");
  return [...start, ...zeros, ...end].map((g) => parseInt(g, 16).toString(16));
};

// Which bucket a request counts against. The address comes only from Astro's
// `clientAddress`; this never reads forwarded headers sent by visitors (the
// trusted client-IP source on Fly.io is decided and verified in P8).
// IPv6 is grouped by /64, the block one household or device usually gets.
export const clientKey = (clientAddress: string | undefined): string => {
  if (!clientAddress) return "unknown";
  let address = clientAddress.trim().split("%")[0]; // drop an IPv6 zone such as %eth0
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (mapped) address = mapped[1];
  const version = isIP(address);
  if (version === 4) return address;
  if (version === 6) return `${ipv6Groups(address).slice(0, 4).join(":")}::/64`;
  return "unknown";
};

export type RateLimitDecision = { ok: true } | { ok: false; retryAfterSeconds: number };

export class RateLimiter {
  readonly #options: RateLimitOptions;
  readonly #now: () => number;
  readonly #clients = new Map<string, { count: number; resetAt: number }>();

  constructor(options: RateLimitOptions = LEAD_RATE_LIMIT, now: () => number = Date.now) {
    this.#options = options;
    this.#now = now;
  }

  get size() {
    return this.#clients.size;
  }

  // Counts one attempt for `key`.
  hit(key: string): RateLimitDecision {
    const now = this.#now();
    let entry = this.#clients.get(key);
    if (entry && entry.resetAt <= now) {
      this.#clients.delete(key);
      entry = undefined;
    }
    if (!entry) {
      if (this.#clients.size >= this.#options.maxClients) this.#makeRoom(now);
      entry = { count: 0, resetAt: now + this.#options.windowMs };
      this.#clients.set(key, entry);
    }
    entry.count += 1;
    if (entry.count <= this.#options.max) return { ok: true };
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
  }

  #makeRoom(now: number) {
    for (const [key, entry] of this.#clients) if (entry.resetAt <= now) this.#clients.delete(key);
    // Map order is insertion order, so the first keys are the oldest windows.
    for (const key of this.#clients.keys()) {
      if (this.#clients.size < this.#options.maxClients) break;
      this.#clients.delete(key);
    }
  }
}
