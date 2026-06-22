import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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

function bandVariant(band: string) {
  if (band === "high") return "destructive";
  if (band === "medium") return "default";
  return "secondary";
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

  if (loading || isLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!data) return null;
  const { attempt, student, snapshots, events, risk, counts } = data;

  const highlights = [
    { label: "Face not detected", key: "face_missing" },
    { label: "Multiple faces", key: "multiple_faces" },
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

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {highlights.map((h) => (
            <Card key={h.key}>
              <CardHeader className="pb-1"><CardDescription className="text-xs">{h.label}</CardDescription></CardHeader>
              <CardContent><div className="text-2xl font-semibold">{counts[h.key] ?? 0}</div></CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Snapshots</CardTitle>
              <CardDescription>{snapshots.length} captures · click any image to enlarge</CardDescription>
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
              <CardTitle>Event timeline</CardTitle>
              <CardDescription>{events.length} events</CardDescription>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events recorded.</p>
              ) : (
                <ol className="max-h-[600px] space-y-1 overflow-auto pr-2 text-xs">
                  {events.map((e) => (
                    <li key={e.id} className={`flex items-start gap-2 rounded px-2 py-1 ${SEVERITY_COLOR[e.severity] ?? ""}`}>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {new Date(e.occurred_at).toLocaleTimeString()}
                      </span>
                      <span className="font-medium">{e.event_type}</span>
                      {e.details && Object.keys(e.details).length > 0 && (
                        <span className="text-muted-foreground">{JSON.stringify(e.details)}</span>
                      )}
                    </li>
                  ))}
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
