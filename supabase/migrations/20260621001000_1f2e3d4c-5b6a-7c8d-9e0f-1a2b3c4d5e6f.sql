CREATE OR REPLACE FUNCTION public.enroll_by_code(_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_quiz_id uuid; v_enabled boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT id, code_enabled INTO v_quiz_id, v_enabled
  FROM public.quizzes
  WHERE access_code = upper(_code)
    AND status = 'published';
  IF v_quiz_id IS NULL THEN RAISE EXCEPTION 'Invalid or unpublished quiz code'; END IF;
  IF NOT v_enabled THEN RAISE EXCEPTION 'This quiz code is disabled'; END IF;
  INSERT INTO public.quiz_enrollments (quiz_id, student_id)
  VALUES (v_quiz_id, auth.uid())
  ON CONFLICT (quiz_id, student_id) DO NOTHING;
  RETURN v_quiz_id;
END; $$;
