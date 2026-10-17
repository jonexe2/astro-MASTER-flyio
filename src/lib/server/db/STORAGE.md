# Database storage and recovery boundaries

Set in P2.4. Explains where the SQLite database lives, how it is protected, and
what can and cannot be recovered if it is lost. The lead fields and the Google
Sheets format are defined in `src/lib/leads/LEAD_CONTRACT.md`; this document
does not change them.

## 1. Where the database lives

The path comes only from `resolveDatabasePath()` in `src/lib/server/settings.ts`.

| Use | Path | Rules |
|---|---|---|
| Local development | `.data/dev.sqlite` (default) | Inside the project only `.data/` is allowed (git-ignored). `public/` would be served to visitors, `dist/` is replaced on every build, `src/` sits next to committed code. Never inside `/data`. |
| Automated tests | A new temporary folder per test | Tests call `openDatabase()` with a temporary path and synthetic records; they never read `.env`, `.data/dev.sqlite` or a real database. |
| Production | `DATABASE_PATH`, an absolute path inside `/data/` (planned: `/data/leads.sqlite`) | No default. `/data` is the planned Fly.io volume mount (set up in P8). A missing folder is refused, never created, so leads cannot land on disposable disk when the volume is absent. |

The database file, its `-wal` and `-shm` files must stay together in one folder.

**Not detected by the code:** a `/data` folder that exists on the container's
own disk without a volume mounted, and symbolic links inside `/data`. P8 must
make sure the image never creates `/data` and must verify the actual volume
mount with a method the deployment environment supports. Comparing the device
IDs of `/data` and `/` is only a hint, not proof of a persistent volume.

## 2. Connections and writes

- WAL mode (checked when opening), `synchronous = FULL` (a save is on disk
  before success is reported), 5 s busy timeout, foreign keys on, defensive mode.
- Every write starts with `BEGIN IMMEDIATE`, so two writers never interleave.
- One shared connection per process (`getDatabase()`). `node:sqlite` is
  synchronous, so one save runs start to finish before the next request. This
  suits modest traffic on one Fly.io Machine.
- Rule for later code (job worker, importer): never `await` between `BEGIN` and
  `COMMIT` on the shared connection, or other requests would run inside that
  transaction.

The database is created and migrated only when `npm run db:migrate` runs or when
server code first asks for the connection (`getDatabase()`). Starting the app
alone does not open it. P8 runs `db:migrate` before the server starts so a
storage problem stops the boot.

## 3. Recreating an empty database

Running the migrations on a new file rebuilds the exact schema from
`src/lib/server/db/migrations/` in one transaction. The result has **no
customer leads**: the schema is code, the leads are data.

Merged migrations are never edited. Each database records a checksum of every
applied migration, and an edited file makes every existing or restored database
refuse to open (`DB_MIGRATION_MISMATCH`). Schema changes are new migrations
added at the end.

## 4. Restoring leads

**Full database restore (preferred).** Restores everything: leads, follow-up
jobs, owner data (from P4) and migration history.

- Live backups: use SQLite's online backup API (`backup()` in `node:sqlite`).
  It produces a consistent single file while the app runs.
- Offline copies: a stopped app does not make the `.sqlite` file complete by
  itself. Committed changes may still be in the `-wal` file. Either shut down
  cleanly (all connections closed, WAL checkpointed) or copy the `.sqlite`,
  `-wal` and `-shm` files together as one set; then check the copy opens and
  passes `PRAGMA integrity_check`. Copying only the `.sqlite` file can silently
  lose leads.
- Fly volume snapshots: crash-consistent disk images; WAL with `FULL` should
  make them recoverable, but this must be proven by a real restore test (P9).
- A restored file opens under the normal migration checks: an older backup gets
  newer migrations applied; a backup newer than the code is refused.

**Google Sheets recovery (fallback, P7).** A fresh database is created from the
migrations, then a separate importer inserts each synchronized row from the
`lead.v1` columns exactly as stored: original `id`, `created_at`, `updated_at`,
`submission_key`, customer details and the services JSON text (including labels
no longer offered). The importer cannot use `saveLead()`, which creates new IDs
and times, only accepts today's services and queues jobs. It creates no
follow-up jobs, so no emails or Sheet writes are triggered again. New leads
after a restore get random UUIDs and cannot collide with restored IDs.

## 5. What the Google Sheet cannot restore

The Sheet is a partial lead copy, not a database backup.

| Data | After a Sheet-only recovery |
|---|---|
| Leads that reached the Sheet | Restored with original values. |
| Leads never synchronized (saved after the last successful sync, or whose `sheet_sync` job failed) | **Lost.** |
| Owner account and sessions (P4) | Not in the Sheet. The owner account is recreated through the private setup procedure; the owner signs in again. |
| `integration_jobs` (pending, failed and finished email/Sheet work, attempts, error codes) | Lost. A lead whose owner email had not been sent is not emailed after the restore. |
| `schema_migrations` | Regenerated by the migration run (new `applied_at` times). |

## 6. Single-Machine risks

A Fly volume lives on one physical host and is not replicated. Host or disk
failure, accidental volume deletion, file corruption or an application bug that
writes bad data can lose leads. Snapshots are periodic, so recent leads may be
missing from the latest one, and a snapshot can contain the same bad data. The
Sheet narrows the gap to "leads synchronized so far". None of this is high
availability.

## 7. Later phases

- P6/P7: job worker, Sheets sync, importer and the no-backup recovery test.
- P8: Dockerfile and volume mount at `/data` (the image must not create `/data`;
  `.dockerignore` excludes `.env*` and `.data/`), `DATABASE_PATH` as a runtime
  setting, `db:migrate` before start, file permissions, mount verification,
  data surviving restart and redeploy.
- P9: snapshot schedule and retention, independent backup decision, consistent
  backup method, restore into a separate test database.
