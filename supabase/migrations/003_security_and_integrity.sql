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
