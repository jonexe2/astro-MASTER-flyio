// Import this first in every module under src/lib/server/. Server code must run
// only in Node (endpoints, on-demand pages). If a bundler ever ships it to a
// browser, fail loudly instead of exposing it. boundaries.test.ts enforces the
// import rules statically; this is the runtime backstop.
if (typeof window !== "undefined") {
  throw new Error("src/lib/server must never be imported in browser code");
}
