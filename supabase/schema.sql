-- =============================================================================
-- AI Tutor — Database Schema (fresh install)
--
-- This file is the COMPLETE schema: the original baseline (migration 001)
-- followed by every numbered migration in supabase/migrations/ in order
-- (002 -> 005). A fresh project only needs this file; an existing project
-- should instead apply just the migrations it has not run yet, in order:
--
--     002_enhancements.sql
--     003_security_and_integrity.sql
--     (deploy the new application code)
--     004_lockdown.sql
--     005_usage_and_plans.sql
--
-- The whole file is idempotent (safe to re-run). Run it in the Supabase SQL
-- editor, or via `supabase db push`.
-- =============================================================================

create extension if not exists "uuid-ossp";

-- =============================================================================
-- Baseline tables (migration 001)
-- =============================================================================

-- One row per authenticated user, mirroring auth.users.
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  tutor_display_name text not null default 'AI Tutor',
  mentor_display_name text not null default 'AI Mentor',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists subjects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists syllabus_uploads (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid references subjects (id) on delete set null,
  storage_path text,
  input_mode text not null check (input_mode in ('image', 'text')),
  raw_text_input text,
  status text not null default 'pending' check (status in ('pending', 'processed', 'failed')),
  failure_reason text,
  created_at timestamptz not null default now()
);

create table if not exists units (
  id uuid primary key default uuid_generate_v4(),
  subject_id uuid not null references subjects (id) on delete cascade,
  name text not null,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists topics (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references subjects (id) on delete cascade,
  unit_id uuid references units (id) on delete set null,
  syllabus_upload_id uuid references syllabus_uploads (id) on delete set null,
  name text not null,
  normalized_name text not null,
  order_index int not null default 0,
  status text not null default 'not_started' check (status in ('not_started', 'notes_ready', 'completed')),
  created_at timestamptz not null default now(),
  unique (user_id, subject_id, normalized_name)
);

create table if not exists subtopics (
  id uuid primary key default uuid_generate_v4(),
  topic_id uuid not null references topics (id) on delete cascade,
  name text not null,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists learning_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id uuid references topics (id) on delete set null,
  activity_type text not null check (activity_type in ('notes_generated', 'notes_viewed', 'tutor_chat', 'assessment_attempt')),
  created_at timestamptz not null default now()
);

create table if not exists notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id uuid not null references topics (id) on delete cascade,
  model text not null,
  generation_status text not null default 'ready' check (generation_status in ('ready', 'failed')),
  created_at timestamptz not null default now(),
  unique (topic_id)
);

create table if not exists note_sections (
  id uuid primary key default uuid_generate_v4(),
  note_id uuid not null references notes (id) on delete cascade,
  section_key text not null check (
    section_key in (
      'overview', 'definition', 'why_it_matters', 'core_concept', 'types',
      'working', 'diagram', 'advantages', 'disadvantages', 'applications',
      'examples', 'exam_points', 'quick_revision', 'common_mistakes',
      'practice_questions'
    )
  ),
  title text not null,
  content_markdown text not null,
  order_index int not null default 0,
  created_at timestamptz not null default now(),
  unique (note_id, section_key)
);

-- Long-term learning memory: distinct from raw chat/message history.
-- Holds durable, curated facts the mentor/tutor should recall later.
create table if not exists learning_memory (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id uuid references topics (id) on delete set null,
  memory_type text not null check (memory_type in ('completed_topic', 'strength', 'weakness', 'mistake', 'preference')),
  summary text not null,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- Tutor chat, assessments, performance, mentor and preferences
-- =============================================================================

create table if not exists chat_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id uuid references topics (id) on delete set null,
  mode text not null default 'normal' check (mode in ('beginner', 'normal', 'exam_focused', 'deep')),
  created_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references chat_sessions (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists assessments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id uuid not null references topics (id) on delete cascade,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard', 'adaptive')),
  created_at timestamptz not null default now()
);

create table if not exists assessment_questions (
  id uuid primary key default uuid_generate_v4(),
  assessment_id uuid not null references assessments (id) on delete cascade,
  question text not null,
  type text not null check (type in ('mcq', 'short_answer', 'long_answer')),
  options jsonb,
  correct_answer text not null,
  explanation text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  concept text not null,
  order_index int not null default 0
);

create table if not exists assessment_attempts (
  id uuid primary key default uuid_generate_v4(),
  assessment_id uuid not null references assessments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  score numeric,
  started_at timestamptz not null default now(),
  submitted_at timestamptz
);

create table if not exists assessment_answers (
  id uuid primary key default uuid_generate_v4(),
  attempt_id uuid not null references assessment_attempts (id) on delete cascade,
  question_id uuid not null references assessment_questions (id) on delete cascade,
  student_answer text,
  is_correct boolean
);

create table if not exists performance_records (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  topic_id uuid not null references topics (id) on delete cascade,
  concept text not null,
  score numeric not null,
  recorded_at timestamptz not null default now()
);

create table if not exists mentor_recommendations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recommendation text not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  preferred_difficulty text not null default 'medium' check (preferred_difficulty in ('easy', 'medium', 'hard', 'adaptive')),
  explanation_style text not null default 'normal' check (explanation_style in ('beginner', 'normal', 'exam_focused', 'deep')),
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- Indexes
-- =============================================================================

create index if not exists idx_topics_user_subject on topics (user_id, subject_id);
create index if not exists idx_notes_user on notes (user_id);
create index if not exists idx_note_sections_note on note_sections (note_id);
create index if not exists idx_learning_memory_user on learning_memory (user_id);
create index if not exists idx_chat_messages_session on chat_messages (session_id);
create index if not exists idx_performance_user_topic on performance_records (user_id, topic_id);

-- =============================================================================
-- Row Level Security — every user-owned table is locked to auth.uid()
-- =============================================================================

alter table profiles enable row level security;
alter table subjects enable row level security;
alter table syllabus_uploads enable row level security;
alter table units enable row level security;
alter table topics enable row level security;
alter table subtopics enable row level security;
alter table learning_sessions enable row level security;
alter table notes enable row level security;
alter table note_sections enable row level security;
alter table learning_memory enable row level security;
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;
alter table assessments enable row level security;
alter table assessment_questions enable row level security;
alter table assessment_attempts enable row level security;
alter table assessment_answers enable row level security;
alter table performance_records enable row level security;
alter table mentor_recommendations enable row level security;
alter table user_preferences enable row level security;

drop policy if exists "profiles: owner read/write" on profiles;
create policy "profiles: owner read/write" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "subjects: owner read/write" on subjects;
create policy "subjects: owner read/write" on subjects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "syllabus_uploads: owner read/write" on syllabus_uploads;
create policy "syllabus_uploads: owner read/write" on syllabus_uploads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "units: owner via subject" on units;
create policy "units: owner via subject" on units
  for all using (
    exists (select 1 from subjects s where s.id = units.subject_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from subjects s where s.id = units.subject_id and s.user_id = auth.uid())
  );

drop policy if exists "topics: owner read/write" on topics;
create policy "topics: owner read/write" on topics
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "subtopics: owner via topic" on subtopics;
create policy "subtopics: owner via topic" on subtopics
  for all using (
    exists (select 1 from topics t where t.id = subtopics.topic_id and t.user_id = auth.uid())
  ) with check (
    exists (select 1 from topics t where t.id = subtopics.topic_id and t.user_id = auth.uid())
  );

drop policy if exists "learning_sessions: owner read/write" on learning_sessions;
create policy "learning_sessions: owner read/write" on learning_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notes: owner read/write" on notes;
create policy "notes: owner read/write" on notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "note_sections: owner via note" on note_sections;
create policy "note_sections: owner via note" on note_sections
  for all using (
    exists (select 1 from notes n where n.id = note_sections.note_id and n.user_id = auth.uid())
  ) with check (
    exists (select 1 from notes n where n.id = note_sections.note_id and n.user_id = auth.uid())
  );

drop policy if exists "learning_memory: owner read/write" on learning_memory;
create policy "learning_memory: owner read/write" on learning_memory
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "chat_sessions: owner read/write" on chat_sessions;
create policy "chat_sessions: owner read/write" on chat_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "chat_messages: owner via session" on chat_messages;
create policy "chat_messages: owner via session" on chat_messages
  for all using (
    exists (select 1 from chat_sessions cs where cs.id = chat_messages.session_id and cs.user_id = auth.uid())
  ) with check (
    exists (select 1 from chat_sessions cs where cs.id = chat_messages.session_id and cs.user_id = auth.uid())
  );

drop policy if exists "assessments: owner read/write" on assessments;
create policy "assessments: owner read/write" on assessments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "assessment_questions: owner via assessment" on assessment_questions;
create policy "assessment_questions: owner via assessment" on assessment_questions
  for all using (
    exists (select 1 from assessments a where a.id = assessment_questions.assessment_id and a.user_id = auth.uid())
  ) with check (
    exists (select 1 from assessments a where a.id = assessment_questions.assessment_id and a.user_id = auth.uid())
  );

drop policy if exists "assessment_attempts: owner read/write" on assessment_attempts;
create policy "assessment_attempts: owner read/write" on assessment_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "assessment_answers: owner via attempt" on assessment_answers;
create policy "assessment_answers: owner via attempt" on assessment_answers
  for all using (
    exists (select 1 from assessment_attempts aa where aa.id = assessment_answers.attempt_id and aa.user_id = auth.uid())
  ) with check (
    exists (select 1 from assessment_attempts aa where aa.id = assessment_answers.attempt_id and aa.user_id = auth.uid())
  );

drop policy if exists "performance_records: owner read/write" on performance_records;
create policy "performance_records: owner read/write" on performance_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "mentor_recommendations: owner read/write" on mentor_recommendations;
create policy "mentor_recommendations: owner read/write" on mentor_recommendations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_preferences: owner read/write" on user_preferences;
create policy "user_preferences: owner read/write" on user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
-- Auto-create a profile row when a new auth user signs up
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  insert into public.user_preferences (user_id) values (new.id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================================================
-- Storage bucket for syllabus images (private; accessed via signed URLs / RLS)
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('syllabus-uploads', 'syllabus-uploads', false)
on conflict (id) do nothing;

drop policy if exists "syllabus-uploads: owner read" on storage.objects;
create policy "syllabus-uploads: owner read" on storage.objects
  for select using (bucket_id = 'syllabus-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "syllabus-uploads: owner write" on storage.objects;
create policy "syllabus-uploads: owner write" on storage.objects
  for insert with check (bucket_id = 'syllabus-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "syllabus-uploads: owner delete" on storage.objects;
create policy "syllabus-uploads: owner delete" on storage.objects
  for delete using (bucket_id = 'syllabus-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

-- #############################################################################
-- Migration 002 (002_enhancements.sql)
-- #############################################################################

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

-- #############################################################################
-- Migration 003 (003_security_and_integrity.sql)
-- #############################################################################

-- =============================================================================
-- AI Tutor — Migration 003: answer-key isolation, atomic submit, concepts,
-- mentor cache, timezone-aware streaks, pins, indexes.
--
-- ADDITIVE and idempotent: safe to re-run, drops no tables/columns/data.
-- Run order:  003 (this file)  ->  deploy the new application code  ->  004.
-- The tightened policies live in 004_lockdown.sql so the live app is never
-- broken between "migration applied" and "new code deployed".
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Answer keys live in their own table. RLS is enabled and NO policy is
--    created, so the browser (anon/authenticated roles) can never read or
--    write it; only the service-role key (server routes) can.
--    The old columns on assessment_questions are left in place (no data is
--    dropped) — 004 revokes client column access to them.
-- ---------------------------------------------------------------------------
create table if not exists assessment_answer_keys (
  question_id uuid primary key references assessment_questions (id) on delete cascade,
  correct_answer text,
  model_answer text,
  rubric text,
  explanation text
);

alter table assessment_answer_keys enable row level security;

insert into assessment_answer_keys (question_id, correct_answer, model_answer, rubric, explanation)
select id, correct_answer, model_answer, rubric, explanation
from assessment_questions
on conflict (question_id) do nothing;

-- New questions store their explanation only in the key table.
alter table assessment_questions alter column explanation drop not null;

-- ---------------------------------------------------------------------------
-- 2. Normalised concepts (one row per concept per topic).
-- ---------------------------------------------------------------------------
create table if not exists concepts (
  id uuid primary key default uuid_generate_v4(),
  topic_id uuid not null references topics (id) on delete cascade,
  name text not null,
  normalized_name text not null,
  created_at timestamptz not null default now(),
  unique (topic_id, normalized_name)
);

alter table concepts enable row level security;
drop policy if exists "concepts: owner read via topic" on concepts;
create policy "concepts: owner read via topic" on concepts
  for select using (
    exists (select 1 from topics t where t.id = concepts.topic_id and t.user_id = auth.uid())
  );

alter table assessment_questions
  add column if not exists concept_id uuid references concepts (id) on delete set null;
alter table performance_records
  add column if not exists concept_id uuid references concepts (id) on delete set null;

-- ---------------------------------------------------------------------------
-- 3. Notes: a 'generating' placeholder makes generation race-safe.
-- ---------------------------------------------------------------------------
alter table notes drop constraint if exists notes_generation_status_check;
alter table notes
  add constraint notes_generation_status_check
  check (generation_status in ('generating', 'ready', 'failed'));

-- ---------------------------------------------------------------------------
-- 4. Timezone-aware streaks and de-duplicated tutor activity.
-- ---------------------------------------------------------------------------
alter table profiles add column if not exists timezone text not null default 'Asia/Kolkata';

alter table learning_sessions
  add column if not exists chat_session_id uuid references chat_sessions (id) on delete set null;

-- Distinct local calendar days with activity for the signed-in user. Returns at
-- most p_days rows, so it can never hit PostgREST's 1000-row cap. SECURITY
-- INVOKER: RLS (and the auth.uid() filter) still apply.
create or replace function public.get_active_days(p_tz text default 'Asia/Kolkata', p_days int default 366)
returns table (day date)
language sql
stable
security invoker
set search_path = public
as $$
  select distinct (ls.created_at at time zone p_tz)::date as day
  from learning_sessions ls
  where ls.user_id = auth.uid()
    and ls.created_at >= now() - make_interval(days => greatest(p_days, 1))
  order by 1;
$$;

revoke all on function public.get_active_days(text, int) from public, anon;
grant execute on function public.get_active_days(text, int) to authenticated;

-- At most one tutor_chat learning_sessions row per chat session per local day.
create or replace function public.log_tutor_activity(
  p_user_id uuid,
  p_topic_id uuid,
  p_chat_session_id uuid,
  p_tz text default 'Asia/Kolkata'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from learning_sessions
    where user_id = p_user_id
      and chat_session_id = p_chat_session_id
      and activity_type = 'tutor_chat'
      and (created_at at time zone p_tz)::date = (now() at time zone p_tz)::date
  ) then
    return false;
  end if;

  insert into learning_sessions (user_id, topic_id, activity_type, chat_session_id)
  values (p_user_id, p_topic_id, 'tutor_chat', p_chat_session_id);
  return true;
end;
$$;

revoke all on function public.log_tutor_activity(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.log_tutor_activity(uuid, uuid, uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- 5. Weakness memories: one row per (user, topic, concept), upserted.
-- ---------------------------------------------------------------------------
alter table learning_memory add column if not exists concept text;

create unique index if not exists uq_learning_memory_weakness
  on learning_memory (user_id, topic_id, concept)
  where memory_type = 'weakness' and concept is not null;

-- ---------------------------------------------------------------------------
-- 6. Mentor cache (latest recommendation per user, keyed by an input hash).
-- ---------------------------------------------------------------------------
create table if not exists mentor_snapshots (
  user_id uuid primary key references auth.users (id) on delete cascade,
  input_hash text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table mentor_snapshots enable row level security;
drop policy if exists "mentor_snapshots: owner read" on mentor_snapshots;
create policy "mentor_snapshots: owner read" on mentor_snapshots
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 7. Pinned items (previously localStorage only).
-- ---------------------------------------------------------------------------
create table if not exists pinned_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_key text not null,
  title text not null,
  type text not null,
  href text not null,
  badge text,
  created_at timestamptz not null default now(),
  unique (user_id, item_key)
);

alter table pinned_items enable row level security;
drop policy if exists "pinned_items: owner read/write" on pinned_items;
create policy "pinned_items: owner read/write" on pinned_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 8. One submitted attempt per assessment. Created only when the existing data
--    has no duplicates (older builds could double-submit); otherwise a NOTICE
--    explains what to merge. The submit RPC below enforces the same rule under
--    a row lock either way.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from assessment_attempts
    where submitted_at is not null
    group by assessment_id having count(*) > 1
  ) then
    raise notice 'assessment_attempts has duplicate submitted attempts per assessment; skipping unique index uq_attempt_submitted_per_assessment. Merge or delete the duplicates, then re-run this migration.';
  else
    create unique index if not exists uq_attempt_submitted_per_assessment
      on assessment_attempts (assessment_id) where submitted_at is not null;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 9. Atomic submit: attempt + answers + performance records + weakness memory +
--    topic status + activity log in ONE transaction, idempotent per assessment.
--    Service-role only; the route verifies the user and passes p_user_id.
-- ---------------------------------------------------------------------------
create or replace function public.submit_assessment_attempt(
  p_user_id uuid,
  p_assessment_id uuid,
  p_score numeric,
  p_answers jsonb,
  p_concept_scores jsonb,
  p_weak_concepts text[],
  p_recovered_concepts text[],
  p_mark_completed boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_topic_id uuid;
  v_attempt_id uuid;
  v_existing uuid;
begin
  -- Lock the assessment row so concurrent submits serialise here.
  select topic_id into v_topic_id
  from assessments
  where id = p_assessment_id and user_id = p_user_id
  for update;

  if not found then
    raise exception 'assessment_not_found' using errcode = 'P0002';
  end if;

  select id into v_existing
  from assessment_attempts
  where assessment_id = p_assessment_id and submitted_at is not null
  limit 1;

  if v_existing is not null then
    return jsonb_build_object('attempt_id', v_existing, 'already_submitted', true);
  end if;

  insert into assessment_attempts (assessment_id, user_id, score, submitted_at)
  values (p_assessment_id, p_user_id, p_score, now())
  returning id into v_attempt_id;

  insert into assessment_answers
    (attempt_id, question_id, student_answer, is_correct, score, max_score, ai_feedback, grading_status)
  select
    v_attempt_id,
    (a->>'question_id')::uuid,
    a->>'student_answer',
    (a->>'is_correct')::boolean,
    (a->>'score')::numeric,
    (a->>'max_score')::numeric,
    nullif(a->'ai_feedback', 'null'::jsonb),
    coalesce(a->>'grading_status', 'graded')
  from jsonb_array_elements(coalesce(p_answers, '[]'::jsonb)) a
  where exists (
    select 1 from assessment_questions q
    where q.id = (a->>'question_id')::uuid and q.assessment_id = p_assessment_id
  );

  insert into performance_records (user_id, topic_id, concept, concept_id, score)
  select
    p_user_id,
    v_topic_id,
    c->>'concept',
    nullif(c->>'concept_id', '')::uuid,
    (c->>'score')::numeric
  from jsonb_array_elements(coalesce(p_concept_scores, '[]'::jsonb)) c;

  insert into learning_memory (user_id, topic_id, memory_type, concept, summary)
  select
    p_user_id,
    v_topic_id,
    'weakness',
    t.w,
    format('Scored poorly on questions about "%s" in an assessment.', t.w)
  from (select distinct unnest(coalesce(p_weak_concepts, '{}'::text[])) as w) as t
  on conflict (user_id, topic_id, concept) where memory_type = 'weakness' and concept is not null
  do update set summary = excluded.summary, created_at = now();

  -- A concept the student has now mastered is no longer a weakness. Also
  -- clears older duplicate rows written before `concept` existed.
  delete from learning_memory lm
  where lm.user_id = p_user_id
    and lm.topic_id = v_topic_id
    and lm.memory_type = 'weakness'
    and (
      lm.concept = any (coalesce(p_recovered_concepts, '{}'::text[]))
      or (
        lm.concept is null
        and exists (
          select 1 from unnest(coalesce(p_recovered_concepts, '{}'::text[])) r
          where lm.summary = format('Scored poorly on questions about "%s" in an assessment.', r)
        )
      )
    );

  if p_mark_completed then
    update topics set status = 'completed' where id = v_topic_id and user_id = p_user_id;
  end if;

  insert into learning_sessions (user_id, topic_id, activity_type)
  values (p_user_id, v_topic_id, 'assessment_attempt');

  return jsonb_build_object('attempt_id', v_attempt_id, 'already_submitted', false);
end;
$$;

revoke all on function public.submit_assessment_attempt(uuid, uuid, numeric, jsonb, jsonb, text[], text[], boolean)
  from public, anon, authenticated;
grant execute on function public.submit_assessment_attempt(uuid, uuid, numeric, jsonb, jsonb, text[], text[], boolean)
  to service_role;

-- ---------------------------------------------------------------------------
-- 9b. Answer statistics for the Progress page, computed in SQL (a client-side
--     select of every answer would hit PostgREST's 1000-row cap). A short
--     answer counts as correct when it earned full marks.
-- ---------------------------------------------------------------------------
create or replace function public.get_answer_stats()
returns table (attempted bigint, correct bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(*) filter (where aa.grading_status <> 'failed') as attempted,
    count(*) filter (
      where aa.grading_status <> 'failed'
        and (aa.is_correct is true or (aa.score is not null and aa.max_score > 0 and aa.score >= aa.max_score))
    ) as correct
  from assessment_answers aa
  join assessment_attempts att on att.id = aa.attempt_id
  where att.user_id = auth.uid() and att.submitted_at is not null;
$$;

revoke all on function public.get_answer_stats() from public, anon;
grant execute on function public.get_answer_stats() to authenticated;

-- ---------------------------------------------------------------------------
-- 10. Indexes for foreign keys used in filters and joins.
-- ---------------------------------------------------------------------------
create index if not exists idx_assessment_questions_assessment on assessment_questions (assessment_id);
create index if not exists idx_assessment_answers_attempt on assessment_answers (attempt_id);
create index if not exists idx_assessment_answers_question on assessment_answers (question_id);
create index if not exists idx_assessments_user_topic on assessments (user_id, topic_id);
create index if not exists idx_assessment_attempts_assessment on assessment_attempts (assessment_id);
create index if not exists idx_chat_sessions_user on chat_sessions (user_id);
create index if not exists idx_chat_sessions_user_topic on chat_sessions (user_id, topic_id, created_at desc);
create index if not exists idx_chat_messages_session_created on chat_messages (session_id, created_at);
create index if not exists idx_subtopics_topic on subtopics (topic_id);
create index if not exists idx_units_subject on units (subject_id);
create index if not exists idx_mentor_recommendations_user_created on mentor_recommendations (user_id, created_at desc);
create index if not exists idx_concepts_topic on concepts (topic_id);
create index if not exists idx_learning_sessions_chat on learning_sessions (chat_session_id);
create index if not exists idx_pinned_items_user on pinned_items (user_id);

-- #############################################################################
-- Migration 004 (004_lockdown.sql)
-- #############################################################################

-- =============================================================================
-- AI Tutor — Migration 004: lock the browser client out of answer keys and
-- scores.  RUN THIS ONLY AFTER 003 AND AFTER DEPLOYING THE NEW APPLICATION CODE.
--
-- The previous build read correct_answer/model_answer/rubric/explanation and
-- wrote attempts, answers, performance records and topic status with the
-- user's own JWT. Running this first would break that build.
--
-- Nothing is dropped or rewritten: only policies and privileges change.
-- Server routes now write these tables with the service-role key (which
-- bypasses RLS) after verifying the user with auth.getUser().
-- =============================================================================

-- assessments + questions: students may read their own, never write them.
drop policy if exists "assessments: owner read/write" on assessments;
drop policy if exists "assessments: owner read" on assessments;
create policy "assessments: owner read" on assessments
  for select using (auth.uid() = user_id);

drop policy if exists "assessment_questions: owner via assessment" on assessment_questions;
drop policy if exists "assessment_questions: owner read" on assessment_questions;
create policy "assessment_questions: owner read" on assessment_questions
  for select using (
    exists (select 1 from assessments a where a.id = assessment_questions.assessment_id and a.user_id = auth.uid())
  );

-- attempts / answers / performance: select-only for owners.
drop policy if exists "assessment_attempts: owner read/write" on assessment_attempts;
drop policy if exists "assessment_attempts: owner read" on assessment_attempts;
create policy "assessment_attempts: owner read" on assessment_attempts
  for select using (auth.uid() = user_id);

drop policy if exists "assessment_answers: owner via attempt" on assessment_answers;
drop policy if exists "assessment_answers: owner read" on assessment_answers;
create policy "assessment_answers: owner read" on assessment_answers
  for select using (
    exists (select 1 from assessment_attempts aa where aa.id = assessment_answers.attempt_id and aa.user_id = auth.uid())
  );

drop policy if exists "performance_records: owner read/write" on performance_records;
drop policy if exists "performance_records: owner read" on performance_records;
create policy "performance_records: owner read" on performance_records
  for select using (auth.uid() = user_id);

-- topics: students may read and delete their own topics; inserts and updates
-- (including `status`) happen server-side only.
drop policy if exists "topics: owner read/write" on topics;
drop policy if exists "topics: owner read" on topics;
drop policy if exists "topics: owner delete" on topics;
create policy "topics: owner read" on topics
  for select using (auth.uid() = user_id);
create policy "topics: owner delete" on topics
  for delete using (auth.uid() = user_id);

-- Defence in depth: even if a policy is later loosened, the browser roles hold
-- no write privilege on these tables.
revoke insert, update on topics from anon, authenticated;
revoke insert, update, delete on assessments from anon, authenticated;
revoke insert, update, delete on assessment_questions from anon, authenticated;
revoke insert, update, delete on assessment_attempts from anon, authenticated;
revoke insert, update, delete on assessment_answers from anon, authenticated;
revoke insert, update, delete on performance_records from anon, authenticated;

-- Answer-key columns on the legacy table are unreadable from the browser.
-- (Only non-key columns may be selected; `select *` from the browser now fails
-- by design.)
revoke select on assessment_questions from anon, authenticated;
grant select (id, assessment_id, question, type, options, difficulty, concept, concept_id, order_index, max_marks)
  on assessment_questions to authenticated;

-- The key table must never be reachable from the browser roles.
revoke all on assessment_answer_keys from anon, authenticated;

-- #############################################################################
-- Migration 005 (005_usage_and_plans.sql)
-- #############################################################################

-- =============================================================================
-- AI Tutor — Migration 005: usage metering, plans, subscriptions, entitlements.
--
-- ADDITIVE and idempotent. Nothing here changes behaviour until the app is run
-- with QUOTAS_ENABLED=true (metering via usage_events is always on).
-- All writes happen server-side with the service-role key; students may only
-- read their own usage/subscription rows.
-- =============================================================================

-- One row per LLM call ('llm_call': tokens + estimated cost) and one per
-- billable request ('request': credits charged against the monthly allowance).
create table if not exists usage_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null check (event_type in ('llm_call', 'request')),
  feature text not null,
  provider text,
  model text,
  tokens_in integer not null default 0,
  tokens_out integer not null default 0,
  cost_usd numeric(12, 6) not null default 0,
  credits numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_usage_events_user_created on usage_events (user_id, created_at desc);
create index if not exists idx_usage_events_user_type_created on usage_events (user_id, event_type, created_at desc);

alter table usage_events enable row level security;
drop policy if exists "usage_events: owner read" on usage_events;
create policy "usage_events: owner read" on usage_events for select using (auth.uid() = user_id);

create table if not exists plans (
  id text primary key,
  name text not null,
  monthly_credits integer not null check (monthly_credits >= 0),
  price_inr integer,
  price_usd numeric(8, 2),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

alter table plans enable row level security;
drop policy if exists "plans: readable by signed-in users" on plans;
create policy "plans: readable by signed-in users" on plans for select to authenticated using (true);

-- At most one default (free) plan.
create unique index if not exists uq_plans_single_default on plans (is_default) where is_default;

-- Optional per-feature monthly request caps for a plan (NULL = only the credit pool applies).
create table if not exists entitlements (
  plan_id text not null references plans (id) on delete cascade,
  feature text not null,
  monthly_limit integer check (monthly_limit is null or monthly_limit >= 0),
  primary key (plan_id, feature)
);

alter table entitlements enable row level security;
drop policy if exists "entitlements: readable by signed-in users" on entitlements;
create policy "entitlements: readable by signed-in users" on entitlements for select to authenticated using (true);

create table if not exists subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan_id text not null references plans (id),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled')),
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table subscriptions enable row level security;
drop policy if exists "subscriptions: owner read" on subscriptions;
create policy "subscriptions: owner read" on subscriptions for select using (auth.uid() = user_id);

-- Seed plans. Edit the numbers freely; they are read at runtime.
insert into plans (id, name, monthly_credits, price_inr, price_usd, is_default) values
  ('free', 'Free', 150, 0, 0, true),
  ('pro', 'Pro', 2000, 299, 4.99, false)
on conflict (id) do nothing;

insert into entitlements (plan_id, feature, monthly_limit) values
  ('free', 'notes_generate', 20),
  ('free', 'assessment_generate', 30),
  ('free', 'assessment_submit', 60),
  ('free', 'tutor_chat', 300),
  ('free', 'mentor', 10),
  ('free', 'syllabus_analyze', 10)
on conflict (plan_id, feature) do nothing;

-- Monthly usage per feature for the quota check (service-role only).
create or replace function public.get_monthly_usage(p_user_id uuid, p_since timestamptz)
returns table (feature text, requests bigint, credits numeric)
language sql
stable
security definer
set search_path = public
as $$
  select ue.feature, count(*) as requests, coalesce(sum(ue.credits), 0) as credits
  from usage_events ue
  where ue.user_id = p_user_id and ue.event_type = 'request' and ue.created_at >= p_since
  group by ue.feature;
$$;

revoke all on function public.get_monthly_usage(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.get_monthly_usage(uuid, timestamptz) to service_role;
