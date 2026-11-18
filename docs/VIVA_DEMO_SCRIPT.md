# Viva Demo Script

A ~5 minute walkthrough for a college viva/demo. Practice it once end-to-end before the real
thing — total time depends mostly on how fast Gemini responds, which you don't control.

## Before you start

- Have a test account already logged in, with **one subject already uploaded** from a previous
  session (so you're not waiting on syllabus analysis live) — but also have a **fresh syllabus
  image or pasted text ready** to upload live for step 2, to prove it isn't staged data.
- Have `GEMINI_API_KEY` and Supabase env vars confirmed working a few minutes beforehand — a cold
  Gemini call can occasionally take a few seconds longer than expected.
- Open the app to `/dashboard` before the examiner sits down.

## Demo flow (~5 minutes)

**1. Dashboard (20s)**
"This is the student's home base — recently studied topics, what's ready to study, and a
streak badge if they've been active on consecutive days." Point at the streak badge if visible.

**2. Upload a syllabus (30s)**
Go to **Learn**. Paste in a short syllabus (a few lines of topic names is enough) or upload an
image. "The Syllabus Agent — one of our LangGraph agents — turns this into a structured
subject → unit → topic → subtopic map, stored directly in Postgres." Show the resulting topic
list appear.

**3. Generate AI notes (30s)**
Click into a topic that has no notes yet, hit **Generate notes**. "The Notes Agent writes
structured, sectioned notes for this topic — and where a concept has a natural visual structure,
it includes a Mermaid diagram."

**4. Show a real diagram (15s)**
Scroll to a section with a diagram. "This used to render as raw Mermaid *text* — now it's a real
rendered SVG diagram, done client-side with the `mermaid` library, sanitized so the AI-generated
diagram source can never execute arbitrary code."

**5. Open AI Tutor, ask a question (30s)**
Click **Ask tutor** from the topic page. Ask something conceptual, e.g. "why does this matter in
practice?" — "The Tutor Agent has short-term memory of this conversation, and its explanation
style defaults to whatever the student set in Settings."

**6. Show Settings personalization (20s)**
Open **Settings**. "Students can rename their Tutor and Mentor, set a preferred explanation style
and language, and a default assessment difficulty — all of it actually changes AI behavior, not
just labels." Point out the Tutor's name in the header matches what's set here.

**7. Create an assessment (30s)**
Go to **Assessment** → pick the topic → leave "Include short-answer questions" checked → **Start
test**. "This generates a mix of MCQs and short-answer questions in one call to the Assessment
Agent, difficulty adapted to the student's last score on this topic — or their Settings preference
if they've never attempted it before."

**8. Attempt MCQ + short-answer questions (45s)**
Answer one MCQ (click an option) and one short-answer question (type 2-3 sentences, even a
partially-correct answer to show partial credit later). Hit **Submit**.

**9. Show grading feedback (30s)**
On the results page: "MCQs are graded deterministically — exact match, no AI involved, zero
ambiguity. Short-answer questions go through a dedicated Grading Agent that compares the answer
against a rubric and gives partial credit with specific feedback — clearly labeled as
AI-generated, with strengths and areas to improve, not just a score."

**10. Open Progress (20s)**
"Everything here is computed from real database records — no fabricated numbers. Score trend,
topic-wise performance, concept strength, and the activity calendar behind the streak."

**11. Open History (15s)**
"A unified, filterable feed of every notes-generation, tutor session, and assessment — newest
first, links straight back into each one."

**12. Show AI Mentor (30s)**
Open **Mentor**. "The Mentor Agent reasons over the student's weak/strong concepts from real
assessment data, plus their recent questions to the Tutor — so if a student keeps asking about
something, the Mentor notices that even before it shows up as a 'weak concept' from a test."

**13. Wrap-up — architecture (30s)**
"Six specialized agents — Syllabus, Notes, Tutor, Assessment, Grading, and Mentor — each with a
narrow job, orchestrated through small LangGraph graphs, all going through one shared structured
-output layer that validates every AI response against a Zod schema before it touches the
database. Supabase handles auth, Postgres, and row-level security, so every query is scoped to
the signed-in user at the database level, not just in application code."

## Technologies used

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, Supabase (Postgres + Auth), Row Level Security
- **AI**: Google Gemini (`gemini-2.0-flash`) via LangChain + LangGraph, Zod-validated structured
  output
- **Diagrams**: `mermaid` (client-side SVG rendering)
- **Testing**: Vitest (68+ unit tests across agents, graphs, and pure utilities)

## AI agent responsibilities (one line each)

- **Syllabus Agent** — turns a syllabus (image or text) into a structured topic map.
- **Notes Agent** — writes structured, sectioned study notes for one topic.
- **Tutor Agent** — holds a focused conversation about one topic, with short-term memory.
- **Assessment Agent** — generates a mix of MCQ and short-answer questions at a given difficulty.
- **Grading Agent** — grades one short-answer response against a model answer and rubric, with
  partial credit and specific feedback.
- **Mentor Agent** — turns computed performance data + recent Tutor questions into specific,
  actionable recommendations.
- **Performance analysis** (deterministic, no LLM) — aggregates `performance_records` into
  strong/moderate/weak concept buckets.

## Database flow (one line each)

`syllabus_uploads` → `subjects`/`units`/`topics`/`subtopics` → `notes`/`note_sections` →
`chat_sessions`/`chat_messages` → `assessments`/`assessment_questions` →
`assessment_attempts`/`assessment_answers` → `performance_records` → `mentor_recommendations`.
Every table is locked down with Postgres Row Level Security keyed to `auth.uid()`.

## Authentication flow

Supabase Auth (email/password), session held in cookies via `@supabase/ssr`. The `(dashboard)`
route group's layout does a server-side session check and redirects to `/login` if absent;
`middleware.ts` covers the same routes as a second layer.

## How personalization works

Settings writes to `profiles` (Tutor/Mentor display names) and `user_preferences` (difficulty,
explanation style, language). The Tutor's session mode, a new assessment's starting difficulty
(when there's no score history yet to adapt from), and the names shown in the Tutor/Mentor headers
all read from these at request time — not hardcoded.

## Error-handling, live

If something fails mid-demo, these are honest, not embarrassing:

- **Notes/assessment/mentor generation fails** → a clear error message, not a blank screen or a
  fabricated result.
- **One short-answer question fails to grade** → the result page says so explicitly and excludes
  it from the score (never silently marks it 0 or 100) — you can point this out as a designed
  behavior, not a bug, if it happens to occur live.
- **A topic with no notes yet** → shows a "Generate notes" CTA, not an empty page.

## Backup plan if the AI provider is unavailable

1. Have a **second account with pre-generated content** (notes, a completed assessment with mixed
   question types already graded, at least one Mentor recommendation, a few days of activity for
   Progress/History/streak) ready to switch to.
2. Walk through Progress, History, Settings, and the result page on that account instead — none of
   those need a live Gemini call.
3. Explain the architecture (step 13 above) — this doesn't depend on the AI provider being up, and
   is often what examiners care about most anyway.
