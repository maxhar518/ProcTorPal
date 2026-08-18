import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Eye,
  GraduationCap,
  Users,
  ScanFace,
  MonitorSmartphone,
  BellRing,
  Lock,
  ArrowRight,
  CheckCircle2,
  Radar,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ProctorPal — AI-Powered Online Exam Proctoring" },
      {
        name: "description",
        content:
          "Secure online quizzes and exams with AI-powered proctoring. Built for students and instructors.",
      },
      { property: "og:title", content: "ProctorPal — AI-Powered Online Exam Proctoring" },
      {
        property: "og:description",
        content:
          "Secure online quizzes and exams with AI-powered proctoring. Built for students and instructors.",
      },
    ],
  }),
  component: Landing,
});

const CAPABILITIES = [
  {
    icon: <ScanFace className="h-5 w-5 text-info" />,
    title: "Face verification",
    text: "Identity snapshots at start, plus continuous face detection throughout every assessment.",
  },
  {
    icon: <MonitorSmartphone className="h-5 w-5 text-info" />,
    title: "Fullscreen lockdown",
    text: "Exams run in fullscreen. Tab switches, focus loss, and blocked shortcuts are recorded.",
  },
  {
    icon: <Eye className="h-5 w-5 text-info" />,
    title: "AI activity monitoring",
    text: "Real-time detection of suspicious behaviour — multiple faces, hidden devices, and more.",
  },
  {
    icon: <BellRing className="h-5 w-5 text-warning" />,
    title: "Live alerts",
    text: "Instructors receive clear risk signals per candidate so violations never slip through.",
  },
  {
    icon: <Lock className="h-5 w-5 text-success" />,
    title: "Privacy-first",
    text: "Only authorized instructors see session evidence. Data is protected by strict access rules.",
  },
  {
    icon: <Radar className="h-5 w-5 text-primary" />,
    title: "Detailed reports",
    text: "Per-attempt timelines, snapshots, and risk scoring turn raw events into clear decisions.",
  },
];

const STATS = [
  { value: "24/7", label: "AI monitoring" },
  { value: "6s", label: "Snapshot cadence" },
  { value: "3x", label: "Risk bands" },
  { value: "100%", label: "Secure sessions" },
];

function Landing() {
  return (
    <div className="min-h-screen bg-glow-primary text-foreground">
      <header className="relative z-10 border-b border-border/70 bg-background/60 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo />
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
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-security-grid [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]" />
          <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-20 text-center sm:pt-24">
            <Badge variant="outline_info" className="mx-auto mb-6 px-3 py-1 text-xs">
              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
              AI-powered anti-cheating proctoring
            </Badge>
            <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-[3.4rem] lg:leading-[1.1]">
              Secure online exams with{" "}
              <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">
                AI-powered proctoring
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              ProctorPal gives instructors a complete quiz and proctoring platform, and candidates a
              simple, fair place to take their exams — monitored, verified, and protected.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link to="/signup">
                  Get started <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link to="/login">I already have an account</Link>
              </Button>
            </div>

            {/* Stats strip */}
            <div className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
              {STATS.map((s) => (
                <div key={s.label} className="bg-card px-4 py-5">
                  <div className="text-2xl font-bold text-primary">{s.value}</div>
                  <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Capabilities */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Proctoring that works like a security team
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
              Every assessment is treated like a high-stakes exam. Detection, prevention, and clear
              evidence — all in one platform.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </section>

        {/* Roles */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-6 md:grid-cols-3">
            <RoleCard
              icon={<GraduationCap className="h-5 w-5 text-primary" />}
              title="For candidates"
              text="Take assigned quizzes, track results, and manage your profile — in a distraction-free, monitored environment."
            />
            <RoleCard
              icon={<Users className="h-5 w-5 text-primary" />}
              title="For instructors"
              text="Create quizzes, assign them to classes, release results, and monitor exam integrity at a glance."
            />
            <RoleCard
              icon={<Eye className="h-5 w-5 text-primary" />}
              title="AI proctoring"
              text="Webcam monitoring, focus tracking, fullscreen enforcement, and risk scoring during exams."
            />
          </div>
        </section>

        {/* Trust band */}
        <section className="border-t border-border bg-card/40">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-14 text-center">
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">Built for academic integrity</span>
            </div>
            <h2 className="max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl">
              Ready to run your first secure assessment?
            </h2>
            <p className="max-w-xl text-sm text-muted-foreground">
              Create a free account and start building proctored quizzes in minutes.
            </p>
            <Button asChild size="lg">
              <Link to="/signup">
                Create your account <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-6 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} ProctorPal</span>
          <span className="inline-flex items-center gap-1.5 text-xs">
            <Lock className="h-3.5 w-3.5 text-success" /> Secure exam infrastructure
          </span>
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
    <div className="group rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/40 hover:bg-card/80">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function RoleCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-secondary">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
