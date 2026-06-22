
CREATE POLICY "Students upload own proctoring files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'proctoring'
    AND EXISTS (
      SELECT 1 FROM public.quiz_attempts a
      WHERE a.id::text = (storage.foldername(name))[1]
        AND a.student_id = auth.uid()
    )
  );

CREATE POLICY "Students read own proctoring files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'proctoring'
    AND EXISTS (
      SELECT 1 FROM public.quiz_attempts a
      WHERE a.id::text = (storage.foldername(name))[1]
        AND a.student_id = auth.uid()
    )
  );

CREATE POLICY "Teachers read proctoring files of their quizzes" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'proctoring'
    AND EXISTS (
      SELECT 1 FROM public.quiz_attempts a
      WHERE a.id::text = (storage.foldername(name))[1]
        AND public.is_quiz_teacher(a.quiz_id, auth.uid())
    )
  );
