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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  Download,
  Eye,
  ArrowUpDown,
  ShieldAlert,
  Users,
  AlertTriangle,
  Activity,
  Search,
} from "lucide-react";
import { listQuizAttemptsWithRisk } from "@/lib/proctoring/proctoring.functions";

export const Route = createFileRoute("/_authenticated/quizzes/$quizId/report/")({
  head: () => ({ meta: [{ title: "Proctoring report — ProctorPal" }] }),
  component: ReportPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">{error.message}</div>
  ),
});

function RiskBadge({ band, score }: { band: string; score: number }) {
  const variant =
    band === "high"
      ? "outline_destructive"
      : band === "medium"
        ? "outline_warning"
        : "outline_success";
  return (
    <Badge variant={variant as any} className="gap-1">
      {band}
      <span className="opacity-70">· {score}</span>
    </Badge>
  );
}

type SortKey = "risk_score" | "critical_events" | "score" | "started_at";

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
  const [sortKey, setSortKey] = useState<SortKey>("risk_score");
  const [sortAsc, setSortAsc] = useState(false);

  const allRows = data?.rows ?? [];

  const stats = useMemo(() => {
    const total = allRows.length;
    const highRisk = allRows.filter((r) => r.risk_band === "high").length;
    const mediumRisk = allRows.filter((r) => r.risk_band === "medium").length;
    const totalCritical = allRows.reduce((sum, r) => sum + r.critical_events, 0);
    const avgScore = total > 0 ? allRows.reduce((sum, r) => sum + (r.score ?? 0), 0) / total : 0;
    return { total, highRisk, mediumRisk, totalCritical, avgScore };
  }, [allRows]);

  const rows = useMemo(() => {
    const filtered = allRows.filter((r) => {
      const matchesBand = band === "all" || r.risk_band === band;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (r.full_name ?? "").toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.student_id_value ?? "").toLowerCase().includes(q);
      return matchesBand && matchesSearch;
    });

    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "risk_score":
          cmp = a.risk_score - b.risk_score;
          break;
        case "critical_events":
          cmp = a.critical_events - b.critical_events;
          break;
        case "score":
          cmp = (a.score ?? 0) - (b.score ?? 0);
          break;
        case "started_at":
          cmp = new Date(a.started_at).getTime() - new Date(b.started_at).getTime();
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return filtered;
  }, [allRows, search, band, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const SortableHead = ({ label, sortField }: { label: string; sortField: SortKey }) => (
    <TableHead>
      <button
        onClick={() => toggleSort(sortField)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label}
        <ArrowUpDown
          className={`h-3 w-3 ${sortKey === sortField ? "text-foreground" : "text-muted-foreground"}`}
        />
      </button>
    </TableHead>
  );

  const exportCsv = () => {
    const header = [
      "Student",
      "Student ID",
      "Email",
      "Status",
      "Score",
      "Risk score",
      "Risk band",
      "Critical events",
      "Started",
      "Submitted",
    ];
    const lines = [header.join(",")];
    rows.forEach((r) => {
      lines.push(
        [
          JSON.stringify(r.full_name ?? ""),
          JSON.stringify(r.student_id_value ?? ""),
          JSON.stringify(r.email ?? ""),
          r.status,
          r.score != null && r.max_score != null ? `${r.score}/${r.max_score}` : "",
          r.risk_score,
          r.risk_band,
          r.critical_events,
          new Date(r.started_at).toISOString(),
          r.submitted_at ? new Date(r.submitted_at).toISOString() : "",
        ].join(","),
      );
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
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader role="teacher" />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Proctoring report</h1>
            <p className="mt-1 text-sm text-muted-foreground">{data.quiz.title}</p>
          </div>
          <Button variant="outline" onClick={exportCsv}>
            <Download className="mr-1 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Summary stats */}
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Users className="h-4 w-4 text-info" />}
            label="Total attempts"
            value={stats.total}
            sub={stats.total > 0 ? `Avg score ${Math.round(stats.avgScore * 10) / 10}` : undefined}
            tone="info"
          />
          <StatCard
            icon={<ShieldAlert className="h-4 w-4 text-destructive" />}
            label="High risk"
            value={stats.highRisk}
            sub={
              stats.total > 0
                ? `${Math.round((stats.highRisk / stats.total) * 100)}% of attempts`
                : undefined
            }
            tone="danger"
          />
          <StatCard
            icon={<AlertTriangle className="h-4 w-4 text-warning" />}
            label="Medium risk"
            value={stats.mediumRisk}
            sub={
              stats.total > 0
                ? `${Math.round((stats.mediumRisk / stats.total) * 100)}% of attempts`
                : undefined
            }
            tone="warning"
          />
          <StatCard
            icon={<Activity className="h-4 w-4 text-primary" />}
            label="Total critical events"
            value={stats.totalCritical}
            tone="primary"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Attempts</CardTitle>
            <CardDescription>
              {rows.length} of {data.rows.length} shown
            </CardDescription>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="relative max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search name, email, or student ID"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={band} onValueChange={(v) => setBand(v as any)}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
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
                  <SortableHead label="Score" sortField="score" />
                  <SortableHead label="Risk" sortField="risk_score" />
                  <SortableHead label="Critical" sortField="critical_events" />
                  <SortableHead label="Started" sortField="started_at" />
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No matching attempts.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow
                      key={r.attempt_id}
                      className={r.risk_band === "high" ? "bg-destructive/5" : undefined}
                    >
                      <TableCell>
                        <div className="font-medium">{r.full_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{r.email || "—"}</div>
                        <div className="text-[11px] text-muted-foreground">
                          ID: {r.student_id_value || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.status}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {r.score != null && r.max_score != null ? `${r.score}/${r.max_score}` : "—"}
                      </TableCell>
                      <TableCell>
                        <RiskBadge band={r.risk_band} score={r.risk_score} />
                      </TableCell>
                      <TableCell>
                        {r.critical_events > 0 ? (
                          <span className="font-semibold text-destructive">
                            {r.critical_events}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{r.critical_events}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(r.started_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button asChild size="sm" variant="ghost">
                          <Link
                            to="/quizzes/$quizId/report/$attemptId"
                            params={{ quizId, attemptId: r.attempt_id }}
                          >
                            <Eye className="mr-1 h-4 w-4" />
                            View
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
  tone: "primary" | "info" | "danger" | "warning";
}) {
  const tile =
    tone === "danger"
      ? "bg-destructive/10 text-destructive ring-1 ring-destructive/20"
      : tone === "warning"
        ? "bg-warning/10 text-warning ring-1 ring-warning/20"
        : tone === "info"
          ? "bg-info/10 text-info ring-1 ring-info/20"
          : "bg-primary/10 text-primary ring-1 ring-primary/20";
  const valueColor =
    tone === "danger"
      ? "text-destructive"
      : tone === "warning"
        ? "text-warning"
        : "text-foreground";
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tile}`}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
          {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
