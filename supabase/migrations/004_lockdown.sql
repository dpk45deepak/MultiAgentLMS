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
