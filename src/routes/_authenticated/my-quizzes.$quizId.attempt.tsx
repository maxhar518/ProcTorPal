import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, CheckCircle2, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { getQuizForAttempt, startAttempt, submitAttempt } from "@/lib/quizzes/student.functions";
import { ProctoredSession } from "@/components/proctoring/ProctoredSession";
import { QuizTimer } from "@/components/quiz-timer";

export const Route = createFileRoute("/_authenticated/my-quizzes/$quizId/attempt")({
  head: () => ({ meta: [{ title: "Attempt quiz — ProctorPal" }] }),
  component: AttemptPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">{error.message}</div>
  ),
});

function AttemptPage() {
  const { quizId } = Route.useParams();
  const { session, loading } = useCurrentUser();
  const navigate = useNavigate();

  const fetchQuiz = useServerFn(getQuizForAttempt);
  const start = useServerFn(startAttempt);
  const submit = useServerFn(submitAttempt);

  const { data, isLoading } = useQuery({
    queryKey: ["attempt-quiz", quizId, session?.user?.id ?? null],
    queryFn: () => fetchQuiz({ data: { quizId } }),
    enabled: !!session,
  });

  const { data: attemptData, isLoading: attemptLoading } = useQuery({
    queryKey: ["attempt-start", quizId, session?.user?.id ?? null],
    queryFn: () => start({ data: { quizId } }),
    enabled: !!session,
  });

  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const submitTriggeredRef = useRef(false);

  const submitM = useMutation({
    mutationFn: () =>
      submit({
        data: {
          quizId,
          answers: Object.entries(answers).map(([qid, ids]) => ({
            question_id: qid,
            selected_option_ids: ids,
          })),
        },
      }),
    onSuccess: async () => {
      toast.success("Submitted");
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
      } catch {
        /* ignore */
      }
      navigate({ to: "/my-quizzes/$quizId/result", params: { quizId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Auto-submit when time runs out
  const handleTimeUp = () => {
    if (!submitTriggeredRef.current) {
      submitTriggeredRef.current = true;
      submitM.mutate();
    }
  };

  if (loading || isLoading || attemptLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!data) return null;

  const attemptId = attemptData?.attempt?.id;
  const totalQuestions = data.questions.length;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader role="student" />
      <ProctoredSession attemptId={attemptId}>
        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <div className="mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{data.quiz.title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{data.quiz.description}</p>
              </div>
              <Badge variant="outline_info" className="gap-1">
                <ListChecks className="h-3.5 w-3.5" />
                {answeredCount}/{totalQuestions} answered
              </Badge>
            </div>
            {/* Progress bar */}
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-info transition-all"
                style={{
                  width: totalQuestions > 0 ? `${(answeredCount / totalQuestions) * 100}%` : "0%",
                }}
              />
            </div>
          </div>

          {data.quiz.time_limit_minutes && (
            <QuizTimer timeLimit={data.quiz.time_limit_minutes} onTimeUp={handleTimeUp} />
          )}

          <div className="space-y-4">
            {data.questions.map((q, i) => {
              const opts = data.options.filter((o) => o.question_id === q.id);
              const sel = answers[q.id] ?? [];
              const answered = sel.length > 0;
              return (
                <Card key={q.id} className={answered ? "border-primary/30" : ""}>
                  <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                    <CardTitle className="text-base">
                      <span className="mr-2 inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-primary/15 px-1.5 text-xs font-semibold text-primary">
                        {i + 1}
                      </span>
                      {q.prompt}
                    </CardTitle>
                    {answered && <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />}
                  </CardHeader>
                  <CardContent>
                    {q.type === "single" ? (
                      <RadioGroup
                        value={sel[0] ?? ""}
                        onValueChange={(v) => setAnswers({ ...answers, [q.id]: [v] })}
                      >
                        {opts.map((o, oi) => (
                          <label
                            key={o.id}
                            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                              sel[0] === o.id
                                ? "border-primary/60 bg-primary/10"
                                : "border-border hover:border-primary/40 hover:bg-accent/50"
                            }`}
                          >
                            <RadioGroupItem value={o.id} />
                            <span>
                              {String.fromCharCode(65 + oi)}. {o.label}
                            </span>
                          </label>
                        ))}
                      </RadioGroup>
                    ) : (
                      <div className="space-y-2">
                        {opts.map((o, oi) => (
                          <label
                            key={o.id}
                            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                              sel.includes(o.id)
                                ? "border-primary/60 bg-primary/10"
                                : "border-border hover:border-primary/40 hover:bg-accent/50"
                            }`}
                          >
                            <Checkbox
                              checked={sel.includes(o.id)}
                              onCheckedChange={(c) => {
                                const next = c ? [...sel, o.id] : sel.filter((x) => x !== o.id);
                                setAnswers({ ...answers, [q.id]: next });
                              }}
                            />
                            <span>
                              {String.fromCharCode(65 + oi)}. {o.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <span className="text-xs text-muted-foreground">
              {answeredCount} of {totalQuestions} answered
            </span>
            <Button
              className="min-w-40"
              size="lg"
              onClick={() => submitM.mutate()}
              disabled={submitM.isPending}
            >
              {submitM.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Submit quiz
                </>
              )}
            </Button>
          </div>
        </main>
      </ProctoredSession>
    </div>
  );
}
