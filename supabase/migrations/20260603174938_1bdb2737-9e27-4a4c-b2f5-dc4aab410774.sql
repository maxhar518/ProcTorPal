
CREATE OR REPLACE FUNCTION public.generate_quiz_code()
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
DECLARE alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; code text := ''; i int;
BEGIN
  FOR i IN 1..6 LOOP code := code || substr(alphabet, 1 + floor(random()*length(alphabet))::int, 1); END LOOP;
  RETURN 'QUIZ-' || code;
END; $$;

-- Tables first (no policies yet)
CREATE TABLE public.quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  time_limit_minutes int,
  passing_score int DEFAULT 0,
  available_from timestamptz,
  available_until timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  results_released boolean NOT NULL DEFAULT false,
  access_code text NOT NULL UNIQUE DEFAULT public.generate_quiz_code(),
  code_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  type text NOT NULL DEFAULT 'single' CHECK (type IN ('single','multi')),
  points int NOT NULL DEFAULT 1,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.question_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  label text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quiz_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(quiz_id, student_id)
);

CREATE TABLE public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  score int,
  max_score int,
  UNIQUE(quiz_id, student_id)
);

CREATE TABLE public.attempt_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_option_ids uuid[] NOT NULL DEFAULT '{}',
  UNIQUE(attempt_id, question_id)
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quizzes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_options TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.quiz_enrollments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_attempts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attempt_answers TO authenticated;
GRANT ALL ON public.quizzes, public.questions, public.question_options, public.quiz_enrollments, public.quiz_attempts, public.attempt_answers TO service_role;

-- Enable RLS
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Teachers manage their quizzes" ON public.quizzes FOR ALL TO authenticated
USING (auth.uid() = teacher_id AND public.has_role(auth.uid(),'teacher'))
WITH CHECK (auth.uid() = teacher_id AND public.has_role(auth.uid(),'teacher'));

CREATE POLICY "Students view enrolled published quizzes" ON public.quizzes FOR SELECT TO authenticated
USING (status='published' AND EXISTS (SELECT 1 FROM public.quiz_enrollments e WHERE e.quiz_id=quizzes.id AND e.student_id=auth.uid()));

CREATE POLICY "Teachers manage own quiz questions" ON public.questions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id=questions.quiz_id AND q.teacher_id=auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id=questions.quiz_id AND q.teacher_id=auth.uid()));

CREATE POLICY "Enrolled students read questions" ON public.questions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.quizzes q JOIN public.quiz_enrollments e ON e.quiz_id=q.id
  WHERE q.id=questions.quiz_id AND q.status='published' AND e.student_id=auth.uid()
));

CREATE POLICY "Teachers manage own question options" ON public.question_options FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.questions qu JOIN public.quizzes q ON q.id=qu.quiz_id WHERE qu.id=question_options.question_id AND q.teacher_id=auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.questions qu JOIN public.quizzes q ON q.id=qu.quiz_id WHERE qu.id=question_options.question_id AND q.teacher_id=auth.uid()));

CREATE POLICY "Enrolled students read options" ON public.question_options FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.questions qu JOIN public.quizzes q ON q.id=qu.quiz_id
  JOIN public.quiz_enrollments e ON e.quiz_id=q.id
  WHERE qu.id=question_options.question_id AND q.status='published' AND e.student_id=auth.uid()
));

CREATE POLICY "Students see own enrollments" ON public.quiz_enrollments FOR SELECT TO authenticated
USING (auth.uid() = student_id);
CREATE POLICY "Teachers see enrollments on their quizzes" ON public.quiz_enrollments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id=quiz_enrollments.quiz_id AND q.teacher_id=auth.uid()));
CREATE POLICY "Students remove own enrollment" ON public.quiz_enrollments FOR DELETE TO authenticated
USING (auth.uid() = student_id);

CREATE POLICY "Students manage own attempts" ON public.quiz_attempts FOR ALL TO authenticated
USING (auth.uid() = student_id) WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Teachers read attempts on their quizzes" ON public.quiz_attempts FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id=quiz_attempts.quiz_id AND q.teacher_id=auth.uid()));

CREATE POLICY "Students manage own answers" ON public.attempt_answers FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.quiz_attempts a WHERE a.id=attempt_answers.attempt_id AND a.student_id=auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.quiz_attempts a WHERE a.id=attempt_answers.attempt_id AND a.student_id=auth.uid()));
CREATE POLICY "Teachers read answers on their quizzes" ON public.attempt_answers FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.quiz_attempts a JOIN public.quizzes q ON q.id=a.quiz_id
  WHERE a.id=attempt_answers.attempt_id AND q.teacher_id=auth.uid()
));

-- Triggers
CREATE TRIGGER trg_quizzes_updated BEFORE UPDATE ON public.quizzes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_questions_updated BEFORE UPDATE ON public.questions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enroll-by-code RPC
CREATE OR REPLACE FUNCTION public.enroll_by_code(_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_quiz_id uuid; v_enabled boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT id, code_enabled INTO v_quiz_id, v_enabled FROM public.quizzes WHERE access_code = upper(_code);
  IF v_quiz_id IS NULL THEN RAISE EXCEPTION 'Invalid quiz code'; END IF;
  IF NOT v_enabled THEN RAISE EXCEPTION 'This quiz code is disabled'; END IF;
  INSERT INTO public.quiz_enrollments (quiz_id, student_id) VALUES (v_quiz_id, auth.uid())
  ON CONFLICT (quiz_id, student_id) DO NOTHING;
  RETURN v_quiz_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.enroll_by_code(text) TO authenticated;
