-- Create subjects table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create quiz_bank_questions table
CREATE TABLE IF NOT EXISTS public.quiz_bank_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  explanation text,
  difficulty text NOT NULL DEFAULT 'Medium' CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  topic text,
  chapter text,
  marks integer NOT NULL DEFAULT 1 CHECK (marks > 0),
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Published', 'Active', 'Inactive')),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create quiz_bank_options table
CREATE TABLE IF NOT EXISTS public.quiz_bank_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.quiz_bank_questions(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  position integer NOT NULL CHECK (position >= 0 AND position < 4),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create quiz_assignments table for shuffled quizzes
CREATE TABLE IF NOT EXISTS public.quiz_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  question_order jsonb NOT NULL DEFAULT '[]'::jsonb,
  option_order jsonb NOT NULL DEFAULT '[]'::jsonb,
  assignment_name text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quiz_bank_questions_subject_id ON public.quiz_bank_questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_quiz_bank_questions_status ON public.quiz_bank_questions(status);
CREATE INDEX IF NOT EXISTS idx_quiz_bank_questions_created_by ON public.quiz_bank_questions(created_by);
CREATE INDEX IF NOT EXISTS idx_quiz_bank_options_question_id ON public.quiz_bank_options(question_id);
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_quiz_id ON public.quiz_assignments(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_created_by ON public.quiz_assignments(created_by);

-- Enable RLS
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_bank_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_bank_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subjects (everyone can read, teachers manage)
CREATE POLICY "Anyone can view subjects" ON public.subjects FOR SELECT 
  TO authenticated USING (true);

CREATE POLICY "Teachers create subjects" ON public.subjects FOR INSERT 
  TO authenticated WITH CHECK (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers update subjects" ON public.subjects FOR UPDATE 
  TO authenticated USING (public.has_role(auth.uid(), 'teacher')) 
  WITH CHECK (public.has_role(auth.uid(), 'teacher'));

CREATE POLICY "Teachers delete subjects" ON public.subjects FOR DELETE 
  TO authenticated USING (public.has_role(auth.uid(), 'teacher'));

-- RLS Policies for quiz_bank_questions
CREATE POLICY "Anyone can view published questions" ON public.quiz_bank_questions FOR SELECT 
  TO authenticated USING (status = 'Published' OR created_by = auth.uid());

CREATE POLICY "Teachers create questions" ON public.quiz_bank_questions FOR INSERT 
  TO authenticated WITH CHECK (public.has_role(auth.uid(), 'teacher') AND created_by = auth.uid());

CREATE POLICY "Teachers update own draft questions" ON public.quiz_bank_questions FOR UPDATE 
  TO authenticated USING (created_by = auth.uid() AND status IN ('Draft', 'Active', 'Inactive'))
  WITH CHECK (created_by = auth.uid() AND status IN ('Draft', 'Published', 'Active', 'Inactive'));

CREATE POLICY "Teachers delete own draft questions" ON public.quiz_bank_questions FOR DELETE 
  TO authenticated USING (created_by = auth.uid() AND status IN ('Draft', 'Active', 'Inactive'));

-- RLS Policies for quiz_bank_options (follow question visibility)
CREATE POLICY "Anyone can view published question options" ON public.quiz_bank_options FOR SELECT 
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.quiz_bank_questions q 
      WHERE q.id = quiz_bank_options.question_id 
      AND (q.status = 'Published' OR q.created_by = auth.uid())
    )
  );

CREATE POLICY "Teachers manage own question options" ON public.quiz_bank_options FOR INSERT 
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quiz_bank_questions q 
      WHERE q.id = quiz_bank_options.question_id 
      AND q.created_by = auth.uid()
    )
  );

CREATE POLICY "Teachers update own question options" ON public.quiz_bank_options FOR UPDATE 
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.quiz_bank_questions q 
      WHERE q.id = quiz_bank_options.question_id 
      AND q.created_by = auth.uid()
      AND q.status IN ('Draft', 'Active', 'Inactive')
    )
  );

CREATE POLICY "Teachers delete own question options" ON public.quiz_bank_options FOR DELETE 
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.quiz_bank_questions q 
      WHERE q.id = quiz_bank_options.question_id 
      AND q.created_by = auth.uid()
      AND q.status IN ('Draft', 'Active', 'Inactive')
    )
  );

-- RLS Policies for quiz_assignments
CREATE POLICY "Teachers create assignments" ON public.quiz_assignments FOR INSERT 
  TO authenticated WITH CHECK (public.has_role(auth.uid(), 'teacher') AND created_by = auth.uid());

CREATE POLICY "Teachers view own assignments" ON public.quiz_assignments FOR SELECT 
  TO authenticated USING (created_by = auth.uid());

CREATE POLICY "Teachers update own assignments" ON public.quiz_assignments FOR UPDATE 
  TO authenticated USING (created_by = auth.uid()) 
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Teachers delete own assignments" ON public.quiz_assignments FOR DELETE 
  TO authenticated USING (created_by = auth.uid());

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_bank_questions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_bank_options TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_assignments TO authenticated;
