CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quiz_bank_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_option text NOT NULL CHECK (correct_option IN ('A','B','C','D')),
  explanation text,
  difficulty text NOT NULL DEFAULT 'Medium' CHECK (difficulty IN ('Easy','Medium','Hard')),
  marks int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.quiz_bank_questions(id) ON DELETE RESTRICT,
  display_order int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quiz_id, question_id)
);

CREATE TABLE public.quiz_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  version_name text NOT NULL CHECK (version_name IN ('A','B','C')),
  question_order jsonb NOT NULL DEFAULT '[]'::jsonb,
  option_order jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quiz_id, version_name)
);

ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS duration_minutes int;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS total_marks int;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS passing_marks int;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS available_from timestamptz;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS available_until timestamptz;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_bank_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_versions TO authenticated;

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_bank_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage subjects" ON public.subjects FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'teacher'))
WITH CHECK (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers manage bank questions" ON public.quiz_bank_questions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'teacher'))
WITH CHECK (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers manage quiz links" ON public.quiz_questions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_questions.quiz_id AND q.teacher_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_questions.quiz_id AND q.teacher_id = auth.uid()));

CREATE POLICY "Teachers manage quiz versions" ON public.quiz_versions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_versions.quiz_id AND q.teacher_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = quiz_versions.quiz_id AND q.teacher_id = auth.uid()));
