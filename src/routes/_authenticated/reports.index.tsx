import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart3, ShieldAlert, AlertTriangle, Users, Eye } from "lucide-react";
import { listAllQuizReportsSummary } from "@/lib/proctoring/proctoring.functions";

export const Route = createFileRoute("/_authenticated/reports/")({
  head: () => ({ meta: [{ title: "Reports — ProctorAI" }] }),
  component: ReportsPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
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
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-sm text-muted-foreground">Performance and proctoring reports across all quizzes.</p>
        </div>

        {/* Summary stats */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
              <CardDescription>Total quizzes</CardDescription>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{quizzes.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
              <CardDescription>Total attempts</CardDescription>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{totalAttempts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
              <CardDescription>High risk</CardDescription>
              <ShieldAlert className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-destructive">{totalHighRisk}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
              <CardDescription>Medium risk</CardDescription>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{totalMediumRisk}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quiz list */}
        {quizzes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No quizzes yet. Create a quiz to see reports here.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {quizzes.map((q) => (
              <Card key={q.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{q.title}</CardTitle>
                      <Badge variant={q.status === "published" ? "default" : "secondary"}>{q.status}</Badge>
                    </div>
                    <CardDescription className="mt-1">
                      {q.stats.totalAttempts} attempt{q.stats.totalAttempts !== 1 ? "s" : ""} · {q.stats.completedAttempts} completed
                      {q.stats.avgMaxScore > 0 && <> · Avg score {q.stats.avgScore}/{q.stats.avgMaxScore}</>}
                    </CardDescription>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {q.stats.highRisk > 0 && (
                        <span className="inline-flex items-center gap-1 text-destructive">
                          <ShieldAlert className="h-3 w-3" /> {q.stats.highRisk} high risk
                        </span>
                      )}
                      {q.stats.mediumRisk > 0 && (
                        <span className="inline-flex items-center gap-1 text-yellow-500">
                          <AlertTriangle className="h-3 w-3" /> {q.stats.mediumRisk} medium risk
                        </span>
                      )}
                      {q.stats.totalCritical > 0 && (
                        <span className="inline-flex items-center gap-1">
                          {q.stats.totalCritical} critical event{q.stats.totalCritical !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/quizzes/$quizId/report" params={{ quizId: q.id }}>
                      <Eye className="mr-1 h-3 w-3" />View report
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
