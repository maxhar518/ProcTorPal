
ALTER TABLE public.quiz_attempts
  ADD COLUMN IF NOT EXISTS consent_given_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_snapshot_path text;

CREATE TABLE IF NOT EXISTS public.proctoring_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now(),
  kind text NOT NULL DEFAULT 'periodic' CHECK (kind IN ('verification','periodic')),
  face_status text CHECK (face_status IN ('ok','missing','multiple','unknown'))
);
CREATE INDEX IF NOT EXISTS proctoring_snapshots_attempt_idx ON public.proctoring_snapshots(attempt_id, captured_at);

GRANT SELECT, INSERT ON public.proctoring_snapshots TO authenticated;
GRANT ALL ON public.proctoring_snapshots TO service_role;
ALTER TABLE public.proctoring_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students insert own snapshots" ON public.proctoring_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.quiz_attempts a
    WHERE a.id = attempt_id AND a.student_id = auth.uid()
  ));

CREATE POLICY "Students read own snapshots" ON public.proctoring_snapshots
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quiz_attempts a
    WHERE a.id = attempt_id AND a.student_id = auth.uid()
  ));

CREATE POLICY "Teachers read snapshots of their quizzes" ON public.proctoring_snapshots
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quiz_attempts a
    WHERE a.id = attempt_id AND public.is_quiz_teacher(a.quiz_id, auth.uid())
  ));

CREATE TABLE IF NOT EXISTS public.proctoring_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warn','critical')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS proctoring_events_attempt_idx ON public.proctoring_events(attempt_id, occurred_at);
CREATE INDEX IF NOT EXISTS proctoring_events_type_idx ON public.proctoring_events(event_type);

GRANT SELECT, INSERT ON public.proctoring_events TO authenticated;
GRANT ALL ON public.proctoring_events TO service_role;
ALTER TABLE public.proctoring_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students insert own events" ON public.proctoring_events
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.quiz_attempts a
    WHERE a.id = attempt_id AND a.student_id = auth.uid()
  ));

CREATE POLICY "Students read own events" ON public.proctoring_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quiz_attempts a
    WHERE a.id = attempt_id AND a.student_id = auth.uid()
  ));

CREATE POLICY "Teachers read events of their quizzes" ON public.proctoring_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quiz_attempts a
    WHERE a.id = attempt_id AND public.is_quiz_teacher(a.quiz_id, auth.uid())
  ));

CREATE OR REPLACE FUNCTION public.attempt_risk_score(_attempt_id uuid)
RETURNS TABLE(risk_score int, risk_band text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s int := 0;
  c_multi int;
  c_missing int;
  c_fs int;
  c_blur int;
  c_short int;
  c_cam int;
  c_dev int;
BEGIN
  SELECT count(*) INTO c_multi FROM proctoring_events WHERE attempt_id = _attempt_id AND event_type = 'multiple_faces';
  SELECT count(*) INTO c_missing FROM proctoring_events WHERE attempt_id = _attempt_id AND event_type = 'face_missing';
  SELECT count(*) INTO c_fs FROM proctoring_events WHERE attempt_id = _attempt_id AND event_type = 'fullscreen_exit';
  SELECT count(*) INTO c_blur FROM proctoring_events WHERE attempt_id = _attempt_id AND event_type IN ('tab_blur','visibility_hidden');
  SELECT count(*) INTO c_short FROM proctoring_events WHERE attempt_id = _attempt_id AND event_type = 'restricted_shortcut';
  SELECT count(*) INTO c_cam FROM proctoring_events WHERE attempt_id = _attempt_id AND event_type IN ('camera_denied','camera_disconnected');
  SELECT count(*) INTO c_dev FROM proctoring_events WHERE attempt_id = _attempt_id AND event_type = 'devtools_suspected';

  s := least(c_multi * 15, 60)
     + least(c_missing * 5, 40)
     + c_fs * 10
     + least(c_blur * 5, 30)
     + least(c_short * 3, 15)
     + c_cam * 25
     + c_dev * 10;

  risk_score := s;
  IF s <= 20 THEN risk_band := 'low';
  ELSIF s <= 60 THEN risk_band := 'medium';
  ELSE risk_band := 'high';
  END IF;
  RETURN NEXT;
END; $$;

GRANT EXECUTE ON FUNCTION public.attempt_risk_score(uuid) TO authenticated;
