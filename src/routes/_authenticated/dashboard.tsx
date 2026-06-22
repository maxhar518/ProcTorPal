import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getMyProfile } from "@/lib/auth/profile.functions";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  Award,
  UserCircle,
  Users,
  ClipboardList,
  Activity,
  BarChart3,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — ProctorAI" }] }),
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
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">Welcome, {name}</h1>
          <p className="text-sm text-muted-foreground">
            {role === "teacher"
              ? "Manage your quizzes, students, and exam sessions."
              : "View your assigned quizzes and exam history."}
          </p>
        </div>

        {role === "teacher" ? <TeacherCards /> : <StudentCards />}
      </main>
    </div>
  );
}

function StudentCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <DashCard
        icon={<BookOpen className="h-5 w-5 text-primary" />}
        title="My quizzes"
        description="Quizzes you're enrolled in."
        cta={<Button asChild size="sm"><Link to="/my-quizzes">Open</Link></Button>}
      />
      <DashCard
        icon={<Award className="h-5 w-5 text-primary" />}
        title="Join a quiz"
        description="Enter an access code or scan a QR."
        cta={<Button asChild size="sm" variant="outline"><Link to="/join">Join</Link></Button>}
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <DashCard
        icon={<ClipboardList className="h-5 w-5 text-primary" />}
        title="Quizzes"
        description="Create and manage your quizzes."
        cta={<Button asChild size="sm"><Link to="/quizzes">Manage</Link></Button>}
      />
      <DashCard
        icon={<Users className="h-5 w-5 text-primary" />}
        title="Students"
        description="View enrolled students from each quiz."
        cta={<Button asChild size="sm" variant="outline"><Link to="/quizzes">Open quizzes</Link></Button>}
      />
      <DashCard
        icon={<Activity className="h-5 w-5 text-primary" />}
        title="Live monitoring"
        description="Watch active exam sessions."
        cta={<EmptyCta label="Coming soon" />}
      />
      <DashCard
        icon={<BarChart3 className="h-5 w-5 text-primary" />}
        title="Reports"
        description="Performance and proctoring reports."
        cta={<EmptyCta label="Coming soon" />}
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
    <Card>
      <CardHeader>
        <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-md bg-accent">
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
  return <p className="text-sm text-muted-foreground">{label}</p>;
}
