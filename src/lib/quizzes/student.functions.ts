import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const enrollByCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ code: z.string().trim().min(4).max(40) }).parse(i)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: quizId, error } = await supabase.rpc("enroll_by_code", {
      _code: data.code.toUpperCase(),
    });
    if (error) throw new Error(error.message);
    return { quizId: quizId as unknown as string };
  });

export const listMyEnrolledQuizzes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: enrolls, error } = await supabase
      .from("quiz_enrollments")
      .select("quiz_id, enrolled_at")
      .eq("student_id", userId)
      .order("enrolled_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = (enrolls ?? []).map((e) => e.quiz_id);
    if (ids.length === 0) return { rows: [] };

    const { data: quizzes, error: qErr } = await supabase
      .from("quizzes").select("id, title, description, status, results_released")
      .in("id", ids);
    if (qErr) throw new Error(qErr.message);

    const { data: attempts } = await supabase
      .from("quiz_attempts")
      .select("quiz_id, status, score, max_score")
      .eq("student_id", userId).in("quiz_id", ids);

    const qMap = new Map((quizzes ?? []).map((q) => [q.id, q]));
    const aMap = new Map((attempts ?? []).map((a) => [a.quiz_id, a]));

    const rows = (enrolls ?? [])
      .filter((e) => qMap.has(e.quiz_id))
      .map((e) => {
        const q = qMap.get(e.quiz_id)!;
        const a = aMap.get(e.quiz_id);
        return {
          quiz_id: e.quiz_id,
          title: q.title,
          description: q.description,
          status: q.status,
          results_released: q.results_released,
          attempt_status: (a?.status ?? "not_started") as "not_started" | "in_progress" | "completed",
          score: a?.score ?? null,
          max_score: a?.max_score ?? null,
        };
      });
    return { rows };
  });

export const getQuizForAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ quizId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: quiz, error } = await supabase
      .from("quizzes").select("id, title, description, time_limit_minutes, status")
      .eq("id", data.quizId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!quiz || quiz.status !== "published") throw new Error("Quiz unavailable");

    const { data: questions } = await supabase
      .from("questions").select("id, prompt, type, points, position")
      .eq("quiz_id", data.quizId).order("position");
    const ids = (questions ?? []).map((q) => q.id);
    let options: any[] = [];
    if (ids.length > 0) {
      const { data: opts } = await supabase
        .from("question_options").select("id, question_id, label, position")
        .in("question_id", ids).order("position");
      options = opts ?? [];
    }
    return { quiz, questions: questions ?? [], options };
  });

export const startAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ quizId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("quiz_attempts").select("*")
      .eq("quiz_id", data.quizId).eq("student_id", userId).maybeSingle();
    if (existing) return { attempt: existing };
    const { data: created, error } = await supabase
      .from("quiz_attempts").insert({
        quiz_id: data.quizId, student_id: userId, status: "in_progress",
      }).select().maybeSingle();
    if (error) {
      // Race: another concurrent call created the attempt — fetch and return it.
      if ((error as any).code === "23505") {
        const { data: again } = await supabase
          .from("quiz_attempts").select("*")
          .eq("quiz_id", data.quizId).eq("student_id", userId).single();
        return { attempt: again };
      }
      throw new Error(error.message);
    }
    return { attempt: created };
  });

export const submitAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    quizId: z.string().uuid(),
    answers: z.array(z.object({
      question_id: z.string().uuid(),
      selected_option_ids: z.array(z.string().uuid()),
    })),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: attempt, error: aErr } = await supabase
      .from("quiz_attempts").select("*")
      .eq("quiz_id", data.quizId).eq("student_id", userId).single();
    if (aErr) throw new Error(aErr.message);

    // Persist answers
    await supabase.from("attempt_answers").delete().eq("attempt_id", attempt.id);
    if (data.answers.length > 0) {
      const { error: insErr } = await supabase.from("attempt_answers").insert(
        data.answers.map((a) => ({
          attempt_id: attempt.id,
          question_id: a.question_id,
          selected_option_ids: a.selected_option_ids,
        }))
      );
      if (insErr) throw new Error(insErr.message);
    }

    // Grade
    const { data: questions } = await supabase
      .from("questions").select("id, type, points").eq("quiz_id", data.quizId);
    const qIds = (questions ?? []).map((q) => q.id);
    const { data: opts } = await supabase
      .from("question_options").select("id, question_id, is_correct")
      .in("question_id", qIds.length > 0 ? qIds : ["00000000-0000-0000-0000-000000000000"]);
    const correctByQ = new Map<string, Set<string>>();
    (opts ?? []).forEach((o) => {
      if (!correctByQ.has(o.question_id)) correctByQ.set(o.question_id, new Set());
      if (o.is_correct) correctByQ.get(o.question_id)!.add(o.id);
    });
    let score = 0, max = 0;
    const ansByQ = new Map(data.answers.map((a) => [a.question_id, new Set(a.selected_option_ids)]));
    for (const q of questions ?? []) {
      max += q.points;
      const correct = correctByQ.get(q.id) ?? new Set();
      const sel = ansByQ.get(q.id) ?? new Set();
      if (sel.size === correct.size && [...sel].every((id) => correct.has(id))) {
        score += q.points;
      }
    }

    const { error: upErr } = await supabase.from("quiz_attempts").update({
      status: "completed", submitted_at: new Date().toISOString(),
      score, max_score: max,
    }).eq("id", attempt.id);
    if (upErr) throw new Error(upErr.message);

    return { score, max_score: max };
  });

export const getMyResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ quizId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: quiz } = await supabase
      .from("quizzes").select("title, results_released, passing_score")
      .eq("id", data.quizId).maybeSingle();
    if (!quiz) throw new Error("Quiz not found");
    const { data: attempt } = await supabase
      .from("quiz_attempts").select("*")
      .eq("quiz_id", data.quizId).eq("student_id", userId).maybeSingle();
    return { quiz, attempt };
  });
