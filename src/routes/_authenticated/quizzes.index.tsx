import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Copy, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { listMyQuizzes, createQuiz, deleteQuiz, setQuizStatus } from "@/lib/quizzes/quiz.functions";
import { getMyProfile } from "@/lib/auth/profile.functions";

export const Route = createFileRoute("/_authenticated/quizzes/")({
  head: () => ({ meta: [{ title: "Quizzes — ProctorAI" }] }),
  component: QuizzesPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
});

function QuizzesPage() {
  const { session, loading } = useCurrentUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("Untitled quiz");
  const [newDescription, setNewDescription] = useState("");
  const [newTimeLimit, setNewTimeLimit] = useState("");
  const [newPassingScore, setNewPassingScore] = useState("");
  const list = useServerFn(listMyQuizzes);
  const create = useServerFn(createQuiz);
  const del = useServerFn(deleteQuiz);
  const setStatus = useServerFn(setQuizStatus);

  const profileFn = useServerFn(getMyProfile);
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["my-profile", session?.user?.id ?? null],
    queryFn: () => profileFn(),
    enabled: !!session,
  });
  const isTeacher = profileData?.role === "teacher";

  const { data, isLoading } = useQuery({
    queryKey: ["my-quizzes", session?.user?.id ?? null],
    queryFn: () => list(),
    enabled: !!session && isTeacher,
  });

  const createM = useMutation({
    mutationFn: () => create({
      data: {
        title: newTitle,
        description: newDescription || null,
        time_limit_minutes: newTimeLimit !== "" ? Number(newTimeLimit) : null,
        passing_score: newPassingScore !== "" ? Number(newPassingScore) : 0,
      }
    }),
    onSuccess: ({ quiz }) => {
      setIsCreateOpen(false);
      navigate({ to: "/quizzes/$quizId/edit", params: { quizId: quiz.id } });
    },
    onError: (err: Error) => toast.error(err.message),
  });
  const delM = useMutation({
    mutationFn: (quizId: string) => del({ data: { quizId } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["my-quizzes"] }); },
    onError: (err: Error) => toast.error(err.message),
  });
  const statusM = useMutation({
    mutationFn: (v: { quizId: string; status: "draft" | "published" }) => setStatus({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-quizzes"] }),
    onError: (err: Error) => toast.error(err.message),
  });

  if (loading || profileLoading || !session) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!isTeacher) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader role={(profileData?.role as "teacher" | "student" | undefined) ?? "student"} />
        <main className="mx-auto max-w-2xl px-6 py-16">
          <Card>
            <CardHeader>
              <CardTitle>Teachers only</CardTitle>
              <CardDescription>This area is restricted to teacher accounts.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline"><Link to="/dashboard">Back to dashboard</Link></Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader role="teacher" />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">My quizzes</h1>
            <p className="text-sm text-muted-foreground">Create, manage and share your quizzes.</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button disabled={createM.isPending}>
                <Plus className="mr-1 h-4 w-4" /> New quiz
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New quiz</DialogTitle>
                <DialogDescription>Enter the quiz details you want to create now.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div><Label>Title</Label><Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} /></div>
                <div><Label>Description</Label><Textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={3} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Time limit (minutes)</Label><Input type="number" min={0} value={newTimeLimit} onChange={(e) => setNewTimeLimit(e.target.value)} /></div>
                  <div><Label>Passing score</Label><Input type="number" min={0} value={newPassingScore} onChange={(e) => setNewPassingScore(e.target.value)} /></div>
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button onClick={() => createM.mutate()} disabled={createM.isPending}>{createM.isPending ? "Creating..." : "Create quiz"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {(!data?.quizzes || data.quizzes.length === 0) ? (
          <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No quizzes yet. Click "New quiz" to start.</CardContent></Card>
        ) : (
          <div className="grid gap-3">
            {data.quizzes.map((q) => (
              <Card key={q.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                  <div>
                    <CardTitle className="text-base">{q.title}</CardTitle>
                    <CardDescription>
                      <Badge variant={q.status === "published" ? "default" : "secondary"}>{q.status}</Badge>
                      <span className="ml-2 font-mono text-xs">{q.access_code}</span>
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button asChild variant="outline" size="sm"><Link to="/quizzes/$quizId" params={{ quizId: q.id }}><Eye className="mr-1 h-3 w-3" />Open</Link></Button>
                    <Button variant="outline" size="sm" onClick={() => statusM.mutate({ quizId: q.id, status: q.status === "published" ? "draft" : "published" })}>
                      {q.status === "published" ? "Unpublish" : "Publish"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { if (confirm("Delete quiz?")) delM.mutate(q.id); }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
