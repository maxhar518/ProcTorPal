import { useEffect, useState } from "react";
import { AlertCircle, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface QuizTimerProps {
  timeLimit: number | null | undefined; // in minutes
  onTimeUp: () => void;
}

export function QuizTimer({ timeLimit, onTimeUp }: QuizTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    if (!timeLimit) return;

    // Initialize with time limit in seconds
    setSecondsLeft(timeLimit * 60);
  }, [timeLimit]);

  useEffect(() => {
    if (secondsLeft === null) return;

    if (secondsLeft <= 0) {
      onTimeUp();
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null) return null;
        const next = prev - 1;

        // Set warning at 5 minutes remaining
        if (next === 300) {
          setIsWarning(true);
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, onTimeUp]);

  if (secondsLeft === null) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const isExpired = secondsLeft <= 0;

  const tone = isExpired
    ? "border-destructive/50 bg-destructive/10 text-destructive"
    : isWarning
      ? "border-warning/40 bg-warning/10 text-warning"
      : "border-border bg-secondary/40 text-foreground";

  return (
    <div className="mb-6 space-y-2">
      <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-sm ${tone}`}>
        <Clock
          className={`h-5 w-5 ${isExpired ? "text-destructive" : isWarning ? "text-warning" : "text-primary"}`}
        />
        <div className="flex-1">
          <div className="text-sm font-semibold">
            Time remaining:{" "}
            <span className="font-mono text-base font-bold tracking-wide tabular-nums">
              {minutes}:{seconds.toString().padStart(2, "0")}
            </span>
          </div>
        </div>
        {isWarning && !isExpired && (
          <span className="hidden rounded-md bg-warning/20 px-2 py-0.5 text-xs font-medium uppercase tracking-wide sm:inline">
            Warning
          </span>
        )}
      </div>

      {isWarning && !isExpired && (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have 5 minutes remaining. Make sure to submit your answers before time runs out.
          </AlertDescription>
        </Alert>
      )}

      {isExpired && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Time's up! Your quiz has been automatically submitted.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
