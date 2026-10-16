import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import matter from "gray-matter";
import { HVAC_SERVICES, isHvacService } from "./contract.ts";

const findServices = (node: unknown): string[] | undefined => {
  if (!node || typeof node !== "object") return undefined;
  const record = node as Record<string, unknown>;
  if (Array.isArray(record.services) && record.services.every((s) => typeof s === "string"))
    return record.services as string[];
  for (const value of Object.values(record)) {
    const found = findServices(value);
    if (found) return found;
  }
  return undefined;
};

test("HVAC_SERVICES matches the hero form content (same six options, same order)", () => {
  const file = new URL("../../content/sections/english/alternative-hero-section.md", import.meta.url);
  const services = findServices(matter(readFileSync(file, "utf8")).data);
  assert.deepEqual([...HVAC_SERVICES], services);
});

test("isHvacService accepts only the six known services", () => {
  for (const service of HVAC_SERVICES) assert.equal(isHvacService(service), true);
  for (const bad of ["ac repair", "Plumbing", "", null, undefined, 1, ["AC Repair"]])
    assert.equal(isHvacService(bad), false);
});
