import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen, PlusCircle, ArrowRight } from "lucide-react";
import { listMyEnrolledQuizzes } from "@/lib/quizzes/student.functions";

export const Route = createFileRoute("/_authenticated/my-quizzes/")({
  head: () => ({ meta: [{ title: "My quizzes — ProctorPal" }] }),
  component: MyQuizzesPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">{error.message}</div>
  ),
});

function MyQuizzesPage() {
  const { session, loading } = useCurrentUser();
  const fetchList = useServerFn(listMyEnrolledQuizzes);
  const { data, isLoading } = useQuery({
    queryKey: ["my-enrolled", session?.user?.id ?? null],
    queryFn: () => fetchList(),
    enabled: !!session,
  });

  if (loading || isLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader role="student" />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My quizzes</h1>
            <p className="mt-1 text-sm text-muted-foreground">Quizzes you're enrolled in.</p>
          </div>
          <Button asChild>
            <Link to="/join">
              <PlusCircle className="mr-1 h-4 w-4" /> Join a quiz
            </Link>
          </Button>
        </div>

        {!data?.rows || data.rows.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
                <BookOpen className="h-6 w-6 text-primary" />
              </span>
              <p className="text-sm text-muted-foreground">You haven't joined any quizzes yet.</p>
              <Button asChild size="sm" variant="outline">
                <Link to="/join">Join with an access code</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {data.rows.map((r) => (
              <Card key={r.quiz_id} className="transition-colors hover:border-primary/40">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{r.title}</CardTitle>
                      <CardDescription>{r.description || "—"}</CardDescription>
                    </div>
                    <AttemptStatusBadge status={r.attempt_status} />
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">
                    {r.attempt_status === "completed" && r.results_released && r.max_score
                      ? `Score: ${r.score}/${r.max_score}`
                      : r.attempt_status === "completed"
                        ? "Awaiting results"
                        : ""}
                  </div>
                  {r.attempt_status === "completed" ? (
                    <Button asChild variant="outline" size="sm">
                      <Link to="/my-quizzes/$quizId/result" params={{ quizId: r.quiz_id }}>
                        View result
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild size="sm">
                      <Link to="/my-quizzes/$quizId/attempt" params={{ quizId: r.quiz_id }}>
                        {r.attempt_status === "in_progress" ? "Resume" : "Start quiz"}
                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function AttemptStatusBadge({ status }: { status: "completed" | "in_progress" | "not_started" }) {
  if (status === "completed") {
    return <Badge variant="outline_success">Completed</Badge>;
  }
  if (status === "in_progress") {
    return <Badge variant="outline_warning">In progress</Badge>;
  }
  return <Badge variant="secondary">Not started</Badge>;
}
