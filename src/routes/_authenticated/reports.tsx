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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ShieldAlert, Eye, Users, AlertTriangle, BarChart3 } from "lucide-react";
import { getTeacherReportOverview } from "@/lib/proctoring/proctoring.functions";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — ProctorAI" }] }),
  component: ReportsPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
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
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!data) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader role="teacher" />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Proctoring reports</h1>
          <p className="text-sm text-muted-foreground">Overview of all quizzes and their proctoring activity.</p>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
              <CardDescription>Total quizzes</CardDescription>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-semibold">{stats.totalQuizzes}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
              <CardDescription>Total attempts</CardDescription>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-semibold">{stats.totalAttempts}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
              <CardDescription>Quizzes with high risk</CardDescription>
              <ShieldAlert className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-destructive">{stats.highRiskQuizzes}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1 flex flex-row items-center justify-between space-y-0">
              <CardDescription>Total critical events</CardDescription>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-semibold">{stats.totalCritical}</div></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quizzes</CardTitle>
            <CardDescription>{quizzes.length} of {data.quizzes.length} shown</CardDescription>
            <div className="mt-2">
              <Input placeholder="Search quiz title" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
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
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No quizzes found.</TableCell></TableRow>
                ) : quizzes.map((q) => (
                  <TableRow key={q.quiz_id} className={q.high_risk_count > 0 ? "bg-destructive/5" : undefined}>
                    <TableCell>
                      <div className="font-medium">{q.title}</div>
                      <div className="text-xs text-muted-foreground">Created {new Date(q.created_at).toLocaleDateString()}</div>
                    </TableCell>
                    <TableCell><Badge variant={q.status === "published" ? "default" : "secondary"}>{q.status}</Badge></TableCell>
                    <TableCell>{q.total_attempts}</TableCell>
                    <TableCell>{q.completed_attempts}</TableCell>
                    <TableCell>
                      {q.high_risk_count > 0 ? (
                        <span className="font-medium text-destructive">{q.high_risk_count}</span>
                      ) : (
                        <span>0</span>
                      )}
                    </TableCell>
                    <TableCell>{q.total_critical}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {q.latest_attempt_at ? new Date(q.latest_attempt_at).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/quizzes/$quizId/report" params={{ quizId: q.quiz_id }}>
                          <Eye className="mr-1 h-4 w-4" />View report
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
