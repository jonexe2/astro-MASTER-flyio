import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import matter from "gray-matter";
import {
  HVAC_SERVICES,
  LEAD_LIMITS,
  LEAD_SHEET_FORMAT,
  LEAD_SHEET_V1_COLUMNS,
  isHvacService,
} from "./contract.ts";

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

test("LEAD_LIMITS match the frozen V1 contract", () => {
  assert.deepEqual(LEAD_LIMITS, {
    fullName: { min: 1, max: 100 },
    phone: { min: 1, max: 30, minDigits: 7 },
    email: { min: 3, max: 254 },
    message: { max: 2000 },
    services: { min: 1, max: 6 },
    storedServiceLabel: { max: 100 },
  });
});

// Rows of the "Google Sheets recovery format" table in LEAD_CONTRACT.md.
const docSheetRows = () => {
  const doc = readFileSync(new URL("./LEAD_CONTRACT.md", import.meta.url), "utf8");
  const section = doc.split("## 6.")[1] ?? "";
  return section
    .split("\n")
    .filter((line) => /^\| [A-Z] \|/.test(line))
    .map((line) => line.split("|").map((cell) => cell.trim()))
    .map(([, , header, , empty]) => ({ header: header.replaceAll("`", ""), nullable: empty === "means NULL" }));
};

test("Sheet lead.v1 columns match LEAD_CONTRACT.md (order, headers, NULL rule)", () => {
  assert.equal(LEAD_SHEET_FORMAT, "lead.v1");
  assert.deepEqual(
    LEAD_SHEET_V1_COLUMNS.map(({ header, nullable }) => ({ header, nullable })),
    docSheetRows(),
  );
});

test("Sheet lead.v1 maps every LeadRecord field exactly once", () => {
  const fields = LEAD_SHEET_V1_COLUMNS.map((c) => c.field).filter((f) => f !== null);
  assert.deepEqual(
    [...fields].sort(),
    ["createdAt", "email", "fullName", "id", "message", "phone", "services", "submissionKey", "updatedAt"],
  );
  // Only the optional fields may be empty (empty cell = null).
  assert.deepEqual(
    LEAD_SHEET_V1_COLUMNS.filter((c) => c.nullable).map((c) => c.field),
    ["message", "submissionKey"],
  );
});
