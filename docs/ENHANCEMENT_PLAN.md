# Enhancement Plan

Audit performed before any feature work, per the project's Phase 0 requirement. This
supersedes nothing in the existing `README.md` — it records what was found, what changed, and in
what order the 10 requested enhancements were implemented.

## 1. Current architecture summary

- **Framework**: Next.js 14 (App Router), TypeScript strict, Tailwind, Radix UI primitives.
- **Auth/DB**: Supabase (Postgres + Auth + Storage), `@supabase/ssr` for cookie-based sessions,
  Row Level Security on every table.
- **AI**: Google Gemini (`gemini-2.0-flash`) via LangChain (`@langchain/google-genai`), orchestrated
  per-feature by small LangGraph graphs (`lib/langgraph/*`). All structured (JSON) output goes
  through `lib/ai/structured.ts::generateStructured`, which validates against a Zod schema and
  retries once on validation failure.
- **Agents** (`lib/agents/*`): `syllabus-agent`, `notes-agent`, `tutor-agent`, `assessment-agent`,
  `performance-agent` (deterministic, no LLM), `mentor-agent`.
- **Testing**: Vitest, 10 suites, agent/graph logic mocked at the LLM boundary.

## 2. Existing features discovered (already implemented, working)

- Email/password auth, protected routes (route-group layout + middleware).
- Syllabus upload (image or pasted text) → structured subject/unit/topic/subtopic map.
- Notes generation → structured sections, collapsible reader, Mermaid code shown as **styled text**,
  not rendered.
- Tutor chat with 4 modes, short-term memory (`chat_messages`) scoped per `chat_session`.
- MCQ-only assessments with adaptive difficulty based on the student's last score on a topic.
- Deterministic performance aggregation (`performance_records` → strong/moderate/weak buckets).
- Mentor recommendations grounded in performance buckets + `learning_memory`, persisted to
  `mentor_recommendations`, each with a YouTube search-query link.
- Dashboard with a "recommended next" nudge and recent/ready-to-study topic lists.

## 3. Database schema relevant to the enhancements

All tables already existed in `supabase/schema.sql` (see that file for full DDL). Notably:

- `user_preferences` — created and seeded by the signup trigger, **but no route reads/writes it**.
  This slice is what the Settings page (Feature 2) fills in.
- `assessment_questions.type` already allows `'short_answer' | 'long_answer'` in its CHECK
  constraint, but only `'mcq'` is ever generated — the schema anticipated Feature 5.
- `chat_messages` already persists every tutor question/answer per session — this is the "recent
  Tutor questions" data source Feature 6 needed; nothing new to persist.
- `performance_records` + `learning_sessions` already have everything Progress/History
  (Features 3–4) need; no fabricated data was required.

### Pre-existing bugs found and fixed during the audit (not part of the 10 features, but blocking
### "the project builds cleanly", which the task explicitly requires)

1. **`types/database.ts` was missing `__InternalSupabase: { PostgrestVersion: '12' }`.** Newer
   `@supabase/supabase-js` (installed: 2.116, allowed by the existing `^2.45.4` range) requires this
   marker on a hand-written `Database` type to resolve schema generics. Without it, **every**
   `.from(table)` call type-checked to `never`, hiding real type errors. Fixed by adding the marker.
2. **`@supabase/ssr@0.5.2` (the originally pinned minor) has incompatible generics with
   `@supabase/supabase-js@2.116`.** Upgraded to `@supabase/ssr@^0.12.7`, which is generic-compatible
   and still supports the deprecated `get/set/remove` cookie API this codebase uses (no code changes
   needed at call sites).
3. **Every hand-written table in `types/database.ts` was missing `Relationships` metadata**
   (documented as a known limitation in the README). This made every embedded-select query (e.g.
   `topics(...).select('..., subjects(name)')`, used in ~15 places) type-check the **entire row** as
   `never`, not just the joined field. Fixed by adding accurate `Relationships` arrays (matching the
   real foreign keys in `schema.sql`) to all 16 tables that participate in an embedded select.
4. **The `subtopics` table had no entry at all in `types/database.ts`**, despite being read
   (`notes/generate/route.ts`) and written (`syllabus/analyze/route.ts`) by existing code. Added.
5. **Three Vitest suites failed** (`mentor-graph`, `topic-analysis-graph`, `tutor-chat-graph`) with
   a `vi.mock` hoisting `ReferenceError` — a pre-existing test bug (referencing a `const` inside a
   hoisted `vi.mock` factory). Fixed with `vi.hoisted(...)` in all three files. Test suite is now
   10/10 passing, 42/42 individual tests.
6. **`middleware.ts` only protected `/dashboard` and `/learn`** — `/tutor`, `/assessment`, and
   `/mentor` were reachable past the middleware layer for a signed-out request (the `(dashboard)`
   route-group's own server-side layout check still caught this, so it wasn't a live vulnerability,
   but it was a gap in defense-in-depth). Extended the prefix list to cover the whole route group,
   including the three new pages this work adds.

After these fixes: `npx tsc --noEmit` → 0 errors (was 139), `npm run lint` → clean, `npm test` →
10/10 suites. See section 14 for full toolchain results.

## 4. Files/components/routes to modify or create, by feature

| # | Feature | New | Modified |
|---|---|---|---|
| 1 | Mermaid rendering | `components/notes/MermaidDiagram.tsx` | `components/notes/NoteMarkdown.tsx`, `package.json` (add `mermaid`) |
| 2 | Settings | `app/(dashboard)/settings/page.tsx`, `app/api/settings/route.ts`, `components/settings/SettingsForm.tsx` | `supabase/schema.sql` (add `user_preferences.preferred_language`), `types/database.ts`, `components/tutor/ChatWindow.tsx` (initial mode from prefs), `app/(dashboard)/tutor/page.tsx`, `app/(dashboard)/assessment/page.tsx` (default difficulty from prefs) |
| 3 | Progress | `app/(dashboard)/progress/page.tsx`, `components/progress/*` | `components/layout/Sidebar.tsx` (nav link) |
| 4 | History | `app/(dashboard)/history/page.tsx`, `components/history/*` | `components/layout/Sidebar.tsx` |
| 5 | Short-answer + LLM grading | `app/api/assessment/[id]/submit-short-answer/route.ts` (or extend `submit`), `lib/agents/grading-agent.ts`, `prompts/grading.ts` | `lib/validation/schemas.ts`, `prompts/assessment.ts`, `lib/agents/assessment-agent.ts`, `app/api/assessment/generate/route.ts`, `app/api/assessment/[id]/submit/route.ts`, `components/assessment/TestRunner.tsx`, `app/(dashboard)/assessment/[assessmentId]/result/page.tsx`, `supabase/schema.sql`/migration |
| 6 | Richer Mentor context | `lib/memory/tutor-context.ts` | `lib/agents/mentor-agent.ts`, `app/api/mentor/recommendations/route.ts`, `prompts/mentor.ts` |
| 7 | Streak tracking | `lib/streak.ts` | `app/(dashboard)/dashboard/page.tsx`, `app/(dashboard)/progress/page.tsx` |
| 8–9 | Loading/empty states | — | audited across all touched pages as they're built; no separate pass needed since every new page ships with skeleton + empty state from the start |
| 10 | Viva readiness | `docs/VIVA_DEMO_SCRIPT.md` | — |

## 5. Risks

- **Migrations run against no live Supabase project in this environment.** SQL is written and
  reviewed by hand against the existing `schema.sql` conventions (idempotent `if not exists`,
  matching RLS pattern) but not executed against a real database from here. Documented as a
  remaining manual step.
- **No `GEMINI_API_KEY`, Supabase credentials, or network access to Google/Supabase in this
  sandbox** — AI-calling code paths (grading, mentor, notes) are written and unit-tested with the
  LLM client mocked (matching the existing test style) but not exercised end-to-end.
- **`npm run build` cannot complete in this sandbox** because `app/layout.tsx` uses
  `next/font/google`, which fetches from `fonts.googleapis.com` at build time — not on this
  environment's allowed egress list. This is unrelated to any code change here; `npx tsc --noEmit`
  is used as the closest available proxy and is clean. Flagged as a remaining step for a real
  environment.
- **Short-answer grading is the highest-risk feature** (new LLM call in the grading path, on the
  score-determining critical path). Mitigated by: clamping scores server-side, never trusting a
  client-submitted score, treating a grading failure as "ungraded" (never silently 0 or silently
  100), and keeping MCQ grading fully deterministic and untouched.

## 6. Implementation order

1. Fix pre-existing type/test bugs blocking a clean toolchain (done — section 3).
2. Mermaid rendering (self-contained, no schema change, immediately demoable).
3. Database migration (`supabase/migrations/002_enhancements.sql`) covering Settings +
   short-answer grading columns in one pass, since both need schema changes.
4. Settings page (depends on migration).
5. Progress page (read-only, existing data).
6. History page (read-only, existing data).
7. Streak tracking (feeds both Dashboard and Progress).
8. Short-answer questions + LLM grading (largest surface area).
9. Richer Mentor context (small, additive to an already-working agent).
10. Empty/loading state pass across touched pages (continuous, not a separate phase).
11. `docs/VIVA_DEMO_SCRIPT.md`.
12. Final toolchain run + report.

## 7. Testing plan

- `npx tsc --noEmit` after every schema/type change (fast, catches join/type regressions
  immediately — this is what caught issues 1–4 above).
- `npm run lint` after UI changes.
- `npm test` — extend with new unit tests for: the grading agent's score-clamping logic, the
  streak-calculation function (pure, easy to test with fixed dates), and the mentor context builder.
- Manual read-through of every new route for: auth check present, ownership filter (`eq('user_id', ...)`
  or an ownership join) present, and no secret/answer-key leaked to the client before submission.
