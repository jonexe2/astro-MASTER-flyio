# V1 lead contract

Frozen in P2.1 (owner approval 2026-10-16). The forms, the backend handler, the
SQLite schema, the owner dashboard, the Google Sheets copy and the recovery
importer all follow this document. Types and constants live in `contract.ts`.

V1 has no lead status, no source/page/referral tracking and no lead editing.

## 1. Fields

| DB / Sheet column | TS name | Type | Required | Limit |
|---|---|---|---|---|
| `id` | `id` | text, lowercase UUID v4 | yes, server-set | 36 chars |
| `created_at` | `createdAt` | text, UTC `YYYY-MM-DDTHH:mm:ss.sssZ` | yes, server-set | 24 chars |
| `updated_at` | `updatedAt` | same format | yes, server-set | 24 chars |
| `full_name` | `fullName` | text, one line | yes | 1–100 chars |
| `phone` | `phone` | text, one line, never a number | yes | 1–30 chars, at least 7 digits |
| `email` | `email` | text, one line | yes | 3–254 chars, simple format check |
| `services` | `services` | JSON list of labels | yes | see section 4 |
| `message` | `message` | text or NULL | no | up to 2,000 chars |
| `submission_key` | `submissionKey` | lowercase UUID or NULL | no | 36 chars, unique when present |

Never stored: the honeypot, any consent checkbox, which form or page was used,
and any time sent by the browser.

## 2. Cleanup before saving

Applied once by the server. The saved value never changes afterwards, and the
dashboard, the Sheet and restores keep it character for character.

- All text: Unicode NFC, then trim both ends.
- Name, phone, email: line breaks and control characters are rejected.
- Message: `\r\n` and `\r` become `\n`; inner line breaks are kept; blank or
  missing becomes NULL (never an empty string). Other control characters except
  tab are rejected.
- Values over a limit are rejected with a field error, never shortened.
- Email case and phone formatting are kept as typed (search may ignore them).
- Limits count Unicode code points after cleanup.

## 3. ID and times

- `id`: `crypto.randomUUID()`, set once at save. It is the primary key, and
  leads are only ever inserted (never "insert or replace"), so an existing lead
  can never be overwritten. A collision is extremely unlikely; if the insert is
  refused, the save fails like any other database error and the customer's
  retry gets a new ID.
- `created_at`: server UTC time at save (`new Date().toISOString()`).
- `updated_at`: equal to `created_at` in V1; always `>= created_at`. It exists
  so future edits need no schema or Sheet format change.
- Restores copy `id`, `created_at` and `updated_at` exactly; they are never
  regenerated.

## 4. Services

- Stored as a JSON list text, for example `["AC Repair","Heating Repair"]`, in
  `HVAC_SERVICES` order, with no duplicates.
- **New submissions (strict):** every value must be one of the current
  `HVAC_SERVICES`; 1–6 items.
- **Stored and restored leads (format only):** a list with at least one item;
  each a non-empty, single-line label of at most 100 chars; no duplicates. The
  label does not have to be on today's list, so older or client-specific labels
  restore unchanged. The importer reports unknown labels as warnings, not errors.

## 5. Duplicate submissions

The form script creates a random submission key when the form is ready and
sends it with the request as a header (it is not a hidden form input; the
honeypot stays the only hidden field). The header is `Idempotency-Key`
(chosen in P3.1); the endpoint is `POST /api/leads/` (`LEAD_ENDPOINT` and
`LEAD_SUBMISSION_KEY_HEADER` in `contract.ts`).

| Situation | Behaviour |
|---|---|
| Double-click | Submit button disabled while sending; any repeat carries the same key. One lead. |
| Retry after an uncertain failure | Form keeps the data and the key. If the first attempt was saved, the server finds the key, sees identical data and returns the original success and lead ID. Otherwise it saves now. One lead. |
| Two requests at the same moment | The unique key lets one insert win; the other looks up the key and answers as above. |
| Customer edits a field after an error | The script makes a new key: it is a different request. |
| Same key, different data | Nothing saved; `conflict` returned; the script makes a new key. |
| Key missing (header absent) | Lead saved normally, without duplicate protection. |
| Key present but not exactly a lowercase UUID (including an empty value) | Nothing saved; `bad_request` returned. |
| Later separate inquiry | New key, separate lead, even with the same phone, email or text. |

"Identical" means equal after the cleanup in section 2. Leads are never merged
by phone or email.

## 6. Google Sheets recovery format `lead.v1`

One private tab, this exact header row, one row per lead. Rows are found by
`lead_id`, never by position.

| Col | Header | Value | Empty cell |
|---|---|---|---|
| A | `format` | `lead.v1` | not allowed |
| B | `lead_id` | `id` | not allowed |
| C | `created_at_utc` | `created_at` | not allowed |
| D | `updated_at_utc` | `updated_at` | not allowed |
| E | `full_name` | as stored | not allowed |
| F | `phone` | as stored | not allowed |
| G | `email` | as stored | not allowed |
| H | `services` | stored JSON text | not allowed |
| I | `message` | as stored | means NULL |
| J | `submission_key` | as stored | means NULL |

- Write every cell as text with `valueInputOption=RAW`, so leading zeros, `+`,
  number-like, date-like and `=`-prefixed text stay unchanged. Add no
  apostrophes or escape codes.
- Read back unformatted values; format the columns as Plain text.
- V1 never stores an empty string, so an empty cell can only mean NULL. An empty
  cell in any other column makes the row invalid: the importer stops and reports.
- The importer requires this exact header row and `lead.v1` in every row. A
  future change uses a new format version instead of reusing columns.
- Round trip: columns B–J equal the database values character for character.
- Restore conflicts: an existing ID with identical values is skipped; with
  different values the importer stops and reports; nothing is overwritten.
- Limit: a lead that never reached the Sheet cannot be recovered from it.
