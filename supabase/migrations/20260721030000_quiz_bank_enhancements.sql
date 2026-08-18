ALTER TABLE public.quiz_bank_questions
  ADD COLUMN IF NOT EXISTS topic text,
  ADD COLUMN IF NOT EXISTS chapter text,
  ADD COLUMN IF NOT EXISTS created_by uuid;

ALTER TABLE public.quizzes
  ADD COLUMN IF NOT EXISTS question_source text DEFAULT 'auto' CHECK (question_source IN ('auto', 'manual')),
  ADD COLUMN IF NOT EXISTS source_subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_topics jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS source_difficulty text DEFAULT 'Mixed' CHECK (source_difficulty IN ('Easy','Medium','Hard','Mixed')),
  ADD COLUMN IF NOT EXISTS source_question_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS start_at timestamptz,
  ADD COLUMN IF NOT EXISTS end_at timestamptz;

CREATE TABLE IF NOT EXISTS public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject_id, name)
);

CREATE TABLE IF NOT EXISTS public.quiz_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  assigned_question_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  question_order jsonb NOT NULL DEFAULT '[]'::jsonb,
  option_order jsonb NOT NULL DEFAULT '[]'::jsonb,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quiz_id, student_id)
);

ALTER TABLE public.quiz_attempts
  ADD COLUMN IF NOT EXISTS assigned_question_ids jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS question_order jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS option_order jsonb DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS quiz_assignments_quiz_idx ON public.quiz_assignments (quiz_id);
CREATE INDEX IF NOT EXISTS quiz_assignments_student_idx ON public.quiz_assignments (student_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.topics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_assignments TO authenticated;

ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage topics" ON public.topics FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'teacher'))
WITH CHECK (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Students view their assignments" ON public.quiz_assignments FOR SELECT TO authenticated
USING (student_id = auth.uid());

CREATE POLICY "Teachers manage quiz assignments" ON public.quiz_assignments FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_assignments.quiz_id AND q.teacher_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_assignments.quiz_id AND q.teacher_id = auth.uid()));
