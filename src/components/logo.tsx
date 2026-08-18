import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  size = "md",
  showWordmark = true,
  className,
}: {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
}) {
  const mark =
    size === "lg"
      ? "h-10 w-10 rounded-xl"
      : size === "sm"
        ? "h-6 w-6 rounded-md"
        : "h-8 w-8 rounded-lg";
  const icon = size === "lg" ? "h-5 w-5" : size === "sm" ? "h-3.5 w-3.5" : "h-4.5 w-4.5";
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-base";

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "inline-flex items-center justify-center bg-gradient-to-br from-primary via-primary to-info text-primary-foreground shadow-lg shadow-primary/25 ring-1 ring-white/10",
          mark,
        )}
      >
        <ShieldCheck className={cn(icon, "text-white")} strokeWidth={2.25} />
      </span>
      {showWordmark && (
        <span className={cn("font-bold tracking-tight", text)}>
          Proctor<span className="text-primary">Pal</span>
        </span>
      )}
    </span>
  );
}
