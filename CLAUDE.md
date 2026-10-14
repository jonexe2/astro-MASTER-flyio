# CLAUDE.md

Follow `AGENTS.md` for the full project instructions.

This is an Astro and Tailwind CSS theme. When editing code:

- Reuse existing components, widgets, cards, schemas, styles, and content patterns.
- Keep editable copy, links, images, buttons, and section options in `src/content/`.
- Add or update schemas in `src/sections.schema.ts` when adding content fields.
- For new sections, create both a section component and a matching content file.
- Use page frontmatter named blocks for page-specific section overrides.
- Use `Button.astro`, `DynamicIcon.astro`, `Icons.astro`, and `OptimizedImage.astro` instead of rebuilding shared primitives.
- Use nearest Tailwind theme values from `src/styles/theme.css`.
- Avoid Tailwind arbitrary values.
- Do not add heading classes already covered by `base.css`, including default font weight, tracking, leading, or wrapping classes.
- Prefer static rendering and add client JavaScript only when interaction requires it.
- Keep copy generic for a shippable theme and avoid hardcoded brand names in reusable content.

Before finishing code or schema changes, run `npm run astro-check`. Run `npm run build` for broad routing, content, or asset changes.

## Implementation Roadmap

`IMPLEMENTATION_PLAN.md` is the authoritative implementation roadmap and progress tracker for this project.

At the beginning of each development session:
1. Read `IMPLEMENTATION_PLAN.md`, including the current phase, working notes, blockers, and next recommended task.
2. Read `AGENTS.md` and inspect the relevant current source files.
3. Confirm the working repository is `jonexe2/astro-MASTER-flyio`. Never modify `jonexe2/techlo-astro-MASTER-Dupe-2`.
4. Reconcile the plan with the actual Git state before starting work.

During development:
- Work on one approved, appropriately scoped task at a time.
- Preserve approved design, master trust indicators, and testimonials.
- Do not begin additional implementation phases without approval.
- Test and review meaningful changes before declaring them complete.
- Never claim a test passed unless it was actually performed.

After completing a task:
- Update the relevant checklist only when the work has been verified.
- Record actual test evidence, blockers, and relevant Git commit information.
- Update the current task and next recommended task.
- Commit and push approved plan updates so future sessions can use them.

Do not treat unchecked or unverified tasks as completed.
