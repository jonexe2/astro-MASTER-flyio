# IMPLEMENTATION PLAN
## Premium HVAC Website, Lead Capture, and Private Owner Dashboard

**Working repository:** [`jonexe2/astro-MASTER-flyio`](https://github.com/jonexe2/astro-MASTER-flyio)  
**Protected original repository:** [`jonexe2/techlo-astro-MASTER-Dupe-2`](https://github.com/jonexe2/techlo-astro-MASTER-Dupe-2) — reference only; **do not change its files, branches, settings, or deployments**.  
**Default branch:** `main`  
**Plan created:** October 13, 2026  
**Assessment basis:** Working repository `main` tree at `3dac95ba0467d6e2339b98d5c7c71460e948c022` (checked October 13, 2026), selected source files including the hero trust banner and testimonial content, plus the earlier original-repository assessment and project requirements. *(Historical, as of 2026-10-13: local build/browser behavior was untested at that time. It was tested on 2026-10-14; see Section 10.1.)*  
**Project status:** Planning; feature implementation has not started in this plan.  
**Current phase:** Phase 0 in `astro-MASTER-flyio`; P0.1 and P0.3 are complete. P0.2 (page/form/brand inventory) and P0.4 (first decisions) remain.  
**Next recommended task:** Finish the open P0.2 inventory items, then P0.4. **Astro security findings (Section 10.1) must be reviewed and remediated before any server-side functionality (Phase 1 onward) is enabled or anything is deployed to production.**  
**Scope of this document:** Development roadmap and progress tracker. This revision only updates the plan, not repository code or deployments. The original repository is not to be modified.

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

- Perform development, testing, commits and deployments against **`jonexe2/astro-MASTER-flyio` only**. Never use `jonexe2/techlo-astro-MASTER-Dupe-2` as the working repository or accidentally push back to it. Verify the Git remote before any push.
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

**Active target:** `jonexe2/astro-MASTER-flyio` on `main` (tree `3dac95ba0467d6e2339b98d5c7c71460e948c022`). The current target contains the inspected source files and components listed below. The earlier detailed inspection of `techlo-astro-MASTER-Dupe-2` is historical context only, not the repository to implement against. The full histories were not compared file by file.

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
| Plan file | `IMPLEMENTATION_PLAN.md` was not found on the new working repository’s `main` during this revision. *(Historical: the plan was later added in commit `de67f59`.)* | Add this revised file to `astro-MASTER-flyio` only when explicitly requested; never upload it to the protected original by accident. |
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

**Working-repository rule:** Any branch, worktree, local clone, pull request, or deployment made under this roadmap must trace back to `astro-MASTER-flyio`. The older Techlo duplicate is not a place to implement or merge these changes.

**Not verified as of 2026-10-13 (the local install/build, route URLs and basic rendered/mobile checks were verified on 2026-10-14; see Section 10.1):** a successful local install/build, all real route URLs, exact rendered appearance, mobile layout, production domain, whether any existing form endpoint currently receives leads, production performance, storage needs, private owner identity, authentication provider, or live integrations. Phase 0 resolves what can be checked safely before code changes.

---

## 3. Version 1 scope and proposed user experience

### Public website

- Existing homepage, service pages, navigation, contact page, blog, SEO structure, hero trust banner, and testimonial display remain. **Do not remove or redesign the trust banner or testimonials to satisfy generic “placeholder cleanup” tasks in the master.**
- Main hero form and other visible service request forms feed **one** server-side lead intake flow.
- After the database confirms the save, the form shows a success message. If the save fails, it shows a helpful error and does not falsely claim success.
- The same website should work on desktop, tablet and mobile.
- Visitors do **not** create accounts.

### Private owner area (proposed URLs, subject to route inspection)

| URL | Purpose | Access |
|---|---|---|
| `/owner/login/` | One-owner sign-in | Public page; no lead data visible |
| `/owner/` | Lead counts and recent inquiries | Signed-in owner only |
| `/owner/leads/` | Searchable/filterable lead list | Signed-in owner only |
| `/owner/leads/[id]/` | Dedicated lead detail view | Signed-in owner only |
| `/owner/settings/` | Only if required for basic owner settings | Deferred unless needed |

These routes are **proposals, not confirmed existing files**. Validate how they coexist with the current `src/pages/[...lang]/` routes, trailing slash, sitemap, and static/on-demand rendering rules before creating them. Prefer a dedicated private layout rather than automatically displaying public website navigation and footer in the owner area.

**Recommended first dashboard features:** total leads, leads received this month, leads received today, newest inquiries, name/phone/email/service/source/date, search, basic date filtering, and a full detail page. **Lead status (New / Contacted / Closed):** decide at Phase 2; useful for small offices, but add it only if the owner will use it. CSV export is optional after core features work. No advanced reports or charts.

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
| `leads` | One customer request per record. Stable ID, contact fields, requested services, message, source page, timestamps, optional lead status. | **Yes** | Primary record; exact fields based on the approved forms. |
| `integration_jobs` | Tasks to email the owner or sync a lead; task type, related lead ID, state, attempts, next try time and error summary. | **Yes, if using the recommended retry design** | Avoids losing follow-up work on a crash. Could use a simpler equivalent if justified. |
| `owner_accounts` or approved login storage | Owner identity, password verification material if applicable, account metadata. | **Needed somewhere**, not necessarily as a custom table | Depends on approved authentication implementation. Never store plaintext passwords. |
| `sessions` or approved session storage | Tracks authorized logins if the selected login approach needs database-backed sessions. | **Conditional** | Do not create a redundant table when the chosen mechanism handles this safely. |
| `schema_migrations` or equivalent | Which database structure changes have already been applied. | **Yes, in the selected migration approach** | Lets a clean database be recreated from code; no hand-editing in production. |

**Recommended lead record rules:**

- Assign a **stable, unique, nonreused lead ID** at creation. Recommendation: a generated string ID (for example, a UUID), which is easier to preserve during imports than relying on a newly generated row number. Final choice requires approval.
- Save server-generated `created_at` and `updated_at` timestamps in an agreed UTC-based format; display local time in the dashboard. Do not accept the browser's claimed submit time as authoritative.
- Store the actual normalized source path/page. Validate it instead of blindly trusting hidden form fields.
- Store service selection consistently (including multiple services if the hero form keeps multi-select). Choose one documented format, not an ad hoc mix of strings.
- Define what “not provided” versus a deliberately blank value means for each optional field; preserve that distinction through exports.
- Limit request field length and data collected to what is necessary. Decide retention and deletion policy before launch.
- If a lead status exists, default it sensibly, track the current value, and keep edits synchronized to Sheets; do not let imports reset it to “new.”
- Keep notification state and Google synchronization state **outside the recoverable customer lead fields** unless the approved design explicitly requires otherwise. Recovery from Sheets will restore leads, not necessarily integration task history.

### 4.3 Suggested form-field decisions (not yet final)

| Field | Suggested V1 treatment | Reason |
|---|---|---|
| Full name | Required | Know who is requesting service. |
| Phone | Required | Easy call-back for HVAC jobs. |
| Email | Optional unless owner prefers mandatory | Allow callers who prefer the phone; validate it if given. |
| Requested service(s) | Required | Distinguish repair, installation, emergency, etc. |
| Service address or city/ZIP | Consider optional at intake; decide before release | Helps qualify service area without creating unnecessary friction. |
| Problem description | Optional, with length limit | Gives context for the owner. |
| Preferred contact time | Optional | Helpful but not essential. |
| Consent/permission notice | Match real data-use requirements and approved copy | Avoid false privacy/security promises. |
| Source page | Set/validate through the application | Support lead-source reporting. |
| Received timestamp + lead ID | Set on server | Reliable records and recovery. |

**Important existing-form difference:** The hero currently asks for name/phone/email/multiple services. The general form has a different IT-focused field set. Phase 3 must decide whether both forms show the same inputs or map two supported layouts into one consistent lead record. Do not silently discard information that users provided.

### 4.4 Recovery contract: SQLite ↔ Google Sheets

The Google Sheet is **not** a complete database backup. For lead recovery, however, it must accurately preserve **all fields needed to recreate every synchronized lead**. The approved database structure becomes the source of truth for the sheet mapping.

The mapping must explicitly cover:

- Every recoverable `leads` field, including original ID, timestamps, customer details, service(s), request text, source and current status if supported.
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

**Repository guardrail:** All hands-on work uses `jonexe2/astro-MASTER-flyio`. Treat `jonexe2/techlo-astro-MASTER-Dupe-2` as a protected reference.

**Why first:** Avoid designing around assumptions and establish the real site's starting condition before changing it.  
**Depends on:** GitHub access, local development environment for runtime testing.  
**Milestone:** Known baseline, agreed limits, and a safe starting checkpoint.

#### P0.1 Confirm current repository and instructions
**Objective:** Understand the source we are extending.  
**Files:** `CLAUDE.md`, `AGENTS.md`, `SKILLS.md`, `package.json`, `astro.config.mjs`, `.gitignore`.

- [x] Confirm the **new working repository** `jonexe2/astro-MASTER-flyio`, its `main` branch and source tree through GitHub.
- [x] Record that `jonexe2/techlo-astro-MASTER-Dupe-2` is the original reference and must remain untouched.
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
- [ ] Build a page/form inventory showing every place a form appears and which form widget it uses.
- [ ] Record each current field name, required rule, service options and submit/success/error behavior, including multi-select serialization.
- [ ] Review images, fonts, spacing, buttons, layouts and color use **in a running browser** on desktop/mobile.
- [ ] Inventory demo business names, contact details, SEO defaults and trust/testimonial content; clearly distinguish **master demo elements to preserve** from any values needing verification or replacement in a **real client deployment**.
- [ ] Visually verify that `5.0 Rating`, `200+ Reviews`, `Licensed & Insured` and the testimonial section remain unchanged on desktop and mobile after future work.

**Verify/done when:** A short evidence-based form/page map exists; no assumptions about live functionality or visual quality are presented as tests.

#### P0.3 Run the untouched site locally and save a baseline
**Objective:** Find existing errors before adding backend code.  
**Prerequisites:** P0.1; correct local access.  
**Files:** `package-lock.json`, `package.json`, project scripts and existing page files.

- [x] Open a local clone of **`jonexe2/astro-MASTER-flyio`** at a known commit/branch; verify the Git remote points to that repository, **not** `techlo-astro-MASTER-Dupe-2`. *(`origin` = `https://github.com/jonexe2/astro-MASTER-flyio.git`; branch `main`; commit `3cc073c`; working tree clean.)*
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
- [ ] Approve the intended master demo brand and which additional template details need cleanup **without removing preserved trust/testimonial elements**. Decide real-client brand facts separately when a client is onboarded.
- [ ] Approve proposed core lead fields and whether “New / Contacted / Closed” belongs in V1.
- [ ] Agree the planned private `/owner/` route family after checking existing routing.
- [ ] Review local-development permissions, GitHub branch workflow, and safe rollback checkpoint.
- [ ] Choose the first coding task from Phase 1 and document any remaining blockers.

**Verify/done when:** Necessary Phase 1 choices are explicit, not left for a coding agent to invent, and protected master trust/testimonial content is documented.

---

### Phase 1. Prepare Astro for a small backend

**Why now:** Server-side form handling, login and dashboards need a functioning server runtime. Verify this while the public site still behaves as before.  
**Depends on:** Phase 0 baseline.  
**Milestone:** Astro can run a small private/server route while existing public routes and styling still work.

#### P1.1 Choose and verify Astro server setup
**Objective:** Add only the runtime necessary for server functions.  
**Files:** `astro.config.mjs`, `package.json`, `package-lock.json`; **proposed** small test endpoint under `src/pages/api/`.

- [ ] **Security gate (from P0.3 baseline, see Section 10.1):** **Before** adding an adapter, API route, form endpoint, login or dashboard: review the Astro and `sharp` advisories reported by `npm audit` against installed `astro@7.0.3` and `sharp@0.34.5`; get approval for a specific dependency upgrade path (the P0.3 audit showed `astro` needs 7.2.8 or later for the AVIF fix); apply it on a branch; then re-run `astro-check`, `build`, the P0.3 baseline checks (routes, 404, overflow, trust banner and testimonials intact) and `npm audit`. A plain `npm audit fix` was dry-run in P0.3 and failed on a peer-dependency conflict; do not use `--force`. Record the chosen versions and any remaining findings with a reason for accepting each.
- [ ] Review current Astro and Node adapter documentation matching the installed versions.
- [ ] Recommend the official Node adapter for the planned Node/Docker runtime unless inspection shows a better fit.
- [ ] Compare keeping existing pages pre-rendered with making only private/API pages run on demand; prefer selective on-demand routes if practical.
- [ ] Implement the approved adapter change in a focused branch; avoid unrelated frontend changes.
- [ ] Add a tiny harmless server response for testing (no private data), then call it locally.
- [ ] Re-run the public-page build and confirm homepage, service routes, i18n rules and sitemap remain correct.

**Verify/done when:** A server-only route responds locally and the original public site still renders. Record the adapter/version and observed tests.

#### P1.2 Establish simple backend organization
**Objective:** Give future database, form and login code predictable homes.  
**Files:** `src/pages/` and **proposed** `src/lib/server/` (exact paths to approve after inspection).

- [ ] Decide how server-only modules will be kept away from browser code.
- [ ] Define one shared lead submission contract and one backend handler; do not create separate storage logic per form.
- [ ] Decide where input validation, database access and integration actions belong; keep modules small.
- [ ] Identify where test files and versioned database migrations will live (paths proposed, not assumed).
- [ ] Confirm no private backend module or secret value is accidentally bundled for the browser.
- [ ] Run project checks and record a reversible Git checkpoint.

**Verify/done when:** One small server route and clear, agreed module boundaries exist without altering public design.

#### P1.3 Development-only settings and errors
**Objective:** Make local work safe and failures understandable.  
**Files:** `.gitignore`, `src/config/config.toml`; **proposed** local environment example file without secret values.

- [ ] List necessary settings by purpose (database file location, future email sender/recipient, Sheet identifier, credentials, session secret).
- [ ] Check which settings belong in harmless public content/config versus protected server environment variables.
- [ ] Document example setting names without real credentials and verify `.gitignore` protects their local secrets.
- [ ] Make local errors actionable without printing full private submissions or credentials into logs.
- [ ] Confirm local database paths cannot silently point to a live production database.

**Verify/done when:** Developers know where settings go, no secrets are committed, and local errors can be diagnosed.

---

### Phase 2. Design and test SQLite lead storage

**Why now:** Forms, dashboards, email tasks and Sheet recovery all depend on one agreed record structure.  
**Depends on:** Phase 1 backend.  
**Milestone:** New and existing sample lead records can be safely saved, found and recreated in a clean test database.

#### P2.1 Freeze the V1 lead contract
**Objective:** Define exactly what one lead means.  
**Files:** Source form content/config files listed in P0.2; **proposed** schema/mapping documentation near backend code.

- [ ] Compare all live form fields and approve required/optional V1 lead fields.
- [ ] Approve canonical field names, data types, limits, how multi-select services are stored, and sensible default/empty values.
- [ ] Choose a stable lead ID format and store the generated ID without changing it later.
- [ ] Define timestamps (server-created UTC, original value maintained; optional last-modified time), source pages and optional status.
- [ ] Define how two rapid clicks, network retries and resubmission of the same request will be treated. Do not treat two genuinely separate inquiries as duplicates automatically.
- [ ] Specify the Sheet column mapping and null/empty encoding **from the approved schema**, even before the Sheets API is connected.

**Verify/done when:** Frontend, backend, dashboard and future importer have a single documented field contract. **Decision required before database implementation.**

#### P2.2 Create SQLite schema and migration process
**Objective:** Make database structure repeatable instead of hand-crafted.  
**Prerequisites:** P2.1.  
**Files:** **proposed** backend database module and versioned migration files; do not assume paths exist.

- [ ] Evaluate a small maintained SQLite driver and migration approach compatible with Node/Astro and Fly.io; avoid adding a large framework without need.
- [ ] Define `leads` with unique ID, approved fields, required constraints, and sensible search/date indexes only where useful.
- [ ] Define the minimal integration task/state storage needed for follow-up notifications and Sheet sync; choose whether a separate jobs table is appropriate.
- [ ] Create owner/login-related tables **only** after the authentication approach is selected.
- [ ] Design safe database creation/update steps that can also create the same schema in a fresh replacement database.
- [ ] Keep the development database outside source control and document its configurable location.
- [ ] Test first creation, second run with no accidental duplication, and upgrades using synthetic records.

**Verify/done when:** A clean database can be created from version-controlled files and migration repeat runs do not destroy sample records.

#### P2.3 Implement reliable lead write/read functions
**Objective:** Make the database work before any public form depends on it.  
**Prerequisites:** P2.2.  
**Files:** **proposed** server-only lead database functions and tests.

- [ ] Implement one operation to validate/normalize and save a new lead, returning its stable ID only after successful database storage.
- [ ] Ensure creating a lead and recording required follow-up tasks is **one reliable database operation**; no “saved lead but permanently missing tasks” gap.
- [ ] Implement safe lookup by ID, newest-first list, total/today/this-month counts, simple search and date filtering.
- [ ] Use parameterized queries or supported safe query methods; never build queries by joining raw form text.
- [ ] Make any allowed edits update `updated_at` while retaining original creation time; define when to queue Sheets updates.
- [ ] Verify a failed write does not return success and a valid read returns the exact saved fields.
- [ ] Test duplicate IDs and simulated database errors without touching a live database.

**Verify/done when:** Automated or repeatable tests prove saved data matches input, duplicate IDs are rejected safely, and errors are reported accurately.

#### P2.4 Define permanent storage and database recovery boundaries
**Objective:** Avoid code that only works on disposable local storage.  
**Prerequisites:** P2.2.  
**Files:** **proposed** server database setup/config; Fly.io mounting comes in Phase 8.

- [ ] Make the database location configurable, with a clearly separate local-test path and planned Fly volume mount path.
- [ ] Verify no database is silently created in a public asset directory or replaceable deployment folder.
- [ ] Decide how the database handles multiple connections/writes appropriate to one Machine; test expected small concurrent traffic.
- [ ] Confirm source files and migrations can recreate the schema without an existing live database.
- [ ] Document how owner account data and integration task history differ from Sheet-restorable lead data.

**Verify/done when:** Persistent path expectations and recovery limitations are explicit, with a small repeatable storage test.

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
- [ ] Normalize/sanitize user input as appropriate; do not trust a hidden page/source field without checking it.
- [ ] Add an appropriate simple spam/abuse defense and sensible submission rate limiting; do not make the public site hard to use.
- [ ] Save valid leads through P2.3 and return a safe success with ID; reject invalid/malicious requests without inserting leads.
- [ ] Return safe, usable error responses. Prevent accidental exposure of exception details, credentials and other leads.
- [ ] Test direct requests that bypass browser validation, including repeated requests and large invalid values.

**Verify/done when:** Valid requests create exactly the expected record; invalid ones create none; endpoint cannot expose existing private leads.

#### P3.2 Wire up the existing homepage hero form
**Objective:** Make the visually approved hero form functional.  
**Files:** `src/layouts/components/widgets/AlternativeHeroForm.astro`, `src/content/sections/english/alternative-hero-section.md`, possibly `FormHandle.ts`.

- [ ] Inspect current submit handlers, service multi-select, required attributes, loading/success/error messages and reset behavior.
- [ ] Change only the submission route/logic needed to use P3.1; retain layout, controls, colors, keyboard behavior, **hero review/license badges, and adjacent testimonial sections**.
- [ ] Map name, phone, email and selected services to approved backend fields, including multiple services when allowed.
- [ ] Prevent duplicate requests from a double click or an uncertain network retry using the approved approach.
- [ ] Show success **only after** confirmed SQLite save; keep user-entered content available on error when appropriate.
- [ ] Test valid, missing name/phone, no service selected, invalid email and server-down cases.
- [ ] Verify the saved lead/source in SQLite and check hero on desktop/mobile/tablet.

**Verify/done when:** Homepage hero submits real sample leads to SQLite, handles errors truthfully, and retains its approved visual design.

#### P3.3 Adapt the shared general contact form to HVAC
**Objective:** Replace outdated IT-project intake while reusing the existing form widget.  
**Files:** `src/content/sections/english/contact-section.md`, `src/content/sections/english/contact-section-two.md`, `src/layouts/components/widgets/ContactForm.astro`, `src/layouts/components/sections/ContactSectionTwo.astro`, `src/sections.schema.ts` only if required.

- [ ] Approve the HVAC question labels and inputs; remove irrelevant budget, project type and web/cloud service choices from the form content.
- [ ] Decide whether this longer form captures address/problem/time or deliberately uses fewer fields than the hero form.
- [ ] Preserve the existing form widget, layout and content-sharing behavior between homepage/contact page.
- [ ] Connect its submit handler to P3.1 with the same backend field contract and distinct source path.
- [ ] Update on-screen feedback and verify radio, select, checkbox and accessibility behavior still work.
- [ ] Test from the contact page **and** the homepage section; verify both create the right SQLite records.
- [ ] Re-run required source/build checks and inspect mobile rendering.

**Verify/done when:** Both contexts submit consistent HVAC leads, no obsolete IT choices appear, and no reused form is broken.

#### P3.4 Cover all approved service-page request entry points
**Objective:** Ensure every CTA that offers a service request leads to an actually working flow.  
**Files:** `src/pages/[...lang]/services/[single].astro`, service content/CTA components and any verified forms it renders.

- [ ] Inventory the six HVAC service pages and their existing CTA targets and contact anchors.
- [ ] For each service page, determine whether there is an embedded form or a link to the shared form; do not invent six new forms if none are needed.
- [ ] Make source-page attribution reliable for each real entry point.
- [ ] Test navigation from each service page to a usable request form, and submit one synthetic test lead per distinct pathway.
- [ ] Confirm the dashboard-ready source and service information is accurate in SQLite.

**Verify/done when:** Every approved “request service” path works and can be attributed to its origin.

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

- [ ] Show name, phone/email where appropriate, requested service, submission date/time, source page and optional status.
- [ ] Sort newest-first by default; define how ties are handled for repeatable results.
- [ ] Add a basic name/phone/email/service search and simple date-range filter; avoid complex query builders.
- [ ] Add manageable pagination or capped results so long histories remain usable.
- [ ] Provide a readable mobile layout (not a clipped desktop-wide table).
- [ ] Test search terms, empty results, no-data state, special characters and date boundaries against known records.

**Verify/done when:** Owner can locate a specific lead reliably without exposing any private information publicly.

#### P5.4 Dedicated lead detail page
**Objective:** Display the complete original inquiry clearly.  
**Files:** **proposed** `/owner/leads/[id]/` page and protected lookup handler.

- [ ] Show all approved customer fields, original submitted time, service(s), source and request message without clipping long text.
- [ ] Add simple click-to-call/email affordances only when field data exists; avoid making contact data public.
- [ ] Show helpful not-found/error handling; never reveal another lead by falling back to an arbitrary record.
- [ ] If approved, allow a simple status change and record its timestamp; ensure Phase 7 will sync it accurately.
- [ ] Test valid ID, unknown ID, malformed ID, long message, missing optional fields and signed-out access.
- [ ] Verify restored historical leads can later display with their original IDs and dates.

**Verify/done when:** The owner can open any authorized record and see precisely the information saved in SQLite.

#### P5.5 Optional dashboard extras decision
**Objective:** Prevent scope drift.  
**Prerequisites:** P5.2–P5.4.

- [ ] Ask whether daily usage really requires statuses; if yes, include the smallest New/Contacted/Closed action and test it.
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
**Depends on:** Phase 2 schema; Phase 3 lead save; Phase 5 if statuses can be edited.  
**Milestone:** Full-fidelity lead copies sync reliably, and a separate fresh SQLite database can be restored from a test Sheet without backups.

#### P7.1 Approve full lead-to-Sheet mapping and account setup
**Objective:** Create one private, accurate lead copy per website.  
**Files:** **proposed** documented Sheet mapping and private integration configuration.

- [ ] List **every field in the approved `leads` schema**, its Sheet column, data representation and whether blank/NULL is allowed.
- [ ] Include original stable ID, timestamps, all contact/request fields, source, and status or other editable fields if used.
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
- [ ] Synchronize any approved lead edits (such as status changes) to the existing row, preserving immutable original values.
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
- [ ] Insert exact preserved lead IDs and original timestamps, fields and statuses using safe database transactions.
- [ ] Design reruns to skip identical existing IDs, stop/report different values for the same ID unless explicitly resolved, and never overwrite unrelated data silently.
- [ ] Prevent imports from creating “new lead” jobs, sending Resend emails or writing the leads back to the Sheet.
- [ ] Document how to handle records created after an old Sheet snapshot and how a recovered app will resume new ID generation safely.
- [ ] Document restoring/recreating owner access **separately**; Sheet data is not the owner's account or full DB structure.

**Verify/done when:** Importing a valid complete Sheet into an independently created SQLite database recreates the identical recoverable lead records with no accidental external actions.

#### P7.4 Run a rigorous no-backup recovery test
**Objective:** Prove the emergency procedure works rather than assuming it will.  
**Prerequisites:** P7.1–P7.3; a test dashboard and test Sheet.

- [ ] Make synthetic test leads with varied services, phone formats/leading zeros, long text, Unicode, empty optional values, timestamp edges and status edits (if enabled).
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
- [ ] Ensure startup creates/applies schema safely against the mounted database using a reviewed procedure.
- [ ] Pass secrets at runtime rather than baking them into the image or committing them.
- [ ] Run the production-style container locally against a disposable test volume/data directory.
- [ ] Test homepage, requests, owner login, a saved lead, dashboard list/detail, email/Sheet test configuration and restart persistence.

**Verify/done when:** The packaged application behaves like the local dev system and preserves database records across a test container restart/recreation with its data mount.

#### P8.3 Deploy to Fly.io and connect persistent storage
**Objective:** Run the finished app on hosted infrastructure.  
**Files:** **proposed** Fly app config, Docker setup and server settings; approved domain DNS settings outside source code.

- [ ] Create the correct Fly.io app for this website, using the approved region/capacity and one initial Machine.
- [ ] Create and mount one persistent volume at the approved application data path; confirm SQLite actually writes there.
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
- [ ] Use a supported, consistent SQLite backup method if taking backups; do not just copy a potentially active database file and assume it is consistent.
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
- [ ] Compare all recoverable lead fields to the test Sheet and preserved source reference, including IDs, timestamps, source and statuses.
- [ ] Ensure importer re-runs cannot duplicate records or generate email/Sheets side effects.
- [ ] Confirm re-established owner login works after separate secure account setup.
- [ ] Open restored leads in dashboard and successfully submit one new synthetic inquiry without an ID collision.
- [ ] Record where missing/unsynced leads or missing account/task history remain **unrecoverable** from Sheets alone.

**Verify/done when:** Another run of the written recovery process succeeds without manual manipulation of customer lead fields. **Mandatory V1 release gate.**

#### P9.4 Validate public UX, SEO and full-system behavior
**Objective:** Launch a credible, fast, reliable HVAC site with no template leftovers.  
**Files:** Existing page/content/theme/SEO components, new dashboard and form components.

- [ ] Confirm the intended **real-client production** brand, business contact details, locations, hours and service areas across pages and structured data; keep master demo branding customizable.
- [ ] Correct unrelated Techlo/IT copy, demo domain metadata, BlueFlame/Techlo references and generic addresses **where appropriate**, without stripping the master’s existing ratings, review count, licensed/insured badge or testimonials. On an actual client launch, supply substantiation and real customer testimonials, or hide only the unsupported elements in that **client deployment**. The protected master content remains intact.
- [ ] Audit heading structure, titles/descriptions, internal links, six service URLs, robots, sitemap, canonical URLs and indexing rules.
- [ ] Review images and large files for loading performance while maintaining approved visual quality; add accurate alt text.
- [ ] Test public pages, all form pathways, dashboard mobile experience, keyboard navigation, readable focus states and accessible errors.
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
- [ ] Centralize repeated business values using the existing content/config conventions; do not create a large CMS. **Keep the master’s sample trust values and testimonial section visible and editable** while allowing each client deployment to substitute verified content or conditionally hide unverified claims.
- [ ] Keep reusable form/database/dashboard behavior independent of brand name or contact copy.
- [ ] Separate public business configuration from private recipient email, Sheet ID, credentials and session secrets.
- [ ] Confirm a harmless brand edit, verified review-count update, license-badge adjustment, or testimonial replacement for a client does not require rewriting lead processing or database tables.
- [ ] Update tests/content checks to catch leftover placeholder details.

**Verify/done when:** A test rebrand changes expected visible business information without touching private lead logic, while the **original master still contains its `5.0 Rating`, `200+ Reviews`, `Licensed & Insured` and testimonials**.

#### P10.2 Prove client data separation
**Objective:** Reuse code without sharing lead records.  
**Prerequisites:** P10.1; test deployments only.

- [ ] Document one deployment/volume/SQLite database/owner account/Sheet per independent client website, each derived from **`astro-MASTER-flyio`**; never alter the protected original Techlo duplicate.
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
| D01 | Which public brand and claims are real? | **Master decision approved:** retain `5.0 Rating`, `200+ Reviews`, `Licensed & Insured` and testimonials as editable demo/template content. | **Client-production decision remains open:** replace with verified client data or hide in that client’s version; never remove from master. | Master: decided; client: P9.4/P10.1 |
| D02 | Astro server setup | Official Node adapter; keep public pages static where reasonable and private/API routes on-demand. | All-server rendering if verified necessary; more runtime dependency for public pages. | P1.1 |
| D03 | Public form fields | Name, phone, service required; email and extra detail optional if approved. | More fields for better qualification but more friction. | P2.1 |
| D04 | Lead ID | Stable generated string ID (UUID style) preserved in Sheet/restores. | Numeric ID can work with careful restore/sequence handling; more collision hazards. | P2.1 |
| D05 | Lead status | Optional simple status only if owner needs it; decide early so edits/export mapping are consistent. | Defer until core list works for simpler V1. | P2.1 |
| D06 | Auth | One owner, maintained password/session approach with server checks and documented reset. | A vetted external provider if requirements justify additional account/service. | P4.1 |
| D07 | Integration tasks | Minimal SQLite-backed durable jobs inside same app. | Direct sending without durable retry is simpler but not acceptable if failures lose work; external worker only if proven necessary. | P2.2/P6.2 |
| D08 | Google access | Private per-client Sheet using a supported server-to-server method if practical. | User authorization/OAuth if client ownership/access requires it; more setup. | P7.1 |
| D09 | Blank and NULL values | Define a reversible text-safe representation and test read-back. | Lossy blank handling is **not acceptable** for 1:1 recovery. | P2.1/P7.1 |
| D10 | Sheet changes and deletions | Mirror edits; avoid hard deletion initially. | Soft delete/record marker if future deletion requirement arises. | P2.1/P7.1 |
| D11 | SQLite recovery | Versioned schema + tested snapshots/backup + complete Sheet importer. | An additional independent backup target may be justified if data-loss tolerance is tighter. | P7.3/P9.2 |
| D12 | Hosting resources | One Machine, one volume; size RAM (1 vs 2 GB) and disk from tests/current prices. | Multiple Machines improve uptime but require SQLite replication/coordination and extra cost. | P8.1 |
| D13 | Retry execution while sleeping | Confirm always-on/background processing policy or design a reliable wake-up mechanism. | A separate scheduled service only if necessary; do not quietly assume timers run on a stopped Machine. | P6.2/P8.1 |
| D14 | Client-specific config | Existing `src/config/` + `src/content/` patterns with private deploy settings. | More elaborate config layer only after real reuse pain appears. | P10.1 |
| D15 | Multi-agent work | Begin with one Claude Code session for a narrowly defined task. | Independent frontend/backend sessions in separate worktrees once shared data contract and merge responsibilities are clear. | Before any parallel work |

**Never silently resolve a pending choice by adding a new platform or package.** State the recommendation, show the evidence, obtain needed approval, then update this table.

---

## 7. Testing strategy and evidence

### Minimum feature-by-feature test matrix

| Feature | Minimum test before marking done |
|---|---|
| Existing working site | `astro-MASTER-flyio` builds; homepage, contact, service pages, master trust banner, testimonials and mobile layouts remain usable. Protected original repository remains unchanged. |
| Database | Valid lead saved exactly; invalid/duplicate ID errors handled; fresh schema recreated safely. |
| Form endpoints | Good submission succeeds; bad/missing/oversized/malicious input rejected server-side; no false success. |
| Source tracking | Two different page submissions are accurately attributed. |
| Duplicate behavior | Double-click/retry handled by approved policy; intentional later inquiry still accepted. |
| Owner login | Authorized login works; logout expires access; bad credentials/expired cookies fail. |
| Private records | Signed-out user cannot read counts, list, details or APIs, even with known IDs. |
| Dashboard | Counts, search, dates, source and individual records match SQLite; mobile usable. |
| Resend | Successful alert, provider downtime, uncertain send, restart and bounded retry behavior. |
| Sheets | Every mapped field matches; updates match; timeout/retry does not create duplicate rows. |
| Importer | Fresh DB without original/backup restores exact lead IDs, fields, timestamps/statuses; rerun safe. |
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
Expected: 1 valid lead with correct page source
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
2. Confirm the local Git remote is **`jonexe2/astro-MASTER-flyio`**, never the protected Techlo duplicate. Recheck `CLAUDE.md`, `AGENTS.md`, relevant files, and current Git status. Do not assume this plan alone reflects the latest repo.
3. Briefly explain the task, which existing files need changes, any proposed new paths, and how success will be checked.
4. Work on a focused Git branch when changing code. A branch is a safe separate line of changes; a commit is a saved checkpoint.
5. Implement **only the agreed task**. Avoid unrelated refactors or design changes. Preserve master trust labels, existing testimonials and their visual components unless the owner explicitly changes this requirement.
6. Run suitable code checks, automated tests and manual checks; inspect actual output.
7. Review the changes (Git diff) for accidental edits, bugs, security issues, exposed credentials and unnecessary dependencies.
8. Resolve failures before claiming completion. Preserve or restore the last working version if a change is unsuccessful.
9. Save a meaningful Git commit. Use a pull request for review before merging changes into `main` when useful.
10. Update this plan: tick only verified items, add evidence/commit, mark blockers, and identify the next task.

**A practical Claude Code task prompt** (adapt as needed):

> Confirm you are working in `jonexe2/astro-MASTER-flyio` (not `jonexe2/techlo-astro-MASTER-Dupe-2`). Read `IMPLEMENTATION_PLAN.md`, `CLAUDE.md`, and `AGENTS.md`. Work only on task **[TASK ID]**. First inspect relevant existing code and explain proposed changes in simple language. Preserve the master `5.0 Rating`, `200+ Reviews`, `Licensed & Insured` and testimonials. Do not redesign existing sections or touch unrelated files. Verify behavior with actual tests, inspect the Git diff, report what passed and failed, and propose checklist updates. Ask before a major architecture change. Do not begin the next task automatically.

### When to use agents/subagents

- **Default:** One Claude Code session implements one bounded task. This minimizes coordination and subscription usage.
- **Helpful specialization:** A read-only review or testing subagent can inspect completed work without modifying files. Use when independent review adds value.
- **Parallel sessions:** Consider one frontend and one backend session only after Phase 2 establishes field contracts and specific tasks can proceed independently.
- **Isolation:** If parallel sessions are used, separate Git worktrees (separate project folders/branches) and explicit file ownership can reduce overlapping edits. Worktrees do **not** stop logic mismatches.
- **Integration:** Define the exact shared fields/endpoints, tasks, forbidden edit areas, tests and merging owner. Integrate and run end-to-end tests before calling the combined result complete.
- **Model/effort usage:** Prefer the least costly model/effort that can reasonably complete the task and verify it. More agents or deeper reasoning are not automatically better. Check current Claude Code documentation before relying on model names, flags or agent messaging behavior.

**Avoid:** multiple agents editing the same form/backend contract independently, arbitrary feature creation, skipping tests, or telling the user code passed without running it.

---

## 10. Progress dashboard (maintain here, not in another tracker)

### Phase status

| Phase | Status | Verified milestone | Evidence / link |
|---|---|---|---|
| 0. Assessment | **In progress** (P0.1 and P0.3 complete; P0.2 and P0.4 open) | Local baseline verified: `npm ci`, `astro-check` and `build` pass; 16 routes + 404 checked; no overflow at 3 widths | `main` at `3cc073c`, 2026-10-14; details in Section 10.1 |
| 1. Astro backend | Not started | Server route + existing pages still work | — |
| 2. SQLite | Not started | Storage/read tests + clean schema creation | — |
| 3. Forms | Not started | Homepage/contact/service pathways save leads | — |
| 4. Owner login | Not started | Secure login + access denial tests | — |
| 5. Dashboard | Not started | Counts/list/detail/search verified | — |
| 6. Resend | Not started | Email + reliable failure/retry tests | — |
| 7. Sheets and importer | Not started | Full field mapping + sheet-only recovery test | — |
| 8. Fly.io | Not started | HTTPS deployment + persistent SQLite | — |
| 9. Release audit | Not started | Security + backup + recovery end-to-end gates | — |
| 10. Reuse/handoff | Not started | Separate test-client setup verified | — |

### Working notes

**Current working task:** None in progress. P0.1 and P0.3 completed 2026-10-14 (local `main` at `3cc073c`).  
**Next recommended task:** Finish the open P0.2 inventory items, then P0.4. Do not start Phase 1 until the Astro security flag below is addressed in P1.1.  
**Current blocker:** None for P0.2/P0.4. **Gate for Phase 1 and production:** the Astro (critical) and other `npm audit` findings in Section 10.1 must be reviewed and remediated before enabling server-side functionality or deploying.  
**Pending approvals:** D02–D15 and the **real-client portion of D01** at their indicated phases. D01 master trust/testimonial preservation is an explicit owner decision, not a pending approval.  
**Confirmed for this revision:** New `astro-MASTER-flyio` repository, branch, selected source files, hero trust content and testimonial section. The new plan was revised locally. No application implementation, builds, deployments or GitHub writes were performed during that 2026-10-13 revision. (The 2026-10-14 P0.3 baseline runs are recorded in Section 10.1.)

### Decision log

| Date | Decision | Basis | Status |
|---|---|---|---|
| 2026-10-13 | Develop only in `jonexe2/astro-MASTER-flyio`; leave `jonexe2/techlo-astro-MASTER-Dupe-2` untouched. | Owner confirmed new duplicate repository; new source tree inspected. | **Approved and verified as target** |
| 2026-10-13 | Keep master `5.0 Rating`, `200+ Reviews`, `Licensed & Insured`, and existing testimonials. | Explicit owner preference; exact hero text and testimonial files confirmed in working repo. | **Approved for master**; client-public accuracy remains separate |
| 2026-10-13 | Preserve Astro and existing visual design as the preferred foundation. | Project requirement; working repository already contains substantial Astro UI. | Project preference; technically recheck in P1 |
| 2026-10-13 | SQLite + one Fly app/volume are the initial direction, not proved production capacity. | Project requirement; small expected workload; actual measurements pending. | Proposed |
| 2026-10-13 | Sheet-only **lead** reconstruction is a V1 acceptance test, not a substitute for full DB backup. | Project requirement and data-integrity limits. | Required acceptance criterion |

### Completed task log (update only after verification)

| Date | Task | What was verified | Commit/test evidence |
|---|---|---|---|
| 2026-10-13 | P0.1 source review (partial) | New working repo/tree, selected instructions/config and absence of plan file in its `main`. | `astro-MASTER-flyio` tree `3dac95ba...`; runtime tests not run |
| 2026-10-13 | P0.2 source identification (partial) | Main form widgets, shared content, theme tokens, master trust indicators and testimonial section/content identified. | GitHub source review only; browser tests not run |
| 2026-10-14 | P0.1 (complete) | Remote, branch, clean tree, and commits since tree `3dac95b` (documentation only) reconciled with GitHub. | `git fetch`; `HEAD` = `origin/main` = `3cc073c` |
| 2026-10-14 | P0.3 (complete) | Lockfile install, `astro-check`, `build`, 16 routes + 404, form destinations (source), responsive/overflow checks, console review, static-route confirmation. | `main` at `3cc073c`; results in Section 10.1. Repo remained clean (no tracked files changed). |

### Blockers and open questions (update after each session)

- [ ] For an **actual client launch**, what verified brand, rating, review count, license/insurance status and authentic testimonials should be used? Keep the master demo trust elements regardless.
- [x] Has the existing website ever had a successful local build with this exact version? Capture results. *(Yes: 2026-10-14, `main` at `3cc073c`, `npm run build` exit 0, 32 pages. See Section 10.1.)*
- [ ] **Astro and dependency security findings (Section 10.1):** approve an upgrade path (P1.1) before server-side work or deployment.
- [ ] Which owner email and private domain will be used for testing and eventual launch? Do not enter credentials into this public document.
- [ ] Are full-service-address and email mandatory, optional, or a later form improvement?
- [ ] Does the owner need simple New/Contacted/Closed statuses in V1?
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
5. **Leftover template/IT content (preserve master trust/testimonials; this is a cleanup list, not an instruction to remove them):** `config.toml` tagline "Free IT Solutions & Services Astro & Tailwind CSS Theme" appears in every page title and the site is named "Techlo"; `baseUrl` is `https://techlo-lite-astro.pages.dev/`; header shows `hello@example.com` and `518-564-3200`; 404 page and blog are IT-themed (blog also has a form on `/blog/` and post pages); `/services/alternative-services/` and `/services/hero-alternatives/` are IT demo pages; `/services/service-03/` title contains "BlueFlame Heating & Air"; the contact form still has IT-project fields (Budget, Start Date, Project Type, Preferred Contact); page content references Boston, MA. Testimonial text is generic IT-business quotes. Additional observations from the 2026-10-14 contact-page review: the contact section shows an address and phone (`1800 Market Street, Suite 420, San Francisco, CA 94103`, `+1 415 555 2300`) that differ from the header's (`1791 Yorkshire Circle Kitty Hawk, NC 279499`, `518-564-3200`); the heading reads "Let's build an awesome project together" with IT-project copy; the service dropdown offers IT services (Web & Mobile App Development, Cloud Infrastructure, Cybersecurity Review, Data Tracking & Analytics, Automation Workflow).
6. **Large source image.** `alternative-hero-hvac.jpg` is about 2.8 MB at source; the build outputs optimized WebP variants (about 37 kB to 272 kB).
7. **Route naming.** HVAC service pages use generic slugs (`service-02` to `service-06`, `service-custom-slug`) and the services index is separate; SEO-friendly URLs are a later decision, not a defect found by tests.

**Repository protection reminder:** Never push, merge, deploy, or update this plan in the original `techlo-astro-MASTER-Dupe-2`. Only the working `astro-MASTER-flyio` is in scope.

**Update protocol:** When a milestone is truly verified, mark its individual tasks complete, update the phase row with evidence, put the commit reference here, and change the `Current phase`/`Next recommended task` lines at the top. Leave failures visible until resolved. Do not count a plan checkbox as evidence of working software.

---

## 11. Future improvements (not part of V1)

Consider only after V1 works and a real business need is demonstrated:

- CSV export, if deferred.
- Simple lead status, if deferred.
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
- [ ] The development/operations instructions and template-reuse process are understandable and verified, with `astro-MASTER-flyio` identified as the master and the old Techlo duplicate protected.

**When every required box above is checked with evidence, Version 1 is complete.** Until then, continue with the next specific unfinished task rather than restarting the project or expanding its scope.

### Repository and master-content safeguard (applies to every phase)

- **Only development target:** `jonexe2/astro-MASTER-flyio` on an appropriate working branch. Before editing, committing, pushing, or deploying, verify this is the active repository.
- **Protected original:** `jonexe2/techlo-astro-MASTER-Dupe-2`. Leave its code, design, branches and settings unchanged.
- **Keep in master:** the exact `5.0 Rating`, `200+ Reviews`, and `Licensed & Insured` values in the hero, plus the existing testimonial section and sample testimonials. These are intended as **editable demo material in the reusable master**, not as proven facts about future clients.
- **For real client sites:** maintain the same components but populate them with accurate approved business-specific details and genuine testimonials; if evidence is not available, hide the unsupported claim only in that client version. Never remove the original master capability.
- **Before marking a design/content task complete:** inspect the Git diff for accidental changes to these elements and verify their visibility in the master.
