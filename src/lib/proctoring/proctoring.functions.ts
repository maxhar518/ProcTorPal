import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EventTypeSchema = z.enum([
  "fullscreen_enter",
  "fullscreen_exit",
  "tab_blur",
  "tab_focus",
  "visibility_hidden",
  "visibility_visible",
  "restricted_shortcut",
  "contextmenu_blocked",
  "copy_blocked",
  "cut_blocked",
  "paste_blocked",
  "devtools_suspected",
  "camera_denied",
  "camera_granted",
  "camera_disconnected",
  "face_missing",
  "multiple_faces",
  "phone_detected",
  "face_detector_unavailable",
  "snapshot_uploaded",
  "consent_given",
]);

export const recordConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ attemptId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("quiz_attempts")
      .update({ consent_given_at: new Date().toISOString() })
      .eq("id", data.attemptId)
      .eq("student_id", userId);
    if (error) throw new Error(error.message);
    await supabase.from("proctoring_events").insert({
      attempt_id: data.attemptId,
      event_type: "consent_given",
      severity: "info",
      details: {},
    });
    return { ok: true };
  });

export const logEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      attemptId: z.string().uuid(),
      events: z
        .array(
          z.object({
            event_type: EventTypeSchema,
            severity: z.enum(["info", "warn", "critical"]).default("info"),
            details: z.record(z.string(), z.any()).default({}),
            occurred_at: z.string().datetime().optional(),
          })
        )
        .min(1)
        .max(200),
    }).parse(i)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Ensure attempt belongs to user (defense in depth; RLS also enforces)
    const { data: a, error: aErr } = await supabase
      .from("quiz_attempts").select("id").eq("id", data.attemptId).eq("student_id", userId).maybeSingle();
    if (aErr) throw new Error(aErr.message);
    if (!a) throw new Error("Attempt not found");

    const rows = data.events.map((e) => ({
      attempt_id: data.attemptId,
      event_type: e.event_type,
      severity: e.severity,
      details: e.details,
      occurred_at: e.occurred_at ?? new Date().toISOString(),
    }));
    const { error } = await supabase.from("proctoring_events").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true, inserted: rows.length };
  });

export const uploadSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      attemptId: z.string().uuid(),
      kind: z.enum(["verification", "periodic"]),
      faceStatus: z.enum(["ok", "missing", "multiple", "unknown"]).optional(),
      // base64-encoded JPEG, no data URL prefix
      imageBase64: z.string().min(100).max(2_000_000),
    }).parse(i)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: a, error: aErr } = await supabase
      .from("quiz_attempts").select("id").eq("id", data.attemptId).eq("student_id", userId).maybeSingle();
    if (aErr) throw new Error(aErr.message);
    if (!a) throw new Error("Attempt not found");

    const bytes = Uint8Array.from(atob(data.imageBase64), (c) => c.charCodeAt(0));
    const ts = new Date();
    const fname = `${data.kind}-${ts.getTime()}.jpg`;
    const path = `${data.attemptId}/${fname}`;

    const { error: upErr } = await supabase.storage
      .from("proctoring")
      .upload(path, bytes, { contentType: "image/jpeg", upsert: false });
    if (upErr) throw new Error(upErr.message);

    const { data: snap, error: insErr } = await supabase
      .from("proctoring_snapshots")
      .insert({
        attempt_id: data.attemptId,
        storage_path: path,
        kind: data.kind,
        face_status: data.faceStatus ?? null,
        captured_at: ts.toISOString(),
      })
      .select()
      .single();
    if (insErr) throw new Error(insErr.message);

    if (data.kind === "verification") {
      await supabase
        .from("quiz_attempts")
        .update({ verification_snapshot_path: path })
        .eq("id", data.attemptId);
    }

    const extraEvents: { event_type: string; severity: string; details: any }[] = [
      { event_type: "snapshot_uploaded", severity: "info", details: { kind: data.kind, path } },
    ];
    if (data.faceStatus === "missing") extraEvents.push({ event_type: "face_missing", severity: "warn", details: { path } });
    if (data.faceStatus === "multiple") extraEvents.push({ event_type: "multiple_faces", severity: "critical", details: { path } });
    await supabase.from("proctoring_events").insert(
      extraEvents.map((e) => ({ attempt_id: data.attemptId, ...e, occurred_at: ts.toISOString() }))
    );

    return { ok: true, snapshotId: snap.id, path };
  });

// Teacher report functions

export const listAllQuizReportsSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: quizzes, error: qErr } = await supabase
      .from("quizzes")
      .select("id, title, status, created_at")
      .eq("teacher_id", userId)
      .order("created_at", { ascending: false });
    if (qErr) throw new Error(qErr.message);

    const quizIds = (quizzes ?? []).map((q) => q.id);
    if (quizIds.length === 0) return { quizzes: [] };

    const results = await Promise.all(
      quizIds.map(async (quizId) => {
        const { data: attempts } = await supabase
          .from("quiz_attempts")
          .select("id, status, score, max_score")
          .eq("quiz_id", quizId);
        const totalAttempts = (attempts ?? []).length;
        const completedAttempts = (attempts ?? []).filter((a) => a.status === "completed").length;
        const avgScore = completedAttempts > 0
          ? (attempts ?? []).reduce((sum, a) => sum + (a.score ?? 0), 0) / completedAttempts
          : 0;
        const avgMaxScore = completedAttempts > 0
          ? (attempts ?? []).reduce((sum, a) => sum + (a.max_score ?? 0), 0) / completedAttempts
          : 0;

        const attemptIds = (attempts ?? []).map((a) => a.id);
        let highRisk = 0;
        let mediumRisk = 0;
        let totalCritical = 0;

        if (attemptIds.length > 0) {
          const { data: critEvents } = await supabase
            .from("proctoring_events")
            .select("attempt_id")
            .in("attempt_id", attemptIds)
            .eq("severity", "critical");
          totalCritical = (critEvents ?? []).length;

          const riskResults = await Promise.all(
            attemptIds.map(async (id) => {
              const { data: risk } = await supabase.rpc("attempt_risk_score", { _attempt_id: id });
              const r = Array.isArray(risk) && risk[0] ? risk[0] : { risk_band: "low" };
              return r.risk_band;
            })
          );
          highRisk = riskResults.filter((b) => b === "high").length;
          mediumRisk = riskResults.filter((b) => b === "medium").length;
        }

        return {
          quizId,
          totalAttempts,
          completedAttempts,
          avgScore: Math.round(avgScore * 10) / 10,
          avgMaxScore: Math.round(avgMaxScore * 10) / 10,
          highRisk,
          mediumRisk,
          totalCritical,
        };
      })
    );

    const summaryMap = new Map(results.map((r) => [r.quizId, r]));
    const quizzesWithStats = (quizzes ?? []).map((q) => ({
      ...q,
      stats: summaryMap.get(q.id) ?? {
        totalAttempts: 0,
        completedAttempts: 0,
        avgScore: 0,
        avgMaxScore: 0,
        highRisk: 0,
        mediumRisk: 0,
        totalCritical: 0,
      },
    }));

    return { quizzes: quizzesWithStats };
  });

export const listQuizAttemptsWithRisk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ quizId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Confirm teacher owns the quiz
    const { data: quiz, error: qErr } = await supabase
      .from("quizzes").select("id, title, teacher_id").eq("id", data.quizId).maybeSingle();
    if (qErr) throw new Error(qErr.message);
    if (!quiz || quiz.teacher_id !== userId) throw new Error("Not authorized");

    const { data: attempts, error } = await supabase
      .from("quiz_attempts")
      .select("id, student_id, status, score, max_score, started_at, submitted_at, consent_given_at")
      .eq("quiz_id", data.quizId)
      .order("started_at", { ascending: false });
    if (error) throw new Error(error.message);

    const studentIds = [...new Set((attempts ?? []).map((a) => a.student_id))];
    const profMap = new Map<string, { full_name: string | null; email: string | null; student_id: string | null }>();
    if (studentIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles").select("id, full_name, email, student_id").in("id", studentIds);
      (profs ?? []).forEach((p) => profMap.set(p.id, { full_name: p.full_name, email: p.email, student_id: p.student_id }));
    }

    const attemptIds = (attempts ?? []).map((a) => a.id);

    // Batch-fetch critical event counts in a single query instead of N queries
    const critCountMap = new Map<string, number>();
    if (attemptIds.length > 0) {
      const { data: critEvents } = await supabase
        .from("proctoring_events")
        .select("attempt_id")
        .in("attempt_id", attemptIds)
        .eq("severity", "critical");
      (critEvents ?? []).forEach((e) => {
        critCountMap.set(e.attempt_id, (critCountMap.get(e.attempt_id) ?? 0) + 1);
      });
    }

    // Risk scores still need individual RPC calls (Supabase RPC doesn't support batch),
    // but run them all in parallel
    const riskResults = await Promise.all(
      attemptIds.map(async (id) => {
        const { data: risk } = await supabase.rpc("attempt_risk_score", { _attempt_id: id });
        const r = Array.isArray(risk) && risk[0] ? risk[0] : { risk_score: 0, risk_band: "low" };
        return { id, risk_score: r.risk_score, risk_band: r.risk_band };
      })
    );
    const riskMap = new Map(riskResults.map((r) => [r.id, r]));

    const rows = (attempts ?? []).map((a) => {
      const r = riskMap.get(a.id) ?? { risk_score: 0, risk_band: "low" };
      const prof = profMap.get(a.student_id) ?? { full_name: null, email: null };
      return {
        attempt_id: a.id,
        student_id: a.student_id,
        full_name: prof.full_name,
        email: prof.email,
        status: a.status,
        score: a.score,
        max_score: a.max_score,
        started_at: a.started_at,
        submitted_at: a.submitted_at,
        consent_given_at: a.consent_given_at,
        risk_score: r.risk_score,
        risk_band: r.risk_band,
        critical_events: critCountMap.get(a.id) ?? 0,
      };
    });
    return { quiz: { id: quiz.id, title: quiz.title }, rows };
  });

export const getAttemptProctoring = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ attemptId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: a, error: aErr } = await supabase
      .from("quiz_attempts")
      .select("id, quiz_id, student_id, status, score, max_score, started_at, submitted_at, consent_given_at, verification_snapshot_path")
      .eq("id", data.attemptId).maybeSingle();
    if (aErr) throw new Error(aErr.message);
    if (!a) throw new Error("Attempt not found");

    // Authorize: must be owning teacher OR the student themselves
    const { data: quiz } = await supabase
      .from("quizzes").select("id, title, teacher_id").eq("id", a.quiz_id).maybeSingle();
    const isTeacher = quiz?.teacher_id === userId;
    const isStudent = a.student_id === userId;
    if (!isTeacher && !isStudent) throw new Error("Not authorized");

    const { data: prof } = await supabase
      .from("profiles").select("id, full_name, email, student_id").eq("id", a.student_id).maybeSingle();

    const { data: snaps } = await supabase
      .from("proctoring_snapshots")
      .select("id, storage_path, captured_at, kind, face_status")
      .eq("attempt_id", data.attemptId)
      .order("captured_at", { ascending: true });

    // Signed URLs (1 hour)
    const snapshots = await Promise.all(
      (snaps ?? []).map(async (s) => {
        const { data: signed } = await supabase.storage
          .from("proctoring")
          .createSignedUrl(s.storage_path, 60 * 60);
        return { ...s, signed_url: signed?.signedUrl ?? null };
      })
    );

    // Extract verification snapshot as first-class property
    const verificationSnapshot = snapshots.find((s) => s.kind === "verification") ?? null;

    const { data: events } = await supabase
      .from("proctoring_events")
      .select("id, event_type, severity, details, occurred_at")
      .eq("attempt_id", data.attemptId)
      .order("occurred_at", { ascending: true });

    const { data: risk } = await supabase.rpc("attempt_risk_score", { _attempt_id: data.attemptId });
    const r = Array.isArray(risk) && risk[0] ? risk[0] : { risk_score: 0, risk_band: "low" };

    // Summary counts
    const counts: Record<string, number> = {};
    (events ?? []).forEach((e) => { counts[e.event_type] = (counts[e.event_type] ?? 0) + 1; });

    const snapshotCounts = { face_missing: 0, multiple_faces: 0 };
    (snaps ?? []).forEach((s) => {
      if (s.face_status === "missing") snapshotCounts.face_missing += 1;
      if (s.face_status === "multiple") snapshotCounts.multiple_faces += 1;
    });
    counts.face_missing = Math.max(counts.face_missing ?? 0, snapshotCounts.face_missing);
    counts.multiple_faces = Math.max(counts.multiple_faces ?? 0, snapshotCounts.multiple_faces);

    return {
      attempt: a,
      quiz: quiz ? { id: quiz.id, title: quiz.title } : null,
      student: prof,
      verificationSnapshot,
      snapshots,
      events: events ?? [],
      risk: r,
      counts,
    };
  });

export const getTeacherReportOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(() => ({}))
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: quizzes, error: qErr } = await supabase
      .from("quizzes")
      .select("id, title, status, created_at")
      .eq("teacher_id", userId)
      .order("created_at", { ascending: false });
    if (qErr) throw new Error(qErr.message);

    const quizIds = (quizzes ?? []).map((q) => q.id);
    if (quizIds.length === 0) return { quizzes: [] };

    const { data: attempts } = await supabase
      .from("quiz_attempts")
      .select("id, quiz_id, status, started_at, submitted_at")
      .in("quiz_id", quizIds);

    const attemptMap = new Map<string, typeof attempts>();
    (attempts ?? []).forEach((a) => {
      const list = attemptMap.get(a.quiz_id) ?? [];
      list.push(a);
      attemptMap.set(a.quiz_id, list);
    });

    const allAttemptIds = (attempts ?? []).map((a) => a.id);
    let critEvents: { attempt_id: string }[] = [];
    if (allAttemptIds.length > 0) {
      const { data } = await supabase
        .from("proctoring_events")
        .select("attempt_id")
        .in("attempt_id", allAttemptIds)
        .eq("severity", "critical");
      critEvents = data ?? [];
    }
    const critMap = new Map<string, number>();
    critEvents.forEach((e) => {
      critMap.set(e.attempt_id, (critMap.get(e.attempt_id) ?? 0) + 1);
    });

    const riskResults = await Promise.all(
      allAttemptIds.map(async (id) => {
        const { data: risk } = await supabase.rpc("attempt_risk_score", { _attempt_id: id });
        const r = Array.isArray(risk) && risk[0] ? risk[0] : { risk_score: 0, risk_band: "low" };
        return { id, risk_score: r.risk_score, risk_band: r.risk_band };
      })
    );
    const riskMap = new Map(riskResults.map((r) => [r.id, r]));

    const result = (quizzes ?? []).map((q) => {
      const qAttempts = attemptMap.get(q.id) ?? [];
      const totalAttempts = qAttempts.length;
      const completedAttempts = qAttempts.filter((a) => a.status === "completed").length;
      let highRiskCount = 0;
      let totalCritical = 0;
      qAttempts.forEach((a) => {
        const r = riskMap.get(a.id);
        if (r?.risk_band === "high") highRiskCount++;
        totalCritical += critMap.get(a.id) ?? 0;
      });
      const latestAttempt = qAttempts.length > 0
        ? qAttempts.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0]
        : null;

      return {
        quiz_id: q.id,
        title: q.title,
        status: q.status,
        created_at: q.created_at,
        total_attempts: totalAttempts,
        completed_attempts: completedAttempts,
        high_risk_count: highRiskCount,
        total_critical: totalCritical,
        latest_attempt_at: latestAttempt?.started_at ?? null,
      };
    });

    return { quizzes: result };
  });
