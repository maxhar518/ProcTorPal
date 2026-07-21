import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, PlusCircle, Sparkles } from "lucide-react";
import { listQuizBankSubjects, listQuizBankQuestions, createQuizFromBank, generateQuizVersions } from "@/lib/quizzes/quiz-bank.functions";
import { getMyProfile } from "@/lib/auth/profile.functions";

export const Route = createFileRoute("/_authenticated/quiz-bank")({
  head: () => ({ meta: [{ title: "Quiz Bank — ProctorAI" }] }),
  component: QuizBankPage,
});

function QuizBankPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [subjectId, setSubjectId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [status, setStatus] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [title, setTitle] = useState("New quiz from bank");
  const [durationMinutes, setDurationMinutes] = useState("45");
  const [totalMarks, setTotalMarks] = useState("20");
  const [passingMarks, setPassingMarks] = useState("10");
  const [publishNow, setPublishNow] = useState(false);

  const subjectFn = useServerFn(listQuizBankSubjects);
  const questionFn = useServerFn(listQuizBankQuestions);
  const createQuiz = useServerFn(createQuizFromBank);
  const generateVersions = useServerFn(generateQuizVersions);
  const profileFn = useServerFn(getMyProfile);

  const { data: profileData } = useQuery({ queryKey: ["my-profile"], queryFn: () => profileFn() });
  const { data: subjectsData } = useQuery({ queryKey: ["quiz-bank-subjects"], queryFn: () => subjectFn() });
  const { data: bankData, isLoading } = useQuery({
    queryKey: ["quiz-bank-questions", subjectId, search, difficulty, status],
    queryFn: () => questionFn({ data: { subjectId: subjectId === "all" ? null : subjectId, search, difficulty: difficulty as any, status: status as any, page: 1, pageSize: 50 } }),
    enabled: profileData?.role === "teacher",
  });

  const createMutation = useMutation({
    mutationFn: () => createQuiz({ data: { title, subjectId: (subjectsData?.subjects ?? []).find((s: any) => s.id === subjectId)?.id ?? (subjectsData?.subjects?.[0]?.id ?? ""), durationMinutes: Number(durationMinutes || 45), totalMarks: Number(totalMarks || 20), passingMarks: Number(passingMarks || 10), availableFrom: null, availableUntil: null, questionIds: selectedIds, publishNow } }),
    onSuccess: async ({ quiz }) => {
      await generateVersions({ data: { quizId: quiz.id } });
      toast.success("Quiz created from bank questions.");
      qc.invalidateQueries({ queryKey: ["quiz-bank-questions"] });
      navigate({ to: "/quizzes/$quizId/edit", params: { quizId: quiz.id } });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rows = useMemo(() => bankData?.rows ?? [], [bankData]);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  if (profileData?.role !== "teacher") {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader role={(profileData?.role as "teacher" | "student" | null) ?? "student"} />
        <main className="mx-auto max-w-3xl px-6 py-16">
          <Card>
            <CardHeader>
              <CardTitle>Teachers only</CardTitle>
              <CardDescription>This workspace is reserved for teacher quiz-bank management.</CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader role="teacher" />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Quiz Bank</h1>
            <p className="text-sm text-muted-foreground">Browse subject questions, pick a set, and create a new quiz.</p>
          </div>
          <Button asChild variant="outline">
            <Link to="/quizzes">Back to quizzes</Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Bank questions</CardTitle>
              <CardDescription>Search, filter, and select questions from the bank.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={subjectId} onValueChange={setSubjectId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All subjects</SelectItem>
                      {(subjectsData?.subjects ?? []).map((subject: any) => (
                        <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="Easy">Easy</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Input placeholder="Search questions" value={search} onChange={(e) => setSearch(e.target.value)} />
              {isLoading ? <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading questions…</div> : null}
              <div className="space-y-3">
                {rows.map((question: any) => (
                  <div key={question.id} className="rounded-lg border p-3">
                    <div className="flex items-start gap-2">
                      <Checkbox checked={selectedIds.includes(question.id)} onCheckedChange={() => toggleSelected(question.id)} />
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{question.question_text}</p>
                          <Badge variant="outline">{question.difficulty}</Badge>
                          <Badge variant="secondary">{question.marks} marks</Badge>
                          <Badge variant="outline">{question.status}</Badge>
                        </div>
                        <div className="grid gap-1 text-sm text-muted-foreground">
                          <span>A. {question.option_a}</span>
                          <span>B. {question.option_b}</span>
                          <span>C. {question.option_c}</span>
                          <span>D. {question.option_d}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Create quiz</CardTitle>
              <CardDescription>Build a new quiz from your selected questions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Quiz title</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Duration (min)</Label>
                  <Input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Total marks</Label>
                  <Input type="number" value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Passing marks</Label>
                <Input type="number" value={passingMarks} onChange={(e) => setPassingMarks(e.target.value)} />
              </div>
              <div className="flex items-center gap-2 rounded-md border p-3">
                <Checkbox checked={publishNow} onCheckedChange={(value) => setPublishNow(Boolean(value))} />
                <span className="text-sm">Publish immediately</span>
              </div>
              <div className="rounded-lg border bg-accent/40 p-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <Sparkles className="h-4 w-4" /> Selected questions: {selectedIds.length}
                </div>
                <p className="mt-1">This creates a new quiz and automatically generates versions A, B, and C.</p>
              </div>
              <Button className="w-full" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || selectedIds.length === 0}>
                {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                Create quiz from selected questions
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
