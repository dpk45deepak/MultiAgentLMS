# Architecture

This document explains the request/data flow end to end for the parts of AI Tutor implemented in
this repository, and where the not-yet-built agents would slot in.

## Layered view

```
Frontend (Next.js App Router, Server + Client Components)
   ↓
API Layer (Route Handlers under app/api/**)
   ↓
LangGraph Orchestrator (lib/langgraph/*)
   ↓
Agents (lib/agents/*) — each a pure function, no DB access
   ↓
LangChain (ChatGoogleGenerativeAI wrapper, lib/ai/gemini.ts)
   ↓
Gemini (Google's API)
   ↓
Memory / Tools (lib/memory/*, Zod validation in lib/validation/*)
   ↓
Supabase (Postgres + Auth + Storage)
```

A deliberate rule enforced throughout the code: **agents never import a Supabase client.**
`runSyllabusAgent` and `runNotesAgent` take plain data in and return validated plain data out.
This is what makes `tests/notes-agent.test.ts` and `tests/topic-analysis-graph.test.ts` possible
without a database or a real Gemini key — they mock one function (`getStructuredModel` /
`runSyllabusAgent`) and assert on pure input/output. Route handlers are the only place that talks
to Postgres/Storage, and they do so with the request-scoped, cookie-authenticated Supabase client
(`lib/supabase/server.ts`), so every query is automatically subject to RLS as that specific user.

## Authentication flow

1. `middleware.ts` runs on every request to `/dashboard/**` and `/learn/**`. It refreshes the
   Supabase session cookie and, if there's no authenticated user, redirects to `/login?next=...`.
2. `/login` and `/register` are Client Components that call `supabase.auth.signInWithPassword` /
   `signUp` directly against Supabase Auth (no custom password handling — Supabase owns hashing,
   sessions, and email confirmation tokens).
3. Email confirmation links point at `/api/auth/callback`, which exchanges the code for a session
   server-side and redirects into `/dashboard`.
4. `(dashboard)/layout.tsx` re-checks `auth.getUser()` server-side before rendering any protected
   page — belt-and-braces alongside the middleware check.

## Syllabus processing flow

```
User submits image or text on /learn
   ↓ (multipart POST)
/api/syllabus/analyze
   ↓ 1. auth check (401 if no user)
   ↓ 2. validate file type/size, OR require non-empty text
   ↓ 3. if image: upload bytes to Supabase Storage (private bucket, path = {userId}/...)
   ↓ 4. insert a `syllabus_uploads` row (status: pending)
   ↓ 5. topicAnalysisGraph.invoke({ input })
   │      classifyInput  → rejects empty/malformed input before spending an API call
   │      syllabusAgent  → calls Gemini, validates against TopicAnalysisSchema,
   │                       retries once on validation failure
   ↓ 6. on success: find-or-create `subjects` row, insert `units`, upsert `topics`
   │    (upsert on (user_id, subject_id, normalized_name) — this is the de-duplication
   │    the spec asks for: re-uploading a similar syllabus won't create duplicate topics)
   │    insert `subtopics`
   │    mark `syllabus_uploads.status = processed`
   ↓ 7. on failure: mark `syllabus_uploads.status = failed` with a reason, return a
   │    human-readable 422 — never a raw stack trace
   ↓
Response: { subject, topics: [{ id, name, unitName }] }
   ↓
UI renders the topic list; clicking a topic navigates to /learn/[topicId]
```

## Notes generation flow

```
User clicks "Generate notes" on /learn/[topicId]
   ↓ (POST { topicId })
/api/notes/generate
   ↓ 1. auth check + ownership check (topic must belong to this user)
   ↓ 2. cost control: if a `notes` row already exists for this topic, return it — no Gemini call
   ↓ 3. notesGenerationGraph.invoke({ userId, subject, topic, subtopics }, { configurable })
   │      contextRetrieval → fetchLearnerContext(userId, topic) reads recent
   │                          `learning_memory` rows (injected via LangGraph's
   │                          `config.configurable`, not imported directly — see
   │                          the comment in lib/langgraph/notes-generation-graph.ts
   │                          for why: it keeps the graph itself DB-free and testable)
   │      notesAgent       → calls Gemini, validates against NotesSchema, retries once
   ↓ 4. insert `notes` row, insert one `note_sections` row per section
   ↓ 5. update `topics.status = 'notes_ready'`
   ↓ 6. insert a `learning_sessions` row (activity_type: notes_generated)
   ↓ 7. insert a `learning_memory` row (memory_type: completed_topic) — this is the
   │    "Memory Update" step from the product spec's flow diagram. It runs here,
   │    after the graph returns and the note has a real database id, rather than
   │    as a graph node — see the note in lib/langgraph/state.ts.
   ↓
Response: { noteId, reused: boolean }
   ↓
Client calls router.refresh(); the Server Component re-fetches notes + sections and
renders <NotesReader>.
```

## State transitions

`topics.status`: `not_started` → `notes_ready` (set by the notes-generate route) → `completed`
(set by `/api/assessment/[id]/submit` when an attempt scores >=80% — see the Assessment flow
below). Status is never downgraded by a lower later score.

`syllabus_uploads.status`: `pending` → `processed` | `failed`.

`notes.generation_status`: always `ready` in this slice (a row is only inserted after successful
validation); `failed` is reserved in the schema for a future async/background generation path.

## Tutor doubt-solving flow

```
User opens /tutor?topicId=X, sends a message
   ↓ (first load: POST /api/tutor/sessions { topicId, mode })
   ↓ 1. auth check + topic ownership check
   ↓ 2. insert `chat_sessions` row (mode: beginner/normal/exam_focused/deep)
   ↓
(each message: POST /api/tutor/chat { sessionId, message })
   ↓ 1. auth check + session ownership check (session.user_id === user.id)
   ↓ 2. insert the user's message into `chat_messages`
   ↓ 3. tutorChatGraph.invoke({ ... }, { configurable })
   │      contextRetrieval → fetchRecentHistory(sessionId) reads the last 12
   │                          `chat_messages` rows (short-term memory), injected
   │                          via config.configurable exactly like notes
   │                          generation injects long-term memory retrieval
   │      tutorAgent       → calls Gemini with system prompt + history + new
   │                          message; returns plain text (not schema-validated
   │                          — see README for why chat is the deliberate
   │                          exception to "validate all AI output")
   ↓ 4. insert the assistant's reply into `chat_messages`
   ↓ 5. insert a `learning_sessions` row (activity_type: tutor_chat)
   ↓
Response: { reply }
   ↓
ChatWindow appends the reply to the visible conversation.
```

Changing the mode selector or clicking "clear conversation" both call `POST
/api/tutor/sessions` again, starting a fresh `chat_sessions` row — short-term memory is
intentionally scoped to one session, not the whole topic, so switching modes doesn't carry a
beginner-level conversation's assumptions into an exam-focused one.

## Assessment flow

```
User clicks "Start test" on /assessment (or "Start practice" on a topic page)
   ↓ (POST /api/assessment/generate { topicId, difficulty: 'adaptive' })
   ↓ 1. auth + ownership check
   ↓ 2. resolveAdaptiveDifficulty: reads the student's most recent SUBMITTED
   │    attempt for this topic. No prior attempt → medium. >=80% → hard next
   │    time. 50–79% → medium. <50% → easy. (requirement #18)
   ↓ 3. assessmentGenerationGraph.invoke({ subject, topic, difficulty, questionCount })
   │      assessmentAgent → calls Gemini, validates against
   │                        AssessmentQuestionsSchema, retries once
   ↓ 4. insert `assessments` row, insert `assessment_questions` rows (WITH
   │    correct_answer + explanation — server-side only)
   ↓
Response: { assessmentId, questions: [{ id, question, options }] }
   │    — correctAnswer and explanation are stripped here, before the
   │    response is built, not just hidden in the UI.
   ↓
TestRunner renders one question at a time; on submit:
   ↓ (POST /api/assessment/{id}/submit { answers: [{questionId, answer}] })
   ↓ 1. auth + ownership check
   ↓ 2. insert `assessment_attempts` row
   ↓ 3. grade each answer against the question's real `correct_answer`
   │    (fetched server-side, never trusted from the client)
   ↓ 4. insert `assessment_answers` rows
   ↓ 5. group by `concept`, compute a 0–100 score per concept for this
   │    attempt, insert one `performance_records` row per concept
   ↓ 6. any concept scoring <50% → recordWeakConceptMemory (writes a
   │    `learning_memory` row of type "weakness")
   ↓ 7. update `assessment_attempts.score` + `submitted_at`
   ↓ 8. overall score >=80% → mark `topics.status = 'completed'`
   ↓ 9. insert a `learning_sessions` row (activity_type: assessment_attempt)
   ↓
Response: { attemptId, score, results, weakConcepts }
   ↓
Client navigates to /assessment/{id}/result?attempt={attemptId} — a Server
Component that re-reads assessment_attempts + assessment_answers (joined to
assessment_questions) from the database, rather than trusting client-held
state. Reloading the result page always shows the same, durable answer.
```

## Mentor / performance analysis flow

```
User opens /mentor
   ↓ (GET /api/mentor/recommendations)
   ↓ 1. auth check
   ↓ 2. mentorGraph.invoke({ userId, mentorDisplayName }, { configurable })
   │      performanceAnalysis → computePerformanceBreakdown(userId): reads ALL
   │                            of the user's `performance_records`, averages
   │                            score per concept, buckets into
   │                            strong (>=75%) / moderate (50–74%) / weak (<50%).
   │                            This is plain arithmetic, not an LLM call — see
   │                            README "Why these choices" for the reasoning.
   │      contextRetrieval    → fetchAllLearnerContext(userId): last 10
   │                            `learning_memory` rows across all topics
   │                            (unlike NOTES_AGENT's topic-scoped version)
   │      mentorAgent         → if performance.hasData is false, returns an
   │                            honest "take an assessment first" response
   │                            WITHOUT calling Gemini. Otherwise calls Gemini
   │                            with the real breakdown + memory, validates
   │                            against MentorRecommendationSchema, retries once.
   ↓ 3. insert one `mentor_recommendations` row per recommendation item
   ↓ 4. attach a YouTube search URL to each recommendation — built here, in
   │    the route, as `youtube.com/results?search_query=<topic> explained`;
   │    never generated by the model (an LLM cannot verify a video URL exists)
   ↓
Response: { summary, performance, recommendations: [{ topic, reason, action, youtubeSearchUrl }] }
   ↓
MentorPanel renders the summary, a strong/moderate/weak concept breakdown, and
one card per recommendation with a "Find a video on this topic" link.
```

This flow is intentionally regenerated on every page load rather than cached — unlike notes
generation, there's no natural "already generated, reuse it" boundary here, since the whole point
is that the recommendation should reflect the student's latest assessment results.

## Database relationships

```
auth.users 1─1 profiles
auth.users 1─N subjects
subjects   1─N units
subjects   1─N topics ──N─1 units (nullable)
topics     1─N subtopics
topics     1─1 notes
notes      1─N note_sections
auth.users 1─N syllabus_uploads ──1 subjects (nullable, set after processing)
topics     1─N syllabus_uploads (via syllabus_upload_id on topics, nullable)
auth.users 1─N learning_memory ──1 topics (nullable)
auth.users 1─N learning_sessions ──1 topics (nullable)
topics     1─N chat_sessions ──N chat_messages
topics     1─N assessments ──N assessment_questions
assessments 1─N assessment_attempts ──N assessment_answers ──1 assessment_questions
auth.users 1─N performance_records ──1 topics
auth.users 1─N mentor_recommendations
```

## Memory lifecycle

**Short-term** (`chat_sessions` / `chat_messages`): written by every tutor message (both the
student's and the assistant's), read by `contextRetrieval` in `tutorChatGraph` on every
subsequent message in the same session. Scoped to one session, never mixed across topics or
modes.

**Long-term** (`learning_memory`): written from two places now —
`recordCompletedTopicMemory` (after notes generation) and `recordWeakConceptMemory` (after
assessment grading, one row per concept under 50%). Read from two places — `NOTES_AGENT`'s
`fetchLearnerContext` (topic-scoped, informs new notes) and `MENTOR_AGENT`'s
`fetchAllLearnerContext` (all-history, informs recommendations). This is still a thinner slice
than the full spec's memory types (`strength`, `mistake`, `preference` exist as allowed values on
the `memory_type` check constraint but nothing writes them yet) — see README limitations.

## What's genuinely deferred

Everything in the original synopsis now has a working agent. What remains deferred within that
scope: short/long-answer question grading (MCQ-only today), a Settings UI for the
already-seeded `profiles.tutor_display_name` / `mentor_display_name` / `user_preferences`
columns, `/progress` and `/history` pages over data that already exists in
`performance_records`/`learning_sessions`, and a real YouTube Data API integration in place of
the current search-link. None of these require a schema change — see README "Future scope".
