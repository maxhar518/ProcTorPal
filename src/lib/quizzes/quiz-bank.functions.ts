import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const teacherOnlySchema = z.object({
  subjectId: z.string().uuid().optional().nullable(),
  search: z.string().trim().max(120).optional().nullable(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  difficulty: z.enum(["all", "Easy", "Medium", "Hard"]).default("all"),
  status: z.enum(["all", "Draft", "Published"]).default("all"),
});

const createQuizFromBankSchema = z.object({
  title: z.string().trim().min(1).max(200),
  subjectId: z.string().uuid(),
  durationMinutes: z.number().int().min(1).max(600),
  totalMarks: z.number().int().min(1).max(1000),
  passingMarks: z.number().int().min(0).max(1000),
  availableFrom: z.string().datetime().optional().nullable(),
  availableUntil: z.string().datetime().optional().nullable(),
  questionIds: z.array(z.string().uuid()).min(1),
  publishNow: z.boolean().default(false),
});

const createVersionsSchema = z.object({ quizId: z.string().uuid() });

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const temp = copy[index];
    copy[index] = copy[swapIndex];
    copy[swapIndex] = temp;
  }
  return copy;
}

export const listQuizBankSubjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await (supabase as any)
      .from("subjects")
      .select("id, name")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return { subjects: data ?? [] };
  });

export const listQuizBankQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => teacherOnlySchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { search, subjectId, page, pageSize, difficulty, status } = data;
    let query = (supabase as any)
      .from("quiz_bank_questions")
      .select("id, question_text, difficulty, marks, status, subject_id, explanation, option_a, option_b, option_c, option_d, correct_option, subjects(name)", { count: "exact" })
      .order("created_at", { ascending: false });

    if (subjectId) {
      query = query.eq("subject_id", subjectId);
    }

    if (search) {
      query = query.or(`question_text.ilike.%${search}%,option_a.ilike.%${search}%,option_b.ilike.%${search}%`);
    }

    if (difficulty !== "all") {
      query = query.eq("difficulty", difficulty);
    }

    if (status !== "all") {
      query = query.eq("status", status.toLowerCase());
    }

    const start = (page - 1) * pageSize;
    query = query.range(start, start + pageSize - 1);

    const { data: rows, error, count } = await query;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });

export const createQuizFromBank = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => createQuizFromBankSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: subject, error: subjectErr } = await (supabase as any)
      .from("subjects")
      .select("id")
      .eq("id", data.subjectId)
      .maybeSingle();
    if (subjectErr) throw new Error(subjectErr.message);
    if (!subject) throw new Error("Subject not found.");

    const { data: quiz, error: quizErr } = await (supabase as any)
      .from("quizzes")
      .insert({
        teacher_id: userId,
        title: data.title,
        subject_id: data.subjectId,
        description: `Generated from quiz bank (${data.questionIds.length} questions)`,
        time_limit_minutes: data.durationMinutes,
        duration_minutes: data.durationMinutes,
        total_marks: data.totalMarks,
        passing_score: data.passingMarks,
        passing_marks: data.passingMarks,
        available_from: data.availableFrom || null,
        available_until: data.availableUntil || null,
        status: data.publishNow ? "published" : "draft",
      })
      .select()
      .single();
    if (quizErr) throw new Error(quizErr.message);

    const questionRows = data.questionIds.map((questionId, index) => ({
      quiz_id: quiz.id,
      question_id: questionId,
      display_order: index + 1,
    }));

    const { error: linkErr } = await (supabase as any)
      .from("quiz_questions")
      .insert(questionRows);
    if (linkErr) throw new Error(linkErr.message);

    return { quiz };
  });

export const generateQuizVersions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => createVersionsSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: existingVersions, error: versionErr } = await (supabase as any)
      .from("quiz_versions")
      .select("id, version_name")
      .eq("quiz_id", data.quizId);
    if (versionErr) throw new Error(versionErr.message);
    if ((existingVersions ?? []).length >= 3) {
      return { versions: existingVersions ?? [] };
    }

    const { data: linkedQuestions, error: linkErr } = await (supabase as any)
      .from("quiz_questions")
      .select("question_id")
      .eq("quiz_id", data.quizId)
      .order("display_order", { ascending: true });
    if (linkErr) throw new Error(linkErr.message);

    const questionIds = (linkedQuestions ?? []).map((row: any) => row.question_id);
    if (questionIds.length === 0) {
      throw new Error("This quiz does not have any bank questions yet.");
    }

    const versions = ["A", "B", "C"].map((versionName) => {
      const shuffledQuestions = shuffle(questionIds);
      const optionOrder = shuffledQuestions.map(() => shuffle(["option_a", "option_b", "option_c", "option_d"]));
      return {
        quiz_id: data.quizId,
        version_name: versionName,
        question_order: shuffledQuestions,
        option_order: optionOrder,
      };
    });

    const { data: inserted, error: insertErr } = await (supabase as any)
      .from("quiz_versions")
      .insert(versions)
      .select();
    if (insertErr) throw new Error(insertErr.message);
    return { versions: inserted ?? [] };
  });

export const listQuizVersions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => createVersionsSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: versions, error } = await (supabase as any)
      .from("quiz_versions")
      .select("id, version_name, question_order, option_order")
      .eq("quiz_id", data.quizId)
      .order("version_name", { ascending: true });
    if (error) throw new Error(error.message);
    return { versions: versions ?? [] };
  });
