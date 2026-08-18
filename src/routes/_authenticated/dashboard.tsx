import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getMyProfile } from "@/lib/auth/profile.functions";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Award,
  UserCircle,
  Users,
  ClipboardList,
  Activity,
  BarChart3,
  Loader2,
  ShieldCheck,
  ScanFace,
  MonitorSmartphone,
  ArrowRight,
  LibraryBig,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — ProctorPal" }] }),
  component: DashboardPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-destructive">Failed to load dashboard: {error.message}</div>
  ),
});

function DashboardPage() {
  const fetchProfile = useServerFn(getMyProfile);
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useCurrentUser();
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-profile", session?.user?.id ?? null],
    queryFn: () => fetchProfile(),
    enabled: !!session,
  });

  // If profile is missing entirely (e.g. signup trigger failed), send to /profile to fill it in.
  useEffect(() => {
    if (data && !data.profile) {
      navigate({ to: "/profile" });
    }
  }, [data, navigate]);

  if (sessionLoading || isLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-sm text-destructive">Error: {error.message}</div>;
  }

  const role = data?.role ?? "student";
  const name = data?.profile?.full_name || data?.profile?.email || "there";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader role={role} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome, {name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {role === "teacher"
                ? "Manage your quizzes, students, and exam sessions."
                : "View your assigned quizzes and exam history."}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1.5 text-xs font-medium text-success">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secure session active
          </div>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <StatusTile
            icon={<ScanFace className="h-4 w-4 text-info" />}
            label="Identity verification"
            value="Enabled"
            tone="info"
          />
          <StatusTile
            icon={<MonitorSmartphone className="h-4 w-4 text-primary" />}
            label="Monitoring profile"
            value="Full lockdown"
            tone="primary"
          />
          <StatusTile
            icon={<ShieldCheck className="h-4 w-4 text-success" />}
            label="Anti-cheating engine"
            value="Active"
            tone="success"
          />
        </div>

        {role === "teacher" ? <TeacherCards /> : <StudentCards />}
      </main>
    </div>
  );
}

function StatusTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "info" | "primary" | "success";
}) {
  const ring =
    tone === "success"
      ? "border-success/30 bg-success/10 text-success"
      : tone === "info"
        ? "border-info/30 bg-info/10 text-info"
        : "border-primary/30 bg-primary/10 text-primary";
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center gap-3 p-4">
        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ${ring}`}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="truncate text-sm font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function StudentCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <DashCard
        icon={<BookOpen className="h-5 w-5 text-primary" />}
        title="My quizzes"
        description="Quizzes you're enrolled in."
        cta={
          <Button asChild size="sm">
            <Link to="/my-quizzes">
              Open <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        }
      />
      <DashCard
        icon={<Award className="h-5 w-5 text-primary" />}
        title="Join a quiz"
        description="Enter an access code or scan a QR."
        cta={
          <Button asChild size="sm" variant="outline">
            <Link to="/join">Join</Link>
          </Button>
        }
      />
      <DashCard
        icon={<UserCircle className="h-5 w-5 text-primary" />}
        title="Profile"
        description="Keep your academic information up to date."
        cta={
          <Button asChild size="sm" variant="outline">
            <Link to="/profile">Edit profile</Link>
          </Button>
        }
      />
    </div>
  );
}

function TeacherCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <DashCard
        icon={<ClipboardList className="h-6 w-6 text-primary" />}
        title="Quizzes"
        description="Create, view and delete your quizzes."
        cta={
          <Button asChild size="sm">
            <Link to="/quizzes">
              Manage <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        }
      />
      <DashCard
        icon={<LibraryBig className="h-6 w-6 text-info" />}
        title="Quiz Bank"
        description="Browse bank questions, build quizzes, and generate versions."
        cta={
          <Button asChild size="sm" variant="outline">
            <Link to="/quiz-bank">Open bank</Link>
          </Button>
        }
      />
      <DashCard
        icon={<Users className="h-6 w-6 text-primary" />}
        title="Students"
        description="View enrolled students from each quiz."
        cta={
          <Button asChild size="sm" variant="outline">
            <Link to="/quizzes">Open quizzes</Link>
          </Button>
        }
      />
      <DashCard
        icon={<Activity className="h-5 w-5 text-primary" />}
        title="Live monitoring"
        description="Watch active exam sessions."
        cta={<EmptyCta label="Coming soon" />}
      />
      <DashCard
        icon={<BarChart3 className="h-6 w-6 text-primary" />}
        title="Reports"
        description="Performance and proctoring reports."
        cta={
          <Button asChild size="sm" variant="outline">
            <Link to="/reports">View</Link>
          </Button>
        }
      />
    </div>
  );
}

function DashCard({
  icon,
  title,
  description,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  cta: React.ReactNode;
}) {
  return (
    <Card className="transition-colors hover:border-primary/40">
      <CardHeader>
        <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
          {icon}
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{cta}</CardContent>
    </Card>
  );
}

function EmptyCta({ label }: { label: string }) {
  return (
    <Badge variant="secondary" className="text-xs font-normal text-muted-foreground">
      {label}
    </Badge>
  );
}
