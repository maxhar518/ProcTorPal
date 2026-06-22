import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Eye, GraduationCap, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ProctorAI — AI-Powered Online Exam Proctoring" },
      {
        name: "description",
        content:
          "Secure online quizzes and exams with AI-powered proctoring. Built for students and teachers.",
      },
      { property: "og:title", content: "ProctorAI — AI-Powered Online Exam Proctoring" },
      {
        property: "og:description",
        content:
          "Secure online quizzes and exams with AI-powered proctoring. Built for students and teachers.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-5 w-5 text-primary" />
            ProctorAI
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/login">Log in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/signup">Sign up</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Secure online exams with AI-powered proctoring
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            ProctorAI gives teachers a complete quiz and proctoring platform, and students a
            simple, fair place to take their exams.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/signup">Get started</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/login">I already have an account</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-6 sm:grid-cols-3">
            <FeatureCard
              icon={<GraduationCap className="h-5 w-5 text-primary" />}
              title="For students"
              text="Take assigned quizzes, track results, and manage your profile in one place."
            />
            <FeatureCard
              icon={<Users className="h-5 w-5 text-primary" />}
              title="For teachers"
              text="Create quizzes, assign them to classes, and monitor exam integrity."
            />
            <FeatureCard
              icon={<Eye className="h-5 w-5 text-primary" />}
              title="AI proctoring"
              text="Webcam monitoring, focus tracking, and full-screen enforcement during exams."
            />
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-6 text-sm text-muted-foreground">
          © {new Date().getFullYear()} ProctorAI
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-accent">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
