GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_options TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_enrolled(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_quiz_teacher(uuid, uuid) TO authenticated;
