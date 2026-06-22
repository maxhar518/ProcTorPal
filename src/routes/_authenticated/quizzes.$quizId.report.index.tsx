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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Download, Eye } from "lucide-react";
import { listQuizAttemptsWithRisk } from "@/lib/proctoring/proctoring.functions";

export const Route = createFileRoute("/_authenticated/quizzes/$quizId/report/")({
  head: () => ({ meta: [{ title: "Proctoring report — ProctorAI" }] }),
  component: ReportPage,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-destructive">{error.message}</div>,
});

function bandColor(band: string) {
  if (band === "high") return "destructive";
  if (band === "medium") return "default";
  return "secondary";
}

function ReportPage() {
  const { quizId } = Route.useParams();
  const { session, loading } = useCurrentUser();
  const fetchList = useServerFn(listQuizAttemptsWithRisk);

  const { data, isLoading } = useQuery({
    queryKey: ["proctor-report", quizId, session?.user?.id ?? null],
    queryFn: () => fetchList({ data: { quizId } }),
    enabled: !!session,
  });

  const [search, setSearch] = useState("");
  const [band, setBand] = useState<"all" | "low" | "medium" | "high">("all");

  const rows = useMemo(() => {
    const all = data?.rows ?? [];
    return all.filter((r) => {
      const matchesBand = band === "all" || r.risk_band === band;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (r.full_name ?? "").toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q);
      return matchesBand && matchesSearch;
    });
  }, [data, search, band]);

  const exportCsv = () => {
    const header = ["Student", "Email", "Status", "Score", "Risk score", "Risk band", "Critical events", "Started", "Submitted"];
    const lines = [header.join(",")];
    rows.forEach((r) => {
      lines.push([
        JSON.stringify(r.full_name ?? ""),
        JSON.stringify(r.email ?? ""),
        r.status,
        r.score != null && r.max_score != null ? `${r.score}/${r.max_score}` : "",
        r.risk_score,
        r.risk_band,
        r.critical_events,
        new Date(r.started_at).toISOString(),
        r.submitted_at ? new Date(r.submitted_at).toISOString() : "",
      ].join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `proctoring-report-${quizId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || isLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!data) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader role="teacher" />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Proctoring report</h1>
            <p className="text-sm text-muted-foreground">{data.quiz.title}</p>
          </div>
          <Button variant="outline" onClick={exportCsv}><Download className="mr-1 h-4 w-4" />Export CSV</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Attempts</CardTitle>
            <CardDescription>{rows.length} of {data.rows.length} shown</CardDescription>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Input placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
              <Select value={band} onValueChange={(v) => setBand(v as any)}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All risk bands</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Critical</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No matching attempts.</TableCell></TableRow>
                ) : rows.map((r) => (
                  <TableRow key={r.attempt_id}>
                    <TableCell>
                      <div className="font-medium">{r.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.email}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                    <TableCell>{r.score != null && r.max_score != null ? `${r.score}/${r.max_score}` : "—"}</TableCell>
                    <TableCell>
                      <Badge variant={bandColor(r.risk_band) as any}>{r.risk_band} · {r.risk_score}</Badge>
                    </TableCell>
                    <TableCell>{r.critical_events}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(r.started_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="ghost">
                        <Link to="/quizzes/$quizId/report/$attemptId" params={{ quizId, attemptId: r.attempt_id }}>
                          <Eye className="mr-1 h-4 w-4" />View
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
