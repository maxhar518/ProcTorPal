import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft } from "lucide-react";
import { getAttemptProctoring } from "@/lib/proctoring/proctoring.functions";

export const Route = createFileRoute("/_authenticated/quizzes/$quizId/report/$attemptId")({
  head: () => ({ meta: [{ title: "Attempt details — ProctorAI" }] }),
  component: AttemptDetailPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
});

const SEVERITY_COLOR: Record<string, string> = {
  info: "bg-muted text-muted-foreground",
  warn: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  critical: "bg-destructive/15 text-destructive",
};

const EVENT_LABELS: Record<string, string> = {
  fullscreen_enter: "Entered fullscreen",
  fullscreen_exit: "Exited fullscreen",
  tab_blur: "Tab lost focus",
  tab_focus: "Tab regained focus",
  visibility_hidden: "Tab hidden",
  visibility_visible: "Tab visible",
  restricted_shortcut: "Restricted shortcut used",
  contextmenu_blocked: "Right-click blocked",
  copy_blocked: "Copy blocked",
  cut_blocked: "Cut blocked",
  paste_blocked: "Paste blocked",
  devtools_suspected: "DevTools suspected",
  camera_denied: "Camera denied",
  camera_granted: "Camera granted",
  camera_disconnected: "Camera disconnected",
  face_missing: "Face not detected",
  multiple_faces: "Multiple faces detected",
  phone_detected: "Phone detected",
  face_detector_unavailable: "Face detector unavailable",
  snapshot_uploaded: "Snapshot uploaded",
  consent_given: "Consent given",
  capture_video_not_ready: "Camera not ready",
  snapshot_failed: "Snapshot upload failed",
};

const SEVERITY_BADGE: Record<string, string> = {
  info: "secondary",
  warn: "outline",
  critical: "destructive",
};

function bandVariant(band: string) {
  if (band === "high") return "destructive";
  if (band === "medium") return "default";
  return "secondary";
}

function formatDetail(key: string, value: unknown): string {
  if (key === "kind") return `Type: ${value}`;
  if (key === "path") return "";
  if (key === "label") return `Object: ${value}`;
  if (key === "error") return `Error: ${value}`;
  if (key === "message") return value as string;
  if (key === "mobile") return "Mobile device";
  if (key === "fallback") return `Fallback: ${value}`;
  if (key === "object_detection") return "Object detection model";
  if (typeof value === "boolean") return value ? key.replace(/_/g, " ") : "";
  return `${key.replace(/_/g, " ")}: ${value}`;
}

function AttemptDetailPage() {
  const { quizId, attemptId } = Route.useParams();
  const { session, loading } = useCurrentUser();
  const fetchDetail = useServerFn(getAttemptProctoring);

  const { data, isLoading } = useQuery({
    queryKey: ["proctor-attempt", attemptId, session?.user?.id ?? null],
    queryFn: () => fetchDetail({ data: { attemptId } }),
    enabled: !!session,
  });

  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  const [eventFilter, setEventFilter] = useState<"all" | "info" | "warn" | "critical">("all");

  const filteredEvents = useMemo(() => {
    if (eventFilter === "all") return data?.events ?? [];
    return (data?.events ?? []).filter((e) => e.severity === eventFilter);
  }, [data?.events, eventFilter]);

  const eventCounts = useMemo(() => {
    const events = data?.events ?? [];
    return {
      all: events.length,
      info: events.filter((e) => e.severity === "info").length,
      warn: events.filter((e) => e.severity === "warn").length,
      critical: events.filter((e) => e.severity === "critical").length,
    };
  }, [data?.events]);

  if (loading || isLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!data) return null;
  const { attempt, student, verificationSnapshot, snapshots, events, risk, counts } = data;

  const highlights = [
    { label: "Face not detected", key: "face_missing" },
    { label: "Multiple faces", key: "multiple_faces" },
    { label: "Phone detected", key: "phone_detected" },
    { label: "Fullscreen exits", key: "fullscreen_exit" },
    { label: "Tab/focus loss", key: "tab_blur" },
    { label: "Restricted shortcuts", key: "restricted_shortcut" },
    { label: "Camera issues", key: "camera_disconnected" },
    { label: "DevTools suspected", key: "devtools_suspected" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader role="teacher" />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Button asChild variant="ghost" size="sm" className="mb-3">
          <Link to="/quizzes/$quizId/report" params={{ quizId }}><ArrowLeft className="mr-1 h-4 w-4" />Back to report</Link>
        </Button>

        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{student?.full_name || student?.email || "Student"}</h1>
            <p className="text-sm text-muted-foreground">
              Started {new Date(attempt.started_at).toLocaleString()}
              {attempt.submitted_at && <> · Submitted {new Date(attempt.submitted_at).toLocaleString()}</>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Score</div>
              <div className="font-medium">{attempt.score != null && attempt.max_score != null ? `${attempt.score}/${attempt.max_score}` : "—"}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Risk</div>
              <Badge variant={bandVariant(risk.risk_band) as any}>{risk.risk_band} · {risk.risk_score}</Badge>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
          {highlights.map((h) => {
            const count = counts[h.key] ?? 0;
            const hasViolation = count > 0;
            return (
              <Card key={h.key} className={hasViolation ? "border-destructive/50 bg-destructive/5" : ""}>
                <CardHeader className="pb-1"><CardDescription className="text-xs">{h.label}</CardDescription></CardHeader>
                <CardContent><div className={`text-2xl font-semibold ${hasViolation ? "text-destructive" : ""}`}>{count}</div></CardContent>
              </Card>
            );
          })}
        </div>

        {verificationSnapshot && (
          <Card className="mb-6 border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30">
            <CardHeader>
              <CardTitle className="text-sm text-blue-700 dark:text-blue-300">Attendance Verification</CardTitle>
              <CardDescription>First snapshot captured at quiz start</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                <div className="flex-shrink-0">
                  {verificationSnapshot.signed_url ? (
                    <img src={verificationSnapshot.signed_url} alt="verification snapshot" className="h-32 w-40 rounded-md border border-border object-cover shadow-sm" />
                  ) : (
                    <div className="h-32 w-40 rounded-md border border-border bg-muted" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Captured at</p>
                    <p className="text-sm">{new Date(verificationSnapshot.captured_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Face status</p>
                    <p className="text-sm">
                      {verificationSnapshot.face_status === "ok" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                          Verified
                        </span>
                      )}
                      {verificationSnapshot.face_status === "missing" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                          Face not detected
                        </span>
                      )}
                      {verificationSnapshot.face_status === "multiple" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
                          Multiple faces
                        </span>
                      )}
                      {verificationSnapshot.face_status === "unknown" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-900/30 dark:text-gray-300">
                          Unknown
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Activity snapshots</CardTitle>
              <CardDescription>{snapshots.length} periodic captures · click any image to enlarge</CardDescription>
            </CardHeader>
            <CardContent>
              {snapshots.length === 0 ? (
                <p className="text-sm text-muted-foreground">No snapshots captured.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {snapshots.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => s.signed_url && setZoomUrl(s.signed_url)}
                      className="group relative overflow-hidden rounded-md border border-border bg-muted text-left"
                    >
                      {s.signed_url ? (
                        <img src={s.signed_url} alt="snapshot" className="aspect-[4/3] w-full object-cover" />
                      ) : (
                        <div className="aspect-[4/3] w-full" />
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-1 text-[10px] text-white">
                        <div>{new Date(s.captured_at).toLocaleTimeString()}</div>
                        <div className="flex items-center justify-between">
                          <span>{s.kind}</span>
                          {s.face_status && s.face_status !== "ok" && (
                            <span className="rounded bg-destructive px-1">{s.face_status}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Event timeline</CardTitle>
                  <CardDescription>{eventCounts.all} events</CardDescription>
                </div>
                <Select value={eventFilter} onValueChange={(v) => setEventFilter(v as any)}>
                  <SelectTrigger className="h-8 w-40 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All ({eventCounts.all})</SelectItem>
                    <SelectItem value="critical">Critical ({eventCounts.critical})</SelectItem>
                    <SelectItem value="warn">Warnings ({eventCounts.warn})</SelectItem>
                    <SelectItem value="info">Info ({eventCounts.info})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events recorded.</p>
              ) : (
                <ol className="max-h-[600px] space-y-1 overflow-auto pr-2 text-xs">
                  {filteredEvents.map((e) => {
                    const detailParts = (e.details && typeof e.details === "object")
                      ? Object.entries(e.details)
                          .map(([k, v]) => formatDetail(k, v))
                          .filter(Boolean)
                      : [];
                    return (
                      <li key={e.id} className={`flex items-start gap-2 rounded px-2 py-1 ${SEVERITY_COLOR[e.severity] ?? ""}`}>
                        <span className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                          {new Date(e.occurred_at).toLocaleTimeString()}
                        </span>
                        <div className="flex-1">
                          <span className="font-medium">{EVENT_LABELS[e.event_type] ?? e.event_type}</span>
                          {detailParts.length > 0 && (
                            <span className="ml-1 text-muted-foreground">— {detailParts.join(", ")}</span>
                          )}
                        </div>
                        <Badge variant={(SEVERITY_BADGE[e.severity] as any) ?? "secondary"} className="text-[10px]">
                          {e.severity}
                        </Badge>
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={!!zoomUrl} onOpenChange={(o) => !o && setZoomUrl(null)}>
        <DialogContent className="max-w-3xl p-2">
          {zoomUrl && <img src={zoomUrl} alt="snapshot" className="w-full rounded" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
