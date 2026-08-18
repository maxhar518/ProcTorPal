import { z } from "zod";

// ============================================================================
// Database Types
// ============================================================================

export interface Subject {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface QuizBankQuestion {
  id: string;
  subject_id: string;
  question_text: string;
  explanation?: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topic?: string;
  chapter?: string;
  marks: number;
  status: "Draft" | "Published" | "Active" | "Inactive";
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface QuizBankOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface QuizAssignment {
  id: string;
  quiz_id: string;
  created_by: string;
  source_questions: string[];
  question_order: string[];
  option_order: Record<string, number[]>;
  assignment_name: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// UI Component Types
// ============================================================================

export interface QuestionWithOptions extends QuizBankQuestion {
  quiz_bank_options?: QuizBankOption[];
}

export interface QuizBankListResponse {
  questions: QuizBankQuestion[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CreateQuestionPayload {
  subjectId: string;
  questionText: string;
  difficulty: "Easy" | "Medium" | "Hard";
  options: string[];
  correctOption: number;
  topic?: string;
  chapter?: string;
  explanation?: string;
  marks?: number;
}

export interface UpdateQuestionPayload extends CreateQuestionPayload {
  id: string;
}

// ============================================================================
// Validation Schemas
// ============================================================================

export const subjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
});

export const quizBankOptionSchema = z.object({
  id: z.string().uuid(),
  question_id: z.string().uuid(),
  option_text: z.string(),
  is_correct: z.boolean(),
  position: z.number().int().min(0).max(3),
});

export const quizBankQuestionSchema = z.object({
  id: z.string().uuid(),
  subject_id: z.string().uuid(),
  question_text: z.string(),
  explanation: z.string().optional(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  topic: z.string().optional(),
  chapter: z.string().optional(),
  marks: z.number().int(),
  status: z.enum(["Draft", "Published", "Active", "Inactive"]),
  created_by: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const questionWithOptionsSchema = quizBankQuestionSchema.extend({
  quiz_bank_options: z.array(quizBankOptionSchema).optional(),
});

// ============================================================================
// Export all types
// ============================================================================

export type Subject = z.infer<typeof subjectSchema>;
export type QuizBankQuestion = z.infer<typeof quizBankQuestionSchema>;
export type QuizBankOption = z.infer<typeof quizBankOptionSchema>;
export type QuestionWithOptions = z.infer<typeof questionWithOptionsSchema>;
