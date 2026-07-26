BEGIN;

DROP POLICY IF EXISTS "Enrolled students read questions" ON public.questions;
DROP POLICY IF EXISTS "Enrolled students read options" ON public.question_options;

CREATE POLICY "Enrolled students read questions" ON public.questions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.quiz_enrollments e
    JOIN public.quizzes q ON q.id = e.quiz_id
    LEFT JOIN public.quiz_questions qq ON qq.quiz_id = q.id
    WHERE e.student_id = auth.uid()
      AND q.status = 'published'
      AND (
        (questions.quiz_id IS NOT NULL AND q.id = questions.quiz_id)
        OR (questions.quiz_id IS NULL AND qq.question_id = questions.id)
      )
  )
);

CREATE POLICY "Enrolled students read options" ON public.question_options FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.questions qu
    LEFT JOIN public.quiz_questions qq ON qq.question_id = qu.id
    JOIN public.quizzes q ON q.id = COALESCE(qu.quiz_id, qq.quiz_id)
    JOIN public.quiz_enrollments e ON e.quiz_id = q.id
    WHERE qu.id = question_options.question_id
      AND e.student_id = auth.uid()
      AND q.status = 'published'
  )
);

COMMIT;
