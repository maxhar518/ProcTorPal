import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/logo";
import {
  LogOut,
  Menu,
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  LibraryBig,
  FileBarChart2,
  UserCircle,
  PlusCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Role = "student" | "teacher" | null;

const NAV_ITEMS: Record<
  "student" | "teacher",
  { label: string; to: string; icon: typeof LayoutDashboard }[]
> = {
  student: [
    { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
    { label: "My quizzes", to: "/my-quizzes", icon: BookOpen },
    { label: "Join a quiz", to: "/join", icon: PlusCircle },
    { label: "Profile", to: "/profile", icon: UserCircle },
  ],
  teacher: [
    { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
    { label: "Quizzes", to: "/quizzes", icon: ClipboardList },
    { label: "Quiz Bank", to: "/quiz-bank", icon: LibraryBig },
    { label: "Reports", to: "/reports", icon: FileBarChart2 },
    { label: "Profile", to: "/profile", icon: UserCircle },
  ],
};

export function AppHeader({ role }: { role: Role }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  }

  const items = role ? NAV_ITEMS[role] : [];

  return (
    <header className="relative z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <Logo />
        </Link>

        {/* Desktop navigation */}
        {role && (
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            {items.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2">
          {role && (
            <Badge
              variant="outline"
              className={cn(
                "hidden border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary sm:inline-flex",
              )}
            >
              {role === "teacher" ? "Instructor" : "Candidate"}
            </Badge>
          )}
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>

          {/* Mobile menu trigger */}
          {role && (
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden">
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] p-0">
                <SheetHeader className="border-b border-border px-4 py-4 text-left">
                  <SheetTitle className="flex items-center gap-2">
                    <Logo size="sm" />
                    <span className="text-sm font-semibold text-muted-foreground">
                      {role === "teacher" ? "Instructor workspace" : "Candidate workspace"}
                    </span>
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 p-3" aria-label="Mobile">
                  {items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        activeProps={{ className: "bg-primary/15 text-primary" }}
                        inactiveProps={{
                          className: "text-foreground hover:bg-accent hover:text-accent-foreground",
                        }}
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                  <Button
                    variant="ghost"
                    className="mt-2 justify-start gap-3 px-3 text-sm font-medium text-muted-foreground"
                    onClick={() => {
                      setMenuOpen(false);
                      void signOut();
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
    </header>
  );
}

function NavItem({
  label,
  to,
  icon: Icon,
}: {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
}) {
  return (
    <Link
      to={to}
      activeProps={{ className: "bg-primary/15 text-primary" }}
      inactiveProps={{
        className: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      }}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
