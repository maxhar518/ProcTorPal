import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getQuizForAttempt, startAttempt, submitAttempt } from "@/lib/quizzes/student.functions";
import { ProctoredSession } from "@/components/proctoring/ProctoredSession";

export const Route = createFileRoute("/_authenticated/my-quizzes/$quizId/attempt")({
  head: () => ({ meta: [{ title: "Attempt quiz — ProctorAI" }] }),
  component: AttemptPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
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

  const submitM = useMutation({
    mutationFn: () => submit({ data: {
      quizId,
      answers: Object.entries(answers).map(([qid, ids]) => ({ question_id: qid, selected_option_ids: ids })),
    }}),
    onSuccess: async () => {
      toast.success("Submitted");
      try { if (document.fullscreenElement) await document.exitFullscreen(); } catch { /* ignore */ }
      navigate({ to: "/my-quizzes/$quizId/result", params: { quizId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading || isLoading || attemptLoading || !session) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!data) return null;

  const attemptId = attemptData?.attempt?.id;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader role="student" />
      <ProctoredSession attemptId={attemptId}>
        <main className="mx-auto max-w-3xl px-6 py-10">
          <h1 className="text-2xl font-semibold">{data.quiz.title}</h1>
          <p className="mb-6 text-sm text-muted-foreground">{data.quiz.description}</p>

          <div className="space-y-4">
            {data.questions.map((q, i) => {
              const opts = data.options.filter((o) => o.question_id === q.id);
              const sel = answers[q.id] ?? [];
              return (
                <Card key={q.id}>
                  <CardHeader><CardTitle className="text-base">Q{i + 1}. {q.prompt}</CardTitle></CardHeader>
                  <CardContent>
                    {q.type === "single" ? (
                      <RadioGroup value={sel[0] ?? ""} onValueChange={(v) => setAnswers({ ...answers, [q.id]: [v] })}>
                        {opts.map((o) => (
                          <label key={o.id} className="flex cursor-pointer items-center gap-2">
                            <RadioGroupItem value={o.id} />
                            <span>{o.label}</span>
                          </label>
                        ))}
                      </RadioGroup>
                    ) : (
                      <div className="space-y-2">
                        {opts.map((o) => (
                          <label key={o.id} className="flex cursor-pointer items-center gap-2">
                            <Checkbox
                              checked={sel.includes(o.id)}
                              onCheckedChange={(c) => {
                                const next = c ? [...sel, o.id] : sel.filter((x) => x !== o.id);
                                setAnswers({ ...answers, [q.id]: next });
                              }}
                            />
                            <span>{o.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Button className="mt-6 w-full" size="lg" onClick={() => submitM.mutate()} disabled={submitM.isPending}>
            {submitM.isPending ? "Submitting..." : "Submit quiz"}
          </Button>
        </main>
      </ProctoredSession>
    </div>
  );
}
