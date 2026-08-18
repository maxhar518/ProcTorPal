import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============================================================================
// Schemas
// ============================================================================

const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

const listQuizBankQuestionsSchema = z.object({
  subjectId: z.string().uuid().optional().nullable(),
  search: z.string().trim().max(120).optional().nullable(),
  difficulty: z.enum(["all", "Easy", "Medium", "Hard"]).default("all"),
  status: z.enum(["all", "Draft", "Published"]).default("all"),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

const createQuizBankQuestionSchema = z.object({
  subjectId: z.string().uuid(),
  questionText: z.string().trim().min(1).max(4000),
  topic: z.string().trim().max(200).optional().nullable(),
  chapter: z.string().trim().max(200).optional().nullable(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).default("Medium"),
  options: z.array(z.string().trim().min(1).max(1000)).length(4),
  correctOption: z.enum([0, 1, 2, 3]).or(z.enum(["0", "1", "2", "3"])).transform(v => Number(v)),
  explanation: z.string().trim().max(4000).optional().nullable(),
  marks: z.number().int().min(1).max(100).default(1),
});

const updateQuizBankQuestionSchema = createQuizBankQuestionSchema.extend({
  id: z.string().uuid(),
});

const publishQuestionSchema = z.object({
  questionId: z.string().uuid(),
  publish: z.boolean(),
});

const deleteQuestionSchema = z.object({
  questionId: z.string().uuid(),
});

const getQuestionWithOptionsSchema = z.object({
  questionId: z.string().uuid(),
});

const createAssignmentSchema = z.object({
  quizId: z.string().uuid(),
  questionIds: z.array(z.string().uuid()).min(1),
  shuffle: z.boolean().default(true),
  assignmentName: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(1000).optional().nullable(),
});

// ============================================================================
// Helper Functions
// ============================================================================

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function generateShuffledOptions(optionIds: string[]): Record<string, number[]> {
  const shuffledMap: Record<string, number[]> = {};
  optionIds.forEach(optionId => {
    shuffledMap[optionId] = shuffle([0, 1, 2, 3]);
  });
  return shuffledMap;
}

// ============================================================================
// Query Functions (Read Operations)
// ============================================================================

/**
 * List all subjects
 */
export const listQuizBankSubjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("subjects")
      .select("id, name, description")
      .order("name", { ascending: true });

    if (error) throw new Error(`Failed to list subjects: ${error.message}`);
    return { subjects: data ?? [] };
  });

/**
 * List quiz bank questions with filters and pagination
 */
export const listQuizBankQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => listQuizBankQuestionsSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const offset = (data.page - 1) * data.pageSize;

    let query = supabase
      .from("quiz_bank_questions") //no overload matches this call
      .select("id, subject_id, question_text, difficulty, status, created_by, created_at, marks, topic, chapter, explanation", { count: "exact" });

    // Filter by subject
    if (data.subjectId) {
      query = query.eq("subject_id", data.subjectId);
    }

    // Filter by status
    if (data.status !== "all") {
      query = query.eq("status", data.status);
    }

    // Filter by difficulty
    if (data.difficulty !== "all") {
      query = query.eq("difficulty", data.difficulty);
    }

    // Filter by search term
    if (data.search) {
      query = query.or(`question_text.ilike.%${data.search}%,topic.ilike.%${data.search}%,chapter.ilike.%${data.search}%`);
    }

    // Only show published questions or own questions
    query = query.or(`status.eq.Published,created_by.eq.${userId}`);

    const { data: questions, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + data.pageSize - 1);

    if (error) throw new Error(`Failed to list questions: ${error.message}`);

    return {
      questions: questions ?? [],
      total: count ?? 0,
      page: data.page,
      pageSize: data.pageSize,
      totalPages: Math.ceil((count ?? 0) / data.pageSize),
    };
  });

/**
 * Get a single question with all its options
 */
export const getQuizBankQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => getQuestionWithOptionsSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Get question
    const { data: question, error: qError } = await supabase
      .from("quiz_bank_questions")
      .select("*")
      .eq("id", data.questionId)
      .single();

    if (qError) {
      if (qError.code === "PGRST116") {
        throw new Error("Question not found");
      }
      throw new Error(`Failed to get question: ${qError.message}`);
    }

    // Check access: user must be the creator or question must be published
    if (question.created_by !== userId && question.status !== "Published") {
      throw new Error("Access denied");
    }

    // Get options
    const { data: options, error: oError } = await supabase
      .from("quiz_bank_options")
      .select("id, option_text, is_correct, position")
      .eq("question_id", data.questionId)
      .order("position", { ascending: true });

    if (oError) throw new Error(`Failed to get options: ${oError.message}`);

    return {
      question,
      options: options ?? [],
    };
  });

/**
 * Get subject by ID
 */
export const getSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ subjectId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: subject, error } = await supabase
      .from("subjects")
      .select("*")
      .eq("id", data.subjectId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new Error("Subject not found");
      }
      throw new Error(`Failed to get subject: ${error.message}`);
    }

    return { subject };
  });

// ============================================================================
// Mutation Functions (Write Operations)
// ============================================================================

/**
 * Create a new quiz bank question
 */
export const createQuizBankQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => createQuizBankQuestionSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify user is a teacher (checking from user metadata)
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error("Unauthorized");

    // Check if user has teacher role
    const userRole = userData.user.user_metadata?.role || userData.user.app_metadata?.role;
    if (userRole !== "teacher") {
      throw new Error("Only teachers can create quiz bank questions");
    }

    // Create question
    const { data: question, error: qError } = await supabase
      .from("quiz_bank_questions")
      .insert({
        subject_id: data.subjectId,
        question_text: data.questionText,
        topic: data.topic || null,
        chapter: data.chapter || null,
        difficulty: data.difficulty,
        explanation: data.explanation || null,
        marks: data.marks,
        status: "Draft",
        created_by: userId,
      })
      .select()
      .single();

    if (qError) throw new Error(`Failed to create question: ${qError.message}`);

    // Create options
    const optionsData = data.options.map((text, index) => ({
      question_id: question.id,
      option_text: text,
      is_correct: index === data.correctOption,
      position: index,
    }));

    const { error: oError } = await supabase
      .from("quiz_bank_options")
      .insert(optionsData);

    if (oError) throw new Error(`Failed to create options: ${oError.message}`);

    return { question, options: optionsData };
  });

/**
 * Update an existing quiz bank question (only draft questions)
 */
export const updateQuizBankQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => updateQuizBankQuestionSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { id, ...updateData } = data;

    // Get existing question
    const { data: existing, error: getError } = await supabase
      .from("quiz_bank_questions")
      .select("*")
      .eq("id", id)
      .single();

    if (getError) throw new Error(`Question not found: ${getError.message}`);
    if (existing.created_by !== userId) throw new Error("Access denied");
    if (existing.status === "Published") throw new Error("Cannot edit published questions");

    // Update question
    const { data: question, error: qError } = await supabase
      .from("quiz_bank_questions")
      .update({
        question_text: updateData.questionText,
        topic: updateData.topic || null,
        chapter: updateData.chapter || null,
        difficulty: updateData.difficulty,
        explanation: updateData.explanation || null,
        marks: updateData.marks,
      })
      .eq("id", id)
      .select()
      .single();

    if (qError) throw new Error(`Failed to update question: ${qError.message}`);

    // Delete existing options
    await supabase.from("quiz_bank_options").delete().eq("question_id", id);

    // Create new options
    const optionsData = updateData.options.map((text, index) => ({
      question_id: id,
      option_text: text,
      is_correct: index === updateData.correctOption,
      position: index,
    }));

    const { error: oError } = await supabase
      .from("quiz_bank_options")
      .insert(optionsData);

    if (oError) throw new Error(`Failed to update options: ${oError.message}`);

    return { question, options: optionsData };
  });

/**
 * Delete a quiz bank question
 */
export const deleteQuizBankQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => deleteQuestionSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Get question
    const { data: question, error: getError } = await supabase
      .from("quiz_bank_questions")
      .select("*")
      .eq("id", data.questionId)
      .single();

    if (getError) throw new Error(`Question not found: ${getError.message}`);
    if (question.created_by !== userId) throw new Error("Access denied");
    if (question.status === "Published") throw new Error("Cannot delete published questions");

    // Delete question (cascade will delete options)
    const { error: dError } = await supabase
      .from("quiz_bank_questions")
      .delete()
      .eq("id", data.questionId);

    if (dError) throw new Error(`Failed to delete question: ${dError.message}`);

    return { ok: true };
  });

/**
 * Publish or unpublish a question
 */
export const publishQuizBankQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => publishQuestionSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Get question
    const { data: question, error: getError } = await supabase
      .from("quiz_bank_questions")
      .select("*")
      .eq("id", data.questionId)
      .single();

    if (getError) throw new Error(`Question not found: ${getError.message}`);
    if (question.created_by !== userId) throw new Error("Access denied");

    // Update status
    const newStatus = data.publish ? "Published" : "Draft";
    const { data: updated, error: uError } = await supabase
      .from("quiz_bank_questions")
      .update({ status: newStatus })
      .eq("id", data.questionId)
      .select()
      .single();

    if (uError) throw new Error(`Failed to update status: ${uError.message}`);

    return { question: updated };
  });

/**
 * Create a quiz assignment with shuffled questions and options
 */
export const createQuizAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => createAssignmentSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify user is a teacher
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error("Unauthorized");

    const userRole = userData.user.user_metadata?.role || userData.user.app_metadata?.role;
    if (userRole !== "teacher") {
      throw new Error("Only teachers can create quiz assignments");
    }

    // Get all questions with their options
    const { data: questions, error: qError } = await supabase
      .from("quiz_bank_questions")
      .select("*, quiz_bank_options(id, option_text, is_correct, position)")
      .in("id", data.questionIds);

    if (qError) throw new Error(`Failed to fetch questions: ${qError.message}`);
    if (!questions || questions.length === 0) throw new Error("No questions found");

    // Prepare question order and option order
    let questionOrder = questions.map(q => q.id);
    let optionOrder: Record<string, number[]> = {};

    if (data.shuffle) {
      // Shuffle question order
      questionOrder = shuffle(questionOrder);

      // Generate shuffled option positions for each question
      questions.forEach(q => {
        const optionIds = (q.quiz_bank_options || []).map((opt: any) => opt.id);
        optionOrder = { ...optionOrder, ...generateShuffledOptions(optionIds) };
      });
    }

    // Create assignment record
    const { data: assignment, error: aError } = await supabase
      .from("quiz_assignments")
      .insert({
        quiz_id: data.quizId,
        created_by: userId,
        source_questions: data.questionIds,
        question_order: questionOrder,
        option_order: optionOrder,
        assignment_name: data.assignmentName,
        notes: data.notes || null,
      })
      .select()
      .single();

    if (aError) throw new Error(`Failed to create assignment: ${aError.message}`);

    return {
      assignment,
      questions,
      questionOrder,
      optionOrder,
    };
  });

/**
 * Get quiz assignment details
 */
export const getQuizAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ assignmentId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: assignment, error: aError } = await supabase
      .from("quiz_assignments")
      .select("*")
      .eq("id", data.assignmentId)
      .single();

    if (aError) {
      if (aError.code === "PGRST116") {
        throw new Error("Assignment not found");
      }
      throw new Error(`Failed to get assignment: ${aError.message}`);
    }

    if (assignment.created_by !== userId) {
      throw new Error("Access denied");
    }

    return { assignment };
  });

/**
 * List quiz assignments for a quiz
 */
export const listQuizAssignments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ quizId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: assignments, error } = await supabase
      .from("quiz_assignments")
      .select("*")
      .eq("quiz_id", data.quizId)
      .eq("created_by", userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to list assignments: ${error.message}`);

    return { assignments: assignments ?? [] };
  });
