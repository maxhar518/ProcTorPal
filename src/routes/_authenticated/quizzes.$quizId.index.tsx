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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  RefreshCw,
  Copy,
  Pencil,
  ShieldAlert,
  Clock3,
  ListChecks,
  Users,
  QrCode,
} from "lucide-react";
import { toast } from "sonner";
import {
  getQuiz,
  setQuizStatus,
  releaseResults,
  regenerateAccessCode,
  setCodeEnabled,
  listEnrolledStudents,
} from "@/lib/quizzes/quiz.functions";

export const Route = createFileRoute("/_authenticated/quizzes/$quizId/")({
  head: () => ({ meta: [{ title: "Quiz — ProctorPal" }] }),
  component: QuizDetailPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">{error.message}</div>
  ),
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
  const statusM = useMutation({
    mutationFn: (s: "draft" | "published") => status({ data: { quizId, status: s } }),
    onSuccess: invalidate,
  });
  const releaseM = useMutation({
    mutationFn: (released: boolean) => release({ data: { quizId, released } }),
    onSuccess: invalidate,
  });
  const regenM = useMutation({
    mutationFn: () => regen({ data: { quizId } }),
    onSuccess: () => {
      toast.success("New code generated");
      invalidate();
    },
  });
  const codeM = useMutation({
    mutationFn: (enabled: boolean) => toggleCode({ data: { quizId, enabled } }),
    onSuccess: invalidate,
  });

  if (loading || isLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!data) return null;
  const q = data.quiz;
  const joinUrl =
    typeof window !== "undefined" ? `${window.location.origin}/join?code=${q.access_code}` : "";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader role="teacher" />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{q.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {q.description || "No description"}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={q.status} />
              {q.results_released && <Badge variant="outline_info">Results released</Badge>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/quizzes/$quizId/edit" params={{ quizId }}>
                <Pencil className="mr-1 h-4 w-4" />
                Edit
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/quizzes/$quizId/report" params={{ quizId }}>
                <ShieldAlert className="mr-1 h-4 w-4" />
                Proctoring report
              </Link>
            </Button>
            <Button
              onClick={() => statusM.mutate(q.status === "published" ? "draft" : "published")}
            >
              {q.status === "published" ? "Unpublish" : "Publish"}
            </Button>
            <Button variant="outline" onClick={() => releaseM.mutate(!q.results_released)}>
              {q.results_released ? "Hide results" : "Release results"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="questions">Questions ({data.questions.length})</TabsTrigger>
            <TabsTrigger value="students">Enrolled students</TabsTrigger>
            <TabsTrigger value="code">Access code</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <StatTile
                icon={<Clock3 className="h-4 w-4 text-primary" />}
                label="Time limit"
                value={q.time_limit_minutes != null ? `${q.time_limit_minutes} min` : "—"}
              />
              <StatTile
                icon={<ListChecks className="h-4 w-4 text-info" />}
                label="Passing score"
                value={q.passing_score != null ? String(q.passing_score) : "—"}
              />
              <StatTile
                icon={<Users className="h-4 w-4 text-success" />}
                label="Questions"
                value={String(data.questions.length)}
              />
            </div>
          </TabsContent>

          <TabsContent value="questions" className="mt-4 space-y-3">
            {data.questions.length === 0 && (
              <p className="text-sm text-muted-foreground">No questions yet.</p>
            )}
            {data.questions.map((qq, i) => (
              <Card key={qq.id} className="transition-colors hover:border-primary/40">
                <CardHeader>
                  <CardTitle className="text-sm">
                    Q{i + 1}. {qq.prompt}
                  </CardTitle>
                  <CardDescription>
                    <Badge variant="secondary">{qq.type === "multi" ? "Multiple" : "Single"}</Badge>
                    <span className="ml-2">{qq.points} pt</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    {data.options
                      .filter((o) => o.question_id === qq.id)
                      .map((o) => (
                        <li key={o.id} className={o.is_correct ? "font-medium text-success" : ""}>
                          {o.is_correct ? "✓ " : "• "}
                          {o.label}
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
                <CardDescription>
                  Share this code or QR with students so they can enroll.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    value={q.access_code}
                    readOnly
                    className="w-auto flex-1 font-mono text-lg tracking-wider"
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(q.access_code);
                      toast.success("Copied");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={() => regenM.mutate()}>
                    <RefreshCw className="mr-1 h-4 w-4" />
                    Regenerate
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={q.code_enabled} onCheckedChange={(v) => codeM.mutate(v)} />
                  <span className="text-sm">Code enabled (students can join)</span>
                </div>
                {joinUrl && (
                  <div className="flex flex-col items-start gap-3">
                    <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
                      <QRCodeCanvas value={joinUrl} size={180} />
                    </div>
                    <div className="w-full break-all rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                      {joinUrl}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(joinUrl);
                        toast.success("Link copied");
                      }}
                    >
                      <QrCode className="mr-1 h-4 w-4" /> Copy link
                    </Button>
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

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
          {icon}
        </span>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="truncate text-lg font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: "draft" | "published" }) {
  if (status === "published") {
    return <Badge variant="outline_success">Published</Badge>;
  }
  return <Badge variant="secondary">Draft</Badge>;
}

function EnrolledStudents({ quizId }: { quizId: string }) {
  const fetchList = useServerFn(listEnrolledStudents);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "not_started" | "in_progress" | "completed"
  >("all");
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
          <Input
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            className="max-w-xs"
          />
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setPage(1);
              setStatusFilter(v as any);
            }}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
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
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
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
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No enrolled students.
                    </TableCell>
                  </TableRow>
                ) : (
                  data!.rows.map((r) => (
                    <TableRow key={r.student_id}>
                      <TableCell className="font-medium">{r.full_name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{r.email}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(r.enrolled_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <StatusBadge2 status={r.status} />
                      </TableCell>
                      <TableCell>
                        {r.status === "completed" && r.max_score
                          ? `${r.score}/${r.max_score}`
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{data?.total ?? 0} total</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Prev
                </Button>
                <span className="self-center">Page {page}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!data || page * pageSize >= data.total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge2({ status }: { status: "not_started" | "in_progress" | "completed" }) {
  if (status === "completed") return <Badge variant="outline_success">Completed</Badge>;
  if (status === "in_progress") return <Badge variant="outline_warning">In progress</Badge>;
  return <Badge variant="secondary">Not started</Badge>;
}
