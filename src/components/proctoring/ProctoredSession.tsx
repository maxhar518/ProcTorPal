import { useState, useEffect, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  ShieldAlert,
  Video,
  Maximize,
  Loader2,
  ScanFace,
  MonitorSmartphone,
  FileWarning,
  Eye,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { recordConsent } from "@/lib/proctoring/proctoring.functions";
import { useLockdown } from "@/lib/proctoring/use-lockdown";
import { useWebcamProctor } from "@/lib/proctoring/use-webcam-proctor";

export function ProctoredSession({
  attemptId,
  children,
}: {
  attemptId: string | undefined;
  children: ReactNode;
}) {
  const [consented, setConsented] = useState(false);
  const [verificationCaptured, setVerificationCaptured] = useState(false);
  const [capturingVerification, setCapturingVerification] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [starting, setStarting] = useState(false);
  const consent = useServerFn(recordConsent);
  const cam = useWebcamProctor(attemptId);
  const consentM = useMutation({
    mutationFn: () => consent({ data: { attemptId: attemptId! } }),
    onError: (e: Error) => toast.error(e.message),
  });

  const handleStart = async () => {
    if (!attemptId) return;
    setStarting(true);
    try {
      await cam.requestAccess();
      await consentM.mutateAsync();
      setAccepted(true);
    } catch (error: any) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Camera access is required to start this quiz.");
      }
      cam.stop();
    } finally {
      setStarting(false);
    }
  };

  // Ensure video displays when verification screen mounts
  useEffect(() => {
    if (!accepted || verificationCaptured) return;

    // Give React time to mount the video element, then re-attach stream
    const timeout = setTimeout(() => {
      cam.reattachStream?.();
    }, 100);

    return () => clearTimeout(timeout);
  }, [accepted, verificationCaptured, cam]);

  const handleCaptureVerification = async () => {
    setCapturingVerification(true);
    try {
      const result = await cam.captureVerification();
      if (result?.success) {
        setVerificationCaptured(true);
        toast.success("Verification image captured successfully!");
      } else {
        const errorMsg = result?.error ?? "Failed to capture verification image. Please try again.";
        toast.error(errorMsg);
      }
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to capture verification image. Please try again.");
    } finally {
      setCapturingVerification(false);
    }
  };

  // Request fullscreen when accepted
  useEffect(() => {
    if (accepted) {
      const enterFullscreen = async () => {
        try {
          // Wait a bit to ensure user gesture context isn't completely lost
          await new Promise((resolve) => setTimeout(resolve, 100));
          if (document.fullscreenElement === null) {
            await document.documentElement.requestFullscreen();
          }
        } catch (error: any) {
          // Silently ignore - fullscreen requires direct user gesture
          // User can still use the quiz, just not in fullscreen
          if (error?.name !== "NotAllowedError") {
            console.warn("[ProctoredSession] Fullscreen request failed:", error?.message);
          }
        }
      };
      enterFullscreen();
    }
  }, [accepted]);

  if (!attemptId) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!accepted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border bg-primary/5">
            <div className="mb-2 flex items-center gap-2 text-primary">
              <ShieldAlert className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-wider">
                Proctored assessment
              </span>
            </div>
            <CardTitle className="text-xl">Before you start</CardTitle>
            <CardDescription>
              This quiz is monitored. Please review and accept the conditions below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-xl border border-border bg-secondary/30 p-3">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info/10 ring-1 ring-info/20">
                  <Video className="h-4 w-4 text-info" />
                </span>
                <div>
                  <b>Webcam monitoring.</b>
                  <p className="mt-0.5 text-muted-foreground">
                    Your camera will be enabled and a snapshot captured every 6 seconds, plus one
                    verification snapshot at the start.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-border bg-secondary/30 p-3">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
                  <Maximize className="h-4 w-4 text-primary" />
                </span>
                <div>
                  <b>Fullscreen mode.</b>
                  <p className="mt-0.5 text-muted-foreground">
                    The quiz runs in fullscreen. Leaving fullscreen, switching tabs, or losing focus
                    will be logged.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-border bg-secondary/30 p-3">
                <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/10 ring-1 ring-warning/20">
                  <FileWarning className="h-4 w-4 text-warning" />
                </span>
                <div>
                  <b>Activity logging.</b>
                  <p className="mt-0.5 text-muted-foreground">
                    Right-click, copy/paste, common dev-tools shortcuts, and tab switches are
                    blocked and/or logged.
                  </p>
                </div>
              </div>
            </div>

            <Alert variant="info">
              <Lock className="h-4 w-4" />
              <AlertTitle>Browser limitations</AlertTitle>
              <AlertDescription className="text-xs">
                Some OS-level shortcuts (Alt+Tab, Windows key, Task Manager) cannot be blocked by a
                web browser. Attempted use, focus loss, and similar events are detected and reported
                to your instructor.
              </AlertDescription>
            </Alert>

            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-3 transition-colors has-[:checked]:border-primary/50 has-[:checked]:bg-primary/5">
              <Checkbox
                checked={consented}
                onCheckedChange={(c) => setConsented(!!c)}
                className="mt-0.5"
              />
              <span>
                I consent to webcam capture, fullscreen mode, and activity logging for this
                assessment.
              </span>
            </label>

            <Button
              className="w-full"
              size="lg"
              disabled={!consented || consentM.isPending || starting}
              onClick={handleStart}
            >
              {starting || consentM.isPending ? "Starting…" : "Start proctored quiz"}
            </Button>
            {cam.status === "requesting" && (
              <p className="mt-3 text-sm text-muted-foreground">
                Requesting camera access now. Please allow the browser prompt.
              </p>
            )}
            {cam.status === "denied" && (
              <Alert className="mt-3" variant="destructive">
                <AlertTitle>Camera permission required</AlertTitle>
                <AlertDescription>
                  This assessment requires camera access. Please enable camera permission in your
                  browser and try again.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verification capture screen
  if (!verificationCaptured) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border bg-primary/5">
            <div className="mb-2 flex items-center gap-2 text-info">
              <ScanFace className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-wider">
                Identity verification
              </span>
            </div>
            <CardTitle className="text-xl">Capture your verification image</CardTitle>
            <CardDescription>
              Please position yourself clearly in the camera and click the button to capture your
              photo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4">
              {/* Live camera feed */}
              <div className="relative overflow-hidden rounded-xl border-2 border-primary/40 bg-black shadow-lg">
                <video
                  ref={cam.videoRef}
                  muted
                  autoPlay
                  playsInline
                  style={{
                    objectFit: "contain",
                    display: "block",
                    width: "100%",
                    height: "100%",
                  }}
                  className="w-full aspect-video"
                />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-400 ring-1 ring-red-400/40">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                  Live
                </span>
              </div>

              {/* Camera status */}
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-secondary/30 p-3 text-sm">
                <Badge
                  variant={
                    cam.status === "ready"
                      ? "outline_success"
                      : cam.status === "denied"
                        ? "outline_destructive"
                        : "outline_warning"
                  }
                  className="gap-1.5"
                >
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${cam.status === "ready" ? "bg-success" : cam.status === "denied" ? "bg-destructive" : "bg-warning"}`}
                  />
                  Camera: {cam.status}
                </Badge>
                {cam.lastFace !== "unknown" && (
                  <Badge
                    variant={
                      cam.lastFace === "ok"
                        ? "outline_success"
                        : cam.lastFace === "multiple"
                          ? "outline_destructive"
                          : "outline_warning"
                    }
                  >
                    Face: {cam.lastFace}
                  </Badge>
                )}
                {cam.status !== "ready" && (
                  <span className="text-xs text-muted-foreground">
                    Initializing camera... please wait
                  </span>
                )}
              </div>

              {/* Capture button */}
              <Button
                size="lg"
                onClick={handleCaptureVerification}
                disabled={cam.status !== "ready" || capturingVerification}
                className="w-full"
              >
                {capturingVerification ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Capturing...
                  </>
                ) : cam.status !== "ready" ? (
                  "Waiting for camera..."
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Capture Verification Image
                  </>
                )}
              </Button>

              {/* Instructions */}
              <Alert variant="info">
                <MonitorSmartphone className="h-4 w-4" />
                <AlertTitle>Tips for good photo</AlertTitle>
                <AlertDescription className="space-y-1 text-xs">
                  <div>• Make sure your face is clearly visible and well-lit</div>
                  <div>• Position yourself facing the camera directly</div>
                  <div>• Remove any objects blocking your face</div>
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ProctoredRunner attemptId={attemptId} cam={cam}>
      {children}
    </ProctoredRunner>
  );
}

function StatusPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "ok" | "warn" | "danger" | "neutral";
}) {
  const dot =
    tone === "ok"
      ? "bg-success"
      : tone === "danger"
        ? "bg-destructive"
        : tone === "warn"
          ? "bg-warning"
          : "bg-muted-foreground/60";
  const text =
    tone === "ok"
      ? "text-success"
      : tone === "danger"
        ? "text-destructive"
        : tone === "warn"
          ? "text-warning"
          : "text-muted-foreground";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dot}`} />
      <span className="text-muted-foreground">{label}:</span>
      <span className={`font-semibold capitalize ${text}`}>{value}</span>
    </span>
  );
}

function faceTone(face: string): "ok" | "warn" | "danger" | "neutral" {
  if (face === "ok") return "ok";
  if (face === "multiple") return "danger";
  if (face === "missing") return "warn";
  return "neutral";
}

function ProctoredRunner({
  attemptId,
  cam,
  children,
}: {
  attemptId: string;
  cam: ReturnType<typeof useWebcamProctor>;
  children: ReactNode;
}) {
  const lockdown = useLockdown(attemptId, true);
  const [showViolationAlert, setShowViolationAlert] = useState(false);

  // Reattach stream when ProctoredRunner mounts (verification screen's video just unmounted)
  useEffect(() => {
    const timeout = setTimeout(() => {
      cam.reattachStream?.();
    }, 100);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const hasViolation =
      cam.lastFace === "multiple" || cam.lastFace === "missing" || cam.lastObject === "phone";
    if (hasViolation) {
      setShowViolationAlert(true);
      return;
    }
    if (cam.lastFace === "ok" && cam.lastObject !== "phone") {
      setShowViolationAlert(false);
    }
  }, [cam.lastFace, cam.lastObject]);

  return (
    <div className="select-none" style={{ userSelect: "none" }}>
      {/* Top status bar */}
      <div className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-2 border-b border-border bg-background/90 px-3 py-2 text-xs backdrop-blur">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusPill
            label="Camera"
            value={cam.status}
            tone={
              cam.status === "ready"
                ? "ok"
                : cam.status === "denied" || cam.status === "disconnected"
                  ? "danger"
                  : "warn"
            }
          />
          {cam.lastFace !== "unknown" && (
            <StatusPill label="Face" value={cam.lastFace} tone={faceTone(cam.lastFace)} />
          )}
          {cam.lastObject !== "unknown" && (
            <StatusPill
              label="Object"
              value={cam.lastObject}
              tone={cam.lastObject === "phone" ? "danger" : "neutral"}
            />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusPill
            label="Fullscreen"
            value={lockdown.fullscreen ? "on" : "off"}
            tone={lockdown.fullscreen ? "ok" : "danger"}
          />
          {!lockdown.fullscreen && (
            <Button size="sm" variant="outline" onClick={() => lockdown.enterFullscreen()}>
              <Maximize className="mr-1 h-3 w-3" /> Re-enter fullscreen
            </Button>
          )}
        </div>
      </div>

      {lockdown.shortcutBlocked && (
        <div className="fixed left-1/2 top-16 z-50 -translate-x-1/2 rounded-lg bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground shadow-lg">
          Shortcut blocked: {lockdown.shortcutBlocked}
        </div>
      )}

      {/* Face detection alerts */}
      {showViolationAlert && cam.lastFace === "multiple" && (
        <div className="fixed left-1/2 top-24 z-50 w-[min(640px,90%)] -translate-x-1/2">
          <Alert variant="destructive">
            <AlertTitle>Multiple faces detected</AlertTitle>
            <AlertDescription>
              Only one person is allowed during this assessment. Multiple faces were detected and
              this has been logged.
            </AlertDescription>
          </Alert>
        </div>
      )}
      {showViolationAlert && cam.lastFace === "missing" && (
        <div className="fixed left-1/2 top-24 z-50 w-[min(640px,90%)] -translate-x-1/2">
          <Alert variant="warning">
            <AlertTitle>Face not detected</AlertTitle>
            <AlertDescription>
              Your face is not visible. Please position yourself so your face is clearly visible to
              the camera.
            </AlertDescription>
          </Alert>
        </div>
      )}
      {showViolationAlert && cam.lastObject === "phone" && (
        <div className="fixed left-1/2 top-24 z-50 w-[min(640px,90%)] -translate-x-1/2">
          <Alert variant="destructive">
            <AlertTitle>Phone detected in view</AlertTitle>
            <AlertDescription>
              A mobile phone or small device was detected in the camera frame. This is logged as a
              proctoring violation.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {cam.status === "denied" && (
        <div className="m-4">
          <Alert variant="destructive">
            <AlertTitle>Camera permission denied</AlertTitle>
            <AlertDescription>
              This assessment requires camera access. Please enable camera permission in your
              browser and refresh the page.
            </AlertDescription>
          </Alert>
        </div>
      )}
      {cam.isMobile && (
        <div className="m-4">
          <Alert variant="warning">
            <AlertTitle>Mobile device detected</AlertTitle>
            <AlertDescription>
              This assessment is intended for desktop/laptop devices. Mobile devices may produce
              unreliable proctoring results.
            </AlertDescription>
          </Alert>
        </div>
      )}
      {cam.status === "disconnected" && (
        <div className="m-4">
          <Alert variant="destructive">
            <AlertTitle>Camera disconnected</AlertTitle>
            <AlertDescription>
              The camera stream was lost. Reconnect your camera and refresh to continue.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {!lockdown.fullscreen && (
        <div className="m-4">
          <Alert variant="warning">
            <AlertTitle>Fullscreen required</AlertTitle>
            <AlertDescription>
              Return to fullscreen to continue. This event has been logged.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Hidden video for capture + small preview */}
      <div className="fixed bottom-3 right-3 z-40 h-24 w-32 overflow-hidden rounded-lg border-2 border-primary/60 bg-black shadow-xl">
        <video
          ref={cam.videoRef}
          muted
          playsInline
          autoPlay
          style={{ objectFit: "cover", width: "100%", height: "100%" }}
        />
        <span className="pointer-events-none absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-400">
          <span className="h-1 w-1 animate-pulse rounded-full bg-red-500" /> Live
        </span>
      </div>

      {children}
    </div>
  );
}
