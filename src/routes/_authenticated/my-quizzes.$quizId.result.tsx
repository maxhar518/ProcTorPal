import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { getMyResult } from "@/lib/quizzes/student.functions";

export const Route = createFileRoute("/_authenticated/my-quizzes/$quizId/result")({
  head: () => ({ meta: [{ title: "Result — ProctorAI" }] }),
  component: ResultPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
});

function ResultPage() {
  const { quizId } = Route.useParams();
  const { session, loading } = useCurrentUser();
  const fetchResult = useServerFn(getMyResult);
  const { data, isLoading } = useQuery({
    queryKey: ["my-result", quizId, session?.user?.id ?? null],
    queryFn: () => fetchResult({ data: { quizId } }),
    enabled: !!session,
  });

  if (loading || isLoading || !session) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!data) return null;
  const { quiz, attempt } = data;
  const completed = attempt?.status === "completed";
  const released = quiz.results_released;
  const pct = completed && attempt?.max_score ? Math.round((attempt.score! / attempt.max_score) * 100) : 0;
  const passed = quiz.passing_score != null && attempt?.score != null && attempt.score >= (quiz.passing_score ?? 0);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader role="student" />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <Card>
          <CardHeader><CardTitle>{quiz.title}</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-center">
            {!completed && <p className="text-sm text-muted-foreground">You haven't completed this quiz yet.</p>}
            {completed && !released && <p className="text-sm text-muted-foreground">Your submission has been recorded. Results will be released by your teacher.</p>}
            {completed && released && (
              <>
                <div className="text-4xl font-semibold">{attempt!.score}/{attempt!.max_score}</div>
                <div className="text-sm text-muted-foreground">{pct}%{quiz.passing_score != null ? ` • Passing: ${quiz.passing_score}` : ""}</div>
                {quiz.passing_score != null && (
                  <div className={passed ? "text-primary font-medium" : "text-destructive font-medium"}>
                    {passed ? "Passed" : "Did not pass"}
                  </div>
                )}
              </>
            )}
            <Button asChild variant="outline"><Link to="/my-quizzes">Back to my quizzes</Link></Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
