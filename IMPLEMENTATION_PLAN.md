# IMPLEMENTATION PLAN
## Premium HVAC Website, Lead Capture, and Private Owner Dashboard

**Working repository:** [`jonexe2/astro-MASTER-flyio`](https://github.com/jonexe2/astro-MASTER-flyio)  
**Default branch:** `main`  
**Plan created:** October 13, 2026  
**Assessment basis:** Working repository `main` tree at `3dac95ba0467d6e2339b98d5c7c71460e948c022` (checked October 13, 2026), selected source files including the hero trust banner and testimonial content, plus project requirements. *(Historical, as of 2026-10-13: local build/browser behavior was untested at that time. It was tested on 2026-10-14; see Section 10.1.)*  
**Project status:** Phase 1 is complete (PRs #1 to #6). Phase 2: P2.1 (V1 lead contract) is merged (PR #7, `main` at `4faf230`); P2.2 (SQLite schema and migrations) is merged (PR #8, `main` at `9d96662`); P2.3 (lead write/read functions) is merged (PR #9, `main` at `ba730a9`); P2.4 (storage and recovery boundaries) is implemented and tested on branch `phase-2/p2-4-storage-boundaries`, awaiting review. No authentication, dashboard, form-submission or integration work has started.  
**Current phase:** Phase 2 (SQLite lead storage). Phase 0 completed 2026-10-14; Phase 1 results are in Sections 10.4 to 10.6 and the completed task log. The 8 remaining `npm audit` findings were accepted "for now" on 2026-10-15; re-run the audit at each phase start, after dependency changes and before deployment.  
**Next recommended task:** review and merge P2.4; then Phase 3 (P3.1 shared form endpoint), only with owner approval.  
**Scope of this document:** Development roadmap and progress tracker. This revision only updates the plan, not repository code or deployments.

> **How to use this plan:** Work through one small task at a time. A checked box (`- [x]`) means the action was actually performed and verified. An unchecked box (`- [ ]`) means it is still pending. An existing file is not proof a feature works. After each development session, update the status table, completed checklist items, test evidence, blockers, and next task. Do not check off untested work.

---

## 1. Goal and boundaries

Extend the **existing Astro HVAC website in `astro-MASTER-flyio`** into a working application that:

1. Keeps its approved public website design, existing reusable components, trust indicators, and testimonial section.
2. Accepts HVAC service requests from any approved website form.
3. Checks submissions on the server and saves them in **SQLite** before confirming success.
4. Shows the saved requests in a simple, secure, private owner dashboard.
5. Notifies the owner using **Resend**, without losing leads if email fails.
6. Copies **all fields needed to reconstruct leads** to a private Google Sheet.
7. Can restore synchronized lead records from the Sheet into a newly recreated SQLite database when ordinary backups are unavailable.
8. Runs as one Astro application in Docker on Fly.io, with SQLite on a persistent volume.
9. Can be adapted to another HVAC business or a plumbing business without rebuilding the lead-handling system.
10. Preserves the master-template demonstration trust content: **`5.0 Rating`**, **`200+ Reviews`**, **`Licensed & Insured`**, and the existing **testimonials** (content, section and design), unless the project owner later explicitly approves changes.

**Keep Version 1 focused:** This is a website plus a private lead inbox, not an appointment scheduler, employee dispatch system, payment system, or large CRM. Do not add another framework, database, service, or paid subscription unless a confirmed requirement warrants it.

**Non-negotiable rules**

- Perform development, testing, commits and deployments against **`jonexe2/astro-MASTER-flyio` only**. Verify the Git remote before any push.
- Preserve the `5.0 Rating`, `200+ Reviews`, `Licensed & Insured` trust banner and all existing testimonial content/components in the **master template**. Do not strip them during SEO cleanup, backend implementation, rebranding, or performance changes.
- These are **reusable demo/template values**, not independently verified statements about any real client. On a real client’s public production site, substitute verified details or hide the relevant claim in that client’s configuration until substantiated; **do not delete it from the master**.
- Preserve existing pages, layouts, responsive behavior, and approved design. Make visual changes only to fix a confirmed issue or with approval.
- Keep Astro unless repository inspection or tests reveal a compelling technical blocker.
- Keep customer data private. Never put passwords, API keys, live leads, or service credentials in this public GitHub repository.
- Build the **real** project in small, testable steps; do not create a throwaway replacement website.
- Prefer one Fly.io Machine and one volume initially, but explicitly evaluate their downtime and data-loss tradeoffs before production launch.
- Never label an untested feature complete or describe a proposal as something already implemented.
- Any major architecture change must explain what problem it fixes, evidence for the change, added complexity and cost, and whether it can wait.

---

## 2. Current repository assessment

### 2.1 Confirmed by the October 13 GitHub inspections

**Active target:** `jonexe2/astro-MASTER-flyio` on `main` (tree `3dac95ba0467d6e2339b98d5c7c71460e948c022`). The current target contains the inspected source files and components listed below.

*Historical context (2026-10-13):* this assessment is **source-code inspection**, not a successful local build, browser test, or production test. The 2026-10-14 P0.3 baseline (Section 10.1) has since run the local install, checks, build and browser review; the table below is preserved as originally written. Recheck the working repository before any changes.

| Area | Confirmed in repository | What remains to prove or do |
|---|---|---|
| Structure | Astro pages, layouts, reusable components, and Markdown/MDX content exist. | Run and inspect the website in a browser. *(Done in P0.3, 2026-10-14; see Section 10.1.)* |
| Dependencies | `package.json` declares `astro: ^7.0.2`, `tailwindcss: ^4.3.1`, Node `>=22.12.0`. | Install locked dependencies and verify compatible runtime locally. *(Done in P0.3, 2026-10-14: `npm ci` succeeded on Node v24.17.0; installed `astro@7.0.3` has open security advisories, see Section 10.1.)* |
| Project instructions | `CLAUDE.md`, `AGENTS.md`, `SKILLS.md` exist. | Follow their rules during changes; revisit where server/dashboard code needs new conventions. |
| Configuration | `astro.config.mjs` has sitemap, MDX, typography and Tailwind configuration; no server adapter is shown in that file. | Evaluate and add a suitable Node server adapter, then verify existing static routes. |
| Homepage | `src/pages/[...lang]/index.astro` composes existing HVAC sections, hero form, contact section, and blog. | Check visual/mobile rendering; do not rebuild those sections. |
| HVAC service pages | `src/pages/[...lang]/services/[single].astro` maps six HVAC services to specific content. | Check actual public URLs and route behavior, especially after adding private server routes. |
| Main hero form | `src/layouts/components/widgets/AlternativeHeroForm.astro` has name, phone, email, service selection, front-end validation and provider-based submission. | Replace its external-provider submission with the shared backend **without losing its interface**. |
| General contact form | `src/layouts/components/widgets/ContactForm.astro` is configurable and uses existing submission utilities. | Map its fields to the approved HVAC intake format and connect it to the same backend. |
| Shared form handling | `src/lib/utils/FormHandle.ts` includes browser-side validation, messages, and external-provider submission logic. | Reuse suitable UI helpers, remove only obsolete provider paths after the new flow passes tests. |
| Form provider | `src/config/config.toml` currently selects `formsubmit.co` with a template email destination. | Do not rely on this as a functioning custom lead storage system. |
| Contact form content | `src/content/sections/english/contact-section.md` contains IT-project fields such as budget, project type, and web/cloud service choices. | Review and replace inappropriate fields with approved HVAC request fields. |
| Shared contact section | `ContactSectionTwo.astro` reads contact form defaults from `contact-section.md`; both homepage and contact page reference it. | Change the shared content carefully and test every page that uses it. |
| Styling | `src/styles/theme.css` defines primary `#2B4DFF`, heat accent `#FF6A3D`, dark/surface values and breakpoints; `src/config/fonts.json` names Sora and Montserrat. | Inventory real rendered patterns before changing any theme value. |
| Content/SEO | Some default configuration still says Techlo, sample URLs or addresses; some service content references BlueFlame and Boston. | Separate the intended demo brand from unverified claims and remove outdated template copy before any real client launch. |
| Master trust banner | `src/content/sections/english/alternative-hero-section.md` includes exactly **“5.0 Rating”**, **“200+ Reviews”**, and **“Licensed & Insured”**. | **Keep all three in the master template.** For a real client deployment, use verified values or hide only in the client copy until valid; do not remove master placeholders. |
| Master testimonials | `src/layouts/components/sections/TestimonialQuoteSection.astro` renders testimonial content from `src/content/sections/english/testimonial.md`; homepage includes the section. Content currently includes generic sample IT-business quotes. | **Preserve the existing testimonial section, its content, and its appearance in the master.** For client-specific live websites, replace with authentic approved customer testimonials or hide just in the client copy if none are available. |
| Older deployment configs | Root contains `netlify.toml`, `vercel.json`, `wrangler.toml`. | Determine which are historical; don't delete them before checking their purpose. |
| Plan file | `IMPLEMENTATION_PLAN.md` was not found on the new working repository’s `main` during this revision. *(Historical: the plan was later added in commit `de67f59`.)* | Add this revised file to `astro-MASTER-flyio` only when explicitly requested. |
| New backend and hosting | The inspected tree did not show a custom SQLite lead backend, owner dashboard, planned Fly.io configuration, or Docker setup. | Treat these as unimplemented until inspected and tested. |

**Important distinction:** The project has user-facing form **markup and client-side handling**. This does **not** demonstrate that a request is saved to SQLite or that a live notification works. The previous file inspection found no evidence of those features. No application commands were executed for this assessment.

### 2.2 Existing project rules to retain

- Editable website copy and fields should live in `src/content/` where the current project pattern supports them.
- Section components generally live in `src/layouts/components/sections/`, and existing shared widgets in `src/layouts/components/widgets/`.
- `src/sections.schema.ts` defines accepted section content fields; update it when new editable fields are needed.
- Reuse `Button.astro`, `DynamicIcon.astro`, `Icons.astro`, and `OptimizedImage.astro` as applicable.
- Prefer mobile-first styling using tokens already in `src/styles/theme.css`; avoid unnecessary hardcoded styles or new UI frameworks.
- For code/schema changes, the repository requires `npm run astro-check`; for broad routing/content/build changes, it requires `npm run build`. These are **future verification steps**, not commands run during planning.
- Never commit generated `dist/`, private `.env` files, live databases, or customer records.

### 2.3 Important inspection limits

**Working-repository rule:** Any branch, worktree, local clone, pull request, or deployment made under this roadmap must trace back to `astro-MASTER-flyio`.

**Not verified as of 2026-10-13 (the local install/build, route URLs and basic rendered/mobile checks were verified on 2026-10-14; see Section 10.1):** a successful local install/build, all real route URLs, exact rendered appearance, mobile layout, production domain, whether any existing form endpoint currently receives leads, production performance, storage needs, private owner identity, authentication provider, or live integrations. Phase 0 resolves what can be checked safely before code changes.

---

## 3. Version 1 scope and proposed user experience

### Public website

- Existing homepage, service pages, navigation, contact page, blog, SEO structure, hero trust banner, and testimonial display remain. **Do not remove or redesign the trust banner or testimonials to satisfy generic “placeholder cleanup” tasks in the master.**
- Main hero form and other visible service request forms feed **one** server-side lead intake flow. **Owner decision (2026-10-14):** keep both homepage lead forms with their existing placements and designs (the short hero form for immediate capture; the longer form farther down the homepage, which is also the Contact Us form). Both will feed the same backend and SQLite database.
- After the database confirms the save, the form shows a success message. If the save fails, it shows a helpful error and does not falsely claim success.
- The same website should work on desktop, tablet and mobile.
- Visitors do **not** create accounts.

### Private owner area (approved target routes, 2026-10-14)

| URL | Purpose | Access |
|---|---|---|
| `/owner/login/` | One-owner sign-in | Public page; no lead data visible |
| `/owner/` | Dashboard overview: all-time, today and this-month lead counts plus recent inquiries | Signed-in owner only |
| `/owner/leads/` | Leads inbox: view and search inquiries | Signed-in owner only |
| `/owner/leads/[id]/` | Individual lead details (read-only) | Signed-in owner only |
| `/owner/settings/` | **Not in V1** (owner decision 2026-10-14) | n/a |

These four routes are **approved target routes (owner decision 2026-10-14), not existing files.** Their compatibility with the current `src/pages/[...lang]/` routes, trailing slash, sitemap, and static/on-demand rendering rules, and their actual functionality, must still be verified during implementation (the P1.1b test route is the first check; Section 10.3-B). Prefer a dedicated private layout rather than automatically displaying public website navigation and footer in the owner area. The exact logout implementation is decided in the authentication phase (P4.1).

**Owner decision (2026-10-14):** the approved flow is **Owner Login, Dashboard Overview, Leads Inbox, Individual Lead Details**. Overview: all-time, today and this-month lead counts plus recent inquiries. Leads Inbox: view and search inquiries. Lead Details: customer contact information, requested services, message (when provided) and submission date. Keep it simple and secure. Leads are **read-only in V1: no lead statuses and no editing; this is not a CRM.** The four URLs in the table above were **approved on 2026-10-14** as target routes (compatibility and functionality still to be verified during implementation). There is no settings page, no lead status and no lead source tracking in V1.

**Recommended first dashboard features:** total leads, leads received this month, leads received today, newest inquiries, name/phone/email/service/date, search, and a full detail page (basic date filtering is optional and not part of the approved flow; confirm later). **Lead status (New / Contacted / Closed): not in V1 (owner decision 2026-10-14); the dashboard is read-only lead viewing, not a CRM.** CSV export is optional after core features work. No advanced reports or charts.

### What happens when a customer submits

```text
Customer fills out an existing Astro form
                  |
                  v
Astro server checks the submitted information
                  |
                  v
SQLite saves the lead + records follow-up tasks together
                  |
                  +----> Customer receives a saved-success message
                  |
                  +----> Protected dashboard reads the saved lead
                  |
                  +----> Same application processes follow-up tasks:
                              |                 |
                              v                 v
                          Resend email     Google Sheets copy
```

**Key rule:** The database save is the decisive step. Temporary email or Google failures cannot undo an already-saved lead. Email/Sheets follow-up tasks must be durable enough to retry after application interruptions.

---

## 4. Proposed architecture and data design

### 4.1 Initial technical choices

| Need | Recommended starting choice | Reason / condition |
|---|---|---|
| Frontend + backend | Keep Astro; add a server runtime and on-demand routes only where required | Preserve the existing mostly-static public pages while allowing private pages and form handling. |
| Server hosting | Fly.io running one Dockerized Astro Node application | One application to learn, host and maintain. |
| Primary database | SQLite on a mounted persistent Fly.io volume | Small data workload; no separate database hosting account. |
| Owner login | One owner account, established password-hashing/session components, secure server-side checks | Do not invent homemade encryption/session logic; choose compatible, maintained tools after Phase 0. |
| Notifications | Resend | Email owner after saving a lead. |
| Sheets | Private per-client Google Sheet via supported Google Sheets API | Human-readable extra lead copy and emergency recovery source. |
| Retries | Small durable follow-up work list stored in SQLite; process in the same app | Avoid a second server or paid queue for Version 1. |
| Recovery | Fly snapshots + tested SQLite restore procedure + separate Sheet-to-SQLite lead importer | Different failure modes require different recovery paths. |

**Hosting tradeoff:** Fly.io explicitly warns that one Machine/volume can experience downtime and data loss if its host fails. A single-machine start is an intentional simplicity/cost tradeoff, **not** high availability. Get acceptance of this risk before taking real leads, verify the available snapshots, and add an independent copy of important lead data. If uninterrupted uptime becomes mandatory, revisit the architecture rather than claiming one machine is fault-tolerant.

### 4.2 Proposed SQLite records (approve exact structure in Phase 2)

No database schema has been created or approved yet. These are **conceptual tables**; their actual fields, types, constraints, and file locations are to be confirmed before implementation.

| Proposed table | What it contains | Essential for V1? | Notes |
|---|---|---|---|
| `leads` | One customer request per record. Stable ID, contact fields, requested services, message, timestamps. No lead status and no source tracking in V1 (owner decisions 2026-10-14). | **Yes** | Primary record; exact fields based on the approved forms. |
| `integration_jobs` | Tasks to email the owner or sync a lead; task type, related lead ID, state, attempts, next try time and error summary. | **Yes, if using the recommended retry design** | Avoids losing follow-up work on a crash. Could use a simpler equivalent if justified. |
| `owner_accounts` or approved login storage | Owner identity, password verification material if applicable, account metadata. | **Needed somewhere**, not necessarily as a custom table | Depends on approved authentication implementation. Never store plaintext passwords. |
| `sessions` or approved session storage | Tracks authorized logins if the selected login approach needs database-backed sessions. | **Conditional** | Do not create a redundant table when the chosen mechanism handles this safely. |
| `schema_migrations` or equivalent | Which database structure changes have already been applied. | **Yes, in the selected migration approach** | Lets a clean database be recreated from code; no hand-editing in production. |

**Recommended lead record rules:**

- Assign a **stable, unique, nonreused lead ID** at creation. Recommendation: a generated string ID (for example, a UUID), which is easier to preserve during imports than relying on a newly generated row number. *(Decided in P2.1: lowercase UUID v4; all record rules are in `src/lib/leads/LEAD_CONTRACT.md`.)*
- Save server-generated `created_at` and `updated_at` timestamps in an agreed UTC-based format; display local time in the dashboard. Do not accept the browser's claimed submit time as authoritative.
- *(Removed from V1, owner decision 2026-10-14: no lead source tracking, so no source, page or referral value is stored, validated or shown.)*
- Store service selection consistently (including multiple services if the hero form keeps multi-select). Choose one documented format, not an ad hoc mix of strings.
- Define what “not provided” versus a deliberately blank value means for each optional field; preserve that distinction through exports.
- Limit request field length and data collected to what is necessary. Decide retention and deletion policy before launch.
- *(Deferred, not V1: lead status was removed from V1 on 2026-10-14; this rule applies only if statuses are added later.)* If a lead status exists, default it sensibly, track the current value, and keep edits synchronized to Sheets; do not let imports reset it to “new.”
- Keep notification state and Google synchronization state **outside the recoverable customer lead fields** unless the approved design explicitly requires otherwise. Recovery from Sheets will restore leads, not necessarily integration task history.

### 4.3 Suggested form-field decisions (not yet final)

| Field | Suggested V1 treatment | Reason |
|---|---|---|
| Full name | Required | Know who is requesting service. |
| Phone | Required | Easy call-back for HVAC jobs. |
| Email | **Required on both approved forms** (owner decision 2026-10-14) | Needed for follow-up; validate the format. |
| Requested service(s) | Required | Distinguish repair, installation, emergency, etc. |
| Service address or city/ZIP | Consider optional at intake; decide before release | Helps qualify service area without creating unnecessary friction. |
| Problem description | Optional, with length limit | Gives context for the owner. |
| Preferred contact time | Optional | Helpful but not essential. |
| Consent/permission notice | Match real data-use requirements and approved copy | Avoid false privacy/security promises. |
| Source page | **Not collected in V1** (owner decision 2026-10-14: no lead source tracking) | Keeps the forms and the lead record simple. |
| Received timestamp + lead ID | Set on server | Reliable records and recovery. |

**Important existing-form difference:** The hero currently asks for name/phone/email/multiple services. The general form has a different IT-focused field set. Phase 3 must decide whether both forms show the same inputs or map two supported layouts into one consistent lead record. Do not silently discard information that users provided.

**Owner decisions, 2026-10-14 (approved requirements for future implementation; no form has been changed yet):**

- **Both homepage forms stay**, with their existing placements and visual designs: the short hero form for immediate lead capture, and the longer form farther down the homepage (also used on the Contact Us page) as a second chance to capture leads. Both will connect to the same backend and SQLite database even though they collect different amounts of information.
- **Hero form (decided 2026-10-14):** preserve its existing fields and multi-select design. **Full Name, Phone, Email and HVAC Services remain required.** Add a hidden honeypot when the form backend is implemented; the honeypot is validated on the server and must not interfere with legitimate submissions (and, as for the longer form, is not the only spam defense).
- **Navigation (decided 2026-10-14):** homepage HVAC service cards and buttons link to their respective existing service pages, not `/#contact` (verified: the six cards already do; Section 10.3-A). Request/Schedule buttons **inside** the individual HVAC service pages link to `/contact-us/` instead of `/#contact`. The Contact Us page uses the approved longer form, and both homepage forms stay. **Lead source tracking is not part of V1** (see the next bullet).
- **Lead source tracking: REJECTED for V1 (owner decision 2026-10-14).** No `?source=` parameters on service-page links, no hidden tracking identifiers, no referral or source attribution logic, and no source column or dashboard feature. Every approved form still saves its lead to the same SQLite database; routing and form functionality are otherwise unchanged. The only hidden form field is the honeypot.
- **Longer form: approved fields** (to be built in P3.3). (1) **Full Name**, required, one field (not separate first/last). (2) **Phone Number**, required. (3) **Email Address**, required on this longer form (the hero form's email is also required). (4) **HVAC Services**, required, using the same six service options and the same multi-select behaviour as the hero form; at least one service must be selected. (5) **Message**, optional text box for describing the HVAC issue or asking a question. (6) **Honeypot**, a hidden anti-spam field that must not interfere with legitimate customers (hidden from sight and assistive technology, no autofill triggers) and must be verified on the server when implemented; it must not be the only spam defense (server validation and rate limiting in P3.1 also apply).
- The outdated IT questions on the longer form (budget, start date, project type, preferred contact, IT service list) will be replaced in P3.3. Do not change either form before then.
- **Decided in P2.1 (2026-10-16):** the exact stored lead record is frozen in `src/lib/leads/LEAD_CONTRACT.md` (Message NULL when not provided, including every hero-form lead; services as a JSON list). The other `/#contact` buttons on the site (footer, banners and similar) **stay unchanged for now** (owner decision 2026-10-14).

### 4.4 Recovery contract: SQLite ↔ Google Sheets

The Google Sheet is **not** a complete database backup. For lead recovery, however, it must accurately preserve **all fields needed to recreate every synchronized lead**. The approved database structure becomes the source of truth for the sheet mapping.

The mapping must explicitly cover:

- Every recoverable `leads` field, including original ID, timestamps, customer details, service(s), request text (no status and no source field in V1).
- Exactly how empty text, missing values, and database `NULL` values round-trip without becoming indistinguishable.
- UTC and dashboard timezone conversion without rewriting the stored original time.
- Leading zeros in phone numbers and identifiers; strings that look like dates/numbers; long messages and characters Sheets may interpret specially.
- A versioned column mapping so a future schema change does not silently corrupt recovered data.
- Updates to existing leads, not just initial rows. If deletions are allowed, define a recoverable deletion marker or soft-delete rule; no deletion feature is required initially.
- Duplicate-safe syncing keyed to **lead ID**, not row position alone; a retry after a timeout must first check whether the row already exists.
- A reconciliation check for missing rows, duplicate IDs, incomplete fields and out-of-date copies.

**Recommended starting approach:** Store a fixed, clearly documented set of text-safe columns for the full approved lead record and write string values using Google Sheets `RAW` input to avoid automatic conversion. Where a typed value or `NULL` needs a special representation, define and test a reversible encoding first. Use the ID to locate/update the existing row rather than repeatedly appending. A Google write timeout can happen after a successful write, so “try again” must not automatically create a second row.

**Recovery behavior:** A deliberately run, **separate importer** recreates a clean SQLite structure from version-controlled schema/migrations, validates Sheet data before altering records, preserves original values/IDs, and imports without firing “new lead” notifications or triggering Sheets synchronization. Compare source and restored data field by field. It must be safe to rerun or clearly stop when records conflict. After import, the dashboard shows old leads with their original dates and the system can accept new leads without ID collisions.

**Recovery limit:** If a lead or later edit never reached Sheets, Sheets alone cannot recover it. Owner credentials, sessions, migration history, and internal task history also need a separate regeneration or restore method.

---

## 5. Development phases and task checklists

**Status rule:** Major tasks include an objective, prerequisites, likely affected files, ordered steps, and test/completion conditions. Existing paths below were observed in GitHub; any path labeled **proposed** does not exist yet and must be confirmed before creation.

### Phase 0. Repository inspection and baseline (current)

**Repository guardrail:** All hands-on work uses `jonexe2/astro-MASTER-flyio`.

**Why first:** Avoid designing around assumptions and establish the real site's starting condition before changing it.  
**Depends on:** GitHub access, local development environment for runtime testing.  
**Milestone:** Known baseline, agreed limits, and a safe starting checkpoint.

#### P0.1 Confirm current repository and instructions
**Objective:** Understand the source we are extending.  
**Files:** `CLAUDE.md`, `AGENTS.md`, `SKILLS.md`, `package.json`, `astro.config.mjs`, `.gitignore`.

- [x] Confirm the **new working repository** `jonexe2/astro-MASTER-flyio`, its `main` branch and source tree through GitHub.
- [x] Read the existing project instructions and identify styling, component and verification rules.
- [x] Inspect package dependencies, scripts, configuration and existing asset/content conventions.
- [x] Check whether a root `IMPLEMENTATION_PLAN.md` already exists on the inspected branch; none was found.
- [x] Before implementation, confirm there have been no relevant later commits **in `astro-MASTER-flyio`** and review changes since tree `3dac95ba0467d6e2339b98d5c7c71460e948c022`. *(Verified 2026-10-14: `git fetch` run; local `main` and `origin/main` both at `3cc073c`. Commits after `3dac95b` are only `de67f59` "Added implementation_plan.md" and `3cc073c` "Update CLAUDE.md to Connect Claude instructions to implementation plan". Both changed documentation only, so nothing relevant to the source assessment needed reconciling.)*

**Verify/done when:** The current code and instructions are known; changes since this assessment have been reconciled. **Status: complete (2026-10-14).**

#### P0.2 Map existing pages, forms and branding
**Objective:** Know what to preserve and exactly where requests originate.  
**Files:** `src/pages/[...lang]/index.astro`, `src/pages/[...lang]/contact-us.astro`, `src/pages/[...lang]/services/[single].astro`, `AlternativeHeroForm.astro`, `ContactForm.astro`, `FormHandle.ts`, `src/content/sections/english/alternative-hero-section.md`, `src/content/sections/english/contact-section.md`, `src/content/sections/english/contact-section-two.md`, `src/styles/theme.css`, `src/config/fonts.json`.

- [x] Identify the two current form widgets and external provider settings in source.
- [x] Identify the shared contact content and existing design tokens in source.
- [x] Locate and confirm the master hero trust banner, testimonial content file, testimonial component and homepage usage in the working repository.
- [x] Build a page/form inventory showing every place a form appears and which form widget it uses. *(2026-10-14: 17 URLs checked in page HTML; two lead forms on `/` (hero + contact), one on `/contact-us/`, none elsewhere; blog "form" is the search box. Section 10.2-A.)*
- [x] Record each current field name, required rule, service options and submit/success/error behavior, including multi-select serialization. *(2026-10-14: fields, required rules, options and hero multi-select serialization (comma+space text) verified in the browser; validation messages verified with network blocked; **success/error submit behaviour is from code reading only, because no valid submission was made by design.** Section 10.2-B and C.)*
- [x] Review images, fonts, spacing, buttons, layouts and color use **in a running browser** on desktop/mobile. *(2026-10-14: homepage sections viewed at 1440 px and 375 px, hero/testimonial at 768 px, contact form at about 1024 px; fonts, colours, buttons measured in the browser. Other pages were not each reviewed visually. Section 10.2-E.)*
- [x] Inventory demo business names, contact details, SEO defaults and trust/testimonial content; clearly distinguish **master demo elements to preserve** from any values needing verification or replacement in a **real client deployment**. *(2026-10-14: config, content search and rendered metadata inventoried; Section 10.2-G. A line-by-line read of all copy is not included and belongs to P9.4.)*

**Verify/done when:** A short evidence-based form/page map exists; no assumptions about live functionality or visual quality are presented as tests. **Status: complete (2026-10-14).** The inventory is recorded in Section 10.2. The post-change regression check that was listed here was moved to P9.4 by owner decision (2026-10-14); it still applies after any change affecting pages, forms, styling or components.

#### P0.3 Run the untouched site locally and save a baseline
**Objective:** Find existing errors before adding backend code.  
**Prerequisites:** P0.1; correct local access.  
**Files:** `package-lock.json`, `package.json`, project scripts and existing page files.

- [x] Open a local clone of **`jonexe2/astro-MASTER-flyio`** at a known commit/branch; verify the Git remote points to that repository. *(`origin` = `https://github.com/jonexe2/astro-MASTER-flyio.git`; branch `main`; commit `3cc073c`; working tree clean.)*
- [x] Install dependencies using the project's lockfile and the supported Node version; record any install failures. *(`npm ci` succeeded: 505 packages in ~1 min, exit 0; Node v24.17.0, npm 11.13.0; project requires Node `>=22.12.0`. No install failures. `npm ci` reported 19 vulnerabilities; see Section 10.1.)*
- [x] Start the existing development site and visit homepage, contact page, six service pages, blog, and a nonexisting route. *(Dev server at `http://localhost:4321`. 16 real routes returned HTTP 200: `/`, `/contact-us/`, `/about-us/`, `/services/`, `/services/alternative-services/`, `/services/hero-alternatives/`, `/services/service-02/` to `service-06/`, `/services/service-custom-slug/` (the six HVAC service pages are `service-02`, `-03`, `-04`, `-05`, `-06` and `-custom-slug`), `/blog/`, `/blog/post-1/`, `/privacy-policy/`, `/terms-conditions/`. `/does-not-exist/` returned a real HTTP 404 with the custom "Page Not Found" page.)*
- [x] Check forms visually and safely inspect their current configured submission destination; do **not** submit real customer data to the template address. *(No form was submitted or interacted with. Hero form seen rendered on desktop, tablet and mobile widths. Contact form on `/contact-us/` viewed in the dev browser on 2026-10-14 (about 1024 px wide pane) after a restart of the dev server: heading "Fill The Contact Form"; fields Your name\*, Email address\*, Estimated budget, a date field (mm/dd/yyyy), a required service dropdown ("Select a service \*"), "New project"/"Improve existing system" radios, Email/Phone checkboxes, Write your message\*, consent checkbox, "Send Message" button; all rendered without visible layout problems. Observation, not investigated: the service dropdown label displayed in red before any interaction. The dropdown options and labels are IT-themed (see Section 10.1). Both forms POST JSON via `formSubmit` in `src/lib/utils/FormHandle.ts` to `https://formsubmit.co/ajax/temp.gats@gmail.com`, from `contactFormAction`/`contactFormProvider` in `src/config/config.toml`.)*
- [x] Run existing `npm run astro-check` and `npm run build` without unrelated edits; record actual results and pre-existing errors. *(`astro-check`: 144 files, 0 errors, 0 warnings, 0 hints. `build`: exit 0, 32 pages built in ~25 s, sitemap created, no warnings or errors in output. `git status` stayed clean afterward.)*
- [x] Review desktop, tablet and mobile presentation; record screenshots or notes for regression comparisons. *(Notes recorded in Section 10.1; no screenshot files were saved. Horizontal-overflow check at 375, 768 and 1280 px on 12 real pages plus the 404 page (13 URLs, 39 checks): 0 overflows. Visually reviewed by screenshot: homepage at 375, 768 and about 1024 and 1440 px; testimonial section on the homepage at 768 px; contact form at about 1024 px. Other pages and widths were checked by the overflow measurement and content checks only, not visually.)*
- [x] Check local console/server errors and confirm whether existing routes are static or on-demand in the current build. *(All routes are static: `astro.config.mjs` has no adapter or server output, and the build emitted 32 static pages. Console findings are in Section 10.1: 404s are the intentional nonexistent-URL test; 504 "Outdated Optimize Dep" errors seen once in dev only on the dev toolbar file and not reproduced after restart.)*

**Verify/done when:** Baseline build/runtime results and known pre-existing defects are recorded. Do not mark complete if any required checks were skipped. **Status: complete (2026-10-14).** Known defects and open flags are in Section 10.1.

#### P0.4 Agree the first implementation decisions
**Objective:** Unblock implementation without endless planning.  
**Prerequisites:** P0.2–P0.3.  
**Files:** This plan only during the decision step.

- [x] Confirm the master template retains **`5.0 Rating`, `200+ Reviews`, `Licensed & Insured` and all existing testimonials** as editable demo content.
- [x] Approve the intended master demo brand and which additional template details need cleanup **without removing preserved trust/testimonial elements**. Decide real-client brand facts separately when a client is onboarded. *(Decided 2026-10-14: **"BlueFlame Heating & Air" is the approved placeholder HVAC business name for the reusable master**; keep the existing BlueFlame content and do not rename, remove or rewrite it. **Template cleanup approved for later implementation (nothing was changed now):** replace unrelated Techlo/IT wording, inappropriate demo contact details, metadata and other leftover IT-template content with suitable HVAC demo content, while preserving "BlueFlame Heating & Air", the master trust indicators and all existing testimonial content and design. The inventory is in Section 10.2-G; the work is tracked in P3.3 (form copy), P9.4 and P10.1 and is not yet scheduled.)*
- [x] Approve proposed core lead fields and whether “New / Contacted / Closed” belongs in V1. *(Decided 2026-10-14: both forms' fields are approved, Section 4.3: hero = Full Name, Phone, Email, HVAC Services all required plus a hidden honeypot added with the backend; longer form = Full Name, Phone, Email, HVAC Services required, optional Message, hidden honeypot. **New / Contacted / Closed statuses are NOT in V1** (read-only lead viewing, not a CRM). The exact stored lead record, ID and timestamps are still frozen in P2.1.)*
- [x] Agree the planned private `/owner/` route family after checking existing routing. *(Approved 2026-10-14: `/owner/login/`, `/owner/`, `/owner/leads/`, `/owner/leads/[id]/`; read-only V1 with no settings page, lead statuses or source tracking. Existing routing was inspected (Section 10.3-B): nothing collides today. Actual compatibility and functionality must still be verified during implementation (first in P1.1b). Logout is decided in P4.1.)*
- [x] Review local-development permissions, GitHub branch workflow, and safe rollback checkpoint. *(Reviewed and approved 2026-10-14: workflow and rollback in Section 9; local permissions reviewed read-only (git-ignored `.claude/settings.local.json`, with a recommendation to remove the standing push and `gh api` approvals, not applied). No branch, worktree, tag or GitHub setting has been created or changed. GitHub-side checks remain optional owner follow-ups listed under Blockers.)*
- [x] Choose the first coding task from Phase 1 and document any remaining blockers. *(Chosen 2026-10-14: P1.1a, dependency security upgrades only, on a dedicated branch (Section 10.3-D). Remaining gate: the exact package/version changes and test plan need owner approval before any dependency is changed.)*

**Verify/done when:** Necessary Phase 1 choices are explicit, not left for a coding agent to invent, and protected master trust/testimonial content is documented. **Status: complete (2026-10-14).** Every item is checked with a recorded owner decision. Follow-up gates that are not P0.4 blockers: owner approval of the exact P1.1a package changes, and the optional GitHub-side checks.

---

### Phase 1. Prepare Astro for a small backend

**Why now:** Server-side form handling, login and dashboards need a functioning server runtime. Verify this while the public site still behaves as before.  
**Depends on:** Phase 0 baseline.  
**Milestone:** Astro can run a small private/server route while existing public routes and styling still work.

#### P1.1 Choose and verify Astro server setup
**Objective:** Add only the runtime necessary for server functions.  
**Files:** `astro.config.mjs`, `package.json`, `package-lock.json`; **proposed** small test endpoint under `src/pages/api/`.

- [x] **Security gate (from P0.3 baseline, see Section 10.1):** **Before** adding an adapter, API route, form endpoint, login or dashboard: review the Astro and `sharp` advisories reported by `npm audit` against installed `astro@7.0.3` and `sharp@0.34.5`; get approval for a specific dependency upgrade path (the P0.3 audit showed `astro` needs 7.2.8 or later for the AVIF fix); apply it on a branch; then re-run `astro-check`, `build`, the P0.3 baseline checks (routes, 404, overflow, trust banner and testimonials intact) and `npm audit`. A plain `npm audit fix` was dry-run in P0.3 and failed on a peer-dependency conflict; do not use `--force`. Record the chosen versions and any remaining findings with a reason for accepting each. *(P1.1a, 2026-10-15: done and **merged into `main` through GitHub PR #1, merge commit `a4bf69f`** (branch `phase-1/astro-security-upgrade`, commits `ddf8f92` and `c102852`); installed `astro` 7.3.8, `@astrojs/markdown-remark` 7.3.2, `@astrojs/mdx` 7.0.8, `sharp` 0.35.5; `astro-check`, `build` and the baseline checks passed; `npm audit` went from 19 flagged packages to 12 (no critical, 8 high, 4 moderate) and `--omit=dev` reports 0. The remaining findings and their classification are in Section 10.4. **The upgrade is merged (PR #1). The follow-up audit cleanup was also merged into `main` through PR #2 (merge commit `86217155e79b0bfe95fd5335d84e8a2067476f2f`) and reduced the findings further to 8 (Section 10.5). The gate is satisfied only once the owner explicitly accepts the remaining 8 findings (Sections 10.5 and 10.6); the owner gave that acceptance on 2026-10-15 "for now", conditional on re-running the audit at each phase start and before deployment.**)*
- [x] Review current Astro and Node adapter documentation matching the installed versions. *(2026-10-15: official `@astrojs/node` and on-demand rendering docs read; `@astrojs/node` 11.1.7 declares peer `astro ^7.2.1`, installed Astro is 7.3.8. Section 10.6.)*
- [x] Recommend the official Node adapter for the planned Node/Docker runtime unless inspection shows a better fit. *(Used `@astrojs/node` 11.1.7 in `standalone` mode, exactly pinned; Section 10.6.)*
- [x] Compare keeping existing pages pre-rendered with making only private/API pages run on demand; prefer selective on-demand routes if practical. *(Chosen: `output` stays `static`; only routes that export `prerender = false` run on the server. Built public output is byte-identical to the pre-adapter build; Section 10.6.)*
- [x] Implement the approved adapter change in a focused branch; avoid unrelated frontend changes. *(Implemented on local branch `phase-1/p1-1b-node-server-foundation`, committed locally as `b7ec83a`, not pushed; no frontend, content or style file changed. Approved split (owner decision 2026-10-14; Section 10.3-D): first P1.1a, the dependency security upgrade alone; then P1.1b, the adapter. With `@astrojs/node` the static files move to `dist/client`; `scripts/remove-draft-from-sitemap.mjs` was updated accordingly (Section 10.6). The old Netlify/Vercel/Cloudflare configs would no longer match the new output and were **left unchanged**; their fate is a P8 decision.)*
- [x] Add a tiny harmless server response for testing (no private data), then call it locally. *(`GET /api/health/` returns `{"status":"ok","serverTime":...}` with `Cache-Control: no-store`; called against the real production server and the dev server; Section 10.6.)*
- [x] Re-run the public-page build and confirm homepage, service routes, i18n rules and sitemap remain correct. *(Done; the shipped static files are byte-identical to the pre-adapter build, 16 routes + 404 verified on the production Node server; Section 10.6.)*

**Verify/done when:** A server-only route responds locally and the original public site still renders. Record the adapter/version and observed tests. **Status: complete; merged into `main` through PR #3 (merge commit `5dc4d80`); evidence in Section 10.6.**

#### P1.2 Establish simple backend organization
**Objective:** Give future database, form and login code predictable homes.  
**Files:** `src/lib/leads/`, `src/lib/server/`, `src/pages/api/health.ts`, `AGENTS.md`.

- [x] Decide how server-only modules will be kept away from browser code. *(Server-only code lives in `src/lib/server/`; every module imports the guard `server-only.ts` using its path relative to the module, which throws if a browser global exists. The guard is only a backstop: it does not keep code or secrets out of downloaded JavaScript. What does is the import rule (only `src/pages/` and `src/lib/server/` may import server code, enforced by `src/lib/server/boundaries.test.ts` including `<script>` blocks in `.astro` files), the build-output scan in the same file, and never putting secrets in browser-loadable code. Rule in `AGENTS.md`.)*
- [x] Define one shared lead submission contract and one backend handler; do not create separate storage logic per form. *(Contract: `src/lib/leads/contract.ts`, browser-safe: `LeadSubmission` (fullName, phone, email, services, optional message; no status or source), `LeadSubmissionResult`, the `LeadSubmissionHandler` type and the six `HVAC_SERVICES`, checked against the hero form content by `contract.test.ts`. The one handler is planned at `src/lib/server/leads/handler.ts` (P3.1); it is intentionally not created yet, so nothing can report a false success. The database schema is not defined; that is P2.1.)*
- [x] Decide where input validation, database access and integration actions belong; keep modules small. *(Module map below.)*
- [x] Identify where test files and versioned database migrations will live (paths proposed, not assumed). *(Tests sit next to the code as `*.test.ts` and run with `npm test`, using Node's built-in runner. Migrations: proposed repo-root `migrations/`, outside `src/` so they are not bundled; final decision in P2.2.)*
- [x] Confirm no private backend module or secret value is accidentally bundled for the browser. *(The built `dist/client` was scanned and contains none of the server-only code; the same check is a test that runs after a build. No secrets exist yet.)*
- [x] Run project checks and record a reversible Git checkpoint. *(`astro-check`, `build` and `npm test` pass; the checkpoint is the commit on branch `phase-1/p1-2-backend-organization`.)*

**Module map (chosen in P1.2; only the modules marked "exists" were created):**
- `src/lib/leads/contract.ts`: shared lead contract (exists).
- `src/lib/server/server-only.ts`: runtime guard; `src/lib/server/health.ts`: payload for `/api/health/` (exist).
- `src/lib/server/leads/validate.ts`: input validation and normalization (P3.1). `src/lib/server/leads/handler.ts`: the single handler; `src/pages/api/leads.ts` stays a thin endpoint that calls it (P3.1).
- `src/lib/server/db/`: SQLite connection and lead queries (P2.2, P2.3).
- `src/lib/server/integrations/resend.ts` and `sheets.ts`: email and Sheets sync (P6, P7).
- `src/lib/server/auth/`: owner authentication (P4).

**Verify/done when:** One small server route and clear, agreed module boundaries exist without altering public design. **Status: complete; merged into `main` through PR #5 (merge commit `bef88d5`).**

#### P1.3 Development-only settings and errors
**Objective:** Make local work safe and failures understandable.  
**Files:** `.gitignore`, `.env.example`, `src/lib/server/settings.ts`, `src/lib/server/errors.ts` and their tests.

- [x] List necessary settings by purpose (database file location, future email sender/recipient, Sheet identifier, credentials, session secret). *(Listed in `.env.example`: `APP_ENV`, `DATABASE_PATH` (used now); `SESSION_SECRET` (P4); `RESEND_API_KEY`, `EMAIL_FROM`, `LEAD_NOTIFY_TO` (P6); `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON` (P7). Only the first two are read by code; the rest are reserved names.)*
- [x] Check which settings belong in harmless public content/config versus protected server environment variables. *(Public business content stays in `src/config/config.toml` and `src/content/`. Everything above is private: server environment variables only, never in `config.toml` and never `PUBLIC_`-prefixed (Astro sends only `PUBLIC_` variables to the browser). Astro's type-safe `astro:env` was not used: it works only inside Astro's build context, so it cannot be unit-tested in plain Node; settings are read from `process.env` by a small tested function. Revisit if a secret is first needed in an Astro page.)*
- [x] Document example setting names without real credentials and verify `.gitignore` protects their local secrets. *(`.env.example` (placeholders only) is committed. `.gitignore` now ignores `.env`, every `.env.*` except `.env.example`, `.data/`, `*.sqlite` and `*.sqlite-*`. Verified with `git check-ignore` and a test.)*
- [x] Make local errors actionable without printing full private submissions or credentials into logs. *(`src/lib/server/errors.ts`: `ServerError` carries a constant code and a predefined message (what is wrong, how to fix; never built from values). Unexpected errors log only `[scope] UNEXPECTED: details hidden`: no message, error name, stack, `cause`, request body or env value, even in development, because libraries put emails and credentials in messages. Scope and code must be simple labels or they are not printed. To diagnose one, reproduce locally with a debugger or catch it at the call site and throw a `ServerError` with a predefined message. Tested with synthetic emails and dummy secrets. Not wired into any route yet.)*
- [x] Confirm local database paths cannot silently point to a live production database. *(Partly. `resolveDatabasePath` in `settings.ts` requires `APP_ENV`. Development refuses any path inside `/data/` (checked after normalization, including `..` and Windows spellings). Production requires an absolute POSIX `.sqlite` path that is still inside `/data/` after normalization; `..` escapes (for example `/data/../tmp/x.sqlite`), backslashes, drive letters and NUL are rejected, and there is no default. Error messages never contain the submitted path. Tested. **Limits:** the check is lexical, so a symbolic link inside `/data` pointing elsewhere is not detected (the volume contents are controlled by the deployment, P8); no database code exists yet, so nothing calls the function and P2.2 must get the path only through it; `/data` is the planned Fly volume mount, confirmed in P8; a production secret copied into a developer's `.env` cannot be detected.)*

**Verify/done when:** Developers know where settings go, no secrets are committed, and local errors can be diagnosed. **Status: complete; merged into `main` through PR #6 (merge commit `f1a48d8`).**

---

### Phase 2. Design and test SQLite lead storage

**Why now:** Forms, dashboards, email tasks and Sheet recovery all depend on one agreed record structure.  
**Depends on:** Phase 1 backend.  
**Milestone:** New and existing sample lead records can be safely saved, found and recreated in a clean test database.

#### P2.1 Freeze the V1 lead contract
**Objective:** Define exactly what one lead means.  
**Files:** Source form content/config files listed in P0.2; **proposed** schema/mapping documentation near backend code.

- [x] Compare all live form fields and approve required/optional V1 lead fields. *(Owner approval 2026-10-16. Both forms map to one record; the longer form's old IT fields and Consent checkbox are not stored; P3.3 decides whether Consent stays as an unstored checkbox.)*
- [x] Approve canonical field names, data types, limits, how multi-select services are stored, and sensible default/empty values. *(TS camelCase / DB snake_case; name 100, phone 30 with at least 7 digits, email 254, message 2,000; over-limit rejected, never shortened; services as a JSON list in `HVAC_SERVICES` order, strict on intake, format-only for stored/restored leads; blank message = NULL, never "".)*
- [x] Choose a stable lead ID format and store the generated ID without changing it later. *(Lowercase UUID v4 from `crypto.randomUUID()`; primary key; insert-only, never "insert or replace"; a collision is a normal failed save.)*
- [x] Define timestamps (server-created UTC, original value maintained; optional last-modified time); no lead status and no source tracking in V1. *(`created_at` and `updated_at`, UTC `YYYY-MM-DDTHH:mm:ss.sssZ`; `updated_at` equals `created_at` in V1; restores copy both exactly.)*
- [x] Define how two rapid clicks, network retries and resubmission of the same request will be treated. Do not treat two genuinely separate inquiries as duplicates automatically. *(Submission key from the form script, sent as a header, unique when present; same key + identical data returns the original success; same key + different data saves nothing; missing key still saves; no merging by phone or email.)*
- [x] Specify the Sheet column mapping and null/empty encoding **from the approved schema**, even before the Sheets API is connected. *(Format `lead.v1`, 10 text columns written with `RAW`, including `updated_at_utc` and `submission_key`; empty cell = NULL only for `message` and `submission_key`.)*

**Verify/done when:** Frontend, backend, dashboard and future importer have a single documented field contract. **Status: implemented and tested on branch `phase-2/p2-1-lead-contract`, awaiting PR review.** Contract: `src/lib/leads/LEAD_CONTRACT.md`; types and constants (`LeadRecord`, `LEAD_LIMITS`, `LEAD_SHEET_V1_COLUMNS`) in `src/lib/leads/contract.ts`, checked by `contract.test.ts`.

#### P2.2 Create SQLite schema and migration process
**Objective:** Make database structure repeatable instead of hand-crafted.  
**Prerequisites:** P2.1.  
**Files:** **proposed** backend database module and versioned migration files; do not assume paths exist.

- [x] Evaluate a small maintained SQLite driver and migration approach compatible with Node/Astro and Fly.io; avoid adding a large framework without need. *(Owner approval 2026-10-16: built-in `node:sqlite` (release candidate since Node 24.15; no dependency, no native build), `engines.node` raised to `>=24.15.0`; small hand-written runner. Bundling verified: a throwaway on-demand route using it built and answered on the production Node server, then was deleted.)*
- [x] Define `leads` with unique ID, approved fields, required constraints, and sensible search/date indexes only where useful. *(STRICT table per `LEAD_CONTRACT.md`: UUID/UTC GLOB checks, length limits, JSON list check, `message` NULL or 1–2000, `submission_key` UNIQUE when present; one index `leads(created_at)`.)*
- [x] Define the minimal integration task/state storage needed for follow-up notifications and Sheet sync; choose whether a separate jobs table is appropriate. *(Separate `integration_jobs` table, one row per lead and kind (`email_new_lead`, `sheet_sync`), status `pending`/`running`/`done`/`failed`; retry rules are P6/P7.)*
- [x] Create owner/login-related tables **only** after the authentication approach is selected. *(None created; Phase 4.)*
- [x] Design safe database creation/update steps that can also create the same schema in a fresh replacement database. *(One `BEGIN IMMEDIATE` transaction per run covers validation, all pending migrations, their `schema_migrations` records (SHA-256 checksums) and `PRAGMA foreign_key_check`; any failure rolls back everything. Edited migrations or a database newer than the code are refused. Production never creates a missing data folder.)*
- [x] Keep the development database outside source control and document its configurable location. *(`.data/dev.sqlite` via `resolveDatabasePath`, git-ignored with WAL files; `npm run db:migrate` creates it; rules in `AGENTS.md`.)*
- [x] Test first creation, second run with no accidental duplication, and upgrades using synthetic records. *(`src/lib/server/db/migrate.test.ts` and `schema.test.ts`, temporary databases only.)*

**Verify/done when:** A clean database can be created from version-controlled files and migration repeat runs do not destroy sample records. **Status: complete; merged into `main` through PR #8 (merge commit `9d96662`).** Code: `src/lib/server/db/` (`connection.ts`, `migrate.ts`, `migrations/`, `migrate-cli.ts`).

#### P2.3 Implement reliable lead write/read functions
**Objective:** Make the database work before any public form depends on it.  
**Prerequisites:** P2.2.  
**Files:** **proposed** server-only lead database functions and tests.

- [x] Implement one operation to validate/normalize and save a new lead, returning its stable ID only after successful database storage. *(`saveLead()` in `src/lib/server/db/leads.ts`, using `validateLeadSubmission()`/`parseSubmissionKey()` in `src/lib/server/leads/validate.ts`; success only after `COMMIT`. Submission-key rules per `LEAD_CONTRACT.md` section 5: same key + same data returns the original ID, different data `conflict`, absent key saves without protection, present but empty/malformed key `bad_request`.)*
- [x] Ensure creating a lead and recording required follow-up tasks is **one reliable database operation**; no “saved lead but permanently missing tasks” gap. *(Lead plus `email_new_lead` and `sheet_sync` jobs (pending) in one `BEGIN IMMEDIATE` transaction; a failing job insert leaves no lead.)*
- [x] Implement safe lookup by ID, newest-first list, total/today/this-month counts, simple search and date filtering. *(`getLeadById`, `listLeads` (25 per page, max 100; search in name, email, phone without punctuation, message, services; inclusive local-date range), `countLeads`. "Today"/"this month" use a business time zone passed in (`src/lib/server/leads/local-time.ts`, built-in `Intl`); where the zone is configured is decided in P5.2.)*
- [x] Use parameterized queries or supported safe query methods; never build queries by joining raw form text. *(Every value is a `?` parameter; only constant SQL fragments are joined; search uses `instr`, so `%` and `_` are plain text.)*
- [x] Make any allowed edits update `updated_at` while retaining original creation time; define when to queue Sheets updates. *(Not applicable to V1: leads are read-only, nothing edits them. Sheets jobs are queued once, when a lead is saved.)*
- [x] Verify a failed write does not return success and a valid read returns the exact saved fields.
- [x] Test duplicate IDs and simulated database errors without touching a live database. *(Temporary databases with synthetic records only.)*

**Verify/done when:** Automated or repeatable tests prove saved data matches input, duplicate IDs are rejected safely, and errors are reported accurately. **Status: complete; merged into `main` through PR #9 (merge commit `ba730a9`).**

#### P2.4 Define permanent storage and database recovery boundaries
**Objective:** Avoid code that only works on disposable local storage.  
**Prerequisites:** P2.2.  
**Files:** **proposed** server database setup/config; Fly.io mounting comes in Phase 8.

- [x] Make the database location configurable, with a clearly separate local-test path and planned Fly volume mount path. *(Already done in P1.3/P2.2: `resolveDatabasePath()`; development `.data/dev.sqlite`, tests use temporary folders via `openDatabase()`, production an absolute path inside `/data/` with no default.)*
- [x] Verify no database is silently created in a public asset directory or replaceable deployment folder. *(Production: only `/data/`, missing folder refused (P2.2). New in P2.4: in development a path inside the project must be under `.data/`, so `public/`, `dist/`, `src/` and the project root are refused (case-insensitive on Windows). Not detected by code: `/data` existing without a mounted volume; verified in P8.)*
- [x] Decide how the database handles multiple connections/writes appropriate to one Machine; test expected small concurrent traffic. *(Kept as is: WAL, `synchronous = FULL`, 5 s busy timeout, `BEGIN IMMEDIATE` writes, one shared synchronous connection per process. Evidence: the existing two-process save and migration tests. Rule added: never `await` inside a transaction on the shared connection.)*
- [x] Confirm source files and migrations can recreate the schema without an existing live database. *(Existing `migrate.test.ts` fresh-database tests.)*
- [x] Document how owner account data and integration task history differ from Sheet-restorable lead data. *(`src/lib/server/db/STORAGE.md`.)*

**Verify/done when:** Persistent path expectations and recovery limitations are explicit, with a small repeatable storage test. **Status: implemented and tested on branch `phase-2/p2-4-storage-boundaries`; awaiting review.** Mount verification (P8) and backup/restore (P9) are deferred, as is the automatic pre-migration backup noted in the P2.2 decision.

---

### Phase 3. Connect customer forms to the backend

**Why now:** Lead storage is ready. Connect one existing form at a time and preserve the website’s approved appearance.  
**Depends on:** Phases 1–2.  
**Milestone:** Both key form types save valid leads, reject invalid input and show truthful status messages.

#### P3.1 Build a shared form submission endpoint
**Objective:** Let all public forms speak to one safe server handler.  
**Files:** **proposed** `src/pages/api/leads.*` (exact extension/path to approve), approved server validation/storage modules.

- [ ] Agree input names and service encoding with both existing form components.
- [ ] Accept only supported form fields and enforce required values, types, size limits and allowed service choices **on the server**.
- [ ] Normalize/sanitize user input as appropriate; do not trust any hidden field without checking it (V1 has no source or page-tracking field; the only hidden field is the honeypot).
- [ ] Add an appropriate simple spam/abuse defense and sensible submission rate limiting; do not make the public site hard to use. *Owner-approved requirement (2026-10-14): both the hero form and the longer form will include a hidden honeypot field; verify it on the server, make sure it never blocks legitimate customers, and do not rely on it as the only defense.* Also decide how the endpoint checks the request origin: Astro's `checkOrigin` does not reject cross-origin JSON requests (Section 10.3-D).
- [ ] Save valid leads through P2.3 and return a safe success with ID; reject invalid/malicious requests without inserting leads.
- [ ] Return safe, usable error responses. Prevent accidental exposure of exception details, credentials and other leads.
- [ ] Test direct requests that bypass browser validation, including repeated requests and large invalid values.

**Verify/done when:** Valid requests create exactly the expected record; invalid ones create none; endpoint cannot expose existing private leads.

#### P3.2 Wire up the existing homepage hero form
**Objective:** Make the visually approved hero form functional.  
**Files:** `src/layouts/components/widgets/AlternativeHeroForm.astro`, `src/content/sections/english/alternative-hero-section.md`, possibly `FormHandle.ts`.

- [ ] Inspect current submit handlers, service multi-select, required attributes, loading/success/error messages and reset behavior.
- [ ] Change only the submission route/logic needed to use P3.1; retain layout, controls, colors, keyboard behavior, **hero review/license badges, and adjacent testimonial sections**. *(Owner decision 2026-10-14: keep the hero form's fields and multi-select design; Full Name, Phone, Email and HVAC Services stay required; add a hidden honeypot with the backend, verified on the server and never blocking legitimate submissions.)*
- [ ] Map name, phone, email and selected services to approved backend fields, including multiple services when allowed.
- [ ] Prevent duplicate requests from a double click or an uncertain network retry using the approved approach.
- [ ] Show success **only after** confirmed SQLite save; keep user-entered content available on error when appropriate.
- [ ] Test valid, missing name/phone, no service selected, invalid email and server-down cases.
- [ ] Verify the saved lead in SQLite and check hero on desktop/mobile/tablet.

**Verify/done when:** Homepage hero submits real sample leads to SQLite, handles errors truthfully, and retains its approved visual design.

#### P3.3 Adapt the shared general contact form to HVAC
**Objective:** Replace outdated IT-project intake while reusing the existing form widget.  
**Files:** `src/content/sections/english/contact-section.md`, `src/content/sections/english/contact-section-two.md`, `src/layouts/components/widgets/ContactForm.astro`, `src/layouts/components/sections/ContactSectionTwo.astro`, `src/sections.schema.ts` only if required.

- [ ] Approve the HVAC question labels and inputs; remove irrelevant budget, project type and web/cloud service choices from the form content. *(Inputs approved 2026-10-14: Full Name (required), Phone Number (required), Email Address (required), HVAC Services (required; same six options and multi-select as the hero; at least one), optional Message, hidden honeypot; see Section 4.3. Final on-screen labels and the removal of the IT fields are still to be done in P3.3, so this box stays unchecked.)*
- [ ] Decide whether this longer form captures address/problem/time or deliberately uses fewer fields than the hero form. *(Decision recorded 2026-10-14: no address or preferred time; an optional Message covers the problem description; fewer fields than the old IT form, more than the hero. Box stays unchecked until P3.3 is implemented.)*
- [ ] Preserve the existing form widget, layout and content-sharing behavior between homepage/contact page.
- [ ] Connect its submit handler to P3.1 with the same backend field contract (no source or tracking field).
- [ ] Update on-screen feedback and verify the approved longer-form behavior works: Full Name, Phone Number and Email Address required; HVAC Services required using the same six options and multi-select as the hero form, with at least one service chosen; Message optional; the hidden honeypot never visible or focusable for customers and assistive technology, never blocking a legitimate submission, and rejected on the server when filled; keyboard and accessibility behavior intact. The obsolete IT-form radio buttons, budget and date fields no longer appear.
- [ ] Test from the contact page **and** the homepage section; verify both create the right SQLite records.
- [ ] Re-run required source/build checks and inspect mobile rendering.

**Verify/done when:** Both contexts submit consistent HVAC leads, no obsolete IT choices appear, and no reused form is broken.

#### P3.4 Cover all approved service-page request entry points
**Objective:** Ensure every CTA that offers a service request leads to an actually working flow.  
**Files:** `src/pages/[...lang]/services/[single].astro`, service content/CTA components and any verified forms it renders.

- [ ] Inventory the six HVAC service pages and their existing CTA targets and contact anchors. *(Facts: the homepage service cards already link to the six service pages; the in-page request buttons currently use `/#contact`; the header menu "AC Repair" link is a 404. Section 10.3-A.)*
- [ ] For each service page, determine whether there is an embedded form or a link to the shared form; do not invent six new forms if none are needed. *(Decided 2026-10-14: the in-page request buttons link to `/contact-us/`, which uses the approved longer form.)*
- *Removed from V1 (owner decision 2026-10-14): lead source tracking, so no source-page attribution, `?source=` parameters or hidden tracking identifiers. The service-page request buttons simply link to `/contact-us/`.*
- [ ] Test navigation from each service page to a usable request form, and submit one synthetic test lead per distinct pathway.
- [ ] Fix the broken header-menu "AC Repair" link: `src/config/menu.en.json` points to `/services/service-01/` (a 404); the page is served at `/services/service-custom-slug/`. Found during P0.4 (Section 10.3-A); **a future fix, not part of P1.1a.** Check the mobile menu too.
- [ ] Confirm the saved service information is accurate in SQLite (no source field in V1).

**Verify/done when:** Every approved â€œrequest serviceâ€ path works and saves a correct lead to the same SQLite database.

---

### Phase 4. Secure owner authentication

**Why now:** Build access protection before exposing customer leads through dashboard pages.  
**Depends on:** Phases 1–2; lead viewing functions.  
**Milestone:** A real owner can log in and out; an unauthorized visitor cannot read lead pages or APIs.

#### P4.1 Select and implement one-owner login approach
**Objective:** Protect the dashboard without inventing a large account system.  
**Files:** **proposed** owner login route and server auth modules; SQLite login/session records only if required.

- [ ] Examine Astro’s current authentication/session documentation and choose a maintained, server-compatible approach.
- [ ] Use one authorized owner per deployment; no public registration, customer accounts, roles or employee management.
- [ ] Decide secure first-owner creation (private setup procedure, not a public signup page); document how ownership will be handed to the client.
- [ ] Use secure password hashing and verification if using passwords. Never store or log plaintext credentials.
- [ ] Use secure, expiring session cookies and appropriate cookie protections; define logout and expiration behavior.
- [ ] Handle wrong passwords and repeated login attempts without revealing account details.
- [ ] Define a safe credential-reset/recovery procedure; account loss must not require deleting customer leads.

**Verify/done when:** One-owner login and logout work under test and the chosen approach has documented setup/recovery steps.

#### P4.2 Guard every private page and lead-reading action
**Objective:** A hidden URL must never equal authorization.  
**Files:** **proposed** `/owner/...` routes and server-only data handlers; any middleware that is actually justified.

- [ ] Check authentication **on the server** before rendering dashboard lead data.
- [ ] Protect lead list, detail, counts, search and any export/update requests, not just the dashboard homepage.
- [ ] Reject direct unauthenticated API calls even if users know the URL or guess a lead ID.
- [ ] Keep protected responses out of public caching and search indexing; avoid private lead data in public page HTML.
- [ ] **Keep `/owner/` out of the public sitemap and robots.txt (required; finding from P1.1b, Section 10.6):** `@astrojs/sitemap` lists on-demand pages, so once any `/owner/` page exists it appears in `sitemap-0.xml` unless excluded. Add exactly `"/owner/"` (not a bare `owner`, which would also match unrelated URLs such as "homeowner") to `[seo.sitemap] exclude` and `[seo.robotsTxt] disallow` in `src/config/config.toml`, add a `noindex` meta tag and `Cache-Control: no-store` to owner pages, and verify in the **built** `dist/client/sitemap-0.xml` and `robots.txt` that no `/owner/` URL is listed. Server-side owner authentication (above) is the real protection; the sitemap/robots exclusion only keeps the URLs out of search engines and is not access control.
- [ ] Check login redirects, logout, session expiry, copied links and tampered identifiers.
- [ ] Test unauthorized access in a private browser window and with direct requests; verify no customer data leaks in response bodies.

**Verify/done when:** Every private route and data operation rejects unauthorized requests; authorized ones work with the correct data.

---

### Phase 5. Build the private owner dashboard

**Why now:** Authentication and trusted lead queries exist, so the UI can safely present real information.  
**Depends on:** Phases 2 and 4.  
**Milestone:** Owner can quickly find and read requests on desktop and mobile.

#### P5.1 Establish a simple dashboard design and layout
**Objective:** Make the dashboard familiar to a nontechnical HVAC owner.  
**Files:** **proposed** private dashboard layout/components; existing tokens in `src/styles/theme.css`, `src/config/fonts.json`, shared buttons/icons if appropriate.

- [ ] Agree a modest layout: header/sidebar or mobile navigation, a clear “Leads” entry, and no public website clutter.
- [ ] Reuse verified typography, colors, button styles and spacing; introduce new tokens only if the private UI genuinely needs them.
- [ ] Design empty, loading, error and successful states with understandable copy.
- [ ] Keep forms, links and tables keyboard-accessible and mobile-friendly.
- [ ] Confirm the proposed `/owner/` pages do not collide with existing catch-all routes or sitemap behavior.
- [ ] Review the UI before adding nonessential animations, graphs or new UI frameworks.

**Verify/done when:** The private layout is readable and navigable on desktop, tablet and mobile without redesigning the public site.

#### P5.2 Owner overview
**Objective:** Give the owner an immediate picture of recent inquiries.  
**Files:** **proposed** `/owner/` page and server-only lead-count queries.

- [ ] Show all-time total, this-month total, today’s total and a small newest-leads list.
- [ ] Define “today” and “this month” using the approved business timezone, not an accidental server timezone.
- [ ] Link recent entries to the appropriate detail page; provide a clear “View all leads” link.
- [ ] Show clear empty/error states and no false statistics.
- [ ] Test counts against a known dataset spanning multiple dates and month boundaries.

**Verify/done when:** Overview counts and links match SQLite data and unauthorized visitors cannot see them.

#### P5.3 Searchable leads list
**Objective:** Create the owner's main lead inbox.  
**Files:** **proposed** `/owner/leads/` page, list UI, read/filter queries.

- [ ] Show name, phone/email where appropriate, requested service, submission date/time (no status or source column in V1).
- [ ] Sort newest-first by default; define how ties are handled for repeatable results.
- [ ] Add a basic name/phone/email/service search and simple date-range filter; avoid complex query builders. *(The approved dashboard flow covers viewing and searching; the date-range filter is not part of it, so confirm before building.)*
- [ ] Add manageable pagination or capped results so long histories remain usable.
- [ ] Provide a readable mobile layout (not a clipped desktop-wide table).
- [ ] Test search terms, empty results, no-data state, special characters and date boundaries against known records.

**Verify/done when:** Owner can locate a specific lead reliably without exposing any private information publicly.

#### P5.4 Dedicated lead detail page
**Objective:** Display the complete original inquiry clearly.  
**Files:** **proposed** `/owner/leads/[id]/` page and protected lookup handler.

- [ ] Show all approved customer fields, original submitted time, service(s) and request message (when provided) without clipping long text.
- [ ] Add simple click-to-call/email affordances only when field data exists; avoid making contact data public.
- [ ] Show helpful not-found/error handling; never reveal another lead by falling back to an arbitrary record.
- *Deferred, not V1 (owner decision 2026-10-14): lead status editing. In V1 the lead detail page is read-only. If statuses are ever added, allow a simple status change, record its timestamp and make sure Phase 7 syncs it.*
- [ ] Test valid ID, unknown ID, malformed ID, long message, missing optional fields and signed-out access.
- [ ] Verify restored historical leads can later display with their original IDs and dates.

**Verify/done when:** The owner can open any authorized record and see precisely the information saved in SQLite.

#### P5.5 Optional dashboard extras decision
**Objective:** Prevent scope drift.  
**Prerequisites:** P5.2–P5.4.

- *Decided 2026-10-14: no lead statuses in V1; the dashboard is a simple lead-viewing tool, not a CRM. The status questions that were listed here are closed.*
- [ ] Decide whether CSV export is helpful enough for Version 1; if added, protect it like other lead endpoints.
- [ ] Reject or defer charts, pipelines, scheduling, bulk emails and unrelated settings.

**Verify/done when:** Only justified optional items are added, tested and documented.

---

### Phase 6. Resend owner email alerts

**Why now:** Leads are already safe in SQLite. Email is additional communication, not the primary storage method.  
**Depends on:** Phases 2–3.  
**Milestone:** Each new lead creates a controlled email task, and transient failures do not lose leads or routinely produce duplicate alerts.

#### P6.1 Configure a private email sender and template
**Objective:** Tell the owner about a saved inquiry.  
**Files:** **proposed** server-only Resend integration and a small notification template; protected runtime settings.

- [ ] Check official Resend account/domain/sender requirements and current usage allowances before setup.
- [ ] Agree the verified sender/domain, actual owner recipient email and an easy-to-read subject.
- [ ] Keep the email brief (service + received time + link to secured lead detail), avoiding unnecessary personal data.
- [ ] Store the API key privately in local/Fly server settings, never in browser code or GitHub.
- [ ] Test with a dedicated address and a clearly labeled synthetic lead.

**Verify/done when:** A test owner alert is sent successfully and links to a login-protected record.

#### P6.2 Make email delivery failure-safe
**Objective:** Retry alerts without delaying or undoing the saved lead.  
**Files:** Approved `integration_jobs` design or simpler verified equivalent.

- [ ] Record an email task as part of the successful lead-saving operation.
- [ ] Send asynchronously from the same application using a documented, reliable processing trigger; check Fly Machine sleep/auto-stop behavior before depending on a running timer.
- [ ] Record success, attempt count, last error and next retry time; use bounded backoff rather than trying endlessly on every request.
- [ ] Use a stable per-lead notification identity and Resend's supported idempotency controls where appropriate; account for provider time windows and uncertain responses.
- [ ] Ensure an unconfirmed email response can be investigated and does not automatically cause an unlimited number of duplicates.
- [ ] Test simulated email outage, restart between save/send, repeated task processing, recovery and eventual success.
- [ ] Confirm email errors never change a saved lead into a failed form submission.

**Verify/done when:** A failed email remains a retryable recorded task and a restored email connection can finish it without duplicating leads.

---

### Phase 7. Google Sheets synchronization and tested lead importer

**Why now:** The database fields, dashboard and optional edits are defined, so the Sheet can mirror the **actual** lead format.  
**Depends on:** Phase 2 schema; Phase 3 lead save; Phase 5 (read-only in V1; no editable statuses).  
**Milestone:** Full-fidelity lead copies sync reliably, and a separate fresh SQLite database can be restored from a test Sheet without backups.

#### P7.1 Approve full lead-to-Sheet mapping and account setup
**Objective:** Create one private, accurate lead copy per website.  
**Files:** **proposed** documented Sheet mapping and private integration configuration.

- [ ] List **every field in the approved `leads` schema**, its Sheet column, data representation and whether blank/NULL is allowed.
- [ ] Include original stable ID, timestamps, all contact/request fields. V1 has no status, source or other editable lead fields.
- [ ] Choose the simplest authorized Google Sheets access method suitable for a private client Sheet; confirm actual API setup and permission requirements.
- [ ] Select one private spreadsheet per site, give access only to the required identity, and store its ID/credentials privately.
- [ ] Keep identifiers, phone numbers and date strings unchanged using appropriate text formatting and API value handling; test `RAW` writes and read-back.
- [ ] Decide how a schema/column change will be versioned and validated before future deployments.

**Verify/done when:** A reviewer can take one lead record and point to an exact, reversible Sheet representation for every recoverable field.

#### P7.2 Synchronize new and changed leads
**Objective:** Maintain an additional readable lead record without manual copying.  
**Files:** **proposed** server-only Sheets integration and durable sync-task handling.

- [ ] After SQLite saves a lead, process its queued Sheets task without delaying the form confirmation until Google responds.
- [ ] Use the stable lead ID to find an existing Sheet row before adding or updating it; do not assume a row was not written merely because the API timed out.
- [ ] Store sync status, attempted time, last failure and a next-retry time for each relevant event.
- *Deferred, not V1: V1 leads are read-only (no statuses or edits), so there are no updates to sync. If edits are ever added, synchronize them to the existing row and preserve the immutable original values.*
- [ ] Define how to detect and reconcile duplicate IDs/rows, missing records and mismatched values; do not silently overwrite conflicts.
- [ ] Simulate API downtime, timeout-after-write, repeat retries, and concurrent/rapid submissions.
- [ ] Confirm one client cannot write into another client’s Sheet through a default or misconfigured ID.

**Verify/done when:** A known set of new/edited SQLite leads appears once with identical field values in the correct Sheet, and failed writes are safely retryable.

#### P7.3 Build a controlled Sheet-to-SQLite recovery importer
**Objective:** Restore recoverable leads when the database and normal backup are unavailable.  
**Files:** **proposed** small offline/admin-only recovery tool plus versioned schema/mapping tests. Its exact path and invocation must be documented when implemented; never expose it publicly.

- [ ] Recreate a **fresh empty** test SQLite database from the versioned schema/migrations; do not use the old database file.
- [ ] Retrieve the private test Sheet with supported access or a documented, stable export format.
- [ ] Validate column names/mapping version and all rows before import: required fields, exact types/encodings, valid timestamps, missing data and duplicate lead IDs.
- [ ] Report invalid/conflicting rows with row identifiers; do not guess missing values or quietly skip failures.
- [ ] Insert exact preserved lead IDs and original timestamps and fields (no statuses in V1) using safe database transactions.
- [ ] Design reruns to skip identical existing IDs, stop/report different values for the same ID unless explicitly resolved, and never overwrite unrelated data silently.
- [ ] Prevent imports from creating “new lead” jobs, sending Resend emails or writing the leads back to the Sheet.
- [ ] Document how to handle records created after an old Sheet snapshot and how a recovered app will resume new ID generation safely.
- [ ] Document restoring/recreating owner access **separately**; Sheet data is not the owner's account or full DB structure.

**Verify/done when:** Importing a valid complete Sheet into an independently created SQLite database recreates the identical recoverable lead records with no accidental external actions.

#### P7.4 Run a rigorous no-backup recovery test
**Objective:** Prove the emergency procedure works rather than assuming it will.  
**Prerequisites:** P7.1–P7.3; a test dashboard and test Sheet.

- [ ] Make synthetic test leads with varied services, phone formats/leading zeros, long text, Unicode, empty optional values, and timestamp edges (no status edits in V1).
- [ ] Sync them to a test Sheet and verify all recoverable fields and changes arrived accurately.
- [ ] Pretend the SQLite database and snapshots are gone by creating a **different empty test database**; never delete the real one.
- [ ] Restore from **Sheet data only**, then compare lead count, sorted ID set and **every field value**, including NULL/blank and original dates.
- [ ] Confirm the owner dashboard shows recovered records with original IDs/times and never labels imports as newly arrived requests.
- [ ] Test a second import: no duplicates, no data loss, no unwanted notifications.
- [ ] Test duplicate conflicting IDs, missing columns, invalid timestamps/rows, missing Sheet permissions and partially synchronized data.
- [ ] Submit a new test lead after restoration and verify its ID cannot collide with restored IDs.
- [ ] Record actual outcomes, limitations, the original-vs-restored comparison and remediation for each failure.

**Verify/done when:** Every required recovery test passes or a verified limitation is explicitly accepted and documented. **This is a mandatory V1 launch gate.**

---

### Phase 8. Docker and Fly.io deployment

**Why now:** The full core application exists locally. Move it to hosting while retaining the same database and security rules.  
**Depends on:** Phases 1–7 tested locally.  
**Milestone:** The hosted application works through HTTPS and saved leads survive restarts and deployments.

#### P8.1 Prepare the production build and hosting decision
**Objective:** Know what will run and what it actually needs.  
**Files:** `package.json`, `astro.config.mjs`; **proposed** `Dockerfile`, `.dockerignore`, `fly.toml` (not present in inspected tree).

- [ ] Check current official Fly.io/Astro/Node adapter hosting instructions and choose a supported container startup method.
- [ ] Inspect actual production output size, large image assets and the app's measured runtime memory use.
- [ ] Compare **1 GB vs 2 GB** RAM and the **about 1 GB** starting volume using observed usage plus current Fly.io pricing; do not invent a monthly bill.
- [ ] Assess risk of a single Machine/volume, temporary outages during deploys, and the requirement for background retry processing when a Machine sleeps.
- [ ] Choose initial capacity, region, uptime configuration, volume size and risk acceptance; document what evidence would justify scaling later.
- [ ] Verify volume and snapshot cost/retention and whether a separate SQLite backup location is needed for acceptable risk.

**Verify/done when:** An approved, evidence-backed production configuration exists with a known budget and downtime/recovery tradeoff.

#### P8.2 Package and run one complete application locally
**Objective:** Make deployment repeatable.  
**Files:** **proposed** Docker and runtime configuration; existing Node/Astro project.

- [ ] Package the public Astro output, backend, dashboard and required runtime software together.
- [ ] Keep static images in the application package; keep SQLite and other persistent mutable files on mounted storage, not in the replaceable container layer.
- [ ] Ensure startup creates/applies schema safely against the mounted database using a reviewed procedure. *(P2.4: the app opens the database only on first use, so run `npm run db:migrate` before the server starts; the image must not create `/data`; `.dockerignore` excludes `.env*` and `.data/`; check file permissions for a non-root user. See `src/lib/server/db/STORAGE.md`.)*
- [ ] Pass secrets at runtime rather than baking them into the image or committing them.
- [ ] Run the production-style container locally against a disposable test volume/data directory.
- [ ] Test homepage, requests, owner login, a saved lead, dashboard list/detail, email/Sheet test configuration and restart persistence.

**Verify/done when:** The packaged application behaves like the local dev system and preserves database records across a test container restart/recreation with its data mount.

#### P8.3 Deploy to Fly.io and connect persistent storage
**Objective:** Run the finished app on hosted infrastructure.  
**Files:** **proposed** Fly app config, Docker setup and server settings; approved domain DNS settings outside source code.

- [ ] Create the correct Fly.io app for this website, using the approved region/capacity and one initial Machine.
- [ ] Create and mount one persistent volume at the approved application data path; confirm SQLite actually writes there. *(P2.4: verify the real mount with a method Fly.io supports; comparing device IDs of `/data` and `/` is only a hint, not proof.)*
- [ ] Set runtime secret credentials privately and verify only the intended deployment can read them.
- [ ] Configure chosen domain and HTTPS, health monitoring and desired Machine sleep/always-on behavior.
- [ ] Deploy the approved tested build; confirm the app starts and routes requests to the Node server.
- [ ] Test a real hosted **synthetic** lead, owner login, dashboard reading, Resend alert and private Sheet sync.
- [ ] Restart and redeploy while preserving the volume; verify the lead remains unchanged.
- [ ] Review logs, memory, disk use and failed-request handling; avoid private data in logs.
- [ ] Establish a safe rollback procedure for an unsuccessful app version **without rolling the database schema backward blindly**.

**Verify/done when:** HTTPS site and owner area work, integrations succeed, and database records persist after verified Fly restart/deploy operations.

---

### Phase 9. Security, backups, recovery and final verification

**Why now:** Test the integrated, production-like system and simulate failures before real customers depend on it. Security/reliability tests also belong to **every earlier phase**.  
**Depends on:** Phases 1–8.  
**Milestone:** Release checklist passes, including tested database restoration and Sheet-only lead reconstruction.

#### P9.1 Run full application security checks
**Objective:** Prevent unauthorized access and accidental disclosure.  
**Files:** All authentication, database, form and integration components created earlier.

- [ ] Verify server-side validation even when browser checks are bypassed; test unusual input, excessive size, malformed URLs and abuse limits.
- [ ] Test invalid login, repeated login attempts, session expiry, logout, stolen/invalid session handling, and direct API calls.
- [ ] Confirm private leads, owner pages and any exports cannot be read from a signed-out browser or guessed URL.
- [ ] Inspect browser bundles, Git history/new diffs and logs for credentials, sample real customer data and sensitive errors.
- [ ] Verify HTTPS, secure cookies, sensible response caching, no indexing of owner pages and safe error messages.
- [ ] Check dependency security findings and decide which issues genuinely affect the app. **Production blocker unless resolved or explicitly accepted:** the Astro advisories and other `npm audit` findings logged in Section 10.1 (19 findings at the P0.3 baseline).

**Verify/done when:** Important access/security checks have recorded passing evidence and no unresolved high-risk exposure remains.

#### P9.2 Validate primary SQLite and snapshot recovery
**Objective:** Know how to recover when storage or deployment fails.  
**Files:** Versioned migrations, database backup/recovery instructions, Fly snapshot configuration.

- [ ] Inspect the real configured Fly snapshot schedule/retention and any limitations/costs; do not assume current snapshots are recent or complete.
- [ ] Decide whether an additional **independent** SQLite backup copy is necessary, where it lives, and how credentials/access are protected.
- [ ] Use a supported, consistent SQLite backup method if taking backups; do not just copy a potentially active database file and assume it is consistent. *(P2.4: prefer the online backup API (`node:sqlite` `backup()`); an offline copy needs a clean shutdown with the WAL checkpointed, or the `.sqlite`, `-wal` and `-shm` files copied together, then `PRAGMA integrity_check`.)*
- [ ] Restore an available test backup or snapshot into a different test database/volume, not over live customer data.
- [ ] Compare original and restored lead records plus any important owner/configuration information included in that backup.
- [ ] Re-test dashboard login, record display and new submission with the restored test copy.
- [ ] Document exact human-readable steps and an estimated data-loss window based on tested schedules, not a guarantee.

**Verify/done when:** A normal backup/snapshot restoration has been demonstrated safely and documented, with honest limits.

#### P9.3 Independently repeat Sheet-only emergency recovery
**Objective:** Prove that losing *both* the database and usable SQLite backups does not make synchronized leads unrecoverable.  
**Prerequisites:** P7.4 passing.

- [ ] Use separate production-like test infrastructure, a private **test** Sheet, and a newly created empty SQLite database.
- [ ] Assume the original database and usable snapshots/backups are unavailable; run only the documented schema recreation + Sheet importer.
- [ ] Compare all recoverable lead fields to the test Sheet and preserved source reference, including IDs, timestamps and every field (V1 has no status or source fields).
- [ ] Ensure importer re-runs cannot duplicate records or generate email/Sheets side effects.
- [ ] Confirm re-established owner login works after separate secure account setup.
- [ ] Open restored leads in dashboard and successfully submit one new synthetic inquiry without an ID collision.
- [ ] Record where missing/unsynced leads or missing account/task history remain **unrecoverable** from Sheets alone.

**Verify/done when:** Another run of the written recovery process succeeds without manual manipulation of customer lead fields. **Mandatory V1 release gate.**

#### P9.4 Validate public UX, SEO and full-system behavior
**Objective:** Launch a credible, fast, reliable HVAC site with no template leftovers.  
**Files:** Existing page/content/theme/SEO components, new dashboard and form components.

- [ ] Confirm the intended **real-client production** brand, business contact details, locations, hours and service areas across pages and structured data; keep master demo branding customizable.
- [ ] Correct unrelated Techlo/IT copy, demo domain metadata, Techlo/IT references (**not** the approved BlueFlame placeholder) and generic addresses **where appropriate**, without stripping the master’s existing ratings, review count, licensed/insured badge or testimonials. On an actual client launch, supply substantiation and real customer testimonials, or hide only the unsupported elements in that **client deployment**. The protected master content remains intact. **"BlueFlame Heating & Air" is the approved master-template placeholder (owner decision 2026-10-14) and must remain in the master.** This cleanup targets unrelated IT/Techlo content and inappropriate demo details (titles, metadata, demo domain, addresses and phone numbers, footer, blog, IT form text); BlueFlame is replaced only in a real client's own copy.
- [ ] Audit heading structure, titles/descriptions, internal links, six service URLs, robots, sitemap, canonical URLs and indexing rules.
- [ ] Review images and large files for loading performance while maintaining approved visual quality; add accurate alt text.
- [ ] Test public pages, all form pathways, dashboard mobile experience, keyboard navigation, readable focus states and accessible errors.
- [ ] **Regression check (moved here from P0.2, 2026-10-14):** Visually verify that the `5.0 Rating`, `200+ Reviews` and `Licensed & Insured` trust indicators and the testimonial section remain unchanged on desktop and mobile after development work, comparing with the pre-change baseline in Section 10.2-F. Do not wait for P9.4 to do this: repeat the check after every change that affects pages, forms, styling or components (see Section 9, per-task routine).
- [ ] Test downtime cases: database save failure, email unavailable, Sheets unavailable, same request twice and service recovery.
- [ ] Check that normal traffic and simple concurrent submissions do not create unexpected failures; record actual results, not guessed capacity.
- [ ] Get owner approval before using real business claims or switching the real domain to the new application.

**Verify/done when:** V1 release checklist is green, critical defects are fixed, the preserved trust/testimonial components remain usable in the master, and any client-public claims are substantiated or hidden for that client.

---

### Phase 10. Reusable template, handoff and final refinement

**Why last:** Make the **working** system repeatable rather than prematurely building a complex template-management product.  
**Depends on:** Verified Version 1.  
**Milestone:** A new business can be configured from the foundation in a separate test deployment without codebase redesign or data mixing.

#### P10.1 Centralize safe business customization
**Objective:** Make business-specific edits straightforward.  
**Files:** Existing `src/config/config.toml`, `src/config/fonts.json`, `src/styles/theme.css`, `src/content/`, image locations; **proposed** small deployment-specific config only if justified.

- [ ] Inventory brand name, logo, colors, fonts, phone, email, addresses, hours, services, service areas, imagery, CTA text, SEO defaults, **trust ratings/review count, license/insurance label and testimonial content**.
- [ ] Centralize repeated business values using the existing content/config conventions; do not create a large CMS. **Keep the master’s sample trust values and testimonial section visible and editable** while allowing each client deployment to substitute verified content or conditionally hide unverified claims. The approved master placeholder "BlueFlame Heating & Air" (2026-10-14) currently appears in about 25 content files and is hard-coded in `ServiceTrustSection.astro` and `src/pages/[...lang]/services/[single].astro`; make it replaceable from one place for each client, **without renaming, removing or rewriting the master placeholder content**.
- [ ] Keep reusable form/database/dashboard behavior independent of brand name or contact copy.
- [ ] Separate public business configuration from private recipient email, Sheet ID, credentials and session secrets.
- [ ] Confirm a harmless brand edit, verified review-count update, license-badge adjustment, or testimonial replacement for a client does not require rewriting lead processing or database tables.
- [ ] Update tests/content checks to catch leftover placeholder details.

**Verify/done when:** A test rebrand changes expected visible business information without touching private lead logic, while the **original master still contains its `5.0 Rating`, `200+ Reviews`, `Licensed & Insured` and testimonials**.

#### P10.2 Prove client data separation
**Objective:** Reuse code without sharing lead records.  
**Prerequisites:** P10.1; test deployments only.

- [ ] Document one deployment/volume/SQLite database/owner account/Sheet per independent client website, each derived from **`astro-MASTER-flyio`**.
- [ ] Create a **test** second client configuration with different logo/contact settings and private credentials.
- [ ] Submit synthetic lead A and B independently; prove each owner sees only their own records.
- [ ] Test that client A's Sheet integration and importer cannot affect client B's database or Sheet.
- [ ] Confirm original IDs are preserved **within each client database** during recovery.
- [ ] Document how shared code improvements will be merged and deployed to each client deliberately, not automatically assumed.

**Verify/done when:** Two test clients can use the foundation without record or credential crossover.

#### P10.3 Finish maintainable documentation and handoff
**Objective:** Make future support possible without remembering this conversation.  
**Files:** This plan; existing `CLAUDE.md`/`AGENTS.md` only if approved and genuinely necessary; **proposed** concise operational runbook.

- [ ] Document first client setup, required accounts, safe credential entry, initial owner login, local tests, deployment and where lead data lives.
- [ ] Document normal updates, rollback, snapshot/SQLite restore and emergency Sheet-only import in plain language.
- [ ] Explain what the HVAC owner uses: website, private dashboard, and email; no expectation they manage Docker or databases.
- [ ] Record integration failure response, ownership transfer, access revocation and basic security maintenance tasks.
- [ ] Avoid duplicating the entire implementation plan in `CLAUDE.md` or creating numerous redundant project documents.
- [ ] Test the written new-client checklist using a separate synthetic client setup and correct any confusing step.

**Verify/done when:** A maintainer can follow the documented process and the owner can use the lead inbox without technical knowledge.

---

## 6. Dependencies and decision gates

### 6.1 Phase order

```text
Phase 0  Inspect and test existing site
    |
Phase 1  Enable limited Astro backend
    |
Phase 2  Approve and implement SQLite lead storage
    |
Phase 3  Connect all public forms
    |
Phase 4  Secure owner login
    |
Phase 5  Private lead inbox
    |
Phase 6  Resend alerts
    |
Phase 7  Full Google Sheets copy + recovery importer
    |
Phase 8  Docker and Fly.io
    |
Phase 9  Integrated security, backup and recovery tests
    |
Phase 10 Reusable master template and handoff
```

This is the **recommended learning and delivery sequence**, not a rule that every small task must wait for all previous phases. For example, image/content audits may happen in parallel with the backend. Security starts in Phases 1–4 and continues throughout; do not defer it to Phase 9. The recovery importer must be tested before production launch.

### 6.2 Decisions to make at the right time

| ID | Decision / unknown | Recommended starting point | Alternative / tradeoff | Decide by |
|---|---|---|---|---|
| D01 | Which public brand and claims are real? | **Master decision approved:** retain `5.0 Rating`, `200+ Reviews`, `Licensed & Insured` and testimonials as editable demo/template content. | **Client-production decision remains open:** replace with verified client data or hide in that client’s version; never remove from master. | Master: decided; client: P9.4/P10.1 Master business-name placeholder: **BlueFlame Heating & Air approved 2026-10-14** |
| D02 | Astro server setup | Official Node adapter; keep public pages static where reasonable and private/API routes on-demand. | All-server rendering if verified necessary; more runtime dependency for public pages. | P1.1 |
| D03 | Public form fields | **Decided 2026-10-14:** Full Name, Phone, Email and HVAC Services required on both forms; the longer form adds an optional Message; both get a hidden, server-validated honeypot. | More fields for better qualification but more friction. | Fields decided 2026-10-14 (Section 4.3); only the exact stored lead record is still frozen in P2.1 |
| D04 | Lead ID | **Decided 2026-10-16:** lowercase UUID v4, primary key, insert-only; preserved in Sheet and restores. | Numeric ID can work with careful restore/sequence handling; more collision hazards. | Decided (P2.1) |
| D05 | Lead status | **Decided 2026-10-14: NOT in V1.** The dashboard is read-only lead viewing, not a CRM. | Revisit after V1 only if the owner shows a real need (Section 11). | Decided |
| D06 | Auth | One owner, maintained password/session approach with server checks and documented reset. | A vetted external provider if requirements justify additional account/service. | P4.1 |
| D07 | Integration tasks | **Storage decided 2026-10-16 (P2.2):** `integration_jobs` table in the same SQLite database, one row per lead and kind. Retry timing and processing are decided in P6.2. | Direct sending without durable retry is simpler but not acceptable if failures lose work; external worker only if proven necessary. | Storage decided (P2.2); processing P6.2 |
| D08 | Google access | Private per-client Sheet using a supported server-to-server method if practical. | User authorization/OAuth if client ownership/access requires it; more setup. | P7.1 |
| D09 | Blank and NULL values | **Decided 2026-10-16:** V1 never stores ""; only `message` and `submission_key` may be NULL; in the Sheet an empty cell means NULL and is invalid elsewhere; `RAW` text writes. Read-back test in P7.1. | Lossy blank handling is **not acceptable** for 1:1 recovery. | Decided (P2.1); tested in P7.1 |
| D10 | Sheet changes and deletions | **Decided 2026-10-16 for V1:** leads are read-only; rows keyed by `lead_id`; `updated_at` exists (equals `created_at`) so later edits need no format change; no deletion. | Soft delete/record marker if future deletion requirement arises. | Decided for V1 (P2.1) |
| D11 | SQLite recovery | Versioned schema + tested snapshots/backup + complete Sheet importer. | An additional independent backup target may be justified if data-loss tolerance is tighter. | P7.3/P9.2 |
| D12 | Hosting resources | One Machine, one volume; size RAM (1 vs 2 GB) and disk from tests/current prices. | Multiple Machines improve uptime but require SQLite replication/coordination and extra cost. | P8.1 |
| D13 | Retry execution while sleeping | Confirm always-on/background processing policy or design a reliable wake-up mechanism. | A separate scheduled service only if necessary; do not quietly assume timers run on a stopped Machine. | P6.2/P8.1 |
| D14 | Client-specific config | Existing `src/config/` + `src/content/` patterns with private deploy settings. | More elaborate config layer only after real reuse pain appears. | P10.1 |
| D15 | Multi-agent work | Begin with one Claude Code session for a narrowly defined task. | Independent frontend/backend sessions in separate worktrees once shared data contract and merge responsibilities are clear. | Before any parallel work Workflow approved 2026-10-14 (Section 9); parallel sessions only after the shared contract is frozen (P2.1) |

**Never silently resolve a pending choice by adding a new platform or package.** State the recommendation, show the evidence, obtain needed approval, then update this table.

---

## 7. Testing strategy and evidence

### Minimum feature-by-feature test matrix

| Feature | Minimum test before marking done |
|---|---|
| Existing working site | `astro-MASTER-flyio` builds; homepage, contact, service pages, master trust banner, testimonials and mobile layouts remain usable. |
| Database | Valid lead saved exactly; invalid/duplicate ID errors handled; fresh schema recreated safely. |
| Form endpoints | Good submission succeeds; bad/missing/oversized/malicious input rejected server-side; no false success. |
| Form placements | A valid submission from each approved form (hero, homepage longer form, Contact Us) saves a correct lead to the same SQLite database; no source or tracking field is stored (V1). |
| Duplicate behavior | Double-click/retry handled by approved policy; intentional later inquiry still accepted. |
| Owner login | Authorized login works; logout expires access; bad credentials/expired cookies fail. |
| Private records | Signed-out user cannot read counts, list, details or APIs, even with known IDs. |
| Dashboard | Counts, search, dates and individual records match SQLite; mobile usable. |
| Resend | Successful alert, provider downtime, uncertain send, restart and bounded retry behavior. |
| Sheets | Every mapped field matches; updates match; timeout/retry does not create duplicate rows. |
| Importer | Fresh DB without original/backup restores exact lead IDs, fields, timestamps (no statuses in V1); rerun safe. |
| Recovery isolation | Imported history sends **zero** unintended “new inquiry” emails or Sheet rows. |
| Recovery edge cases | Bad row, duplicate ID, missing column, NULL/blank, leading zeros, missing Sheet permissions reported safely. |
| Post-recovery | Dashboard shows old leads correctly; next new lead saves with a nonconflicting ID. |
| Persistence | Database survives realistic container restart and Fly deployment while volume remains attached. |
| Backups | Fresh test copy restored from usable SQLite backup/snapshot when available. |
| Client isolation | Test clients have separate volumes, owner access, records and private Sheets. |
| Security/SEO and master trust content | No credentials/PII leaks; owner pages private/no-index; public SEO not regressed; master `5.0 Rating` / `200+ Reviews` / `Licensed & Insured` and testimonials retained; client-specific public claims verified or hidden. |

**Evidence rule:** For each meaningful milestone, record: date, Git commit/branch, test command or manual steps, expected result, actual result, pass/fail, and any outstanding issue. Screenshots/logs can help, but scrub private information. **Never invent test output.**

**Suggested evidence entry:**

```text
Task: P3.2 hero form
Date: [fill in]
Branch/commit: [fill in]
Test: Submitted synthetic AC Repair request on local homepage
Expected: 1 valid lead saved with the submitted fields
Actual: [fill in after running]
Result: PASS / FAIL / NOT RUN
Notes/blocker: [fill in]
```

---

## 8. Security and data protection requirements

- Server validation always applies; client validation alone is insufficient.
- Every private page and data endpoint must check owner authorization server-side.
- Use secure password/session solutions and reasonable abuse controls. No public registration.
- Secrets go only in protected environment/runtime storage; do not commit private Sheets credentials, Resend key, session secrets, owner passwords or production data.
- Use HTTPS and secure session cookies; avoid private data in pages that can be cached publicly or indexed by search engines.
- Keep logs useful but exclude full customer details and sensitive secret values.
- Collect only necessary information; decide a reasonable privacy notice, retention approach, and safe handling of access revocation/deletion before launch.
- Scope Google permissions and each client Sheet as narrowly as practical; verify no client data crossover.
- Protect recovery and administrative functions from public web access. Test with **synthetic** leads until release approval.
- Test security during implementation, not only at the final audit.

---

## 9. Claude Code + GitHub working process

The goal is consistent progress with **small, reviewable changes**, not complex agent orchestration.

### Per-task routine

1. Read this plan and select **one** unchecked task whose prerequisites are met.
2. Confirm the local Git remote is **`jonexe2/astro-MASTER-flyio`**. Recheck `CLAUDE.md`, `AGENTS.md`, relevant files, and current Git status. Do not assume this plan alone reflects the latest repo.
3. Briefly explain the task, which existing files need changes, any proposed new paths, and how success will be checked.
4. Work on a focused Git branch when changing code. A branch is a safe separate line of changes; a commit is a saved checkpoint.
5. Implement **only the agreed task**. Avoid unrelated refactors or design changes. Preserve master trust labels, existing testimonials and their visual components unless the owner explicitly changes this requirement.
6. Run suitable code checks, automated tests and manual checks; inspect actual output. After any change affecting pages, forms, styling or components, re-check the `5.0 Rating`, `200+ Reviews`, `Licensed & Insured` trust banner and the testimonial section against the baseline in Section 10.2-F.
7. Review the changes (Git diff) for accidental edits, bugs, security issues, exposed credentials and unnecessary dependencies.
8. Resolve failures before claiming completion. Preserve or restore the last working version if a change is unsuccessful.
9. Save a meaningful Git commit. Use a pull request for review before merging changes into `main` when useful.
10. Update this plan: tick only verified items, add evidence/commit, mark blockers, and identify the next task.

**A practical Claude Code task prompt** (adapt as needed):

> Confirm you are working in `jonexe2/astro-MASTER-flyio`. Read `IMPLEMENTATION_PLAN.md`, `CLAUDE.md`, and `AGENTS.md`. Work only on task **[TASK ID]**. First inspect relevant existing code and explain proposed changes in simple language. Preserve the master `5.0 Rating`, `200+ Reviews`, `Licensed & Insured` and testimonials. Do not redesign existing sections or touch unrelated files. Verify behavior with actual tests, inspect the Git diff, report what passed and failed, and propose checklist updates. Ask before a major architecture change. Do not begin the next task automatically.

### When to use agents/subagents

- **Default:** One Claude Code session implements one bounded task. This minimizes coordination and subscription usage.
- **Helpful specialization:** A read-only review or testing subagent can inspect completed work without modifying files. Use when independent review adds value.
- **Parallel sessions:** Consider one frontend and one backend session only after Phase 2 establishes field contracts and specific tasks can proceed independently.
- **Isolation:** If parallel sessions are used, separate Git worktrees (separate project folders/branches) and explicit file ownership can reduce overlapping edits. Worktrees do **not** stop logic mismatches.
- **Integration:** Define the exact shared fields/endpoints, tasks, forbidden edit areas, tests and merging owner. Integrate and run end-to-end tests before calling the combined result complete.
- **Model/effort usage:** Prefer the least costly model/effort that can reasonably complete the task and verify it. More agents or deeper reasoning are not automatically better. Check current Claude Code documentation before relying on model names, flags or agent messaging behavior.

**Avoid:** multiple agents editing the same form/backend contract independently, arbitrary feature creation, skipping tests, or telling the user code passed without running it.

### Approved development workflow and rollback (approved by the owner 2026-10-14)

**Approved workflow (owner decision 2026-10-14):** use a focused development branch for coding changes; keep `main` as the stable version; use one primary Claude Code session initially; bring in specialized read-only review/testing subagents when useful; when frontend and backend tasks become independent and their shared data contract is agreed, consider parallel Claude Code sessions in separate Git worktrees and branches; require integration tests and owner approval before merging major changes.

**Status:** approved as the project workflow. `main` stays the stable branch; coding changes happen on focused branches and are merged through pull requests after testing and owner approval; parallel frontend/backend sessions in separate worktrees are allowed later, once responsibilities and the shared data contract are clearly established; safe rollback checkpoints are kept and `main` is never rewritten. **Nothing has been created or changed yet:** no branch, worktree, tag or GitHub setting.

**Assessment: suitable for this repository**, with these repo-specific points:
1. **It fits:** one developer, `main` equals `origin/main`, no CI workflows and no tests exist yet. One branch per task and one pull request per merge gives the review point you want.
2. **GitHub-side protection was not checked** (the GitHub CLI is not installed on this computer). Recommended owner action: in the repository's GitHub settings, require a pull request before merging into `main`.
3. **Deployment side effects are unknown.** The repo contains `netlify.toml`, `vercel.json` and `wrangler.toml`; if any of those services is connected to the repository, branch pushes may start preview builds or merges to `main` may deploy. Owner to confirm which are connected; nothing was assumed.
4. **"Integration tests" need a decision.** There is no test runner or `test` script today. Choose one in P2.3 (prefer Node's built-in test runner so no new dependency is needed; any new dependency needs approval). Until then the required checks per task are `astro-check`, `build`, the baseline route/form checks and the trust-indicator and testimonial check.
5. **Parallel sessions and worktrees: not yet.** When used, each worktree needs its own `npm ci` (about 500 packages, about a minute), its own generated `.astro/` config, its own dev port and its own SQLite file. Changes to `package.json`, `package-lock.json`, `astro.config.mjs`, `config.toml`, `src/sections.schema.ts` and the lead-field contract should stay with one session. Start only after P2.1 freezes the contract (see D15).
6. **Read-only review/testing subagents** can be used now to review a diff or run checks; they must not edit files.
7. **Merge policy:** pull request into `main` after the checks pass and the owner approves (approved 2026-10-14). A squash merge is recommended so each task is one commit that is easy to revert.
8. **Local permissions (reviewed 2026-10-14, read-only):** `.claude/settings.local.json` is local to this computer (git-ignored, never committed). It pre-approves a list of diagnostic commands and also standing approvals for `git add IMPLEMENTATION_PLAN.md`, `git push origin main` and `Bash(gh api *)`. Recommendation (not applied; no settings were changed): remove the standing `git push origin main` and `gh api *` entries so every push and any GitHub API write asks for approval. `.env` and `.env.production` are git-ignored.

**Safe rollback procedure (approved 2026-10-14):**
1. Before each task: `main` is clean and equal to `origin/main`; create the task branch from it.
2. Checkpoints: after each approved merge, add an owner-approved annotated tag on `main` (for example `checkpoint-p0-complete`, `checkpoint-p1-1a`). Tags are shared on GitHub, so create them only with approval.
3. Unmerged work that goes wrong: switch back to `main` and delete the branch (locally and on GitHub). `main` was never touched.
4. Merged change that goes wrong: `git revert` the commit on a new branch and merge it through a pull request. Never force-push or rewrite `main`.
5. A bad dependency change is undone by reverting its commit (it restores `package.json` and the lockfile), then `npm ci`.
6. Uncommitted local experiments: review with `git diff`, then `git stash` or restore the files, and only with the owner's approval for anything not made in the current task.
7. Later phases: a code rollback does not roll back data. Take a Fly volume snapshot or SQLite backup before any database migration, keep migrations forward-only, redeploy the previous Fly release if a deploy fails, and never roll a schema back blindly (already a plan rule).



---

## 10. Progress dashboard (maintain here, not in another tracker)

### Phase status

| Phase | Status | Verified milestone | Evidence / link |
|---|---|---|---|
| 0. Assessment | **Complete** (P0.1 to P0.4, 2026-10-14; committed and merged into `main`) | Local baseline verified: `npm ci`, `astro-check` and `build` pass; 16 routes + 404 checked; no overflow at 3 widths | `main` at `3cc073c`, 2026-10-14; details in Section 10.1 |
| 1. Astro backend | **Complete**: P1.1a (PR #1), audit follow-up (PR #2), P1.1b (PR #3), P1.2 (PR #5) and P1.3 (PR #6, `f1a48d8`) merged | Server route + existing pages still work (P1.1b); server-only boundaries tested (P1.2); settings, ignore rules and error convention tested (P1.3) | PRs #1 to #6 (Sections 10.4 to 10.6); completed task log |
| 2. SQLite | **In progress**: P2.1 (PR #7), P2.2 (PR #8) and P2.3 (PR #9, `ba730a9`) merged; P2.4 (storage and recovery boundaries) implemented and tested on branch `phase-2/p2-4-storage-boundaries`, awaiting review | Storage/read tests + clean schema creation | `src/lib/leads/LEAD_CONTRACT.md`, `src/lib/server/db/`; completed task log |
| 3. Forms | Not started | Homepage/contact/service pathways save leads | — |
| 4. Owner login | Not started | Secure login + access denial tests | — |
| 5. Dashboard | Not started | Counts/list/detail/search verified | — |
| 6. Resend | Not started | Email + reliable failure/retry tests | — |
| 7. Sheets and importer | Not started | Full field mapping + sheet-only recovery test | — |
| 8. Fly.io | Not started | HTTPS deployment + persistent SQLite | — |
| 9. Release audit | Not started | Security + backup + recovery end-to-end gates | — |
| 10. Reuse/handoff | Not started | Separate test-client setup verified | — |

### Working notes

**Current working task:** P2.4, storage and recovery boundaries: implemented and tested on branch `phase-2/p2-4-storage-boundaries` (from `main` at `ba730a9`), awaiting review. P2.1 to P2.3 merged (PRs #7 to #9). Owner decisions and findings are in Sections 4.3, 9, 10.2 and 10.3 and the decision log.  
**Next recommended task:** review and merge P2.4; then Phase 3 (P3.1 shared form endpoint), only with owner approval.  
**Current blocker:** none. Standing condition: the 8 remaining `npm audit` findings were accepted "for now" on 2026-10-15; re-run `npm audit` at each phase start, after any dependency change and before any production deployment.  
**Decisions status (2026-10-16):** **Approved:** D01 for the master (BlueFlame placeholder, trust indicators, testimonials), D03 form fields, D04 (UUID v4 lead ID), D05 (no lead status in V1), D09 (blank/NULL), D10 for V1 (read-only, no deletion) and D15 (development workflow); the stored lead record is frozen in `src/lib/leads/LEAD_CONTRACT.md` (P2.1). **Genuinely unresolved, to be decided at the phase shown in the decision table:** D06 (P4.1), D07 (P2.2/P6.2), D08 (P7.1), D11 (P7.3/P9.2), D12 (P8.1), D13 (P6.2/P8.1), D14 (P10.1), and the real-client portion of D01 (P9.4/P10.1). **Resolved 2026-10-14 (P0.4 complete):** `/owner/` target routes approved; lead source tracking rejected; development workflow approved; first coding task P1.1a approved; other global `/#contact` buttons stay unchanged for now. **D02 (Astro server setup) is decided:** official Node adapter, static output kept, selective on-demand routes (P1.1b, PR #3).
**Confirmed for this revision:** New `astro-MASTER-flyio` repository, branch, selected source files, hero trust content and testimonial section. The new plan was revised locally. No application implementation, builds, deployments or GitHub writes were performed during that 2026-10-13 revision. (The 2026-10-14 P0.3 baseline runs are recorded in Section 10.1.)

### Decision log

| Date | Decision | Basis | Status |
|---|---|---|---|
| 2026-10-13 | Develop only in `jonexe2/astro-MASTER-flyio`. | Owner confirmed the working repository; its source tree was inspected. | **Approved and verified as target** |
| 2026-10-13 | Keep master `5.0 Rating`, `200+ Reviews`, `Licensed & Insured`, and existing testimonials. | Explicit owner preference; exact hero text and testimonial files confirmed in working repo. | **Approved for master**; client-public accuracy remains separate |
| 2026-10-13 | Preserve Astro and existing visual design as the preferred foundation. | Project requirement; working repository already contains substantial Astro UI. | Project preference; technically recheck in P1 |
| 2026-10-13 | SQLite + one Fly app/volume are the initial direction, not proved production capacity. | Project requirement; small expected workload; actual measurements pending. | Proposed |
| 2026-10-13 | Sheet-only **lead** reconstruction is a V1 acceptance test, not a substitute for full DB backup. | Project requirement and data-integrity limits. | Required acceptance criterion |
| 2026-10-14 | "BlueFlame Heating & Air" is the placeholder HVAC business name for the reusable master. Keep the existing BlueFlame content (do not rename, remove or rewrite) and make the name easy to replace for real clients. | Owner decision. Inventory in Section 10.2-G. | **Approved** (the wider template cleanup was approved on 2026-10-14 for later implementation; see the template cleanup decision below) |
| 2026-10-14 | Keep both homepage lead forms with their placements and designs; both connect to the same backend and SQLite database. | Owner decision. Section 4.3. | **Approved** |
| 2026-10-14 | Longer contact form fields: Full Name, Phone, Email and HVAC Services (all required; services use the same six options and multi-select as the hero, at least one), optional Message, hidden honeypot (server-verified, not the only spam defense). | Owner decision. Section 4.3. | **Approved requirement; not implemented** (P3.3) |
| 2026-10-14 | The P0.2 "verify trust indicators and testimonials after future work" item moves to P9.4; regression checks continue after any change affecting pages, forms, styling or components. | Owner decision. | **Approved** |
| 2026-10-14 | Hero form: keep existing fields and multi-select design; Full Name, Phone, Email and HVAC Services stay required; add a hidden honeypot with the backend, validated on the server and never interfering with legitimate submissions. | Owner decision. Section 4.3. | **Approved requirement; not implemented** (P3.2) |
| 2026-10-14 | Navigation: homepage HVAC service cards/buttons link to their service pages (already true, verified); request/schedule buttons inside the six service pages will link to `/contact-us/` instead of `/#contact`; Contact Us uses the approved longer form; both homepage forms stay. Other global `/#contact` buttons stay unchanged for now. | Owner decision. Section 10.3-A. | **Approved**; no navigation change implemented yet (P3.4) |
| 2026-10-14 | No New / Contacted / Closed statuses in V1; the dashboard is simple read-only lead viewing, not a CRM. Status requirements were removed or marked deferred in this plan. | Owner decision. | **Approved** |
| 2026-10-14 | Dashboard flow: Owner Login, Dashboard Overview (all-time, today, this-month counts and recent inquiries), Leads Inbox (view and search), Lead Details (contact information, services, message when provided, submission date). Simple, secure, read-only. | Owner decision. Section 3. | **Approved** |
| 2026-10-14 | Template cleanup approved for later implementation: replace unrelated Techlo/IT wording, inappropriate demo contact details, metadata and other leftover IT-template content with suitable HVAC demo content; preserve BlueFlame Heating & Air, the trust indicators and all testimonial content and design. | Owner decision. Inventory in Section 10.2-G. | **Approved; not scheduled, nothing changed yet** |
| 2026-10-14 | `/owner/` target routes approved: `/owner/login/`, `/owner/`, `/owner/leads/`, `/owner/leads/[id]/`. Simple read-only V1; no settings page, lead statuses or CRM features; logout decided in P4.1. Compatibility and functionality are verified during implementation. | Owner decision. Section 10.3-B. | **Approved target routes** |
| 2026-10-14 | Lead source tracking REJECTED for V1: no `?source=` parameters, hidden tracking identifiers, referral/source logic, source columns or dashboard features. Source-related requirements were removed or reworded across the plan. | Owner decision. | **Approved (proposal rejected)** |
| 2026-10-14 | Development workflow approved: `main` stable; focused branches; pull requests and testing before merging; one primary Claude Code session first; read-only review/testing subagents when useful; parallel frontend/backend sessions in separate worktrees later, once responsibilities and the shared data contract are clear; safe rollback checkpoints; never rewrite `main`. | Owner decision. Section 9. | **Approved**; nothing created yet |
| 2026-10-14 | First coding task: P1.1a, dependency security upgrades only, on a dedicated branch, with no unrelated website, backend or UI changes; exact package changes and test plan to be approved first. | Owner decision. Section 10.3-D. | **Approved task; package list approved by the owner 2026-10-14, implemented and merged into `main` through PR #1 (merge commit `a4bf69f`, 2026-10-15)** (Section 10.4) |
| 2026-10-16 | V1 lead contract frozen (P2.1, revision 2): fields and limits; UUID v4 primary key, insert-only; `created_at` and `updated_at` (equal in V1); blank message = NULL; services as a JSON list, strict on intake and format-only for stored/restored leads; submission key (header, unique, also copied to the Sheet) for double-clicks and retries, no merging by phone/email; Sheet format `lead.v1` with 10 `RAW` text columns. | Owner approval of the seven P2.1 decisions. `src/lib/leads/LEAD_CONTRACT.md`. | **Approved; implemented as types, constants, documentation and tests** (no database yet) |
| 2026-10-16 | SQLite setup (P2.2, revision 2): built-in `node:sqlite` with Node `>=24.15.0`; hand-written forward-only TypeScript migrations with checksums, all pending migrations applied in one `BEGIN IMMEDIATE` transaction at server start and by `npm run db:migrate`; `leads`, `integration_jobs` and `schema_migrations` tables; WAL, `synchronous = FULL`, 5-second busy timeout; one index `leads(created_at)`; production never creates the data folder; automatic pre-migration backup deferred until the first upgrade migration (P2.4/P8). | Owner approval of the six P2.2 decisions. | **Approved; merged (PR #8)** |
| 2026-10-16 | Lead functions (P2.3, revision 2): `LeadSubmissionResult` adds `conflict` and `bad_request`; the handler takes the submission key separately; only an absent key (`undefined`/`null`) skips duplicate protection, a present empty or malformed key is `bad_request`; duplicate services in one request are rejected; unknown fields are ignored by validation (the P3.1 endpoint decides accepted fields); both follow-up jobs are created as pending for each new lead; page-number pagination (25, max 100) and search across name, email, phone, message and services; counts take the business time zone as a parameter (source and demo default decided in P5.2). | Owner approval of the six P2.3 decisions. | **Approved; merged (PR #9)** |
| 2026-10-17 | Storage boundaries (P2.4): D1 in development a database inside the project must be under `.data/`; D2 detecting `/data` without a mounted volume is deferred to P8 and verified with a Fly-supported method (device IDs only a hint); D3 boundaries documented in `src/lib/server/db/STORAGE.md`. SQLite connection and write settings kept unchanged. | Owner approval of the revised P2.4 proposal. | **Approved; implemented and tested, awaiting review** |

### Completed task log (update only after verification)

| Date | Task | What was verified | Commit/test evidence |
|---|---|---|---|
| 2026-10-13 | P0.1 source review (partial) | New working repo/tree, selected instructions/config and absence of plan file in its `main`. | `astro-MASTER-flyio` tree `3dac95ba...`; runtime tests not run |
| 2026-10-13 | P0.2 source identification (partial) | Main form widgets, shared content, theme tokens, master trust indicators and testimonial section/content identified. | GitHub source review only; browser tests not run |
| 2026-10-14 | P0.1 (complete) | Remote, branch, clean tree, and commits since tree `3dac95b` (documentation only) reconciled with GitHub. | `git fetch`; `HEAD` = `origin/main` = `3cc073c` |
| 2026-10-14 | P0.2 (complete) | Page/form map, field and service-option inventory, hero multi-select behaviour, validation (network blocked), service-page request links, design baseline, brand/SEO inventory. Success/error submit paths NOT run. Post-change regression check moved to P9.4 by owner decision. | Section 10.2; dev server and preview of `dist/`; tracked files unchanged apart from this plan |
| 2026-10-14 | P0.4 (complete) | Owner decisions recorded: BlueFlame placeholder; both homepage forms; approved form fields and honeypots; navigation rules; no lead statuses; no lead source tracking; simple read-only dashboard flow and `/owner/` target routes; workflow and rollback; first task P1.1a; template cleanup (later); other `/#contact` buttons unchanged. Investigations: navigation links, route compatibility, Astro/adapter documentation and a read-only upgrade dry run. | Sections 4.3, 9, 10.3; no source, dependency or config file changed |
| 2026-10-15 | P1.1a (complete; merged into `main` through PR #1) | Four direct packages upgraded; `npm ci`, `astro-check`, `build` pass; 17 URLs return the expected status; no overflow at 3 widths; sitemap identical; forms, hero multi-select, testimonials, trust indicators, menus, accordion and blog search checked; `npm audit` 19 to 12 flagged packages (no critical); lockfile reviewed; no source, content or config changes. No form was submitted. Limits in Section 10.4. | Branch `phase-1/astro-security-upgrade` from `main` at `4ce3f61`; dependency commit `ddf8f92`, plan commit `c102852`; merged by PR #1, merge commit `a4bf69f`; Section 10.4 |
| 2026-10-15 | P1.1a audit follow-up (complete; **merged into `main` through GitHub PR #2, merge commit `86217155e79b0bfe95fd5335d84e8a2067476f2f`**; implemented and verified on branch `phase-1/security-audit-followup`) | Lockfile-only audit fixes plus the deferred `toml` update; `npm audit` 12 to 8 flagged packages (0 critical; production dependencies 0); built output byte-identical to `main`; `npm ci`, `astro-check`, `build` pass; favicon script runs. No form was submitted. Limits in Section 10.5. | Branch from `main` at `a4bf69f`; dependency commit `9f2b9c4`, then plan-update commits; merged by PR #2 (merge commit `86217155`); Section 10.5 |
| 2026-10-15 | P1.1b (complete; **merged into `main` through PR #3, merge commit `5dc4d80`**) | `@astrojs/node` 11.1.7 (`standalone`, `output` stays `static`); `GET /api/health/`; sitemap script reads `dist/client` and fails loudly if the sitemap is missing; built static files byte-identical to the pre-adapter build; production server, `/owner/` coexistence, audit reassessment. Evidence and limits in Section 10.6. | Code commit `b7ec83a`, merged by PR #3 (`5dc4d80`); Section 10.6 |
| 2026-10-16 | P1.2 (complete; **merged into `main` through PR #5, merge commit `bef88d5`**) | `npm run astro-check`: 151 files, 0 errors. `npm run build`: exit 0, 32 pages. `npm test`: 7 of 7 pass (contract matches hero form content; server-only guard throws when a browser global exists; only `src/pages` and `src/lib/server` import server code, with a self-test proving the check can fail; built `dist/client` contains no server-only code). Production Node server: `/api/health/` 200 with `no-store`; `/`, `/contact-us/`, `/services/service-02/`, `/blog/`, `/robots.txt`, `/sitemap-0.xml` 200; `/does-not-exist/` and `/api/leads/` 404. No new dependency; lockfile unchanged; `npm audit` unchanged (8 findings, 0 in production). Not re-run: visual regression (no frontend file changed). Limits: the boundary test is a static text scan (it does not follow dynamic imports built from variables); the runtime guard was only tested with a simulated `window`; Windows only. | PR #5 (`bef88d5`); review fixes `72c331f` (Node flag, guard import path, nonempty services) |
| 2026-10-16 | P1.3 (complete; **merged into `main` through PR #6, merge commit `f1a48d8`**) | `npm run astro-check`: 156 files, 0 errors. `npm run build`: exit 0. `npm test`: 25 of 25 pass, 0 skipped (settings rules including production path traversal and Windows-path rejection, unexpected errors reveal no message, name or cause (synthetic emails and dummy secrets), `.env.example` is placeholders only, private env files and local databases are git-ignored while the example is not, built browser output contains no private setting names). Production Node server: `/api/health/` 200 with `no-store`; `/`, `/contact-us/`, `/robots.txt` 200; `/does-not-exist/` 404. No dependency change; `npm audit` unchanged (8 accepted findings, 0 in production). Not re-run: visual regression (no public file changed). Limits: settings and error utilities are not called by any route yet; the database-path rule cannot be exercised against a real database until Phase 2; Windows only. | Merged by PR #6 (`f1a48d8`); review fixes `20bf10e` (path traversal and error logging) |
| 2026-10-16 | P2.1 (complete; **merged into `main` through PR #7, merge commit `4faf230`**) | Owner approved the seven contract decisions (revision 2). Added `LEAD_CONTRACT.md`, and `LeadRecord`, `LEAD_LIMITS`, `LEAD_SHEET_FORMAT`, `LEAD_SHEET_V1_COLUMNS` to `contract.ts`. `npm test`: 28 of 28 pass (new: limits match the contract; Sheet columns match the document table in order, header and NULL rule; every `LeadRecord` field mapped exactly once, only `message` and `submissionKey` nullable). `npm run astro-check`: 156 files, 0 errors. No dependency, database, endpoint, form or style change, so build and visual checks were not re-run. Limits: the contract is types, constants and documentation; nothing validates or stores leads yet (P2.2, P2.3, P3.1). | Merged by PR #7 (`4faf230`); review fix `b5c8a49` (nonempty services type) |
| 2026-10-16 | P2.2 (complete; **merged into `main` through PR #8, merge commit `9d96662`**) | `npm test`: 47 of 47 pass, 0 skipped (46 of 46 in three consecutive runs before the line-ending fix below; 19 new database tests: fresh creation, fresh failure leaves no tables, repeat run unchanged, upgrade keeps leads, failed multi-migration upgrade rolls back all, foreign-key final check, edited/newer migrations refused, gap in list refused, lock held → `DB_BUSY` then success, two child processes initializing one file at once, production never creates the data folder, migration SQL rules, and the `leads`/`integration_jobs` constraints). The two-process test failed in 4 of 5 runs at first; the cause was SQLite answering "busy" at once when a new file is switched to WAL, so that step now retries until the busy timeout (then 11 of 11 passes). Migration checksums ignore CRLF/LF differences, so Windows and Linux checkouts agree (tested). A temporary switch from `BEGIN IMMEDIATE` to `BEGIN` made that test fail 3 of 3 times, so it detects a missing lock. `npm run astro-check`: 163 files, 0 errors. `npm run build`: exit 0. `npm run db:migrate` twice on `.data/dev.sqlite`: "schema version 1" both times; without `APP_ENV` it exits 1 with `SETTINGS_APP_ENV`. Throwaway on-demand route using `node:sqlite` built and returned `{"version":1,"sqlite":"3.53.0"}` from the production Node server, then was deleted and the site rebuilt. `npm audit`: unchanged, the same 8 accepted packages (2 high, 6 moderate), 0 in production; no dependency added. Limits: Windows only (Linux/Docker in P8); no route uses the database yet; whether `process.env` holds `.env` values inside the Astro dev server is checked when P3.1 first calls `getDatabase()`. | Merged by PR #8 (`9d96662`); commits `f56d918`, `12e1067` (CRLF/LF checksum fix) |
| 2026-10-17 | P2.4 (implemented and tested; awaiting review) | `npm test`: 90 of 90 pass, 0 skipped (was 87). Settings: the old "other local paths" test (it used `tmp/a.sqlite`, now refused) became 3 tests: development accepts `.data/` and paths outside the project; refuses `public/`, `dist/`, `src/`, `node_modules/`, the project root, `tmp/` and `..` tricks without echoing the path; a different letter case on Windows does not bypass the rule. The development extension check now uses `.data/.env`. 1 new storage test: `saveLead`, close, reopen, `getLeadById` identical, both pending jobs and only migration 1 present, same key still answers as a repeat). Existing concurrency and migration tests reused, not re-run separately. `npm run astro-check`: 169 files, 0 errors. Build not run (no routing, content or asset change). `.data/dev.sqlite` untouched; no database file tracked. No dependency, schema or connection change. Limits: Windows only; mount verification is P8; backups and restore tests are P9. | Branch `phase-2/p2-4-storage-boundaries` from `main` at `ba730a9` |
| 2026-10-16 | P2.3 (complete; **merged into `main` through PR #9, merge commit `ba730a9`**) | `npm test`: 87 of 87 pass, 0 skipped, in three consecutive runs (40 new: validation and cleanup rules, submission-key parsing (absent `undefined`/`null` vs present `""`/malformed), save-and-read-back in the stored format with two pending jobs, replay with same key and data, `conflict` with different data, separate identical inquiries, job-insert failure leaves no lead, forced ID collision leaves the existing lead unchanged, lock held -> `unavailable` with a `DB_BUSY` log line, error logs free of customer details, two child processes saving with the same key -> one lead and the same ID, different keys -> two leads, newest-first pagination, search incl. phone punctuation and literal `%`/`_`, inclusive local-date ranges, historical service labels unchanged, stored service lists that break the contract format (empty, blank, duplicate, control characters or line breaks, over 100 code points) reported as `DB_INVALID_ROW` on read, today/this-month counts and daylight-saving days in `America/New_York`). Weakening `saveLead` from `BEGIN IMMEDIATE` to `BEGIN` made both two-process tests fail 3 of 3 times (reverted). `npm run astro-check`: 169 files, 0 errors. `npm run build`: exit 0; built browser output contains no lead-saving code. No dependency or schema change. Limits: SQLite `lower()` folds only A-Z, so accented capitals are not matched case-insensitively; in zones that change clocks exactly at midnight a day start can be off by the size of the change; the business time zone source is decided in P5.2; Windows only. | Merged by PR #9 (`ba730a9`); commits `ec81864`, `6c3ad28` (stored service-list format on read) |
| 2026-10-14 | P0.3 (complete) | Lockfile install, `astro-check`, `build`, 16 routes + 404, form destinations (source), responsive/overflow checks, console review, static-route confirmation. | `main` at `3cc073c`; results in Section 10.1. Repo remained clean (no tracked files changed). |

### Blockers and open questions (update after each session)

- [ ] For an **actual client launch**, what verified brand, rating, review count, license/insurance status and authentic testimonials should be used? Keep the master demo trust elements regardless.
- [x] Has the existing website ever had a successful local build with this exact version? Capture results. *(Yes: 2026-10-14, `main` at `3cc073c`, `npm run build` exit 0, 32 pages. See Section 10.1.)*
- [ ] **Astro and dependency security findings (Sections 10.1 and 10.4):** P1.1a upgraded Astro and `sharp` and cleared the critical Astro advisory (merged through PR #1, `a4bf69f`); the audit follow-up (Section 10.5, merged through PR #2, `86217155`) reduced the findings from 12 to 8, all in build/dev tooling and none fixable without overrides, downgrades or code changes. P1.1b (Section 10.6) reassessed them with the Node server in place: still the same 8, none present in a runtime-only install. Open: owner acceptance of the 8 remaining findings before P1.1b is merged and before deployment.
- [ ] **Future bug (not part of P1.1a):** the header menu "AC Repair" link goes to `/services/service-01/`, a 404 (Sections 10.1 item 8 and 10.3-A; fix scheduled in P3.4).
- [ ] **Optional owner follow-up (not a P0.4 blocker):** confirm whether Netlify, Vercel or Cloudflare is connected to this GitHub repository, and consider requiring pull requests for `main` in the GitHub settings (nothing in GitHub was changed). *(2026-10-15: the owner stated in chat that no Netlify, Vercel or Cloudflare deployment is connected to this repository; this is the owner's statement and was not checked in those services' dashboards. The pull-request requirement for `main` is still open.)*
- [ ] Which owner email and private domain will be used for testing and eventual launch? Do not enter credentials into this public document.
- [ ] Are full-service-address and email mandatory, optional, or a later form improvement? *(Partly answered 2026-10-14: email is required on both forms; neither approved form collects a service address. Whether to add an address later was not stated, so this stays open.)*
- [x] Does the owner need simple New/Contacted/Closed statuses in V1? *(Answered 2026-10-14: no. Statuses are deferred out of V1.)*
- [ ] What is the accepted downtime/data-loss tolerance for one Fly.io Machine?
- [ ] What secure login method best matches the current Astro/server environment?

### 10.1 P0.3 baseline evidence and known issues (2026-10-14)

**Environment:** Windows 11; Node v24.17.0; npm 11.13.0; repo `jonexe2/astro-MASTER-flyio`, branch `main`, commit `3cc073c`; `astro@7.0.3` installed (declared `^7.0.2`).

| Test | Command / steps | Expected | Actual | Result |
|---|---|---|---|---|
| Install | `npm ci` | Locked install | 505 packages, exit 0; 19 audit findings reported | PASS |
| Type/content check | `npm run astro-check` | No errors | 144 files: 0 errors, 0 warnings, 0 hints | PASS |
| Production build | `npm run build` | Build completes | Exit 0; 32 pages in ~25 s; sitemap created; no warnings/errors in output | PASS |
| Routes (dev) | HTTP request + browser to 16 real routes | 200 | All 200 | PASS |
| 404 | Visit `/does-not-exist/` | Custom 404 page, status 404 | "Page Not Found" page, status 404 | PASS |
| Master trust content | Homepage text check | `5.0 Rating`, `200+ Reviews`, `Licensed & Insured` present | All three present (also visible in screenshots) | PASS |
| Testimonials | Homepage and service pages | Section present | Homepage: carousel rendered and viewed at 768 px, next/previous buttons present. The 6 HVAC service pages: testimonial content detected in the page HTML by text match only; not visually inspected | PASS (homepage visual; service pages text-match only) |
| Overflow | 12 real pages + the 404 page x 375/768/1280 px (hidden same-origin frames) | No horizontal scroll | 0 overflows (39 checks) | PASS |
| Console, clean tab | Fresh tab, visit 15 real pages after server restart | No errors | No console errors | PASS |
| Repo unchanged | `git status` after all runs | Clean | Clean (`node_modules/`, `.astro/`, `dist/` are gitignored) | PASS |
| Form submission | Not run (by design) | n/a | No form was submitted; no data sent to the template address | NOT RUN (intentional) |

**Not done in P0.3:** no screenshot files were saved; tablet/mobile visual review covered the homepage (and its testimonial section), other pages were checked by overflow measurement only; the service-page testimonials were confirmed by text match, not visually; no form was submitted. No form, design or content was changed.

**Known issues and flags (nothing here has been fixed):**

1. **Dependency audit: 19 packages flagged (not 19 independent attacks).** `npm audit` (2026-10-14, `main` at `3cc073c`) flags 19 packages (1 critical, 14 high, 4 moderate) carrying about 43 distinct advisories; 4 of the 19 (`@realfavicongenerator/image-adapter-node`, `@tailwindcss/typography`, `argparse`, `svgdom`) are flagged only because they depend on another flagged package, and a few packages (`fast-uri`: 8 advisories, `devalue`: 7) account for many entries. Whether each is actually exploitable depends on how the package is used (see item 2). Production-only audit (`npm audit --omit=dev`): **two packages, `js-yaml` and `smol-toml`** (both high; both parse files the project itself authors). Highest installed-version findings: `astro@7.0.3`, `sharp@0.34.5`, `devalue@5.8.1`, `smol-toml@1.7.0`, `toml@4.1.1`, `js-yaml@3.15.0` and `4.3.0`, `postcss@8.5.15`, `svgo@4.0.1`, `fast-uri@3.1.2`, `image-size@1.2.1`, `nanoid@3.3.15`, `source-map-js@1.2.1`, `http-cache-semantics@4.2.0`, `postcss-selector-parser@6.0.10`, `sprintf-js@1.0.3`, `argparse@1.0.10`. All flagged packages run on the developer's computer at build/dev time; none run on a visitor-facing server today because the site is fully static. `npm audit fix --dry-run` fails with a peer-dependency conflict (`astro@7.3.8` needs `@astrojs/markdown-remark` ^7.3, lockfile has 7.2.0); `--force` was not used and nothing was changed. `sharp` shows no automatic fix because the declared range `^0.34.5` excludes the fixed `0.35.x` line (`0.35.5` exists; Astro 7.2.8 requires `sharp` 0.35.4), so a `package.json` range change would be needed. For `@tailwindcss/typography`, npm's suggested "fix" is a downgrade to 0.5.4 and should not be used. `astro@7.3.8`, `@astrojs/markdown-remark@7.3.2`, `@astrojs/mdx@7.0.8` and `toml@4.3.0` are within the declared ranges; `@astrojs/mdx` 8, `toml` 5, Preline 5, TypeScript 7 and the favicon packages' 0.9 line are major updates not needed for these findings. Whether an upgrade changes theme behavior is **unknown** until tested on a branch.
2. **Astro security findings: REVIEW, APPROVE AND TEST DEPENDENCY UPGRADES BEFORE ENABLING ANY SERVER-SIDE FUNCTIONALITY (adapter, API/form endpoint, login, dashboard) OR PRODUCTION DEPLOYMENT.** Installed `astro@7.0.3`. Advisories (severity per the advisory): remote code execution through AVIF image optimization via `libheif`, **critical**, CVSS 9.8, affects `<7.2.8`, GHSA-26w7-cxv4-gfx2 (this one advisory is why the audit labels Astro "critical"; the advisory says projects are affected when an attacker can cause Astro to process an untrusted AVIF image); `astro/hono` pipeline can bypass `security.checkOrigin`, moderate, `>=7.0.0 <7.0.6`, GHSA-8mv7-9c27-98vc; XSS via unescaped spread attribute names, moderate, `<7.0.6`, GHSA-f48w-9m4c-m7f5; reflected XSS via View Transition animation properties, moderate, `<=7.0.9`, GHSA-4g3v-8h47-v7g6; authorization bypass when stripping a configured `base`, moderate, `<=7.2.3` (fixed 7.2.4), GHSA-376h-93r7-7g6f (needs a non-root `base` plus middleware that authorizes by `context.url.pathname`); XSS via `transition:*` directive values, low, `<7.0.4`, GHSA-7pw4-f3q4-r2p2. `sharp@0.34.5` has three high advisories (libvips, libheif, librsvg; GHSA-f88m-g3jw-g9cj, GHSA-rgj7-g3m4-5g8c, GHSA-wq5f-xc86-pv6w, fixed in 0.35.0 to 0.35.5). Confirmed for the current static site: no adapter, server output, middleware, `base` setting, view transitions or `astro/hono` usage found in `src`, `scripts` or `astro.config.mjs`; **no AVIF images found** in `src/` or `public/` (the only "avif" reference is a type name in `src/lib/utils/bgOptimizedImage.ts`); **no customer image-upload feature exists or is planned for V1**. So these are **not confirmed exploitable today**. **Possible future risk:** once server rendering, form endpoints and a login exist, the `checkOrigin` and `devalue` issues become relevant (form/CSRF protection and server data handling), and the XSS issues matter if customer-supplied text is rendered; the AVIF/`sharp` issues would matter only if untrusted images are ever processed. **Unknown:** whether any component spreads attacker-influenced attribute names; how Astro uses `http-cache-semantics` internally; whether Astro 7.3.8 changes theme behavior. Required before server-side work (P1.1 gate): approve an upgrade path (likely `astro` to 7.2.8 or later, with matching `@astrojs/markdown-remark` and `sharp` versions and `devalue`/`smol-toml`/`svgo` as resolved), apply it on a branch, and re-run `astro-check`, `build`, the P0.3 baseline checks (16 routes, 404, no overflow, trust banner and testimonials intact) and `npm audit`. Build/dev-tooling findings (`postcss`, `nanoid`, `source-map-js`, `postcss-selector-parser`, `js-yaml`, `toml`, `fast-uri`, favicon tools) process only project-authored files and may wait or be taken opportunistically within declared version ranges.
3. **Development-server errors (dev only).** (a) `404 (Not Found)` console lines appear only when requesting the nonexistent test URL; expected behavior. (b) `504 (Outdated Optimize Dep)` on `/@id/astro/runtime/client/dev-toolbar/entrypoint.js` (Astro's dev toolbar) occurred once during the first heavy cold-cache session; **not reproduced** after a server restart (fresh tab, 15 pages, zero errors). The exact triggering dependency was not confirmed. The production build had no errors.
4. **Placeholder form destination.** Both forms POST JSON via `formSubmit` to `https://formsubmit.co/ajax/temp.gats@gmail.com` (`src/config/config.toml`, `contactFormAction`). This is a template address, not lead storage. `FormHandle.ts` also contains a hard-coded Formspree URL used only if the provider is set to `formspree`. Do not submit real or test customer data to it.
5. **Leftover template/IT content (preserve master trust/testimonials; this is a cleanup list, not an instruction to remove them):** `config.toml` tagline "Free IT Solutions & Services Astro & Tailwind CSS Theme" appears in every page title and the site is named "Techlo"; `baseUrl` is `https://techlo-lite-astro.pages.dev/`; header shows `hello@example.com` and `518-564-3200`; 404 page and blog are IT-themed (the blog pages show only the blog search box, not a lead form (corrected 2026-10-14, Section 10.2-A); `/services/alternative-services/` and `/services/hero-alternatives/` are IT demo pages; `/services/service-03/` title contains "BlueFlame Heating & Air"; the contact form still has IT-project fields (Budget, Start Date, Project Type, Preferred Contact); page content references Boston, MA. Testimonial text is generic IT-business quotes. Additional observations from the 2026-10-14 contact-page review: the contact section shows an address and phone (`1800 Market Street, Suite 420, San Francisco, CA 94103`, `+1 415 555 2300`) that differ from the header's (`1791 Yorkshire Circle Kitty Hawk, NC 279499`, `518-564-3200`); the heading reads "Let's build an awesome project together" with IT-project copy; the service dropdown offers IT services (Web & Mobile App Development, Cloud Infrastructure, Cybersecurity Review, Data Tracking & Analytics, Automation Workflow).
6. **Large source image.** `alternative-hero-hvac.jpg` is about 2.8 MB at source; the build outputs optimized WebP variants (about 37 kB to 272 kB).
7. **Route naming.** HVAC service pages use generic slugs (`service-02` to `service-06`, `service-custom-slug`) and the services index is separate; SEO-friendly URLs are a later decision, not a defect found by tests.
8. **Navigation defects found during P0.4 (not fixed):** the header Services menu "AC Repair" link goes to `/services/service-01/`, which is a 404 (the page is at `/services/service-custom-slug/`); footer service labels are IT names pointing at HVAC pages; "Careers" links to `/`. Details in Section 10.3-A. **Scheduled as a future fix (P3.4), not part of P1.1a.**

### 10.2 P0.2 page, form and branding inventory (2026-10-14)

**How to read this:** **V** = verified by running the site (dev server `http://localhost:4321` and/or a local preview of the existing production build `dist/`, built earlier on 2026-10-14 from the same source; only `IMPLEMENTATION_PLAN.md` has changed since). **C** = found by reading code or content only; **not run**. Nothing was submitted to the template address: browser network calls were blocked by a test stub while checking validation, and no valid submission was attempted. No source, content, styling, config or dependency was changed.

**A. Where forms appear (V: 17 URLs checked in the page HTML; C for component wiring)**

| Page | Lead-request form | Widget and content source |
|---|---|---|
| `/` (homepage) | **Two**: hero estimate form (`#alternative-hero-form`) and contact form (`#contact-form`, inside section `id="contact"`) | `AlternativeHeroForm.astro` via `AlternativeHeroSection` (`alternative-hero-section.md`); `ContactForm.astro` via `ContactSectionTwo` (`contact-section.md` for fields/messages, `contact-section-two.md` for title and address) |
| `/contact-us/` | One: contact form | `ContactForm.astro` via `ContactSectionTwo`, plus `ContactMapSection` |
| `/blog/`, `/blog/post-1/` | **None.** The only `<form>` is the blog search box (`#search`, `Search.astro`), not a lead form (this corrects the earlier note in Section 10.1 item 5) | n/a |
| `/about-us/`, `/services/`, six HVAC service pages, `/services/alternative-services/`, `/services/hero-alternatives/`, privacy, terms, 404 | None | n/a |

**B. Hero form (V unless marked C)**
- Fields: `fullName` text, required; `phone` tel, required; `email` email, **required in the current code** (the plan's D03 suggested email optional; decided 2026-10-14: email stays required on both forms); `services` hidden input, required, filled by the multi-select. Hidden: `_subject` = "New HVAC service request", `_template` = "table". There is **no page/source field** in the payload.
- Service options (6): AC Repair, Heating Repair, HVAC Installation, Preventive Maintenance, Indoor Air Quality, Emergency HVAC Service.
- **Multi-select (V):** the button opens a checkbox panel. Ticking boxes writes one text value, joined with a comma and a space, e.g. `AC Repair, HVAC Installation, Indoor Air Quality`. The button label shows the names for 1 to 2 picks and "3 services selected" for 3 or more. Unticking everything empties the value. Arrow, Enter, Space and Escape keyboard handling exists in code (C).
- Validation (V): empty submit is blocked with the browser's required-field notices and "Please complete all required fields."; a bad email gets the browser's message; valid fields with no service shows "Select at least one service." Nothing was sent in any case.
- Submit behaviour (**C, not run**): posts JSON to `https://formsubmit.co/ajax/temp.gats@gmail.com` (placeholder). While sending it shows "Submitting your service request..." and disables the button. Success only if the reply says `success: "true"`, then "Thank you. Your service request has been received." and the form resets. `success: "false"` shows the reply's own message. A network failure shows a hard-coded "Oops! There was a problem submitting your form." (not the error text in the content file). Code observations to keep in mind later: the abort message promises an "alternative server" but none is implemented; a reply that is neither `"true"` nor `"false"` would leave the button disabled with no result message; the unused Formspree path would show a success-style message on failure.

**C. Contact form (V unless marked C)**
- Fields: Name (text, required); Email (email, required); Estimated budget (number); Preferred start date (date); Service interest (searchable dropdown over a native select, required, 5 options: Web & Mobile App Development, Cloud Infrastructure, Cybersecurity Review, Data Tracking & Analytics, Automation Workflow); Project type (radios: New project [default], Improve existing system); Preferred contact (checkboxes: Email [default ticked], Phone); Message (textarea, required); Consent ("I agree to be contacted about this request.", required). Hidden: `_subject` = "New form submission from your website", `_template` = "table". Field names are capitalised with spaces (`Start Date`, `Project Type`), unlike the hero's camelCase names: the two forms do not share a field contract today.
- It has **no phone-number field**, although "Phone" is offered as a preferred contact method. No source/page field.
- Validation (V): an empty submit flags Name, Email, Service, Message and Consent with the browser's messages; a bad email is flagged; nothing was sent.
- Submit/success/error (**C, not run**): same endpoint and function as the hero. Success text from content: "Thank you. We received your request and will reply with useful next steps." Failure shows the error text followed by the fallback message.

**D. Request buttons on the six HVAC service pages (V: link lists read from each page; click-through checked on `service-02`)**
- Pages (content → page): `service-01.mdx` is served at `/services/service-custom-slug/` (AC Repair); `service-02` Heating Repair; `service-03` HVAC Installation; `service-04` Preventive Maintenance; `service-05` Indoor Air Quality; `service-06` Emergency HVAC Service. None of the six pages contains a form.
- Every request/schedule button on all six pages (4 to 5 per page, e.g. "Request AC Repair", "Request Heating Repair", "Request an Estimate", "Schedule Maintenance", "Explore Air Quality Options" / "Request an Air Quality Consultation", "Request HVAC Service", plus a final "Schedule …" button) links to `/#contact`, i.e. the **homepage contact section and its IT-style contact form**, not the hero form and not `/contact-us/`. The sidebar buttons are hard-coded in `src/pages/[...lang]/services/[single].astro`; the final buttons come from the `*-final-cta.md` files.
- Click-through: on the **production build**, opening `/#contact` from `service-02` scrolled to the contact section (V). On the **dev server** the page changed to `/#contact` but did **not** scroll (V, 3 tries); the cause is unknown and the production result is the one that matters. The Services menu on each page also links to the Emergency page.
- Extra phone link: the Heating and Emergency pages show "857-123-4567" (`service-emergency-cta-section.md`), which differs from the header number.
- Nothing in either form records which page or button the visitor came from (owner decision 2026-10-14: this stays as is; no lead source tracking in V1).

**E. Design baseline (V on desktop 1440 px and about 1024 px, tablet 768 px, mobile 375 px; no horizontal overflow, see Section 10.1)**
- Type: Sora 400/500/700 for body and most headings; Montserrat 800 for the hero headline (`src/config/fonts.json`). Body 14 px, colour `#585B6F` on white; hero H1 about 44 px and H2 about 39 px at a 1024 px window; H2 colour `#0A165E`.
- Colour tokens (`src/styles/theme.css`): primary `#2B4DFF`, primary-soft `#EEF1FF`, heat-accent `#FF6A3D`, accent `#E3FF04`, theme-dark `#040D43`, theme-light `#F5F6F7`, dark `#0A165E`, border-light `#E5E5E5`; breakpoints 540 / 768 / 1024 / 1320 px. Primary button: `#2B4DFF` fill, white text, 7 px radius.
- Homepage order (V): hero with trust banner, checklist and estimate-form card; services carousel (HVAC photos); Repair or Replace (dark/light cards); Why Homeowners Choose; "HVAC Service Made Simple" (3 illustrated steps); testimonial band (dark navy carousel); FAQ accordion; service area (town list + map); contact section; blog cards; footer. On mobile the hero form, carousels and contact form all fit the screen.
- Entrance fade-in animations: screenshots taken in the first couple of seconds look washed out; wait about 3 s.
- Images: HVAC photo sets under `src/assets/images/hvac/`; hero photo `public/images/alternative-hero-hvac.jpg`; blog and gallery images are IT-themed.
- **Reusable pieces to preserve (C from imports, V in render):** `AlternativeHeroSection` + `AlternativeHeroForm`, `ContactSectionTwo` + `ContactForm`, `TestimonialQuoteSection`, `ServicesSection`, `RepairVsReplacementSection`, `HomeownerTrustSection`, `WorkingProcessSection`, `HomepageFaqSection` / `FaqSection`, `HomepageServiceAreaShowcaseSection` / `ServiceAreaSection`, `Service*` sections (options, benefits, trust, emergency CTA), `CallToAction`, `PageHeader`, `ServicesSingle`, `Button.astro`, `DynamicIcon.astro`.

**F. Master trust indicators and testimonials (baseline, V): preserve** (reference baseline for the regression check in P9.4)
- Hero trust banner (`alternative-hero-section.md`, `trustBanner`): "5.0 Rating", "200+ Reviews", "Licensed & Insured" visible on the homepage at desktop, tablet and mobile.
- Testimonials (`testimonial.md`, `TestimonialQuoteSection`): carousel viewed on the homepage at desktop (Brooklyn Simmons, Lead Developer), tablet (Sarah Jones, Head of Engineering) and mobile (Michael Thompson, CEO). The quotes are generic IT-business text. Also on the six HVAC service pages (text match only, not viewed).

**G. Brand, contact and SEO inventory (V for rendered values, C for file search)**

*Master demo values to keep (editable):* the three trust indicators and testimonials above; the HVAC/Boston demo copy on the hero, service pages, FAQ and service-area sections. **Decision made 2026-10-14: "BlueFlame Heating & Air" is the approved master placeholder; keep it and make it easy to replace per client (P10.1).** Background: "BlueFlame Heating & Air" appears as the demo HVAC brand in about 25 files (service pages, trust sections, final CTAs, why-choose-us, service area) and is also hard-coded in `ServiceTrustSection.astro` and `[single].astro`; `CLAUDE.md` says to avoid hardcoded brand names in reusable content.

*Outdated IT-template content to clean up later (not changed):*

| Item | Where | What it says now |
|---|---|---|
| Site name, tagline, description, logo text | `src/config/config.toml` | "Techlo Lite", "Free IT Solutions & Services Astro & Tailwind CSS Theme", IT-theme description, logo text "Techlo" |
| Page titles | every page (V) | "<Page> - Free IT Solutions & Services Astro & Tailwind CSS Theme" |
| Domain / canonical / OG URL | `config.toml` `baseUrl` (V on every page) | `https://techlo-lite-astro.pages.dev/`; all pages say `index, follow` |
| SEO author and keywords | `config.toml` `[seo]` | "Getastrothemes", astro/IT-theme keywords |
| Homepage meta description | `src/content/homepage/english/-index.md` (V) | "Build reliable technology with We through expert IT strategy, software engineering, and support." |
| `/services/` meta description | (V) | "Browse our IT services, including app development, cybersecurity, cloud, automation, and support." |
| `/blog/` meta description and content | (V) | software/cloud/cybersecurity text; IT-themed posts and photos |
| `/services/alternative-services/`, `/services/hero-alternatives/` | (V) | IT demo pages with IT meta description |
| Header/footer contact | `config.toml` | phone 518-564-3200, `hello@example.com`, "1791 Yorkshire Circle Kitty Hawk, NC 279499" |
| Contact section address | `contact-section-two.md` (V) | "1800 Market Street, Suite 420, San Francisco, CA 94103", "+1 415 555 2300", `hello@example.com` |
| Emergency phone | `service-emergency-cta-section.md` (V) | 857-123-4567 (three different phone numbers on the site) |
| Contact section copy | `contact-section-two.md` (V) | "Let's build an awesome project together" and IT-project wording |
| Contact form | `contact-section.md` (V) | Budget, start date, project type, IT service dropdown (see C) |
| Footer (V, desktop) | footer content | "Let's work together" / "Let's Start a Project" CTA, IT description, links UI/UX Design, App Development, Digital Marketing, Web Development, Cyber Security, "Careers", "Copyright 2026 Your Company" |
| Homepage headings (V) | services and blog sections | "Our awesome services to give you success", "Recent blog & articles about technology" |
| Form destination | `config.toml` | `https://formsubmit.co/temp.gats@gmail.com` (placeholder) |
| Other "Techlo" strings | `Head.astro`, `FaqSection.astro`, `HomepageFaqSection.astro`, `BackToTop.astro`, `GlobalScripts.astro`, `Accordion.astro`, `site.webmanifest`, `wrangler.toml`, `package.json` | found by file search only; **not checked** whether any is visible to visitors (some may be internal names) |

**Not covered by this inventory:** a line-by-line read of every content file (About page, FAQ answers, privacy/terms, blog posts), which belongs to P9.4. Tablet width was reviewed on the homepage only.

### 10.3 P0.4 investigation findings (2026-10-14)

**How to read this:** **V** = verified by running the site (local preview of the existing production build `dist/`, built from the same source; only this plan has changed since) or by running a read-only command. **C** = from reading code, content or documentation, not run. No source, content, styling, config or dependency was changed, and `npm install` was only run as a `--dry-run` that changed nothing.

**A. Navigation facts behind the owner's navigation decisions**
- **Homepage service cards already link to their own service pages (V).** The six cards go to `/services/service-custom-slug/` (AC Repair) and `/services/service-02/` to `/services/service-06/`; "View all services" goes to `/services/`. No card links to `/#contact`, so **no change is needed there.** Other homepage links: hero "Contact Us" goes to `/#alternative-hero-form`; "Get Expert Advice" (Repair or Replace section) goes to `/#contact`; header "Get in Touch" goes to `/contact-us/`. The owner decision did not mention these three, so none is changed.
- **Request/Schedule buttons inside the six service pages (owner decision: change to `/contact-us/`).** Today they go to `/#contact` (Section 10.2-D). Where that link is written (C, by search of `src/`): the sidebar buttons in `src/pages/[...lang]/services/[single].astro` (6 occurrences), the six `*-options-section.md` files and the six `*-final-cta.md` files in `src/content/sections/english/`. The same `/#contact` text also appears outside the service pages' own content, in `src/config/config.toml` (1), `call-to-action.md`, `call-to-action-widget.md`, `banner-three.md`, `src/layouts/shortcodes/CardWrapper.astro` (2), and as `#contact` in `repair-vs-replacement-section.md` and `why-choose-us-section.md`. **Decided 2026-10-14: those global and other-page buttons stay unchanged for now**; whoever changes the service-page buttons must still read each rendered button's link before and after the change so that only the in-page service buttons change.
- **Newly found pre-existing defect (V, not fixed): the header Services menu item "AC Repair" links to `/services/service-01/`, which is a 404.** The AC Repair page is actually served at `/services/service-custom-slug/` because `service-01.mdx` sets `customSlug`. The link is in `src/config/menu.en.json` (also used by the mobile menu); the homepage card and the service pages use the correct slug.
- **Footer links (V, C):** the footer "Services" column has IT labels pointing at HVAC pages (UI/UX Design and App Development and Web Development go to service-05 or service-02, Digital Marketing to service-03, Cyber Security to service-06), and "Careers" links to `/`. Same file, `menu.en.json`. Part of the approved template cleanup.

**B. Can an `/owner/` area coexist with the existing routes?**
- Current behaviour (V): the site is single-language (`src/config/language.json` has only `en`; `showDefaultLangInUrl = false`), so public pages sit at the root and `/en/` is a 404. All public pages come from `src/pages/[...lang]/` with `getStaticPaths`; `[...lang]/[page].astro` generates only the `pages` collection entries (privacy-policy, terms-conditions). `/owner/`, `/owner/login/` and `/admin/` return 404 today, so **nothing collides now.**
- `trailingSlash` is `always` (`config.toml`). Astro answers `/api/leads` with a 404 that mentions the trailing slash (V), so endpoint URLs must be written with the trailing slash (for example `/api/leads/`).
- Astro routing docs (C): more path segments beat fewer; static (no-parameter) routes beat dynamic ones; named parameters beat rest parameters; prerendered dynamic routes beat on-demand dynamic ones; endpoints beat pages. The docs do not discuss this exact `[...lang]/[page]` plus `owner/` combination, so "no collision" is **an inference to confirm** with the P1.1 test route and a full rebuild.
- On-demand docs (C): with the default static output, an adapter plus `export const prerender = false` on individual pages or endpoints keeps the rest of the site static; `Astro.cookies`, `Astro.redirect()` and `Astro.request` are available on on-demand routes. The page does not describe POST endpoints specifically; confirm in P1.1.
- Owner area should: use its own layout (not `Base.astro`, which carries the public header, footer and metadata); be added to `[seo.sitemap] exclude` and `[seo.robotsTxt] disallow` in `config.toml` (both exist and are empty now) and carry a `noindex` tag; avoid logging search terms in query strings, since they may contain customer details.

**`/owner/` URL structure: APPROVED 2026-10-14 as target routes (compatibility and functionality still to be verified during implementation):**

| URL | Purpose |
|---|---|
| `/owner/login/` | Owner login |
| `/owner/` | Dashboard overview: all-time, today and this-month counts, recent inquiries |
| `/owner/leads/` | Leads Inbox: view and search (search term in a query string such as `?q=`) |
| `/owner/leads/[id]/` | Individual lead details |
| *(logout)* | Not an approved route; the exact logout implementation is decided in the authentication phase (P4.1) |
| *(submission endpoint)* | Not an approved route; its path is decided in P3.1. Suggestion: `/api/leads/` (trailing slash required), outside `/owner/` |

This follows the approved flow exactly, keeps the owner pages in one folder (`src/pages/owner/`, outside `[...lang]`, English only), and drops `/owner/settings/` from V1. Compared with the plan's earlier proposal it only removes the settings page.

**C. Source-page attribution: REJECTED for V1 (owner decision 2026-10-14)**
Today neither form sends a source (V). The earlier proposal (fixed form identifiers, a `?source=` query string on service-page links and server-side allowlists) is **withdrawn**: there is no source tracking of any kind in V1. The plan was adjusted so that no database, dashboard, form, Sheets or test requirement assumes a source field. If tracking is ever wanted, it would be a new owner decision after V1.

**D. Phase 1 preparation (npm metadata and a `--dry-run`, plus official Astro documentation)**
- **Order matters:** `@astrojs/node` 11.1.7 (latest) needs `astro ^7.2.1` (npm peer dependency); installed Astro is 7.0.3. So the security upgrade must come before the adapter.
- **Dry run (nothing changed on disk; `git status` stayed clean)** of `npm install astro@7.3.8 @astrojs/markdown-remark@7.3.2 @astrojs/mdx@7.0.8 sharp@0.35.5` resolved with no conflicts: 52 packages changed, 18 added, 14 removed (for example `devalue` 5.8.1 to 5.9.4, `nanoid` 3.3.15 to 3.3.20, `cookie` 1.1.1 to 2.0.1, `diff` 8 to 9). It also upgrades `satteri` (0.9.3 to 0.10.5) and `@astrojs/markdown-satteri` (0.3.2 to 0.4.3), packages Astro already uses for Markdown (corrected 2026-10-14 from an earlier "adds" wording); **whether Markdown output changes is unknown** and must be tested by comparing built HTML before and after. `astro@7.3.8` requires `@astrojs/markdown-remark ^7.3.0` as a peer (the cause of the earlier failed `npm audit fix` dry run), Node `>=22.12.0` (installed v24.17.0 is fine), and depends on `devalue ^5.9.4`, `smol-toml ^1.9.0` and `svgo ^4.1.0`, the fixed lines for those findings. The `sharp` entry in `package.json` (`^0.34.5`) must change to the 0.35 line for the `sharp` fix; the Astro, `markdown-remark` and `mdx` updates stay inside the declared ranges (lockfile-only). Whether Astro's own `sharp` requirement matches 0.35.5 was not shown by the metadata check.
- **Dry-run detail (repeated 2026-10-14, nothing changed):** the top level would get `astro` 7.3.8, `@astrojs/markdown-remark` 7.3.2, `@astrojs/mdx` 7.0.8, `sharp` 0.35.5, `devalue` 5.9.4, `smol-toml` 1.9.1, `svgo` 4.1.0, `postcss` 8.5.30, `source-map-js` 1.2.2, `nanoid` 3.3.20, `vite` 8.1.0 to 8.3.4 and `zod` 4.4.3 to 4.6.7. The dry run also lists a second, nested `sharp` 0.34.5 and a nested `@astrojs/markdown-remark` 7.2.4 staying in the tree (probably required by `@realfavicongenerator/image-adapter-node` and `@astrojs/mdx` respectively; not confirmed). Packages the dry run does not change, and which are therefore expected to remain in `npm audit`: `js-yaml`, `toml` (unless its optional update is taken), `fast-uri`, `image-size`/`svgdom`/the favicon adapter, `postcss-selector-parser`/`@tailwindcss/typography`, `argparse`/`sprintf-js`, `http-cache-semantics` and the nested `sharp` 0.34.5. The audit run after the upgrade will say for certain.
- **Astro changelog notes (C; summary of the 7.3.6 to 7.3.8 entries only, earlier versions were not visible; confirm in the official docs when planning):** with the Node adapter the `Host` header is validated against `security.allowedDomains` (7.3.8), so the real domain must be configured before deployment (P8); `security.checkOrigin` applies only to the content types the docs describe, so cross-origin JSON requests are not rejected (7.3.7), which means our JSON `POST` endpoint needs its own Origin/CSRF check or a form-encoded submission (decide in P3.1); build tooling moved from esbuild to Vite's Oxc/Rolldown (7.3.8).
- **Adapter docs (C):** `@astrojs/node` in `standalone` mode runs with `node ./dist/server/entry.mjs`, reads `HOST` and `PORT`, serves client files from `dist/client/`, and the docs include a Docker example. **Knock-on effects found in the repo (V/C):** `scripts/remove-draft-from-sitemap.mjs` hardcodes the `dist` folder (so the build step that runs after `astro build` would fail to find the sitemap once output moves to `dist/client`); `netlify.toml` and `wrangler.toml` publish `dist`; `vercel.json` builds with `vercel.sh`. Those static-hosting files are historical for this project, and what to do with them is a P8 decision. There are no GitHub Actions workflows (`.github/` holds only `copilot-instructions.md`).

**First coding task: P1.1a, dependency security upgrade only, on a dedicated branch (for example `phase-1/astro-security-upgrade`). The task is approved (2026-10-14); the exact package changes and test plan below still need owner approval before any dependency is changed.** No adapter, no new routes, no UI or content changes.
1. Owner approves the exact package list: `astro` 7.3.8, `@astrojs/markdown-remark` 7.3.2, `@astrojs/mdx` 7.0.8, `sharp` 0.35.5 (and optionally `toml` 4.3.0, inside its range).
2. Before changing anything, build once and keep a copy of the current `dist/` outside the repository as the "before" build.
3. Make the change on the branch; run `npm ci`, `astro-check`, `build` and `npm audit`; record each remaining finding with a reason.
4. Compare the built HTML for all 32 pages before and after, then repeat the P0.3 checks (16 routes plus the 404, no overflow, trust indicators, testimonials, both forms render, hero multi-select value).
5. Owner reviews the diff; merge through a pull request.

Then **P1.1b**: add `@astrojs/node` 11.1.7 with static output unchanged, one harmless on-demand test route, fix the sitemap script path, and re-run the same checks. Why this order and size: it is the smallest change that clears the critical Astro advisory and unblocks the adapter, it keeps upgrade risk separate from adapter risk, and it is one easy-to-revert commit. Alternatives rejected: adapter first (the peer dependency forbids it); upgrade and adapter together (breakage could not be attributed); postponing the upgrade to P8 (contradicts the P1.1 security gate).


### 10.4 P1.1a results: dependency security upgrade (2026-10-15)

**Status (updated 2026-10-15): complete and merged into `main` through GitHub PR #1 (merge commit `a4bf69f`).** Implemented and verified on branch `phase-1/astro-security-upgrade` (created from `main` at `4ce3f61`; dependency commit `ddf8f92`, plan commit `c102852`). Not deployed. The text below is the record written before the merge. No P1.1b work, adapter, route, form, content or style change was made. P1.1b and all backend work remain unchecked.

**Environment:** Windows 11; Node v24.17.0; npm 11.13.0; baseline build made from `main` after a clean `npm ci` (32 pages, saved outside the repository for comparison).

**Installed versions (direct):** `astro` 7.0.3 to **7.3.8**; `@astrojs/markdown-remark` 7.2.0 to **7.3.2**; `@astrojs/mdx` 7.0.0 to **7.0.8**; `sharp` 0.34.5 to **0.35.5**. `package.json` changed only on those four lines (the minimum of each caret range now equals the installed version, so a fresh install cannot resolve the older vulnerable versions). `toml` stays at 4.1.1 (optional upgrade deliberately excluded). Notable indirect updates: `devalue` 5.9.4, `smol-toml` 1.9.1, `svgo` 4.1.0, `postcss` 8.5.30, `vite` 8.3.4, `zod` 4.6.7, `nanoid` 3.3.20, `source-map-js` 1.2.2, `cookie` 2.0.1, `rolldown` 1.2.14. Astro 7.3.8 no longer pulls in `esbuild`.

**Dependency review (lockfile compared with `main`; all checks run on the final committed files):**
- Root dependency ranges changed only for the four approved packages; `overrides` unchanged; `lockfileVersion` 3 unchanged. The lockfile changed 97 package entries, added 67 and removed 48 (mostly platform-specific binaries of the same trees); `npm ls` is consistent (exit 0).
- Every changed or added entry resolves from `https://registry.npmjs.org/` and has an integrity hash; no git, URL or file sources. `npm audit signatures`: all 509 packages have verified registry signatures.
- New install scripts: none (the only packages with install scripts are `fsevents` and the nested `sharp` 0.34.5; `esbuild`'s install script is gone). No change to `package.json` scripts.
- The new non-binary packages `undici` 8.12.1 (through `unifont`), `find-proc` 0.2.0 and `verkit` 0.5.0 are dependencies of `astro` 7.3.8 (traced with `npm explain`); all are dev-time here. Nested copies that remain by design: `@astrojs/mdx` pins its own `@astrojs/markdown-remark` 7.2.4 (not flagged by audit; MDX content is processed by this copy), and `@realfavicongenerator/image-adapter-node` pins `sharp` 0.34.5 (flagged, see below).
- Review was done by the primary session with scripts; no separate subagent review was run. Not every file in the generated `_astro/` folder (355 files, mostly images) was compared individually (see below).

**Test results (production build of the upgraded branch, served locally with `astro preview`; the dev server was not re-run):**

| Check | Result |
|---|---|
| `npm ci` | Pass |
| `npm run astro-check` | 144 files: 0 errors, 0 warnings, 0 hints |
| `npm run build` | Pass; 32 pages; sitemap created; no warnings |
| Routes | The 16 real routes, `sitemap-index.xml`, `sitemap-0.xml` and `robots.txt`: 200 |
| 404 | Real HTTP 404 with the custom "Page Not Found" page; `/owner/` is still a 404 |
| Overflow | 17 URLs (16 routes plus the 404) at 375, 768 and 1280 px: 0 horizontal overflows (51 checks) |
| Images and links | 0 broken images on those pages; all 1,708 local link and asset references exist (identical to the baseline; the only missing target is the known `/services/service-01/` menu link) |
| Sitemap | Byte-identical to the baseline build |
| Trust indicators | `5.0 Rating`, `200+ Reviews`, `Licensed & Insured` render on the homepage (screenshots and text check) |
| Testimonials | The three testimonial names appear on the same 7 pages before and after (homepage plus the six HVAC service pages); homepage carousel viewed and its next button works. Service-page testimonials were confirmed in the built HTML, not visually |
| Hero form | Six service options render; Full Name, Phone, Email and services required; selecting "AC Repair" and "Preventive Maintenance" gives `AC Repair, Preventive Maintenance`, the same serialization as the baseline; empty submit shows validation and sends nothing |
| Contact form | Renders with the same fields (still the IT-themed ones); empty submit fails validation and sends nothing |
| Interactions | Services dropdown (hover), mobile menu, homepage FAQ accordion, sticky header scroll-up/down classes, back-to-top, blog search (filter, no-results message, clear) all work |
| Git | Only `package.json` and `package-lock.json` changed |

No form was submitted. `fetch` and `XMLHttpRequest` were replaced in the page with stubs during the form checks and recorded zero network attempts, so nothing could reach the placeholder `formsubmit.co` address.

**Generated output differences (baseline `dist/` compared with the upgraded `dist/`):** every one of the 32 HTML files changes byte for byte, for these reasons only: (1) content-hashed asset file names and their references; (2) the generator tag `Astro v7.0.3` to `v7.3.8`; (3) three inline scripts (sticky header, back-to-top, blog search) re-minified by Astro's new Rolldown-based toolchain, with the logic read and found equivalent (statements rewritten as expressions); 83 other inline scripts are byte-identical; (4) one blog image now uses the file name `cloud-operations-platform` instead of `cyber-resilience-playbook` (identical content hash, so it is the same image). The compiled stylesheet is 0.18% larger: the same rules, with the "fully rounded" radius written as `2147483647px` instead of `3.4e38px` and extra `-webkit-` prefixes. No text, link, image-set, form-markup or sitemap difference was found. External JavaScript bundles were rebuilt by the new bundler and were checked by behaviour (the interactions above), not by line-by-line comparison.

**`npm audit` after the upgrade: 12 flagged packages (8 high, 4 moderate, 0 critical); before: 19 (1 critical, 14 high, 4 moderate).** `npm audit --omit=dev`: **0 vulnerabilities**. Cleared: `astro` (including the critical AVIF/`libheif` advisory GHSA-26w7-cxv4-gfx2 and the other Astro advisories), `devalue`, `smol-toml`, `svgo`, `postcss`, `nanoid`, `source-map-js`. Remaining, with where each runs (none ships in the built static site, and none is a visitor-facing server dependency today):

| Package (installed) | Severity | Why it is still there and where it runs | Treatment |
|---|---|---|---|
| `fast-uri` 3.1.2 (8 advisories) | high | Through `ajv` from `@astrojs/check` and the YAML language server; type-check tooling only | Build/dev only. An in-range update (3.1.8) is listed by `npm audit fix --dry-run` |
| `http-cache-semantics` 4.2.0 | high | Required by `astro` 7.3.8; advisory is about cross-user cached responses. How Astro uses it at run time is **not verified** | Re-evaluate when the Node adapter is added (P1.1b/P8); in-range update 4.3.0 listed by the dry run |
| `js-yaml` 3.15.0 (via `gray-matter`) and 4.3.0 (Astro internals); `argparse` 1.0.10 and `sprintf-js` 1.0.3 (under the 3.x copy) | high / moderate | CPU-exhaustion advisories when parsing YAML; they parse only project-authored front matter at build time | Build only. Never feed customer-supplied text to these parsers. In-range updates (3.15.2, 4.3.2) are listed by the dry run; their effect on the audit was not tested |
| `toml` 4.1.1 | high | Reads `src/config/config.toml` in `scripts/toml-watcher.mjs` at dev/build time | Build only; the optional upgrade to 4.3.0 was excluded from P1.1a by owner decision |
| `image-size` 1.2.1 and `svgdom` 0.1.23 | high | Only through the favicon generator (`scripts/generate-favicons.mjs`, run by hand); malformed-image denial of service | Dev tool only. Update path is a newer `@realfavicongenerator/*` 0.8.x per the dry run (not applied) |
| `sharp` 0.34.5 nested under `@realfavicongenerator/image-adapter-node` (and that adapter) | high | Pinned by the favicon adapter; used only by the manual favicon script; audit reports no fix available. The top-level `sharp` that Astro uses is 0.35.5 and is not flagged | Dev tool only; revisit when the favicon packages release a fix |
| `postcss-selector-parser` 6.0.10 and `@tailwindcss/typography` 0.5.20 | moderate | Tailwind build-time CSS processing of project-authored CSS | npm's suggested "fix" is a downgrade to 0.5.4 and **must not be used**; wait for an upstream fix |

`npm audit fix --dry-run` (nothing applied; not re-audited) lists in-range updates that could clear most of these: `fast-uri`, `http-cache-semantics`, `js-yaml` (both), `image-size`, `svgdom`, the favicon packages and `toml`. **Optional follow-up (needs separate owner approval, not part of P1.1a):** a lockfile-only task to apply them on its own branch, then repeat `astro-check`, `build`, the baseline checks and `npm audit`. *(Carried out afterwards; see Section 10.5.)*

**Follow-up security requirements for later phases (not done):**
- Re-run `npm audit` and `npm audit --omit=dev` on the P1.1b branch after the adapter is added and again before any deployment; new advisories appear continuously, so this is a recurring gate, not a one-time check.
- When the production Docker image is defined (P8), confirm which packages ship in the runtime image (Astro is a devDependency here) and re-evaluate `http-cache-semantics`, `sharp` and the YAML/TOML parsers against what actually runs on the server.
- The server-side notes in Section 10.3-D still apply on the installed Astro 7.3.8: configure `security.allowedDomains` with the real domain before deployment, and give the JSON lead endpoint its own Origin/CSRF check because `security.checkOrigin` does not reject cross-origin JSON requests.
- `sharp`/AVIF: V1 has no customer image uploads; if untrusted images are ever processed, review the image pipeline first.
- Do not pass customer-supplied YAML, TOML or SVG/image data to the build-tool parsers listed above.

**Limitations of this verification:** the production build was tested with `astro preview`, not the dev server; the browser checks used hidden same-origin frames, one live tab and spot checks, not a full visual comparison of every page at every width (no screenshot files were saved); the console review of all 16 routes in one fresh tab kept only the last page's output (empty), so earlier pages were covered by the broken-asset and reference checks instead; the form submit and success/error paths were not run; testimonial and trust-indicator checks on service pages were by text match. A successful build is not proof of complete behavioural equivalence or of complete security.

**Pre-existing defects, unchanged and preserved (not part of P1.1a):** the header Services menu "AC Repair" link goes to `/services/service-01/` (404; Sections 10.1 item 8 and 10.3-A; fix scheduled in P3.4); the contact form's IT-themed fields and the other leftover template content listed in Section 10.1 item 5; its service `<select>` logs the browser message "An invalid form control with name='Service' is not focusable" on an empty submit (seen identically on the baseline build); `/does-not-exist/` 404 console lines are the intentional test.

### 10.5 P1.1a audit follow-up: remaining vulnerabilities (2026-10-15)

**Status:** implemented and verified on local branch `phase-1/security-audit-followup` (created from `main` at `a4bf69f`, after PR #1). *(Historical, written before the merge: the work was committed and pushed as dependency commit `9f2b9c4` plus plan-update commits, with GitHub PR #2 open and awaiting review.)* **Current status (updated 2026-10-15): complete and merged into `main` through GitHub PR #2 (https://github.com/jonexe2/astro-MASTER-flyio/pull/2), merge commit `86217155e79b0bfe95fd5335d84e8a2067476f2f`.** Not deployed. No P1.1b work, adapter, route, form, content or style change was made in this follow-up; P1.1b was done separately (Section 10.6).

**What changed (2 files: `package.json`, `package-lock.json`):** `npm audit fix` without `--force` (lockfile only; it did not touch `package.json`), plus the previously deferred `toml` update. No override was added and no `--force` was used.

| Package | Before | After | Notes |
|---|---|---|---|
| `toml` (direct) | 4.1.1 | **4.3.0** | `package.json` minimum raised from `^4.1.1` to `^4.3.0`. `config.toml` parses to identical JSON with 4.1.1 and 4.3.0 (compared directly); the build step that reads it passes |
| `http-cache-semantics` | 4.2.0 | **4.3.0** | Required by `astro`; Astro uses it only in `astro/dist/assets/build/remote.js` to compute cache lifetime of remote images fetched at build time. This project has no remote images; no server use today (re-check when the adapter is added in P1.1b) |
| `fast-uri` | 3.1.2 | **3.1.8** | Type-check tooling only (`@astrojs/check` language server via `ajv`) |
| `js-yaml` | 3.15.0 and 4.3.0 | **3.15.2 and 4.3.2** | `gray-matter` (3.x copy) and Astro internals (4.x copy); project-authored YAML at build time |
| `image-size` / `svgdom` | 1.2.1 / 0.1.23 | **2.0.4 / 0.1.29** | Favicon generator only; `image-size` 2.x is the range declared by `svgdom` 0.1.29 itself (a transitive major, not forced) |
| `@realfavicongenerator/generate-favicon` and `image-adapter-node` | 0.8.3 | **0.8.6** | Within the existing `^0.8.3` ranges; `npm run generate-favicons` was run once and works with the updated tooling (see limitations) |

Two unused transitive packages (`inherits`, `queue`) were removed from the lockfile; nothing was added. Every changed entry resolves from `registry.npmjs.org` with an integrity hash; no new install scripts; `npm audit signatures`: 507 packages with verified registry signatures; `npm ls` consistent.

**Installed versions after the follow-up:** `astro` 7.3.8, `@astrojs/markdown-remark` 7.3.2, `@astrojs/mdx` 7.0.8, `sharp` 0.35.5 (unchanged from P1.1a), `toml` 4.3.0, `http-cache-semantics` 4.3.0, `fast-uri` 3.1.8, `js-yaml` 3.15.2 and 4.3.2, `image-size` 2.0.4, `svgdom` 0.1.29.

**`npm audit` result: 8 flagged packages (2 high, 6 moderate, 0 critical); before: 12 (8 high, 4 moderate). `npm audit --omit=dev`: 0 vulnerabilities.** Cleared: `fast-uri`, `http-cache-semantics`, `image-size`, `svgdom`, `toml`. Remaining, none of which runs in the built static site or in a visitor-facing server today:

| Package (installed) | Severity | Why no safe fix exists | Where it runs / relevance |
|---|---|---|---|
| `sharp` 0.34.5 (nested) and `@realfavicongenerator/image-adapter-node` 0.8.6 | high | The adapter pins `sharp ^0.34.5`; its latest release (0.9.0) still does, so no upstream fix exists. The only workaround would be an `overrides` entry forcing `sharp` 0.35 into the adapter, which is speculative and was not done | Manual favicon script only. The `sharp` that Astro uses is the top-level 0.35.5 and is not flagged |
| `@tailwindcss/typography` 0.5.20 and `postcss-selector-parser` 6.0.10 | moderate | Typography pins `postcss-selector-parser` exactly at 6.0.10 and 0.5.20 is its latest release; npm's suggested fix is a downgrade to 0.5.4 and must not be used | Tailwind build-time processing of project-authored CSS |
| `sprintf-js` 1.0.3, `argparse` 1.0.10, `js-yaml` 3.15.2 (nested under `gray-matter`) and `gray-matter` 4.0.3 | moderate | `js-yaml` 3.15.2 is patched itself; it is still flagged only through `argparse` 1 and `sprintf-js` (denial of service via unbounded precision specifiers). No fixed `sprintf-js` exists (its latest release, 1.1.3, is in the vulnerable range), `argparse` 1 pins it, and `gray-matter` 4.0.3 is its latest release; npm's suggested fix is a downgrade to `gray-matter` 2.0.1 | `gray-matter` is used only in `scripts/remove-draft-from-sitemap.mjs` at build time, on project-authored front matter; `sprintf-js` formats argparse's own help text and is not fed external input here |

**Follow-up needed for the remaining 8:** recheck `npm audit` at each phase start and before deployment; update when upstream releases fix `@realfavicongenerator/image-adapter-node` (`sharp`), `@tailwindcss/typography` (`postcss-selector-parser`) or `sprintf-js`/`argparse`. Optional, each needs separate owner approval: replace `gray-matter` in the sitemap script with a small front matter reader (a code change); test an `overrides` entry for `sharp` in the favicon adapter by running the generator and comparing output. Do not use `npm audit fix --force`. The server-side requirements listed in Section 10.4 (re-run the audit on the P1.1b branch and before deploy; decide what ships in the production image; `security.allowedDomains`; own Origin/CSRF check for the JSON endpoint; never pass customer-supplied YAML, TOML or images to build-tool parsers) still apply.

**Test results (production build served locally with `astro preview`; dev server not run):**

| Check | Result |
|---|---|
| `npm ci` | Pass |
| `npm run astro-check` | 144 files: 0 errors, 0 warnings, 0 hints |
| `npm run build` | Pass; 32 pages; sitemap created; no warnings or errors |
| Built output vs `main` | The whole `dist/` folder is **byte-identical** to the build of `main` (`diff -rq`: no differences; 32 HTML files identical), so pages, forms, navigation, layouts, images, sitemap, trust indicators and testimonials are unchanged in the shipped site |
| Routes | The 16 real routes, `sitemap-index.xml`, `sitemap-0.xml` and `robots.txt`: 200; `/does-not-exist/`: 404 |
| Links and assets | 1,708 local references checked; only the known `/services/service-01/` menu link is missing (same as `main`) |
| Content spot check | `5.0 Rating`, `200+`, `Licensed` and a testimonial name present on the homepage |
| `toml` | `config.toml` parses identically with 4.1.1 and 4.3.0 |
| Favicon generator | `npm run generate-favicons` ran successfully with the updated packages; the output differs from the committed favicons in all 7 generated files. One difference is explained: the manifest name is `Techlo Lite` (from the configuration) versus the committed `Techlo`. **The PNG, ICO and SVG differences (for example `favicon.ico` 1,197 bytes committed versus 15,086 generated) were not investigated**: the generator was not run with the old package versions, so it is **not known** whether the updated favicon packages, `sharp` or `svgdom` contribute to them or whether the committed files simply came from a different source image or settings. The generated files were therefore **not kept**: `public/images/favicons` was restored and verified identical to `main`. If the favicons are ever regenerated, review the output visually first |
| Git | Only `package.json` and `package-lock.json` changed (plus this plan) |

**Limitations:** because the built site is byte-identical to `main`, no new browser walkthrough of forms, responsive layouts or testimonials was run for this follow-up; the P1.1a browser results (Section 10.4) still describe the shipped output. Build/dev tooling was checked by running `astro check`, `build`, and the favicon script once; the dev server, the favicon output fidelity (the cause of the PNG/ICO/SVG differences is unknown, see the favicon row above) and the forms' submit paths were not tested. A successful build is not proof of complete security.

**Pre-existing defects, unchanged and preserved:** see Section 10.4 (the `/services/service-01/` menu 404, IT-themed contact form and other leftover template content).

### 10.6 P1.1b results: Astro Node server foundation (2026-10-15)

**Status:** implemented and verified locally on branch `phase-1/p1-1b-node-server-foundation` (created from `main` at `86217155e79b0bfe95fd5335d84e8a2067476f2f` after a fast-forward-only sync of local `main` to `origin/main`; remote `origin` = `https://github.com/jonexe2/astro-MASTER-flyio.git`). **Owner-approved on 2026-10-15 after review; committed locally as `b7ec83a` (code and dependencies; this plan update is committed separately); not pushed, no pull request, not deployed.** The owner accepted the 8 remaining audit findings "for now" and stated that no Netlify, Vercel or Cloudflare deployment is connected to this repository (owner statement, not independently checked). Not called complete until it is pushed, reviewed in a pull request and merged into `main`. No database, authentication, dashboard, form-submission, Resend or Google Sheets work was done, and no public page, content, style or form file was changed.

**Environment:** Windows 11; Node v24.17.0; npm 11.13.0; `astro` 7.3.8. The pre-change baseline build (32 pages) was made from clean `main` and kept outside the repository for byte comparison.

**Files changed (4 tracked, 1 new):** `package.json` (one line: `"@astrojs/node": "11.1.7"` in `dependencies`), `package-lock.json`, `astro.config.mjs` (import plus `adapter: node({ mode: "standalone" })`; `output` left at its default `static`), `scripts/remove-draft-from-sitemap.mjs`, and new `src/pages/api/health.ts`.

**Adapter compatibility and choice:** the official `@astrojs/node` docs and the on-demand rendering docs were read. `@astrojs/node` 11.1.7 (published 2026-10-06) declares peer `astro ^7.2.1`; installed `astro` 7.3.8 satisfies it and `npm ls` shows one deduplicated `astro`. Version 11.1.8 was published on 2026-10-15 (the day of this work); it was **not** adopted, to stay on the version the plan approved (it has the same peer range and can be reviewed separately). Pinned exactly (no caret). It sits in `dependencies`, not `devDependencies`, because the server entry imports it at run time. `standalone` mode was chosen because the plan's single Dockerized Node application needs the adapter's own server (middleware mode would need Express or similar, which is not planned).

**Rendering strategy (D02 recommendation, implemented):** `output` stays `static`. All 32 existing pages and `robots.txt` remain prerendered. Only routes that export `prerender = false` run on the server (today only `/api/health/`). Making every page on demand was rejected: the docs state `server` output adds no capability, only changes the default, and it would put the whole public site on the Node process.

**Lockfile and dependency review:** lockfile compared with `main`: 19 packages added (`@astrojs/node`, `send` 1.2.1 and its small dependency tree, `server-destroy`, a hoisted `@astrojs/internal-helpers` 0.12.0), 2 hoisted duplicates removed, **0 existing packages changed version**. All 19 resolve from `registry.npmjs.org` with integrity hashes; licenses MIT or ISC; no install scripts; `npm audit signatures`: 524 packages with verified registry signatures; `npm ls` exit 0.

**Server route `GET /api/health/` (`src/pages/api/health.ts`):** returns `{"status":"ok","serverTime":"<ISO time>"}`, status 200, `Content-Type: application/json`, `Cache-Control: no-store`. It reads no environment variables, request data or files and exposes no configuration or customer data. Observed on the production server: `GET` 200 (time changes per request, proving on-demand rendering); `HEAD` 200; `POST` 404 (Astro answers 404, not 405, for a method with no handler and logs a router warning); `/api/health` without the trailing slash redirects 301 to `/api/health/`, consistent with `trailingSlash = "always"`; `/api/` and `/api/leads/` are 404. The route also worked on the dev server. No static HTML is generated for it (`dist/client` has no `api` folder; it is a server chunk).

**Build output with the adapter:** `dist/client/` (prerendered files, `_astro/`, sitemap, robots) and `dist/server/` (`entry.mjs`, chunks). **The whole of `dist/client` is byte-identical to the pre-adapter build (`diff -rq`: no differences, 32 HTML files in both).** Production start: `HOST=127.0.0.1 PORT=<port> node ./dist/server/entry.mjs`.

**Sitemap script (`scripts/remove-draft-from-sitemap.mjs`):** *Finding:* after adding the adapter the old script, which only looked in `dist/`, found no sitemap files and **still printed "Sitemaps processed successfully"**, silently skipping all draft/exclusion filtering (the raw sitemap landed in `dist/client` unprocessed). *Fix:* it now processes `dist/client` when that folder exists and `dist` otherwise (so both layouts work), and, if the sitemap is enabled in the configuration but no `sitemap-N.xml` is found, exits with code 1 and a clear message instead of reporting success. Filtering logic is unchanged. *Tests (all actually run):* real build: sitemap byte-identical to the baseline's processed sitemap; flat `dist/` layout with a planted `-index` URL: removed, exit 0; sitemap missing: exit 1 with message; no `dist`: exit 1 (existing behaviour). *Draft/exclusion test:* there is **no** real draft or `excludeFromSitemap` page today, so two temporary content files were used (then deleted): a page with `excludeFromSitemap: true` was built but **removed from the sitemap**; a page with `draft: true` was **not built** (404). Final sitemap: 31 URLs, identical to the baseline.

**`/owner/` coexistence (temporary pages, all removed afterwards; no owner feature implemented):** four throwaway on-demand pages were created at `/owner/`, `/owner/login/`, `/owner/leads/` and `/owner/leads/[id]/`, then built and served. All returned 200 with the trailing slash (a `?q=` query string and a dynamic id were read correctly); `/owner` and `/owner/leads` redirect 301 to the slash form; the catch-all `[...lang]` routes did not interfere and all 16 public routes still returned 200 with unchanged HTML. No static HTML was generated for the owner pages (they are server-only). **Important finding:** `@astrojs/sitemap` **does list on-demand pages** (`/owner/`, `/owner/leads/` and `/owner/login/` appeared in `sitemap-0.xml`). With `[seo.sitemap] exclude = ["/owner/"]` and `[seo.robotsTxt] disallow = ["/owner/"]` set temporarily in `src/config/config.toml`, the sitemap dropped them (back to 31 URLs) and `robots.txt` gained `Disallow: /owner/`. That configuration change is **not applied** in this task (the owner pages do not exist); it is a **required step when the owner pages are built (P4/P5)**, together with a `noindex` tag. Use the exact value `"/owner/"`: the script excludes by substring match on the URL path, so a bare `owner` would also remove unrelated URLs containing that word (for example "homeowner"). The `config.toml` edit was reverted (`git diff` shows no change).

**Test results:**

| Check | Result |
|---|---|
| `npm ci` (final) | Pass; 524 packages |
| `npm run astro-check` (final) | 145 files: 0 errors, 0 warnings, 0 hints |
| `npm run build` (final) | Exit 0; 32 prerendered pages; sitemap created and processed; no warnings or errors |
| Built static files vs pre-adapter baseline | `dist/client` byte-identical |
| Production Node server | Started with `node ./dist/server/entry.mjs`; `/api/health/` 200 |
| Routes on the production server | The 16 real routes, `sitemap-index.xml`, `sitemap-0.xml`, `robots.txt`: 200. `/does-not-exist/`, `/en/`, `/owner/`, `/admin/`, `/api/`: 404 (custom "Page Not Found" page). `/services/service-01/`: 404 (the known menu defect). Homepage, `/contact-us/`, `/services/service-02/` and `/blog/post-1/` served byte-identical to the baseline files |
| Production-only install (`npm ci --omit=dev`, 299 packages) | The built site and `/api/health/` run from it (homepage, contact page, service page 200, 404 page 404); `npm audit --omit=dev` 0 |
| Dev server (`npm run dev`) | `/api/health/`, homepage, contact, service and blog pages 200; 404s correct; the `getStaticPaths` router warnings printed for 404 URLs are normal |
| Responsive (production server, 17 URLs x 375/768/1280 px, hidden same-origin frames) | 51 checks: 0 horizontal overflows, 0 broken images (images already loaded at the time of the check) |
| Links and assets | 3,533 local references in the built HTML checked against `dist/client`; only `/services/service-01/` (64 references, the known menu defect) is missing |
| Trust indicators | `5.0 Rating`, `200+ Reviews`, `Licensed & Insured` present on `/` at all three widths and visible in desktop, tablet and mobile screenshots |
| Testimonials | Homepage carousel viewed at tablet (Sarah Jones) and mobile (Brooklyn Simmons, then Michael Thompson after clicking next); names present in the page; the other pages' testimonials are unchanged because their HTML is byte-identical to the baseline |
| Hero form | Fields `fullName`, `phone`, `email`, `services` all required; six service options; selecting AC Repair + HVAC Installation gives `AC Repair, HVAC Installation`, three picks give `3 services selected`, clearing empties the value; empty submit shows "Please complete all required fields."; bad email fails validation |
| Contact form | Same IT-themed fields as the baseline (`Name, Email, Budget, Start Date, Service, Project Type, Preferred Contact, Message, Consent`); empty submit flags `Name,Email,Service,Message,Consent` |
| No form submission | `fetch`, `XMLHttpRequest` and `sendBeacon` were replaced in the page with blockers; **zero network attempts were recorded**; nothing could reach the placeholder `formsubmit.co` address. No valid submission was made |
| Other interactions | FAQ accordion opens; mobile menu opens (screenshot); testimonial next button works; blog search filters, shows the no-results message, restores on clear and escapes HTML (focused rerun, see Limitations) |
| Browser console | Only four entries over the whole session: three 404s from the deliberate `/does-not-exist/` loads and the known pre-existing `An invalid form control with name='Service' is not focusable` (empty submit of the contact form) |

**`npm audit` reassessment with server functionality introduced:** `npm audit`: **8 flagged packages (2 high, 6 moderate, 0 critical), the identical set as in Section 10.5**; `npm audit --omit=dev`: **0**. Nothing new appeared and no finding was fixed by this task (the adapter added no flagged package). Reassessed against what the server actually runs: (1) The server entry imports only Astro runtime packages (`astro` internals, `devalue`, `cookie`, `send`, `server-destroy`, `zod`, `unstorage`, `sharp`, and similar). A runtime-only install (`npm ci --omit=dev`, which includes `astro` through the adapter's peer dependency) contains **none** of the 8 flagged packages (`js-yaml`, `gray-matter`, `argparse`, `sprintf-js`, `@tailwindcss/typography`, `postcss-selector-parser`, the favicon adapter and its nested `sharp` 0.34.5 are absent) and audits clean. In that tree `sharp` is 0.35.5 and `devalue` 5.9.4, both unflagged. (2) `http-cache-semantics` 4.3.0 (fixed last task) is now part of a server tree; it was cleared by that update. (3) The runtime image endpoint `/_image` returns 404 on the production server, so no on-demand image processing is exposed today; the `sharp`/libheif/AVIF class of issue still depends on untrusted images ever being processed, and V1 has none. (4) All 8 remaining findings stay confined to developer/build-time tooling that parses project-authored files; they would become relevant only if customer-supplied YAML, TOML, CSS or images were ever passed to them. **The deferral stays conditional, not permanent:** the owner accepted these 8 findings "for now" on 2026-10-15 (not permanently, and not for new findings); recheck `npm audit` at the start of each phase, after any dependency change and before deployment; the Docker image (P8) must be built from a runtime-only install. Owner decision (2026-10-15): the 8 are accepted for now, for development and for merging P1.1b, on the basis above.

**Other observations (nothing here was changed):**
- *Static asset caching (corrected after review, 2026-10-15):* an earlier note here said the server sent `max-age=0` for `/_astro/` files and suggested a possible adapter bug. **That was a test mistake, not a defect:** the check used `curl -I` (an HTTP `HEAD` request). The adapter sets its long-cache header in a `send` stream event, and `send` does not open a stream for `HEAD`, so only `HEAD` requests show `max-age=0`. Re-tested with real `GET` requests on the production server: a hashed `/_astro/` CSS, JS and WebP file each returned `Cache-Control: public, max-age=31536000, immutable`, as documented. HTML pages return `public, max-age=0` (revalidate each time), which is the safe default for pages. Nothing needs fixing; in P8, check that the Fly/proxy layer does not alter these headers.
- *Host header (tested 2026-10-15):* `security.allowedDomains` is not set, and the server answered `200` regardless of the `Host` or `X-Forwarded-Host` value sent (`evil.example.com`, the template domain, `localhost`). Nothing in P1.1b uses the host (the health route ignores it), so there is no exposure today, but any later code that builds URLs from the request host (for example links in emails or redirects) must not run until `security.allowedDomains` is configured with the real domain (P8, and before P3.1 if endpoints use the host).
- *`npm run preview`:* tested with the adapter: it rebuilds, post-processes the sitemap and starts the Node server (`/`, `/api/health/`, `/robots.txt`, `/sitemap-0.xml` 200; 404 page 404).
- *Existing static-host configs:* `netlify.toml`, `vercel.json`, `vercel.sh` and `wrangler.toml` still point at the old flat `dist` output and no longer match the new `dist/client` layout; left unchanged, decision in P8. The `deploy:cf` and `preview` npm scripts were not exercised.
- *Security items for later phases (unchanged from Sections 10.3-D and 10.4):* configure `security.allowedDomains` with the real domain before deployment (not configured and not tested here); give the JSON lead endpoint its own Origin/CSRF check; the server listens on plain HTTP and expects TLS from the hosting layer.
- *Trailing slash:* all endpoint and page URLs need the trailing slash.

**Limitations of this verification:** the browser checks used hidden same-origin frames, one live tab and spot screenshots (desktop 1440, tablet 768, mobile 375), not a full visual comparison of every page at every width; no screenshot files were saved. The blog search was first exercised without a conclusive result because the test fired `input` events, while the search runs on form **submit**. A focused rerun with real submits on the production server (2026-10-15) passed: "voice" narrowed the list to the one matching post, "zzzzqqq" showed `No Posts Found For "zzzzqqq"`, an empty search restored all four posts, and an HTML string typed into the search box was shown as escaped text (no element was created). No valid form submission was made. Docker, Fly.io and any HTTPS/proxy behaviour were not tested. No separate review subagent was used. A passing build and test run is not proof of complete security.

**Pre-existing defects, unchanged and preserved:** see Section 10.4 (the `/services/service-01/` menu 404, IT-themed contact form, other leftover template content, and the contact form `Service` select console message).

**Repository reminder:** Only the working `astro-MASTER-flyio` is in scope.

**Update protocol:** When a milestone is truly verified, mark its individual tasks complete, update the phase row with evidence, put the commit reference here, and change the `Current phase`/`Next recommended task` lines at the top. Leave failures visible until resolved. Do not count a plan checkbox as evidence of working software.

---

## 11. Future improvements (not part of V1)

Consider only after V1 works and a real business need is demonstrated:

- CSV export, if deferred.
- Simple lead status (New / Contacted / Closed): explicitly deferred out of V1 by owner decision 2026-10-14; add only if a real need is shown.
- CRM integrations with a business's existing Jobber, Housecall Pro or other system, subject to their actual supported APIs.
- More refined follow-up tracking, appointment scheduling, dispatch and analytics if specifically requested.
- Additional client-site automation once a second deployment has been configured successfully.
- Higher-availability hosting if uptime or data-loss requirements outgrow the single-instance architecture.
- Separate image uploads/storage if customer-provided photos become necessary.

**Do not add now:** payments, customer accounts/portal, employee management, invoicing, inventory, complex pipelines, AI chatbot/voice agent, multiple databases, microservices, multi-tenant SaaS, Kubernetes, or elaborate AI-agent orchestration.

---

## 12. Documentation to consult during the relevant phases

Use official documentation matching the actual installed versions before issuing configuration commands. These references support **recommended approaches**, not claims that the proposed features already exist.

- Astro: [On-demand rendering](https://docs.astro.build/en/guides/on-demand-rendering/) and [Node adapter](https://docs.astro.build/en/guides/integrations-guide/node/)
- Astro: [Authentication](https://docs.astro.build/en/guides/authentication/)
- Fly.io: [Run an Astro app](https://fly.io/docs/js/frameworks/astro/) and [Fly Volumes overview](https://fly.io/docs/volumes/overview/)
- Fly.io: [Volume snapshots and restoration](https://fly.io/docs/volumes/snapshots/)
- Google: [Sheets API values / RAW handling](https://developers.google.com/workspace/sheets/api/guides/values)
- Resend: [Idempotency keys](https://resend.com/changelog/idempotency-keys)
- GitHub: [Git basics](https://docs.github.com/en/get-started/using-git/about-git) and [Pull requests](https://docs.github.com/en/pull-requests)

---

## 13. Definition of Version 1 complete

**Do not launch as fully complete unless all required statements below have actual passing evidence:**

- [ ] Existing HVAC public pages retain approved design, **`5.0 Rating`, `200+ Reviews`, `Licensed & Insured` and testimonials in the master**, and work across device sizes.
- [ ] Every approved service-request entry point saves accurate leads to one website-specific SQLite database.
- [ ] Invalid/spam submissions are safely rejected and no false success message appears after a failed save.
- [ ] Private owner login, logout, authorized dashboard/list/detail and unauthorized access rejection are tested.
- [ ] Dashboard counts/search/filter/details show the correct SQLite information.
- [ ] Saved leads trigger Resend and full-field private Google Sheets synchronization; failures are recorded and safely retried.
- [ ] The approved recoverable lead schema has an accurate, reversible Sheet column mapping, including original IDs, timestamps and any edited fields.
- [ ] A **fresh test SQLite database**, with **no original database or backup**, has been recreated and successfully populated from test Sheet lead data.
- [ ] Restored lead counts and values have been compared field by field, including empty/null and edge cases.
- [ ] Reimporting does not duplicate leads or send unintended “new lead” emails; a newly submitted lead after recovery works.
- [ ] Real backup/snapshot recovery has been tested separately and limits are understood.
- [ ] Docker/Fly.io production-style deployment uses a persistent volume and survives verified restart/deployment operations.
- [ ] A documented dependency security review exists (`npm audit` run on the release build, each remaining finding recorded as fixed, or accepted with a reason such as build-time-only use); no unresolved critical/high finding affecting server-side or production code, and the Astro/`sharp` findings from Section 10.1 are resolved. Unrelated build-tool warnings need not reach zero.
- [ ] Security, performance, SEO and business-content checks pass; master demo trust/testimonial content remains intact, **any real-client public claims are backed by real evidence or hidden in that client deployment**, and no secrets are exposed.
- [ ] The development/operations instructions and template-reuse process are understandable and verified, with `astro-MASTER-flyio` identified as the master.

**When every required box above is checked with evidence, Version 1 is complete.** Until then, continue with the next specific unfinished task rather than restarting the project or expanding its scope.

### Repository and master-content safeguard (applies to every phase)

- **Only development target:** `jonexe2/astro-MASTER-flyio` on an appropriate working branch. Before editing, committing, pushing, or deploying, verify this is the active repository.
- **Keep in master:** the exact `5.0 Rating`, `200+ Reviews`, and `Licensed & Insured` values in the hero, plus the existing testimonial section and sample testimonials. These are intended as **editable demo material in the reusable master**, not as proven facts about future clients.
- **For real client sites:** maintain the same components but populate them with accurate approved business-specific details and genuine testimonials; if evidence is not available, hide the unsupported claim only in that client version. Never remove the original master capability.
- **Before marking a design/content task complete:** inspect the Git diff for accidental changes to these elements and verify their visibility in the master.
