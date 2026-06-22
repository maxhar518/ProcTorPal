import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, Copy, Pencil, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
  getQuiz, setQuizStatus, releaseResults, regenerateAccessCode, setCodeEnabled,
  listEnrolledStudents,
} from "@/lib/quizzes/quiz.functions";

export const Route = createFileRoute("/_authenticated/quizzes/$quizId/")({
  head: () => ({ meta: [{ title: "Quiz — ProctorAI" }] }),
  component: QuizDetailPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
});

function QuizDetailPage() {
  const { quizId } = Route.useParams();
  const { session, loading } = useCurrentUser();
  const qc = useQueryClient();

  const fetchQuiz = useServerFn(getQuiz);
  const status = useServerFn(setQuizStatus);
  const release = useServerFn(releaseResults);
  const regen = useServerFn(regenerateAccessCode);
  const toggleCode = useServerFn(setCodeEnabled);

  const { data, isLoading } = useQuery({
    queryKey: ["quiz", quizId, session?.user?.id ?? null],
    queryFn: () => fetchQuiz({ data: { quizId } }),
    enabled: !!session,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["quiz", quizId] });
  const statusM = useMutation({ mutationFn: (s: "draft" | "published") => status({ data: { quizId, status: s } }), onSuccess: invalidate });
  const releaseM = useMutation({ mutationFn: (released: boolean) => release({ data: { quizId, released } }), onSuccess: invalidate });
  const regenM = useMutation({ mutationFn: () => regen({ data: { quizId } }), onSuccess: () => { toast.success("New code generated"); invalidate(); } });
  const codeM = useMutation({ mutationFn: (enabled: boolean) => toggleCode({ data: { quizId, enabled } }), onSuccess: invalidate });

  if (loading || isLoading || !session) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!data) return null;
  const q = data.quiz;
  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/join?code=${q.access_code}` : "";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader role="teacher" />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{q.title}</h1>
            <p className="text-sm text-muted-foreground">{q.description || "No description"}</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant={q.status === "published" ? "default" : "secondary"}>{q.status}</Badge>
              {q.results_released && <Badge variant="outline">Results released</Badge>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link to="/quizzes/$quizId/edit" params={{ quizId }}><Pencil className="mr-1 h-4 w-4" />Edit</Link></Button>
            <Button asChild variant="outline"><Link to="/quizzes/$quizId/report" params={{ quizId }}><ShieldAlert className="mr-1 h-4 w-4" />Proctoring report</Link></Button>
            <Button onClick={() => statusM.mutate(q.status === "published" ? "draft" : "published")}>
              {q.status === "published" ? "Unpublish" : "Publish"}
            </Button>
            <Button variant="outline" onClick={() => releaseM.mutate(!q.results_released)}>
              {q.results_released ? "Hide results" : "Release results"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="questions">Questions ({data.questions.length})</TabsTrigger>
            <TabsTrigger value="students">Enrolled students</TabsTrigger>
            <TabsTrigger value="code">Access code</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
              <CardContent className="grid gap-2 text-sm">
                <div><span className="text-muted-foreground">Time limit: </span>{q.time_limit_minutes ?? "—"} min</div>
                <div><span className="text-muted-foreground">Passing score: </span>{q.passing_score ?? "—"}</div>
                <div><span className="text-muted-foreground">Questions: </span>{data.questions.length}</div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="questions" className="mt-4 space-y-3">
            {data.questions.length === 0 && <p className="text-sm text-muted-foreground">No questions yet.</p>}
            {data.questions.map((qq, i) => (
              <Card key={qq.id}>
                <CardHeader>
                  <CardTitle className="text-sm">Q{i + 1}. {qq.prompt}</CardTitle>
                  <CardDescription>{qq.type === "multi" ? "Multiple" : "Single"} • {qq.points} pt</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    {data.options.filter((o) => o.question_id === qq.id).map((o) => (
                      <li key={o.id} className={o.is_correct ? "font-medium text-primary" : ""}>
                        {o.is_correct ? "✓ " : "• "}{o.label}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="students" className="mt-4">
            <EnrolledStudents quizId={quizId} />
          </TabsContent>

          <TabsContent value="code" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Access code</CardTitle>
                <CardDescription>Share this code or QR with students so they can enroll.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input value={q.access_code} readOnly className="font-mono text-lg" />
                  <Button variant="outline" onClick={() => { navigator.clipboard.writeText(q.access_code); toast.success("Copied"); }}><Copy className="h-4 w-4" /></Button>
                  <Button variant="outline" onClick={() => regenM.mutate()}><RefreshCw className="mr-1 h-4 w-4" />Regenerate</Button>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={q.code_enabled} onCheckedChange={(v) => codeM.mutate(v)} />
                  <span className="text-sm">Code enabled (students can join)</span>
                </div>
                {joinUrl && (
                  <div className="flex flex-col items-start gap-2">
                    <div className="rounded-md border bg-white p-3">
                      <QRCodeCanvas value={joinUrl} size={180} />
                    </div>
                    <div className="text-xs text-muted-foreground break-all">{joinUrl}</div>
                    <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(joinUrl); toast.success("Link copied"); }}>Copy link</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function EnrolledStudents({ quizId }: { quizId: string }) {
  const fetchList = useServerFn(listEnrolledStudents);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "not_started" | "in_progress" | "completed">("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["enrolled", quizId, search, statusFilter, page],
    queryFn: () => fetchList({ data: { quizId, search, statusFilter, page, pageSize } }),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Search by name or email" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} className="max-w-xs" />
          <Select value={statusFilter} onValueChange={(v) => { setPage(1); setStatusFilter(v as any); }}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="not_started">Not started</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Enrolled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.rows ?? []).length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No enrolled students.</TableCell></TableRow>
                ) : data!.rows.map((r) => (
                  <TableRow key={r.student_id}>
                    <TableCell>{r.full_name || "—"}</TableCell>
                    <TableCell>{r.email}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(r.enrolled_at).toLocaleString()}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell>{r.status === "completed" && r.max_score ? `${r.score}/${r.max_score}` : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{data?.total ?? 0} total</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
                <span>Page {page}</span>
                <Button variant="outline" size="sm" disabled={!data || page * pageSize >= data.total} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: "not_started" | "in_progress" | "completed" }) {
  const map = {
    not_started: { label: "Not started", variant: "secondary" as const },
    in_progress: { label: "In progress", variant: "outline" as const },
    completed: { label: "Completed", variant: "default" as const },
  };
  const m = map[status];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
