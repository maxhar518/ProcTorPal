import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function fetchQuizQuestionsAndOptions(
  _supabase: any,
  quizId: string,
  questionSelect = "id, prompt, type, points, position",
  optionSelect = "id, question_id, label, position"
) {
  const client = supabaseAdmin;

  const { data: linkedRows, error: linkErr } = await client
    .from("quiz_questions")
    .select("question_id, display_order")
    .eq("quiz_id", quizId)
    .order("display_order", { ascending: true });

  if (linkErr) throw new Error(linkErr.message);

  const linkedIds = (linkedRows ?? []).map((row: any) => row.question_id);
  let linkedQuestions: any[] = [];

  if (linkedIds.length > 0) {
    const { data: rows, error: qErr } = await client
      .from("questions")
      .select(questionSelect)
      .in("id", linkedIds);

    if (qErr) throw new Error(qErr.message);
    linkedQuestions = rows ?? [];
  }

  const { data: directQuestions, error: directQErr } = await client
    .from("questions")
    .select(questionSelect)
    .eq("quiz_id", quizId)
    .order("position", { ascending: true });

  if (directQErr) throw new Error(directQErr.message);

  const byId = new Map<string, any>();
  const ordered: Array<{ id: string; position: number }> = [];

  for (const row of linkedRows ?? []) {
    const question = linkedQuestions.find((item: any) => item.id === row.question_id);
    if (!question || byId.has(question.id)) continue;
    const normalizedQuestion = { ...question, position: row.display_order };
    byId.set(question.id, normalizedQuestion);
    ordered.push({ id: question.id, position: row.display_order });
  }

  for (const question of directQuestions ?? []) {
    if (byId.has(question.id)) continue;
    byId.set(question.id, question);
    ordered.push({ id: question.id, position: question.position ?? 0 });
  }

  const questions = ordered
    .sort((a, b) => a.position - b.position)
    .map((entry) => byId.get(entry.id));

  const questionIds = questions.map((question: any) => question.id);
  let options: any[] = [];
  if (questionIds.length > 0) {
    const { data: rows, error: oErr } = await client
      .from("question_options")
      .select(optionSelect)
      .in("question_id", questionIds)
      .order("position", { ascending: true });

    if (oErr) throw new Error(oErr.message);
    options = rows ?? [];
  }

  return { questions, options };
}
