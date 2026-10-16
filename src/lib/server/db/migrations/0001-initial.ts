import "../../server-only.ts";

// Migration 1: lead storage (src/lib/leads/LEAD_CONTRACT.md) and follow-up jobs.
// NEVER edit this file after it is merged: the runner stores a checksum of `sql`
// and refuses to start if it changes. Make a new migration instead.

const HEX = "[0-9a-f]";
const DIGIT = "[0-9]";
// Lowercase UUID: 8-4-4-4-12 hex characters.
const UUID = [8, 4, 4, 4, 12].map((n) => HEX.repeat(n)).join("-");
// UTC time from toISOString(): YYYY-MM-DDTHH:MM:SS.mmmZ
const UTC = `${DIGIT.repeat(4)}-${DIGIT.repeat(2)}-${DIGIT.repeat(2)}T${DIGIT.repeat(2)}:${DIGIT.repeat(2)}:${DIGIT.repeat(2)}.${DIGIT.repeat(3)}Z`;

export const initial = {
  version: 1,
  name: "initial",
  sql: `
CREATE TABLE leads (
  id TEXT NOT NULL PRIMARY KEY CHECK (id GLOB '${UUID}'),
  created_at TEXT NOT NULL CHECK (created_at GLOB '${UTC}'),
  updated_at TEXT NOT NULL CHECK (updated_at GLOB '${UTC}' AND updated_at >= created_at),
  full_name TEXT NOT NULL CHECK (length(full_name) BETWEEN 1 AND 100),
  phone TEXT NOT NULL CHECK (length(phone) BETWEEN 1 AND 30),
  email TEXT NOT NULL CHECK (length(email) BETWEEN 3 AND 254),
  services TEXT NOT NULL CHECK (
    json_valid(services) AND json_type(services) = 'array' AND json_array_length(services) >= 1
  ),
  message TEXT CHECK (message IS NULL OR length(message) BETWEEN 1 AND 2000),
  submission_key TEXT UNIQUE CHECK (submission_key IS NULL OR submission_key GLOB '${UUID}')
) STRICT;

CREATE INDEX leads_created_at ON leads (created_at);

CREATE TABLE integration_jobs (
  lead_id TEXT NOT NULL REFERENCES leads (id),
  kind TEXT NOT NULL CHECK (kind IN ('email_new_lead', 'sheet_sync')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'done', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at TEXT NOT NULL CHECK (next_attempt_at GLOB '${UTC}'),
  last_error_code TEXT,
  created_at TEXT NOT NULL CHECK (created_at GLOB '${UTC}'),
  updated_at TEXT NOT NULL CHECK (updated_at GLOB '${UTC}'),
  PRIMARY KEY (lead_id, kind)
) STRICT;
`,
};
