INSERT INTO public.subjects (name) VALUES
  ('Programming'),
  ('Object-Oriented Programming'),
  ('Data Structures & Algorithms'),
  ('Digital Logic Design'),
  ('Database Management Systems'),
  ('Computer Networks'),
  ('Operating Systems'),
  ('Information Security'),
  ('Artificial Intelligence');

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
  q text;
  opts text[];
  correct text;
  difficulty text;
  marks int;
BEGIN
  FOR idx IN 1..9 LOOP
    SELECT id INTO subject_row FROM public.subjects WHERE name = subject_names[idx];
    FOR i IN 1..40 LOOP
      CASE subject_names[idx]
        WHEN 'Programming' THEN
          q := 'What does ' || chr(65 + (i % 5)) || ' represent in a typical program?';
          opts := ARRAY['Variable', 'Keyword', 'Operator', 'Loop'];
          correct := 'A';
          difficulty := CASE (i % 3) WHEN 0 THEN 'Hard' WHEN 1 THEN 'Medium' ELSE 'Easy' END;
          marks := CASE WHEN difficulty = 'Hard' THEN 3 WHEN difficulty = 'Medium' THEN 2 ELSE 1 END;
        WHEN 'Object-Oriented Programming' THEN
          q := 'Which concept describes hiding implementation details?';
          opts := ARRAY['Abstraction', 'Inheritance', 'Polymorphism', 'Encapsulation'];
          correct := 'A';
          difficulty := CASE (i % 3) WHEN 0 THEN 'Hard' WHEN 1 THEN 'Medium' ELSE 'Easy' END;
          marks := CASE WHEN difficulty = 'Hard' THEN 3 WHEN difficulty = 'Medium' THEN 2 ELSE 1 END;
        WHEN 'Data Structures & Algorithms' THEN
          q := 'Which data structure uses FIFO ordering?';
          opts := ARRAY['Queue', 'Stack', 'Heap', 'Tree'];
          correct := 'A';
          difficulty := CASE (i % 3) WHEN 0 THEN 'Hard' WHEN 1 THEN 'Medium' ELSE 'Easy' END;
          marks := CASE WHEN difficulty = 'Hard' THEN 3 WHEN difficulty = 'Medium' THEN 2 ELSE 1 END;
        WHEN 'Digital Logic Design' THEN
          q := 'What is the output of an AND gate when one input is 0?';
          opts := ARRAY['0', '1', 'Undefined', 'Both'];
          correct := 'A';
          difficulty := CASE (i % 3) WHEN 0 THEN 'Hard' WHEN 1 THEN 'Medium' ELSE 'Easy' END;
          marks := CASE WHEN difficulty = 'Hard' THEN 3 WHEN difficulty = 'Medium' THEN 2 ELSE 1 END;
        WHEN 'Database Management Systems' THEN
          q := 'Which keyword is used to remove duplicate rows from a query result?';
          opts := ARRAY['DISTINCT', 'UNIQUE', 'PRIMARY', 'INDEX'];
          correct := 'A';
          difficulty := CASE (i % 3) WHEN 0 THEN 'Hard' WHEN 1 THEN 'Medium' ELSE 'Easy' END;
          marks := CASE WHEN difficulty = 'Hard' THEN 3 WHEN difficulty = 'Medium' THEN 2 ELSE 1 END;
        WHEN 'Computer Networks' THEN
          q := 'Which protocol is used to resolve domain names?';
          opts := ARRAY['DNS', 'HTTP', 'FTP', 'SMTP'];
          correct := 'A';
          difficulty := CASE (i % 3) WHEN 0 THEN 'Hard' WHEN 1 THEN 'Medium' ELSE 'Easy' END;
          marks := CASE WHEN difficulty = 'Hard' THEN 3 WHEN difficulty = 'Medium' THEN 2 ELSE 1 END;
        WHEN 'Operating Systems' THEN
          q := 'Which scheduler allocates CPU time to processes?';
          opts := ARRAY['CPU scheduler', 'Memory allocator', 'File system', 'Device driver'];
          correct := 'A';
          difficulty := CASE (i % 3) WHEN 0 THEN 'Hard' WHEN 1 THEN 'Medium' ELSE 'Easy' END;
          marks := CASE WHEN difficulty = 'Hard' THEN 3 WHEN difficulty = 'Medium' THEN 2 ELSE 1 END;
        WHEN 'Information Security' THEN
          q := 'Which of these is a common method to protect data?';
          opts := ARRAY['Encryption', 'Compression', 'Duplication', 'Deletion'];
          correct := 'A';
          difficulty := CASE (i % 3) WHEN 0 THEN 'Hard' WHEN 1 THEN 'Medium' ELSE 'Easy' END;
          marks := CASE WHEN difficulty = 'Hard' THEN 3 WHEN difficulty = 'Medium' THEN 2 ELSE 1 END;
        WHEN 'Artificial Intelligence' THEN
          q := 'Which field focuses on making machines learn from data?';
          opts := ARRAY['Machine Learning', 'Networking', 'Compilers', 'Databases'];
          correct := 'A';
          difficulty := CASE (i % 3) WHEN 0 THEN 'Hard' WHEN 1 THEN 'Medium' ELSE 'Easy' END;
          marks := CASE WHEN difficulty = 'Hard' THEN 3 WHEN difficulty = 'Medium' THEN 2 ELSE 1 END;
      END CASE;

      INSERT INTO public.quiz_bank_questions (
        subject_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty, marks, status
      ) VALUES (
        subject_row.id,
        q || ' (' || i || ')',
        opts[1], opts[2], opts[3], opts[4],
        correct,
        'This is a sample explanation for the question.',
        difficulty,
        marks,
        CASE WHEN i % 3 = 0 THEN 'Published' ELSE 'Draft' END
      );
    END LOOP;
  END LOOP;
END $$;
