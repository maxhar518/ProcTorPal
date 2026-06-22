import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { listMyEnrolledQuizzes } from "@/lib/quizzes/student.functions";

export const Route = createFileRoute("/_authenticated/my-quizzes/")({
  head: () => ({ meta: [{ title: "My quizzes — ProctorAI" }] }),
  component: MyQuizzesPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
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
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader role="student" />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">My quizzes</h1>
            <p className="text-sm text-muted-foreground">Quizzes you're enrolled in.</p>
          </div>
          <Button asChild><Link to="/join">Join a quiz</Link></Button>
        </div>

        {(!data?.rows || data.rows.length === 0) ? (
          <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">You haven't joined any quizzes yet.</CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {data.rows.map((r) => (
              <Card key={r.quiz_id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{r.title}</CardTitle>
                      <CardDescription>{r.description || "—"}</CardDescription>
                    </div>
                    <Badge variant={r.attempt_status === "completed" ? "default" : r.attempt_status === "in_progress" ? "outline" : "secondary"}>
                      {r.attempt_status === "completed" ? "Completed" : r.attempt_status === "in_progress" ? "In progress" : "Not started"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {r.attempt_status === "completed" && r.results_released && r.max_score
                      ? `Score: ${r.score}/${r.max_score}`
                      : r.attempt_status === "completed"
                        ? "Awaiting results"
                        : ""}
                  </div>
                  {r.attempt_status === "completed" ? (
                    <Button asChild variant="outline" size="sm">
                      <Link to="/my-quizzes/$quizId/result" params={{ quizId: r.quiz_id }}>View result</Link>
                    </Button>
                  ) : (
                    <Button asChild size="sm">
                      <Link to="/my-quizzes/$quizId/attempt" params={{ quizId: r.quiz_id }}>
                        {r.attempt_status === "in_progress" ? "Resume" : "Start quiz"}
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
