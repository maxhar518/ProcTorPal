import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  BarChart3,
  ShieldAlert,
  AlertTriangle,
  Users,
  Eye,
  FileBarChart2,
} from "lucide-react";
import { listAllQuizReportsSummary } from "@/lib/proctoring/proctoring.functions";

export const Route = createFileRoute("/_authenticated/reports/")({
  head: () => ({ meta: [{ title: "Reports — ProctorPal" }] }),
  component: ReportsPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">{error.message}</div>
  ),
});

function ReportsPage() {
  const { session, loading } = useCurrentUser();
  const fetchReports = useServerFn(listAllQuizReportsSummary);

  const { data, isLoading } = useQuery({
    queryKey: ["quiz-reports-summary", session?.user?.id ?? null],
    queryFn: () => fetchReports(),
    enabled: !!session,
  });

  if (loading || isLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const quizzes = data?.quizzes ?? [];
  const totalAttempts = quizzes.reduce((sum, q) => sum + q.stats.totalAttempts, 0);
  const totalHighRisk = quizzes.reduce((sum, q) => sum + q.stats.highRisk, 0);
  const totalMediumRisk = quizzes.reduce((sum, q) => sum + q.stats.mediumRisk, 0);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader role="teacher" />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Performance and proctoring reports across all quizzes.
          </p>
        </div>

        {/* Summary stats */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<BarChart3 className="h-4 w-4 text-primary" />}
            label="Total quizzes"
            value={quizzes.length}
            tone="primary"
          />
          <StatCard
            icon={<Users className="h-4 w-4 text-info" />}
            label="Total attempts"
            value={totalAttempts}
            tone="info"
          />
          <StatCard
            icon={<ShieldAlert className="h-4 w-4 text-destructive" />}
            label="High risk"
            value={totalHighRisk}
            tone="danger"
          />
          <StatCard
            icon={<AlertTriangle className="h-4 w-4 text-warning" />}
            label="Medium risk"
            value={totalMediumRisk}
            tone="warning"
          />
        </div>

        {/* Quiz list */}
        {quizzes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                <FileBarChart2 className="h-6 w-6 text-primary" />
              </span>
              <p className="text-sm text-muted-foreground">
                No quizzes yet. Create a quiz to see reports here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {quizzes.map((q) => (
              <Card key={q.id} className="transition-colors hover:border-primary/40">
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base">{q.title}</CardTitle>
                      <StatusBadge status={q.status} />
                    </div>
                    <CardDescription className="mt-1">
                      {q.stats.totalAttempts} attempt{q.stats.totalAttempts !== 1 ? "s" : ""} ·{" "}
                      {q.stats.completedAttempts} completed
                      {q.stats.avgMaxScore > 0 && (
                        <>
                          {" "}
                          · Avg score {q.stats.avgScore}/{q.stats.avgMaxScore}
                        </>
                      )}
                    </CardDescription>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {q.stats.highRisk > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 font-medium text-destructive">
                          <ShieldAlert className="h-3 w-3" /> {q.stats.highRisk} high risk
                        </span>
                      )}
                      {q.stats.mediumRisk > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 font-medium text-warning">
                          <AlertTriangle className="h-3 w-3" /> {q.stats.mediumRisk} medium risk
                        </span>
                      )}
                      {q.stats.totalCritical > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-2 py-0.5 font-medium text-muted-foreground">
                          {q.stats.totalCritical} critical event
                          {q.stats.totalCritical !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/quizzes/$quizId/report" params={{ quizId: q.id }}>
                      <Eye className="mr-1 h-3 w-3" />
                      View report
                    </Link>
                  </Button>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
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
