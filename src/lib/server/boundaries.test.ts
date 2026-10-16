import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const src = join(root, "src");
const serverDir = join(src, "lib", "server");
const pagesDir = join(src, "pages");

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );

const IMPORT = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;

const importsServer = (file: string, code: string): string[] =>
  [...code.matchAll(IMPORT)]
    .map((m) => m[1])
    .filter((spec) => {
      const target = spec.startsWith("@/")
        ? join(src, spec.slice(2))
        : spec.startsWith(".")
          ? resolve(dirname(file), spec)
          : spec;
      // Compare with forward slashes so Windows paths work too.
      return /(^|\/)lib\/server(\/|$)/.test(target.split(sep).join("/"));
    });

// Returns the violations in one file: "client code" may never import src/lib/server.
// - `<script>` blocks in .astro files are browser code everywhere.
// - Everything else outside src/pages and src/lib/server is shared or browser code.
const violations = (file: string, text: string): string[] => {
  if (file.endsWith(".astro")) {
    const scripts = [...text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    const code = file.startsWith(pagesDir) ? scripts.join("\n") : text;
    return importsServer(file, code);
  }
  const allowed = file.startsWith(pagesDir) || file.startsWith(serverDir);
  return allowed ? [] : importsServer(file, text);
};

test("only src/pages and src/lib/server import src/lib/server", () => {
  const files = walk(src).filter((f) => /\.(ts|js|mjs|astro)$/.test(f) && !f.endsWith(".test.ts"));
  const found = files.flatMap((f) => violations(f, readFileSync(f, "utf8")).map((s) => `${relative(root, f)} -> ${s}`));
  assert.deepEqual(found, []);
});

test("the boundary check detects violations (self-test)", () => {
  const widget = join(src, "layouts", "components", "widgets", "X.astro");
  assert.equal(violations(widget, `---\nimport { a } from "@/lib/server/health.ts";\n---`).length, 1);
  assert.equal(violations(join(src, "lib", "utils", "x.ts"), `import "../server/health.ts";`).length, 1);
  const page = join(pagesDir, "contact-us.astro");
  assert.equal(violations(page, `---\nimport a from "@/lib/server/health.ts";\n---<script>import "@/lib/server/health.ts";</script>`).length, 1);
  assert.equal(violations(join(pagesDir, "api", "x.ts"), `import a from "@/lib/server/health.ts";`).length, 0);
});

// Needs a prior `npm run build`; skipped when dist/ does not exist.
const client = join(root, "dist", "client");
const server = join(root, "dist", "server");
test("built browser output contains no server-only code", { skip: !existsSync(client) || !existsSync(server) }, () => {
  const marker = "must never be imported in browser code";
  const text = (dir: string) =>
    walk(dir).filter((f) => /\.(js|mjs|html|css|json|map|txt|xml)$/.test(f)).map((f) => readFileSync(f, "utf8")).join("\n");
  assert.ok(text(server).includes(marker), "marker should exist in the server build");
  const clientText = text(client);
  assert.ok(!clientText.includes(marker));
  assert.ok(!clientText.includes("getHealthPayload"));
  assert.ok(!clientText.includes("lib/server"));
});
