-- Migration: migrate quiz_bank_questions -> questions + question_options
BEGIN;

-- 1) Make questions support bank (allow quiz_id NULL) and subject_id
ALTER TABLE public.questions ALTER COLUMN quiz_id DROP NOT NULL;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL;

-- 2) Copy quiz_bank_questions into questions (reuse ids to preserve links)
INSERT INTO public.questions (id, quiz_id, prompt, type, points, position, created_at, updated_at, subject_id)
SELECT id, NULL, question_text, 'single', marks, 0, created_at, updated_at, subject_id
FROM public.quiz_bank_questions;

-- 3) Migrate options from option_a..d into question_options
INSERT INTO public.question_options (id, question_id, label, is_correct, position, created_at)
SELECT gen_random_uuid(), qb.id, qb.option_a, (qb.correct_option = 'A'), 1, qb.created_at FROM public.quiz_bank_questions qb
UNION ALL
SELECT gen_random_uuid(), qb.id, qb.option_b, (qb.correct_option = 'B'), 2, qb.created_at FROM public.quiz_bank_questions qb
UNION ALL
SELECT gen_random_uuid(), qb.id, qb.option_c, (qb.correct_option = 'C'), 3, qb.created_at FROM public.quiz_bank_questions qb
UNION ALL
SELECT gen_random_uuid(), qb.id, qb.option_d, (qb.correct_option = 'D'), 4, qb.created_at FROM public.quiz_bank_questions qb;

-- 4) Redirect quiz_questions.question_id FK to reference public.questions
ALTER TABLE public.quiz_questions DROP CONSTRAINT IF EXISTS quiz_questions_question_id_fkey;
ALTER TABLE public.quiz_questions ADD CONSTRAINT quiz_questions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE RESTRICT;

-- 5) Remove the old table (we'll recreate a compatibility view below)
DROP TABLE public.quiz_bank_questions;

-- 6) Create a compatibility view so existing queries selecting option_a..option_d still work
CREATE OR REPLACE VIEW public.quiz_bank_questions AS
SELECT
  q.id,
  q.subject_id,
  q.prompt AS question_text,
  MAX(CASE WHEN qo.position = 1 THEN qo.label END) AS option_a,
  MAX(CASE WHEN qo.position = 2 THEN qo.label END) AS option_b,
  MAX(CASE WHEN qo.position = 3 THEN qo.label END) AS option_c,
  MAX(CASE WHEN qo.position = 4 THEN qo.label END) AS option_d,
  COALESCE(
    MAX(CASE WHEN qo.position = 1 AND qo.is_correct THEN 'A' END),
    MAX(CASE WHEN qo.position = 2 AND qo.is_correct THEN 'B' END),
    MAX(CASE WHEN qo.position = 3 AND qo.is_correct THEN 'C' END),
    MAX(CASE WHEN qo.position = 4 AND qo.is_correct THEN 'D' END)
  ) AS correct_option,
  NULL::text AS explanation,
  q.type AS difficulty,
  q.points AS marks,
  'Published'::text AS status,
  q.created_at,
  q.updated_at
FROM public.questions q
LEFT JOIN public.question_options qo ON qo.question_id = q.id
WHERE q.quiz_id IS NULL
GROUP BY q.id, q.subject_id, q.prompt, q.type, q.points, q.created_at, q.updated_at;

-- 7) Grant select on view to authenticated (keep previous grants)
GRANT SELECT ON public.quiz_bank_questions TO authenticated;

-- 8) Add policy to allow teachers to manage bank questions (questions where quiz_id IS NULL)
-- (this complements the existing question policies)
DROP POLICY IF EXISTS "Teachers manage bank questions" ON public.questions;
CREATE POLICY "Teachers manage bank questions" ON public.questions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'teacher') AND quiz_id IS NULL)
WITH CHECK (public.has_role(auth.uid(), 'teacher') AND quiz_id IS NULL);

COMMIT;

-- End migration
