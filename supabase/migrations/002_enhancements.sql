-- =============================================================================
-- AI Tutor — Migration 002: Settings, Short-Answer Grading, Streaks
--
-- Additive only. Every statement is safe to re-run and never drops or
-- rewrites existing data. Run this in the Supabase SQL editor (or
-- `supabase db push`) against a project that already has schema.sql applied.
--
-- Covers:
--   - Feature 2 (Settings): user_preferences.preferred_language
--   - Feature 5 (Short-answer + LLM grading): assessment_questions grading
--     metadata, assessment_answers score/feedback columns
--   - Feature 7 (Streaks): index to make the streak query cheap
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Feature 2 — Settings: preferred language, alongside the already-existing
-- preferred_difficulty / explanation_style columns.
-- ---------------------------------------------------------------------------
alter table user_preferences
  add column if not exists preferred_language text not null default 'english'
    check (preferred_language in ('english', 'hindi', 'hinglish'));

-- ---------------------------------------------------------------------------
-- Feature 5 — Short-answer questions with LLM grading.
--
-- `assessment_questions.type` already allowed 'short_answer'/'long_answer' in
-- schema.sql's CHECK constraint; only MCQs were ever generated. These columns
-- add what a short-answer question needs that an MCQ doesn't:
--   - model_answer: the reference answer the grader compares against
--     (correct_answer is kept as the MCQ literal-match column and left
--     unused for short answers, to avoid a breaking type change on a column
--     existing rows and queries already depend on).
--   - rubric: key points / partial-credit guidance for the grading prompt.
--   - max_marks: MCQs default to 1; short answers are typically worth more.
-- ---------------------------------------------------------------------------
alter table assessment_questions
  add column if not exists model_answer text;

alter table assessment_questions
  add column if not exists rubric text;

alter table assessment_questions
  add column if not exists max_marks numeric not null default 1 check (max_marks > 0);

-- Short-answer questions have no single literal correct answer to match
-- against, so `correct_answer` (originally NOT NULL, MCQ-only) must allow
-- null for them. MCQ generation/grading is untouched: the column is still
-- always populated for type = 'mcq'.
alter table assessment_questions
  alter column correct_answer drop not null;

-- ---------------------------------------------------------------------------
-- Feature 5 — grading results per answer.
--
-- MCQ grading remains fully deterministic (is_correct, computed in the route
-- handler) and now also fills in score/max_score for a consistent weighted
-- total across question types. Short-answer grading is the only path that
-- writes ai_feedback and can produce grading_status = 'failed' (a failed AI
-- grading call is recorded as failed, never silently scored 0 or 100 — see
-- app/api/assessment/[id]/submit/route.ts).
-- ---------------------------------------------------------------------------
alter table assessment_answers
  add column if not exists score numeric;

alter table assessment_answers
  add column if not exists max_score numeric;

alter table assessment_answers
  add column if not exists ai_feedback jsonb;

alter table assessment_answers
  add column if not exists grading_status text not null default 'graded'
    check (grading_status in ('graded', 'ungraded', 'failed'));

-- ---------------------------------------------------------------------------
-- Feature 7 — streaks are computed from learning_sessions.created_at, grouped
-- by calendar day per user. This index makes that query (and the Progress /
-- History pages' date-range scans) an index-only scan instead of a full
-- table scan as session history grows.
-- ---------------------------------------------------------------------------
create index if not exists idx_learning_sessions_user_created
  on learning_sessions (user_id, created_at desc);

create index if not exists idx_assessment_attempts_user_submitted
  on assessment_attempts (user_id, submitted_at desc);
