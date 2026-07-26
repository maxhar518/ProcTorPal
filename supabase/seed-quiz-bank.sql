-- Seed subjects (idempotent)
INSERT INTO public.subjects (name)
VALUES
  ('Programming'),
  ('Object-Oriented Programming'),
  ('Data Structures & Algorithms'),
  ('Digital Logic Design'),
  ('Database Management Systems'),
  ('Computer Networks'),
  ('Operating Systems'),
  ('Information Security'),
  ('Artificial Intelligence')
ON CONFLICT (name) DO NOTHING;

--
-- This block inserts up to 10 distinct questions per subject.
-- It is idempotent for re-population: it deletes existing questions for
-- the target subjects before inserting the new batch.
-- The `quiz_bank_questions` table schema (from migrations) is:
-- id uuid PRIMARY KEY DEFAULT gen_random_uuid()
-- subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE
-- question_text text NOT NULL
-- option_a..option_d text NOT NULL
-- correct_option text NOT NULL CHECK (correct_option IN ('A','B','C','D'))
-- explanation text
-- difficulty text NOT NULL DEFAULT 'Medium' CHECK (difficulty IN ('Easy','Medium','Hard'))
-- marks int NOT NULL DEFAULT 1
-- status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Published'))
-- created_at/updated_at timestamptz NOT NULL DEFAULT now()
--
DO $$
DECLARE
  subject_row RECORD;
  subject_names text[] := ARRAY[
    'Programming',
    'Object-Oriented Programming',
    'Data Structures & Algorithms',
    'Digital Logic Design',
    'Database Management Systems',
    'Computer Networks',
    'Operating Systems',
    'Information Security',
    'Artificial Intelligence'
  ];
  idx int;
  j int;
  q text;
  opts text[4];
  correct text;
  difficulty text;
  marks int;
  templates text[];
BEGIN
  FOR idx IN 1..array_length(subject_names,1) LOOP
    SELECT id INTO subject_row FROM public.subjects WHERE name = subject_names[idx];
    IF subject_row.id IS NULL THEN
      RAISE NOTICE 'Subject % not found, skipping', subject_names[idx];
      CONTINUE;
    END IF;

    -- remove existing seeded bank questions for this subject so script can be re-run
    -- Only delete questions that are not linked to any quiz through quiz_questions.
    DELETE FROM public.question_options
    WHERE question_id IN (
      SELECT q.id
      FROM public.questions q
      LEFT JOIN public.quiz_questions qq ON qq.question_id = q.id
      WHERE q.subject_id = subject_row.id
        AND q.quiz_id IS NULL
        AND qq.id IS NULL
    );

    DELETE FROM public.questions
    WHERE id IN (
      SELECT q.id
      FROM public.questions q
      LEFT JOIN public.quiz_questions qq ON qq.question_id = q.id
      WHERE q.subject_id = subject_row.id
        AND q.quiz_id IS NULL
        AND qq.id IS NULL
    );

    FOR j IN 1..10 LOOP
      -- choose per-subject templates and options (rotate using j)
      CASE subject_names[idx]
        WHEN 'Programming' THEN
          templates := ARRAY[
            'What does recursion typically involve?',
            'Which keyword is used to define a function in many languages?',
            'Which construct repeats a block until a condition is false?',
            'What data type would hold true/false values?',
            'Which operator is commonly used for assignment?'
          ];
          opts[1] := 'A function calling itself';
          opts[2] := 'A loop that never ends';
          opts[3] := 'A data structure';
          opts[4] := 'A compiler phase';
        WHEN 'Object-Oriented Programming' THEN
          templates := ARRAY[
            'Which OOP principle lets objects expose behavior while hiding details?',
            'Which principle allows a class to take multiple forms?',
            'Which mechanism lets a class derive from another?',
            'What term describes bundling data with methods?',
            'Which keyword is used to create an instance of a class in many languages?'
          ];
          opts[1] := 'Abstraction';
          opts[2] := 'Polymorphism';
          opts[3] := 'Inheritance';
          opts[4] := 'Encapsulation';
        WHEN 'Data Structures & Algorithms' THEN
          templates := ARRAY[
            'Which data structure uses FIFO ordering?',
            'Which data structure uses LIFO ordering?',
            'Which algorithmic technique divides problem into subproblems?',
            'Which structure is optimal for LRU cache?',
            'Which traversal visits left, node, then right?'
          ];
          opts[1] := 'Queue';
          opts[2] := 'Stack';
          opts[3] := 'Heap';
          opts[4] := 'Tree';
        WHEN 'Digital Logic Design' THEN
          templates := ARRAY[
            'What is the output of an AND gate when one input is 0?',
            'Which gate outputs 1 only when inputs differ?',
            'Which representation uses 0/1 for logic?',
            'Which component stores a bit of state?',
            'What does a multiplexer do?'
          ];
          opts[1] := '0';
          opts[2] := '1';
          opts[3] := 'Undefined';
          opts[4] := 'Both';
        WHEN 'Database Management Systems' THEN
          templates := ARRAY[
            'Which keyword removes duplicate rows from query results?',
            'Which command retrieves rows from a table?',
            'Which clause filters rows returned by SELECT?',
            'Which constraint enforces uniqueness?',
            'Which operation joins two tables?' 
          ];
          opts[1] := 'DISTINCT';
          opts[2] := 'SELECT';
          opts[3] := 'WHERE';
          opts[4] := 'UNIQUE';
        WHEN 'Computer Networks' THEN
          templates := ARRAY[
            'Which protocol is used to resolve domain names?',
            'Which protocol is used to transfer web pages?',
            'Which layer in OSI handles routing?',
            'Which protocol is used for reliable byte streams?',
            'Which address type is used to identify a host on a local network?'
          ];
          opts[1] := 'DNS';
          opts[2] := 'HTTP';
          opts[3] := 'IP';
          opts[4] := 'MAC';
        WHEN 'Operating Systems' THEN
          templates := ARRAY[
            'Which scheduler is responsible for choosing the next process to run?',
            'Which structure keeps track of open files?',
            'Which mechanism isolates processes memory?',
            'Which component manages hardware interrupts?',
            'Which policy decides which page to evict?'
          ];
          opts[1] := 'CPU scheduler';
          opts[2] := 'File table';
          opts[3] := 'Virtual memory';
          opts[4] := 'Interrupt handler';
        WHEN 'Information Security' THEN
          templates := ARRAY[
            'Which of these is a common method to protect data?',
            'Which method verifies user identity?',
            'Which practice reduces attack surface by fixing bugs?',
            'Which technique makes data unreadable without a key?',
            'Which model separates duties to reduce fraud?' 
          ];
          opts[1] := 'Encryption';
          opts[2] := 'Authentication';
          opts[3] := 'Patching';
          opts[4] := 'Authorization';
        WHEN 'Artificial Intelligence' THEN
          templates := ARRAY[
            'Which field focuses on making machines learn from data?',
            'Which algorithm family is used for classification/regression?',
            'Which technique uses neural layers to learn representations?',
            'Which area studies search and planning?',
            'Which subfield focuses on understanding language?' 
          ];
          opts[1] := 'Machine Learning';
          opts[2] := 'Decision Trees';
          opts[3] := 'Deep Learning';
          opts[4] := 'Search';
        ELSE
          templates := ARRAY['Sample question?'];
          opts[1] := 'Option A'; opts[2] := 'Option B'; opts[3] := 'Option C'; opts[4] := 'Option D';
      END CASE;

      -- pick a template rotating through the template array
      q := templates[((j - 1) % array_length(templates,1)) + 1] || ' (variant ' || j || ')';

      -- choose correct answer letter rotating A..D
      correct := chr(65 + ((j - 1) % 4));

      -- difficulty pattern: first 4 Easy, next 4 Medium, last 2 Hard (for 10 questions)
      IF j <= 4 THEN
        difficulty := 'Easy';
      ELSIF j <= 8 THEN
        difficulty := 'Medium';
      ELSE
        difficulty := 'Hard';
      END IF;

      marks := CASE difficulty WHEN 'Hard' THEN 3 WHEN 'Medium' THEN 2 ELSE 1 END;

      -- insert normalized question (bank entry: quiz_id = NULL)
      DECLARE new_q_id uuid;
      BEGIN
        INSERT INTO public.questions (subject_id, quiz_id, prompt, type, points, position, created_at, updated_at)
        VALUES (subject_row.id, NULL, q, 'single', marks, 0, now(), now())
        RETURNING id INTO new_q_id;

        -- insert options
        INSERT INTO public.question_options (question_id, label, is_correct, position, created_at)
        VALUES
          (new_q_id, opts[1], (correct = 'A'), 1, now()),
          (new_q_id, opts[2], (correct = 'B'), 2, now()),
          (new_q_id, opts[3], (correct = 'C'), 3, now()),
          (new_q_id, opts[4], (correct = 'D'), 4, now());
      END;
    END LOOP;
  END LOOP;
END $$;

-- End of seed file
