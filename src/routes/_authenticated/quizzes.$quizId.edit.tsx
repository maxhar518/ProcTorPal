import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import {
  getQuiz, updateQuiz, upsertQuestion, deleteQuestion,
} from "@/lib/quizzes/quiz.functions";

export const Route = createFileRoute("/_authenticated/quizzes/$quizId/edit")({
  head: () => ({ meta: [{ title: "Edit quiz — ProctorAI" }] }),
  component: EditQuizPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
});

type OptionDraft = { id?: string; label: string; is_correct: boolean };
type QuestionDraft = {
  id?: string; prompt: string; type: "single" | "multi"; points: number; options: OptionDraft[];
};

function EditQuizPage() {
  const { quizId } = Route.useParams();
  const { session, loading } = useCurrentUser();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const fetchQuiz = useServerFn(getQuiz);
  const update = useServerFn(updateQuiz);
  const upsertQ = useServerFn(upsertQuestion);
  const delQ = useServerFn(deleteQuestion);

  const quizQueryKey = ["quiz", quizId, session?.user?.id ?? null] as const;
  const { data, isLoading } = useQuery({
    queryKey: quizQueryKey,
    queryFn: () => fetchQuiz({ data: { quizId } }),
    enabled: !!session,
  });

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [tl, setTl] = useState<string>("");
  const [pass, setPass] = useState<string>("");
  const [drafts, setDrafts] = useState<QuestionDraft[]>([]);

  useEffect(() => {
    if (data?.quiz) {
      setTitle(data.quiz.title ?? "");
      setDesc(data.quiz.description ?? "");
      setTl(data.quiz.time_limit_minutes?.toString() ?? "");
      setPass(data.quiz.passing_score?.toString() ?? "");
      setDrafts(
        data.questions.map((q) => ({
          id: q.id,
          prompt: q.prompt,
          type: q.type as "single" | "multi",
          points: q.points,
          options: data.options
            .filter((o) => o.question_id === q.id)
            .map((o) => ({ id: o.id, label: o.label, is_correct: o.is_correct })),
        })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.quiz?.id]);

  const delQM = useMutation({
    mutationFn: (id: string) => delQ({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: quizQueryKey }); },
  });

  const saveAllM = useMutation({
    mutationFn: async () => {
      await update({ data: {
        id: quizId, title, description: desc || null,
        time_limit_minutes: tl !== "" ? Number(tl) : null,
        passing_score: pass !== "" ? Number(pass) : null,
      }});
      for (let i = 0; i < drafts.length; i++) {
        const q = drafts[i];
        await upsertQ({ data: {
          id: q.id, quiz_id: quizId, prompt: q.prompt, type: q.type,
          points: q.points, position: i,
          options: q.options.map((o, idx) => ({ ...o, position: idx })),
        }});
      }
    },
    onSuccess: () => { toast.success("All changes saved"); qc.invalidateQueries({ queryKey: ["quiz", quizId] }); navigate({ to: "/quizzes" }); },
    onError: (err: Error) => toast.error(err.message),
  });

  if (loading || isLoading || !session) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!data) return null;

  function updateDraft(i: number, next: QuestionDraft) {
    setDrafts((d) => d.map((x, j) => (j === i ? next : x)));
  }
  function addDraft() {
    setDrafts((d) => [...d, {
      prompt: "New question", type: "single", points: 1,
      options: [{ label: "Option A", is_correct: true }, { label: "Option B", is_correct: false }],
    }]);
  }
  function removeDraft(i: number) {
    const q = drafts[i];
    if (q.id) delQM.mutate(q.id);
    setDrafts((d) => d.filter((_, j) => j !== i));
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader role="teacher" />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link to="/quizzes/$quizId" params={{ quizId }}><ArrowLeft className="mr-1 h-4 w-4" />Back</Link>
        </Button>

        <Card className="mb-6">
          <CardHeader><CardTitle>Quiz details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div><Label>Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Time limit (minutes)</Label><Input type="number" min={0} value={tl} onChange={(e) => setTl(e.target.value)} /></div>
              <div><Label>Passing score</Label><Input type="number" min={0} value={pass} onChange={(e) => setPass(e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Questions</h2>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={addDraft}>
              <Plus className="mr-1 h-4 w-4" />Add question
            </Button>
            <Button size="sm" onClick={() => saveAllM.mutate()} disabled={saveAllM.isPending}>
              {saveAllM.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
              {saveAllM.isPending ? "Saving..." : "Save all changes"}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {drafts.length === 0 && <p className="text-sm text-muted-foreground">No questions yet.</p>}
          {drafts.map((q, idx) => (
            <QuestionEditor
              key={q.id ?? `new-${idx}`}
              index={idx}
              draft={q}
              onChange={(next) => updateDraft(idx, next)}
              onDelete={() => { if (confirm("Delete question?")) removeDraft(idx); }}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

function QuestionEditor({
  index, draft, onChange, onDelete,
}: {
  index: number; draft: QuestionDraft;
  onChange: (d: QuestionDraft) => void; onDelete: () => void;
}) {
  function update<K extends keyof QuestionDraft>(k: K, v: QuestionDraft[K]) {
    onChange({ ...draft, [k]: v });
  }
  function updateOpt(i: number, patch: Partial<OptionDraft>) {
    const opts = draft.options.map((o, j) => j === i ? { ...o, ...patch } : o);
    if (draft.type === "single" && patch.is_correct) {
      opts.forEach((o, j) => { if (j !== i) o.is_correct = false; });
    }
    onChange({ ...draft, options: opts });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">Question {index + 1}</CardTitle>
        <Button variant="ghost" size="sm" onClick={onDelete}><Trash2 className="h-3 w-3 text-destructive" /></Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div><Label>Prompt</Label><Textarea value={draft.prompt} onChange={(e) => update("prompt", e.target.value)} rows={2} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Type</Label>
            <Select value={draft.type} onValueChange={(v) => update("type", v as "single" | "multi")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single answer</SelectItem>
                <SelectItem value="multi">Multiple answers</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Points</Label><Input type="number" min={1} value={draft.points} onChange={(e) => update("points", Math.max(1, Number(e.target.value)))} /></div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label>Options</Label>
            <Button variant="outline" size="sm" onClick={() => update("options", [...draft.options, { label: `Option ${String.fromCharCode(65 + draft.options.length)}`, is_correct: false }])}>
              <Plus className="mr-1 h-3 w-3" />Add option
            </Button>
          </div>
          {draft.type === "single" ? (
            <RadioGroup value={draft.options.findIndex((o) => o.is_correct).toString()}>
              {draft.options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <RadioGroupItem value={i.toString()} onClick={() => updateOpt(i, { is_correct: true })} />
                  <Input value={o.label} onChange={(e) => updateOpt(i, { label: e.target.value })} />
                  <Button variant="ghost" size="sm" disabled={draft.options.length <= 2} onClick={() => update("options", draft.options.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
            </RadioGroup>
          ) : (
            <div className="space-y-2">
              {draft.options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Checkbox checked={o.is_correct} onCheckedChange={(c) => updateOpt(i, { is_correct: !!c })} />
                  <Input value={o.label} onChange={(e) => updateOpt(i, { label: e.target.value })} />
                  <Button variant="ghost" size="sm" disabled={draft.options.length <= 2} onClick={() => update("options", draft.options.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
