# Quiz Bank Management System

## Architecture overview

The quiz bank feature is built as a teacher-first extension of the existing quiz flow:

- Subjects and reusable bank questions are stored separately from individual quizzes.
- Teachers browse the bank, select multiple questions, and create a quiz from that selection.
- Each quiz created from the bank can generate shuffled versions A/B/C automatically.
- The existing quiz and auth layers remain in place, so student participation continues to work without disruption.

## Core entities

- Subject: top-level category for bank questions.
- QuizBankQuestion: reusable question item with subject, options, answer, difficulty, marks, and status.
- Quiz: teacher-owned quiz wrapper with duration, marks, publish state, and availability window.
- QuizQuestion: mapping between a quiz and selected bank questions.
- QuizVersion: generated randomized version metadata for A/B/C.

## Business rules

- Only authenticated teachers can manage the bank and create quizzes.
- A quiz can contain questions from a single subject.
- Question edits in the bank do not mutate previously published quiz snapshots; the system uses a reusable bank reference model and version metadata.
- Published quizzes remain read-only in this initial implementation unless duplicated later.

## API surface

Teacher-facing server functions:

- listQuizBankSubjects
- listQuizBankQuestions
- createQuizFromBank
- generateQuizVersions
- listQuizVersions

## Seed data

The SQL seed file populates bank questions for the required subjects and includes a mix of Easy, Medium, and Hard items.

## Deployment notes

1. Apply the new Supabase migration.
2. Run the seed SQL to load dummy questions.
3. Open the teacher dashboard and visit Quiz Bank.
