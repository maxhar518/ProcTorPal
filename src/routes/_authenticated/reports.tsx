import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, ShieldAlert, Eye, Users, AlertTriangle, BarChart3, Search } from "lucide-react";
import { getTeacherReportOverview } from "@/lib/proctoring/proctoring.functions";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — ProctorPal" }] }),
  component: ReportsPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">{error.message}</div>
  ),
});

function ReportsPage() {
  const { session, loading } = useCurrentUser();
  const fetchOverview = useServerFn(getTeacherReportOverview);

  const { data, isLoading } = useQuery({
    queryKey: ["teacher-report-overview", session?.user?.id ?? null],
    queryFn: () => fetchOverview({ data: {} }),
    enabled: !!session,
  });

  const [search, setSearch] = useState("");

  const quizzes = useMemo(() => {
    const all = data?.quizzes ?? [];
    if (!search.trim()) return all;
    const q = search.trim().toLowerCase();
    return all.filter((quiz) => quiz.title.toLowerCase().includes(q));
  }, [data, search]);

  const stats = useMemo(() => {
    const all = data?.quizzes ?? [];
    return {
      totalQuizzes: all.length,
      totalAttempts: all.reduce((sum, q) => sum + q.total_attempts, 0),
      highRiskQuizzes: all.filter((q) => q.high_risk_count > 0).length,
      totalCritical: all.reduce((sum, q) => sum + q.total_critical, 0),
    };
  }, [data]);

  if (loading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader role="teacher" />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Proctoring reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of all quizzes and their proctoring activity.
          </p>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<BarChart3 className="h-4 w-4 text-primary" />}
            label="Total quizzes"
            value={stats.totalQuizzes}
            tone="primary"
          />
          <StatCard
            icon={<Users className="h-4 w-4 text-info" />}
            label="Total attempts"
            value={stats.totalAttempts}
            tone="info"
          />
          <StatCard
            icon={<ShieldAlert className="h-4 w-4 text-destructive" />}
            label="Quizzes with high risk"
            value={stats.highRiskQuizzes}
            tone="danger"
          />
          <StatCard
            icon={<AlertTriangle className="h-4 w-4 text-warning" />}
            label="Total critical events"
            value={stats.totalCritical}
            tone="warning"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quizzes</CardTitle>
            <CardDescription>
              {quizzes.length} of {data.quizzes.length} shown
            </CardDescription>
            <div className="relative mt-2 max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search quiz title"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quiz</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>High risk</TableHead>
                  <TableHead>Critical events</TableHead>
                  <TableHead>Latest activity</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quizzes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No quizzes found.
                    </TableCell>
                  </TableRow>
                ) : (
                  quizzes.map((q) => (
                    <TableRow
                      key={q.quiz_id}
                      className={q.high_risk_count > 0 ? "bg-destructive/5" : undefined}
                    >
                      <TableCell>
                        <div className="font-medium">{q.title}</div>
                        <div className="text-xs text-muted-foreground">
                          Created {new Date(q.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={q.status} />
                      </TableCell>
                      <TableCell>{q.total_attempts}</TableCell>
                      <TableCell>{q.completed_attempts}</TableCell>
                      <TableCell>
                        {q.high_risk_count > 0 ? (
                          <span className="font-semibold text-destructive">
                            {q.high_risk_count}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>{q.total_critical}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {q.latest_attempt_at ? new Date(q.latest_attempt_at).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell>
                        <Button asChild size="sm" variant="ghost">
                          <Link to="/quizzes/$quizId/report" params={{ quizId: q.quiz_id }}>
                            <Eye className="mr-1 h-4 w-4" />
                            View report
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "primary" | "info" | "danger" | "warning";
}) {
  const tile =
    tone === "danger"
      ? "bg-destructive/10 text-destructive ring-1 ring-destructive/20"
      : tone === "warning"
        ? "bg-warning/10 text-warning ring-1 ring-warning/20"
        : tone === "info"
          ? "bg-info/10 text-info ring-1 ring-info/20"
          : "bg-primary/10 text-primary ring-1 ring-primary/20";
  const valueColor =
    tone === "danger"
      ? "text-destructive"
      : tone === "warning"
        ? "text-warning"
        : "text-foreground";
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tile}`}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: "draft" | "published" }) {
  if (status === "published") return <Badge variant="outline_success">Published</Badge>;
  return <Badge variant="secondary">Draft</Badge>;
}
