import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { ScanFace, MonitorSmartphone, ShieldCheck, Lock, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/login")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [{ title: "Log in — ProctorPal" }],
  }),
  component: LoginPage,
});

const STUDENT_ID_PATTERN = /^[A-Z]{3}-\d{2}[A-Z]-\d{3}$/i;

function LoginPage() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/login" });
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) {
      toast.error("Please enter your email or student ID.");
      return;
    }

    setLoading(true);

    let emailToUse = trimmedIdentifier;
    if (STUDENT_ID_PATTERN.test(trimmedIdentifier.toUpperCase())) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("email")
        .eq("student_id", trimmedIdentifier.toUpperCase())
        .maybeSingle();

      if (profileError) {
        setLoading(false);
        toast.error(profileError.message);
        return;
      }

      if (profileData?.email) {
        emailToUse = profileData.email;
      }
    }

    const { error } = await supabase.auth.signInWithPassword({ email: emailToUse, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back!");
    navigate({ to: redirect ?? "/dashboard" });
  }

  return (
    <AuthShell
      title="Log in to ProctorPal"
      subtitle="Welcome back. Enter your credentials to continue."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="identifier">Email or Student ID</Label>
          <Input
            id="identifier"
            required
            autoComplete="email"
            placeholder="teacher@example.com or ABC-00A-000"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <div className="mt-4 flex items-center justify-between text-sm">
        <Link to="/forgot-password" className="text-primary hover:underline">
          Forgot password?
        </Link>
        <Link to="/signup" className="text-primary hover:underline">
          Create account
        </Link>
      </div>
    </AuthShell>
  );
}

const BRAND_POINTS = [
  {
    icon: <ScanFace className="h-4 w-4 text-info" />,
    text: "AI face verification and continuous identity monitoring",
  },
  {
    icon: <MonitorSmartphone className="h-4 w-4 text-info" />,
    text: "Fullscreen lockdown with focus and tab-switch detection",
  },
  {
    icon: <ShieldCheck className="h-4 w-4 text-success" />,
    text: "Real-time suspicious activity alerts for instructors",
  },
];

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-glow-primary">
      {/* Brand panel */}
      <aside className="relative hidden w-[44%] flex-col justify-between overflow-hidden border-r border-border bg-card/40 p-10 lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-security-grid [mask-image:radial-gradient(80%_70%_at_30%_20%,black,transparent)]" />
        <div className="pointer-events-none absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <Logo size="lg" />
        </div>
        <div className="relative space-y-6">
          <h2 className="text-3xl font-bold leading-tight tracking-tight">
            Examinations monitored with{" "}
            <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">
              security-grade precision
            </span>
          </h2>
          <ul className="space-y-3">
            {BRAND_POINTS.map((p) => (
              <li key={p.text} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 ring-1 ring-primary/20">
                  {p.icon}
                </span>
                {p.text}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5 text-success" />
          Protected by end-to-end secure session infrastructure
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center lg:hidden">
            <Logo size="lg" />
          </div>
          <div className="rounded-2xl border border-border bg-card p-8 shadow-xl shadow-black/30">
            <Link
              to="/"
              className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" /> Back home
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
