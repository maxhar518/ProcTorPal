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
    const profMap = new Map<string, { full_name: string | null; email: string | null }>();
    if (studentIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles").select("id, full_name, email").in("id", studentIds);
      (profs ?? []).forEach((p) => profMap.set(p.id, { full_name: p.full_name, email: p.email }));
    }

    const rows = await Promise.all(
      (attempts ?? []).map(async (a) => {
        const { data: risk } = await supabase.rpc("attempt_risk_score", { _attempt_id: a.id });
        const r = Array.isArray(risk) && risk[0] ? risk[0] : { risk_score: 0, risk_band: "low" };
        const { count: critCount } = await supabase
          .from("proctoring_events")
          .select("*", { count: "exact", head: true })
          .eq("attempt_id", a.id)
          .eq("severity", "critical");
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
          critical_events: critCount ?? 0,
        };
      })
    );
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
      .from("profiles").select("id, full_name, email").eq("id", a.student_id).maybeSingle();

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

    return {
      attempt: a,
      quiz: quiz ? { id: quiz.id, title: quiz.title } : null,
      student: prof,
      snapshots,
      events: events ?? [],
      risk: r,
      counts,
    };
  });
