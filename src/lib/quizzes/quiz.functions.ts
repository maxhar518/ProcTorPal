import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { quizUpsertSchema, questionUpsertSchema } from "./schemas";

const idSchema = z.object({ quizId: z.string().uuid() });

export const listMyQuizzes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("quizzes")
      .select("*")
      .eq("teacher_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { quizzes: data ?? [] };
  });

export const getQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => idSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: quiz, error } = await supabase
      .from("quizzes").select("*").eq("id", data.quizId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!quiz) throw new Error("Quiz not found");

    const { data: questions, error: qErr } = await supabase
      .from("questions").select("*").eq("quiz_id", data.quizId)
      .order("position", { ascending: true });
    if (qErr) throw new Error(qErr.message);

    const ids = (questions ?? []).map((q) => q.id);
    let options: any[] = [];
    if (ids.length > 0) {
      const { data: opts, error: oErr } = await supabase
        .from("question_options").select("*").in("question_id", ids)
        .order("position", { ascending: true });
      if (oErr) throw new Error(oErr.message);
      options = opts ?? [];
    }
    return { quiz, questions: questions ?? [], options };
  });

export const createQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => quizUpsertSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      ...data,
      description: data.description?.trim() ? data.description : null,
      time_limit_minutes: data.time_limit_minutes ?? null,
      passing_score: data.passing_score ?? 0,
      available_from: data.available_from || null,
      available_until: data.available_until || null,
      teacher_id: userId,
    };
    const { data: quiz, error } = await supabase
      .from("quizzes")
      .insert(payload)
      .select().single();
    console.log("Insert quiz result:", { quiz, error });
    if (error) {
      console.error("Error creating quiz:", error);
      if (error.code === "42501" || /row-level security/i.test(error.message)) {
        throw new Error("Only teachers can create quizzes.");
      }
      throw new Error(error.message);
    }
    return { quiz };
  });

export const updateQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => quizUpsertSchema.extend({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { id, ...rest } = data;
    const { data: quiz, error } = await supabase
      .from("quizzes").update(rest).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return { quiz };
  });

export const setQuizStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ quizId: z.string().uuid(), status: z.enum(["draft", "published"]) }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("quizzes").update({ status: data.status }).eq("id", data.quizId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const releaseResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ quizId: z.string().uuid(), released: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("quizzes").update({ results_released: data.released }).eq("id", data.quizId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => idSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("quizzes").delete().eq("id", data.quizId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const regenerateAccessCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => idSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .rpc("generate_quiz_code");
    if (error) throw new Error(error.message);
    const code = row as unknown as string;
    const { error: uErr } = await supabase
      .from("quizzes").update({ access_code: code }).eq("id", data.quizId);
    if (uErr) throw new Error(uErr.message);
    return { access_code: code };
  });

export const setCodeEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ quizId: z.string().uuid(), enabled: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("quizzes").update({ code_enabled: data.enabled }).eq("id", data.quizId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => questionUpsertSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let questionId = data.id;
    if (questionId) {
      const { error } = await supabase.from("questions").update({
        prompt: data.prompt, type: data.type, points: data.points, position: data.position,
      }).eq("id", questionId);
      if (error) throw new Error(error.message);
      await supabase.from("question_options").delete().eq("question_id", questionId);
    } else {
      const { data: q, error } = await supabase.from("questions").insert({
        quiz_id: data.quiz_id, prompt: data.prompt, type: data.type,
        points: data.points, position: data.position,
      }).select().single();
      if (error) throw new Error(error.message);
      questionId = q.id;
    }
    const { error: optErr } = await supabase.from("question_options").insert(
      data.options.map((o) => ({
        question_id: questionId!, label: o.label, is_correct: o.is_correct, position: o.position,
      }))
    );
    if (optErr) throw new Error(optErr.message);
    return { id: questionId };
  });

export const deleteQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("questions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listEnrolledStudents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    quizId: z.string().uuid(),
    search: z.string().trim().max(120).optional(),
    statusFilter: z.enum(["all", "not_started", "in_progress", "completed"]).default("all"),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(20),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: enrolls, error } = await supabase
      .from("quiz_enrollments")
      .select("student_id, enrolled_at")
      .eq("quiz_id", data.quizId)
      .order("enrolled_at", { ascending: false });
    if (error) throw new Error(error.message);
    const studentIds = (enrolls ?? []).map((e) => e.student_id);
    if (studentIds.length === 0) return { rows: [], total: 0 };

    const { data: profiles, error: pErr } = await supabase
      .from("profiles").select("id, full_name, email").in("id", studentIds);
    if (pErr) throw new Error(pErr.message);

    const { data: attempts, error: aErr } = await supabase
      .from("quiz_attempts")
      .select("student_id, status, score, max_score")
      .eq("quiz_id", data.quizId).in("student_id", studentIds);
    if (aErr) throw new Error(aErr.message);

    const pMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const aMap = new Map((attempts ?? []).map((a) => [a.student_id, a]));

    let rows = (enrolls ?? []).map((e) => {
      const p = pMap.get(e.student_id);
      const a = aMap.get(e.student_id);
      return {
        student_id: e.student_id,
        full_name: p?.full_name ?? "",
        email: p?.email ?? "",
        enrolled_at: e.enrolled_at,
        status: (a?.status ?? "not_started") as "not_started" | "in_progress" | "completed",
        score: a?.score ?? null,
        max_score: a?.max_score ?? null,
      };
    });

    if (data.search) {
      const s = data.search.toLowerCase();
      rows = rows.filter((r) =>
        r.full_name.toLowerCase().includes(s) || r.email.toLowerCase().includes(s)
      );
    }
    if (data.statusFilter !== "all") {
      rows = rows.filter((r) => r.status === data.statusFilter);
    }
    const total = rows.length;
    const start = (data.page - 1) * data.pageSize;
    rows = rows.slice(start, start + data.pageSize);
    return { rows, total };
  });
