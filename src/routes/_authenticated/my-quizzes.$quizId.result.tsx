import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Award, CheckCircle2, Clock3 } from "lucide-react";
import { getMyResult } from "@/lib/quizzes/student.functions";

export const Route = createFileRoute("/_authenticated/my-quizzes/$quizId/result")({
  head: () => ({ meta: [{ title: "Result — ProctorPal" }] }),
  component: ResultPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">{error.message}</div>
  ),
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
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!data) return null;
  const { quiz, attempt } = data;
  const completed = attempt?.status === "completed";
  const released = quiz.results_released;
  const pct =
    completed && attempt?.max_score ? Math.round((attempt.score! / attempt.max_score) * 100) : 0;
  const passed =
    quiz.passing_score != null &&
    attempt?.score != null &&
    attempt.score >= (quiz.passing_score ?? 0);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader role="student" />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Card className="overflow-hidden">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">{quiz.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            {!completed && (
              <p className="text-sm text-muted-foreground">You haven't completed this quiz yet.</p>
            )}
            {completed && !released && (
              <div className="flex flex-col items-center gap-3 py-4">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-info/10 ring-1 ring-info/20">
                  <Clock3 className="h-7 w-7 text-info" />
                </span>
                <p className="text-sm text-muted-foreground">
                  Your submission has been recorded. Results will be released by your instructor.
                </p>
              </div>
            )}
            {completed && released && (
              <div className="flex flex-col items-center gap-4 py-2">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                  <Award className="h-7 w-7 text-primary" />
                </span>
                <div>
                  <div className="text-5xl font-bold tracking-tight">
                    {attempt!.score}
                    <span className="text-2xl font-semibold text-muted-foreground">
                      /{attempt!.max_score}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {pct}%{quiz.passing_score != null ? ` • Passing: ${quiz.passing_score}` : ""}
                  </div>
                </div>
                {/* Score progress */}
                <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-info transition-all"
                    style={{ width: `${Math.max(4, Math.min(100, pct))}%` }}
                  />
                </div>
                {quiz.passing_score != null && (
                  <Badge
                    variant={passed ? "outline_success" : "outline_destructive"}
                    className="gap-1 px-3 py-1 text-sm"
                  >
                    {passed ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" /> Passed
                      </>
                    ) : (
                      "Did not pass"
                    )}
                  </Badge>
                )}
              </div>
            )}
            <Button asChild variant="outline">
              <Link to="/my-quizzes">Back to my quizzes</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
