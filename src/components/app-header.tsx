import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, LogOut, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

export function AppHeader({ role }: { role: "student" | "teacher" | null }) {
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  }

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="h-5 w-5 text-primary" />
          ProctorAI
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard">Dashboard</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/profile">
              <UserIcon className="mr-1 h-4 w-4" />
              Profile
            </Link>
          </Button>
          {role && (
            <span className="hidden rounded-md bg-accent px-2 py-1 text-xs font-medium uppercase text-accent-foreground sm:inline">
              {role}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="mr-1 h-4 w-4" /> Sign out
          </Button>
        </nav>
      </div>
    </header>
  );
}
