-- Seed data for Quiz Bank - Subjects and Questions
-- This file creates all 10 subjects and multiple questions for each

-- Insert subjects
INSERT INTO public.subjects (name, description) VALUES
  ('Programming Fundamentals', 'Basic programming concepts and syntax'),
  ('Object-Oriented Programming', 'OOP principles and design patterns'),
  ('Data Structures & Algorithms', 'Common data structures and algorithm analysis'),
  ('Computer Organization & Assembly Language', 'Computer architecture and low-level programming'),
  ('Database Systems', 'SQL, database design, and management'),
  ('Operating Systems', 'Process management, memory management, and synchronization'),
  ('Software Engineering', 'Software development lifecycle and best practices'),
  ('Artificial Intelligence', 'AI algorithms and machine learning fundamentals'),
  ('Computer Networks', 'Networking protocols and communication'),
  ('Information Security', 'Cryptography and security principles')
ON CONFLICT (name) DO NOTHING;

-- Note: The system user UUID should be updated to a valid teacher UUID in production
-- For now, using a placeholder that can be updated
\set SYSTEM_USER_UUID '00000000-0000-0000-0000-000000000001'

-- Insert sample questions for Programming Fundamentals
INSERT INTO public.quiz_bank_questions (subject_id, question_text, explanation, difficulty, status, created_by, marks)
SELECT s.id, q.question_text, q.explanation, q.difficulty, 'Published', :'SYSTEM_USER_UUID'::uuid, 1
FROM public.subjects s, (VALUES
  ('What is the output of: int x = 5; int y = ++x; System.out.println(x);', 'Pre-increment (++x) increments the variable before the assignment, so x becomes 6', 'Easy'),
  ('Which of the following is NOT a primitive data type in Java?', 'Primitive types in Java are: byte, short, int, long, float, double, boolean, char. String is a class, not primitive.', 'Easy'),
  ('What does the keyword "static" mean in Java?', 'Static members belong to the class itself, not to instances of the class.', 'Medium'),
  ('What is a variable in programming?', 'A variable is a named location in memory that stores a value and can be modified during program execution.', 'Easy'),
  ('Which operator is used for multiplication in most programming languages?', 'The asterisk (*) is the standard multiplication operator in most programming languages.', 'Easy')
) q(question_text, explanation, difficulty)
WHERE s.name = 'Programming Fundamentals'
ON CONFLICT DO NOTHING;

-- Insert sample questions for Object-Oriented Programming
INSERT INTO public.quiz_bank_questions (subject_id, question_text, explanation, difficulty, status, created_by, marks)
SELECT s.id, q.question_text, q.explanation, q.difficulty, 'Published', :'SYSTEM_USER_UUID'::uuid, 1
FROM public.subjects s, (VALUES
  ('Which OOP principle allows objects to take multiple forms?', 'Polymorphism allows objects to take on multiple forms. It includes method overriding and overloading.', 'Medium'),
  ('What is the purpose of an abstract class?', 'Abstract classes define a template for subclasses and cannot be instantiated directly.', 'Medium'),
  ('Which design pattern is used to create objects without specifying their exact classes?', 'The Factory pattern creates objects without specifying their exact classes at compile time.', 'Hard'),
  ('What is encapsulation in OOP?', 'Encapsulation bundles data and methods together, hiding internal details and exposing only necessary functionality.', 'Medium'),
  ('What is inheritance in OOP?', 'Inheritance allows a class to inherit properties and methods from a parent class, promoting code reuse.', 'Easy')
) q(question_text, explanation, difficulty)
WHERE s.name = 'Object-Oriented Programming'
ON CONFLICT DO NOTHING;

-- Insert sample questions for Data Structures & Algorithms
INSERT INTO public.quiz_bank_questions (subject_id, question_text, explanation, difficulty, status, created_by, marks)
SELECT s.id, q.question_text, q.explanation, q.difficulty, 'Published', :'SYSTEM_USER_UUID'::uuid, 1
FROM public.subjects s, (VALUES
  ('What is the time complexity of binary search?', 'Binary search has O(log n) time complexity because it eliminates half the elements with each iteration.', 'Medium'),
  ('Which data structure is LIFO (Last In First Out)?', 'Stack is a LIFO data structure where the last element added is the first one removed.', 'Easy'),
  ('What is the average case time complexity of QuickSort?', 'QuickSort has average case time complexity of O(n log n), though worst case is O(n²).', 'Hard'),
  ('What is a linked list?', 'A linked list is a linear data structure where elements are stored in nodes with pointers to the next node.', 'Medium'),
  ('What is the time complexity of accessing an element in an array by index?', 'Accessing an element by index in an array is O(1) because arrays provide direct access to elements.', 'Easy')
) q(question_text, explanation, difficulty)
WHERE s.name = 'Data Structures & Algorithms'
ON CONFLICT DO NOTHING;

-- Insert sample questions for Computer Organization & Assembly Language
INSERT INTO public.quiz_bank_questions (subject_id, question_text, explanation, difficulty, status, created_by, marks)
SELECT s.id, q.question_text, q.explanation, q.difficulty, 'Published', :'SYSTEM_USER_UUID'::uuid, 1
FROM public.subjects s, (VALUES
  ('What does the CPU stand for?', 'CPU stands for Central Processing Unit, the main processor in a computer.', 'Easy'),
  ('Which register is used to store the return address of a function call?', 'The return address is typically stored in the stack or in a specific register like RA (return address register).', 'Hard'),
  ('What is the purpose of the Program Counter (PC)?', 'The PC holds the address of the next instruction to be executed.', 'Medium'),
  ('What is cache memory in a CPU?', 'Cache is fast, small memory located on the CPU that stores frequently used data to speed up processing.', 'Medium'),
  ('What is the function of the ALU (Arithmetic Logic Unit)?', 'The ALU performs arithmetic and logical operations on data as instructed by the CPU control unit.', 'Hard')
) q(question_text, explanation, difficulty)
WHERE s.name = 'Computer Organization & Assembly Language'
ON CONFLICT DO NOTHING;

-- Insert sample questions for Database Systems
INSERT INTO public.quiz_bank_questions (subject_id, question_text, explanation, difficulty, status, created_by, marks)
SELECT s.id, q.question_text, q.explanation, q.difficulty, 'Published', :'SYSTEM_USER_UUID'::uuid, 1
FROM public.subjects s, (VALUES
  ('What does ACID stand for in database transactions?', 'ACID = Atomicity, Consistency, Isolation, Durability - properties that guarantee reliable database transactions.', 'Medium'),
  ('Which SQL statement is used to retrieve data from a database?', 'The SELECT statement is used to query and retrieve data from one or more tables.', 'Easy'),
  ('What is database normalization?', 'Normalization organizes data to reduce redundancy and improve data integrity through normal forms.', 'Hard'),
  ('What is a primary key in a database?', 'A primary key is a unique identifier for each record in a table, ensuring no duplicate entries.', 'Easy'),
  ('What is a foreign key?', 'A foreign key is a field that links to the primary key of another table, establishing relationships between tables.', 'Medium')
) q(question_text, explanation, difficulty)
WHERE s.name = 'Database Systems'
ON CONFLICT DO NOTHING;

-- Insert sample questions for Operating Systems
INSERT INTO public.quiz_bank_questions (subject_id, question_text, explanation, difficulty, status, created_by, marks)
SELECT s.id, q.question_text, q.explanation, q.difficulty, 'Published', :'SYSTEM_USER_UUID'::uuid, 1
FROM public.subjects s, (VALUES
  ('What is a process?', 'A process is an instance of a program in execution, with its own memory space and resources.', 'Medium'),
  ('Which scheduling algorithm gives each process equal time?', 'Round Robin scheduling gives each process a fixed time slice (quantum) in a circular fashion.', 'Medium'),
  ('What is a deadlock?', 'A deadlock is when two or more processes are blocked waiting for each other, unable to proceed.', 'Hard'),
  ('What is the purpose of an OS scheduler?', 'The scheduler allocates CPU time to processes, ensuring fair and efficient resource utilization.', 'Medium'),
  ('What is virtual memory?', 'Virtual memory uses disk space to extend the available memory, allowing programs to use more memory than physically available.', 'Hard')
) q(question_text, explanation, difficulty)
WHERE s.name = 'Operating Systems'
ON CONFLICT DO NOTHING;

-- Insert sample questions for Software Engineering
INSERT INTO public.quiz_bank_questions (subject_id, question_text, explanation, difficulty, status, created_by, marks)
SELECT s.id, q.question_text, q.explanation, q.difficulty, 'Published', :'SYSTEM_USER_UUID'::uuid, 1
FROM public.subjects s, (VALUES
  ('What is the main goal of software testing?', 'The goal is to identify defects and ensure the software meets requirements and quality standards.', 'Easy'),
  ('Which design pattern is used to handle varying algorithms?', 'The Strategy pattern encapsulates algorithms and allows selecting them at runtime.', 'Hard'),
  ('What is refactoring?', 'Refactoring is improving code structure and quality without changing its external behavior.', 'Medium'),
  ('What is the Waterfall model in software development?', 'Waterfall is a linear SDLC model where each phase must be completed before the next begins.', 'Medium'),
  ('What are the phases of the Software Development Life Cycle (SDLC)?', 'SDLC phases include planning, analysis, design, implementation, testing, deployment, and maintenance.', 'Hard')
) q(question_text, explanation, difficulty)
WHERE s.name = 'Software Engineering'
ON CONFLICT DO NOTHING;

-- Insert sample questions for Artificial Intelligence
INSERT INTO public.quiz_bank_questions (subject_id, question_text, explanation, difficulty, status, created_by, marks)
SELECT s.id, q.question_text, q.explanation, q.difficulty, 'Published', :'SYSTEM_USER_UUID'::uuid, 1
FROM public.subjects s, (VALUES
  ('What is machine learning?', 'ML is a subset of AI where systems learn from data and improve performance without explicit programming.', 'Medium'),
  ('Which algorithm is used for supervised learning classification?', 'Decision Trees, SVM, and Neural Networks are common supervised classification algorithms.', 'Hard'),
  ('What is the difference between AI and Machine Learning?', 'AI is broader (simulating intelligence), while ML is a subset focusing on learning from data.', 'Medium'),
  ('What is unsupervised learning?', 'Unsupervised learning finds patterns in unlabeled data without predefined output examples.', 'Medium'),
  ('What is deep learning?', 'Deep learning uses artificial neural networks with multiple layers to learn hierarchical representations of data.', 'Hard')
) q(question_text, explanation, difficulty)
WHERE s.name = 'Artificial Intelligence'
ON CONFLICT DO NOTHING;

-- Insert sample questions for Computer Networks
INSERT INTO public.quiz_bank_questions (subject_id, question_text, explanation, difficulty, status, created_by, marks)
SELECT s.id, q.question_text, q.explanation, q.difficulty, 'Published', :'SYSTEM_USER_UUID'::uuid, 1
FROM public.subjects s, (VALUES
  ('What is the OSI model?', 'OSI (Open Systems Interconnection) is a 7-layer model for network communication protocols.', 'Medium'),
  ('Which layer does TCP/IP operate on?', 'TCP/IP operates on the Transport (Layer 4) and Network (Layer 3) layers of the OSI model.', 'Hard'),
  ('What does HTTP stand for?', 'HTTP stands for HyperText Transfer Protocol, used for web communication.', 'Easy'),
  ('What is an IP address?', 'An IP address is a unique numerical identifier assigned to each device on a network for communication.', 'Easy'),
  ('What is the difference between TCP and UDP?', 'TCP is connection-oriented and reliable, while UDP is connectionless and faster but may lose packets.', 'Hard')
) q(question_text, explanation, difficulty)
WHERE s.name = 'Computer Networks'
ON CONFLICT DO NOTHING;

-- Insert sample questions for Information Security
INSERT INTO public.quiz_bank_questions (subject_id, question_text, explanation, difficulty, status, created_by, marks)
SELECT s.id, q.question_text, q.explanation, q.difficulty, 'Published', :'SYSTEM_USER_UUID'::uuid, 1
FROM public.subjects s, (VALUES
  ('What is encryption?', 'Encryption converts data into a coded format to prevent unauthorized access.', 'Easy'),
  ('What is the difference between symmetric and asymmetric encryption?', 'Symmetric uses same key for encryption/decryption, asymmetric uses public/private key pair.', 'Hard'),
  ('What is a hash function?', 'A hash function converts input data of any size into fixed-size hash value, typically one-way.', 'Medium'),
  ('What is a firewall?', 'A firewall is a network security system that monitors and controls incoming and outgoing network traffic.', 'Easy'),
  ('What is SQL injection?', 'SQL injection is a cyber attack where malicious SQL code is inserted into input fields to manipulate databases.', 'Hard')
) q(question_text, explanation, difficulty)
WHERE s.name = 'Information Security'
ON CONFLICT DO NOTHING;

-- Now insert options for each question
-- We'll insert 4 options per question with the second option being correct for simplicity
INSERT INTO public.quiz_bank_options (question_id, option_text, is_correct, position)
SELECT 
  q.id,
  opts.option_text,
  opts.is_correct,
  opts.position
FROM public.quiz_bank_questions q
CROSS JOIN LATERAL (VALUES
  ('Option A', false, 0),
  ('Option B', true, 1),
  ('Option C', false, 2),
  ('Option D', false, 3)
) opts(option_text, is_correct, position)
ON CONFLICT DO NOTHING;
