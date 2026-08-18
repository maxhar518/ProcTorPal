import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { GraduationCap, UserCog } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "./login";

const STUDENT_ID_PATTERN = /^[A-Z]{3}-\d{2}[A-Z]-\d{3}$/i;

function normalizeStudentId(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign up — ProctorPal" }] }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [studentId, setStudentId] = useState("");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    const normalizedStudentId = role === "student" ? normalizeStudentId(studentId) : null;
    if (role === "student") {
      if (!normalizedStudentId) {
        toast.error("Student ID is required for student accounts.");
        return;
      }
      if (!STUDENT_ID_PATTERN.test(normalizedStudentId)) {
        toast.error("Student ID must use the format ABC-00A-000.");
        return;
      }
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName, role, student_id: normalizedStudentId },
      },
    });
    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }
    // Emails are auto-confirmed — sign in immediately if no session was returned.
    if (!data.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setLoading(false);
        toast.error(signInError.message);
        navigate({ to: "/login" });
        return;
      }
    }
    setLoading(false);
    toast.success("Account created. Welcome!");
    navigate({ to: "/dashboard" });
  }

  return (
    <AuthShell title="Create your ProctorPal account" subtitle="Choose your role to get started.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full name</Label>
          <Input
            id="fullName"
            required
            maxLength={120}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">At least 6 characters.</p>
        </div>
        {role === "student" && (
          <div className="space-y-2">
            <Label htmlFor="studentId">Student ID</Label>
            <Input
              id="studentId"
              required
              placeholder="ABC-00A-000"
              value={studentId}
              onChange={(e) => setStudentId(normalizeStudentId(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">Use the format ABC-00A-000.</p>
          </div>
        )}
        <div className="space-y-2">
          <Label>I am a…</Label>
          <RadioGroup
            value={role}
            onValueChange={(v) => setRole(v as "student" | "teacher")}
            className="grid grid-cols-2 gap-2"
          >
            <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-border p-4 text-sm font-medium transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/10">
              <GraduationCap className="h-5 w-5 text-primary" />
              <span>Student</span>
              <RadioGroupItem value="student" className="sr-only" />
            </label>
            <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-border p-4 text-sm font-medium transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/10">
              <UserCog className="h-5 w-5 text-primary" />
              <span>Teacher</span>
              <RadioGroupItem value="teacher" className="sr-only" />
            </label>
          </RadioGroup>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="text-primary hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
