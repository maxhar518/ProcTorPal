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

  return (
    <div className="mb-6 space-y-2">
      <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 ${
        isExpired ? "border-destructive bg-destructive/10" : 
        isWarning ? "border-yellow-500 bg-yellow-50" : 
        "border-border bg-muted/30"
      }`}>
        <Clock className={`h-5 w-5 ${
          isExpired ? "text-destructive" : 
          isWarning ? "text-yellow-600" : 
          "text-muted-foreground"
        }`} />
        <div className="flex-1">
          <div className="text-sm font-semibold">
            Time remaining: <span className={`${
              isExpired ? "text-destructive" : 
              isWarning ? "text-yellow-600" : 
              ""
            }`}>
              {minutes}:{seconds.toString().padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>
      
      {isWarning && !isExpired && (
        <Alert variant="default" className="border-yellow-500 bg-yellow-50">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
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
