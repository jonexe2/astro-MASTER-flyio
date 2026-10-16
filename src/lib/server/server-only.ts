// Import this first in every module under src/lib/server/ (path relative to the
// module). If server code is ever executed in a browser, fail loudly. This is only
// a backstop: it does NOT keep code or secrets out of downloaded JavaScript. What
// prevents that is the import rule enforced by boundaries.test.ts, the build-output
// scan in the same file, and never putting secrets in code the browser can load.
if (typeof window !== "undefined") {
  throw new Error("src/lib/server must never be imported in browser code");
}
