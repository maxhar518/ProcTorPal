import { z } from "zod";

export const quizUpsertSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  time_limit_minutes: z.number().int().min(0).max(600).optional().nullable(),
  passing_score: z.number().int().min(0).max(100000).optional().nullable(),
  available_from: z.string().datetime().optional().nullable(),
  available_until: z.string().datetime().optional().nullable(),
});
export type QuizUpsert = z.infer<typeof quizUpsertSchema>;

export const optionSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1).max(500),
  is_correct: z.boolean(),
  position: z.number().int().min(0).max(50),
});

export const questionUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  quiz_id: z.string().uuid(),
  prompt: z.string().trim().min(1).max(2000),
  type: z.enum(["single", "multi"]),
  points: z.number().int().min(1).max(1000).default(1),
  position: z.number().int().min(0).max(1000),
  options: z.array(optionSchema).min(2).max(10),
});
export type QuestionUpsert = z.infer<typeof questionUpsertSchema>;
