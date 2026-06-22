
CREATE OR REPLACE FUNCTION public.is_enrolled(_quiz_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.quiz_enrollments WHERE quiz_id = _quiz_id AND student_id = _user_id)
$$;
GRANT EXECUTE ON FUNCTION public.is_enrolled(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_quiz_teacher(_quiz_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.quizzes WHERE id = _quiz_id AND teacher_id = _user_id)
$$;
GRANT EXECUTE ON FUNCTION public.is_quiz_teacher(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Students view enrolled published quizzes" ON public.quizzes;
CREATE POLICY "Students view enrolled published quizzes" ON public.quizzes
FOR SELECT USING (status = 'published' AND public.is_enrolled(id, auth.uid()));

DROP POLICY IF EXISTS "Teachers see enrollments on their quizzes" ON public.quiz_enrollments;
CREATE POLICY "Teachers see enrollments on their quizzes" ON public.quiz_enrollments
FOR SELECT USING (public.is_quiz_teacher(quiz_id, auth.uid()));
