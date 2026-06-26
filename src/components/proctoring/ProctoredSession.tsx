import { useState, useEffect, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert, Video, Maximize, Loader2 } from "lucide-react";
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

  // Request fullscreen when accepted
  useEffect(() => {
    if (accepted) {
      const enterFullscreen = async () => {
        try {
          await document.documentElement.requestFullscreen();
        } catch (error) {
          toast.warning("Fullscreen could not be entered automatically. Use the button at the top of the page.");
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
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Card>
          <CardHeader>
            <div className="mb-2 flex items-center gap-2 text-primary"><ShieldAlert className="h-5 w-5" /> <span className="text-sm font-medium">Proctored assessment</span></div>
            <CardTitle>Before you start</CardTitle>
            <CardDescription>This quiz is monitored. Please review and accept the conditions below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-start gap-2"><Video className="mt-0.5 h-4 w-4 text-muted-foreground" /><div><b>Webcam monitoring.</b> Your camera will be enabled and a snapshot captured every 6 seconds, plus one verification snapshot at the start.</div></div>
              <div className="flex items-start gap-2"><Maximize className="mt-0.5 h-4 w-4 text-muted-foreground" /><div><b>Fullscreen mode.</b> The quiz runs in fullscreen. Leaving fullscreen, switching tabs, or losing focus will be logged.</div></div>
              <div className="flex items-start gap-2"><ShieldAlert className="mt-0.5 h-4 w-4 text-muted-foreground" /><div><b>Activity logging.</b> Right-click, copy/paste, common dev-tools shortcuts, and tab switches are blocked and/or logged.</div></div>
            </div>

            <Alert>
              <AlertTitle>Browser limitations</AlertTitle>
              <AlertDescription className="text-xs">
                Some OS-level shortcuts (Alt+Tab, Windows key, Task Manager) cannot be blocked by a web browser. Attempted use, focus loss, and similar events are detected and reported to your teacher.
              </AlertDescription>
            </Alert>

            <label className="flex items-center gap-2">
              <Checkbox checked={consented} onCheckedChange={(c) => setConsented(!!c)} />
              <span>I consent to webcam capture, fullscreen mode, and activity logging for this assessment.</span>
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
              <p className="mt-3 text-sm text-muted-foreground">Requesting camera access now. Please allow the browser prompt.</p>
            )}
            {cam.status === "denied" && (
              <Alert className="mt-3" variant="destructive">
                <AlertTitle>Camera permission required</AlertTitle>
                <AlertDescription>
                  This assessment requires camera access. Please enable camera permission in your browser and try again.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <ProctoredRunner attemptId={attemptId} cam={cam}>{children}</ProctoredRunner>;
}

function ProctoredRunner({ attemptId, cam, children }: { attemptId: string; cam: ReturnType<typeof useWebcamProctor>; children: ReactNode }) {
  const lockdown = useLockdown(attemptId, true);
  const [showViolationAlert, setShowViolationAlert] = useState(false);

  useEffect(() => {
    const hasViolation = cam.lastFace === "multiple" || cam.lastFace === "missing" || cam.lastObject === "phone";
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
      <div className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-2 border-b bg-card/80 px-4 py-2 text-xs backdrop-blur">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${cam.status === "ready" ? "bg-green-500" : cam.status === "denied" || cam.status === "disconnected" ? "bg-red-500" : "bg-yellow-500"}`} />
          <span>
            Camera: <b>{cam.status}</b>
            {cam.lastFace !== "unknown" && <> · Face: <b>{cam.lastFace}</b></>}
            {cam.lastObject !== "unknown" && <> · Object: <b>{cam.lastObject}</b></>}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span>Fullscreen: <b>{lockdown.fullscreen ? "on" : "off"}</b></span>
          {!lockdown.fullscreen && (
            <Button size="sm" variant="outline" onClick={() => lockdown.enterFullscreen()}>Re-enter fullscreen</Button>
          )}
        </div>
      </div>

      {lockdown.shortcutBlocked && (
        <div className="fixed left-1/2 top-16 z-50 -translate-x-1/2 rounded-md bg-destructive px-3 py-1.5 text-xs text-destructive-foreground shadow">
          Shortcut blocked: {lockdown.shortcutBlocked}
        </div>
      )}

      {/* Face detection alerts */}
      {showViolationAlert && cam.lastFace === "multiple" && (
        <div className="fixed left-1/2 top-24 z-50 -translate-x-1/2 w-[min(640px,90%)]">
          <Alert variant="destructive">
            <AlertTitle>Multiple faces detected</AlertTitle>
            <AlertDescription>
              Only one person is allowed during this assessment. Multiple faces were detected and this has been logged.
            </AlertDescription>
          </Alert>
        </div>
      )}
      {showViolationAlert && cam.lastFace === "missing" && (
        <div className="fixed left-1/2 top-24 z-50 -translate-x-1/2 w-[min(640px,90%)]">
          <Alert>
            <AlertTitle>Face not detected</AlertTitle>
            <AlertDescription>
              Your face is not visible. Please position yourself so your face is clearly visible to the camera.
            </AlertDescription>
          </Alert>
        </div>
      )}
      {showViolationAlert && cam.lastObject === "phone" && (
        <div className="fixed left-1/2 top-24 z-50 -translate-x-1/2 w-[min(640px,90%)]">
          <Alert variant="destructive">
            <AlertTitle>Phone detected in view</AlertTitle>
            <AlertDescription>
              A mobile phone or small device was detected in the camera frame. This is logged as a proctoring violation.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {cam.status === "denied" && (
        <div className="m-4">
          <Alert variant="destructive">
            <AlertTitle>Camera permission denied</AlertTitle>
            <AlertDescription>
              This assessment requires camera access. Please enable camera permission in your browser and refresh the page.
            </AlertDescription>
          </Alert>
        </div>
      )}
      {cam.isMobile && (
        <div className="m-4">
          <Alert>
            <AlertTitle>Mobile device detected</AlertTitle>
            <AlertDescription>
              This assessment is intended for desktop/laptop devices. Mobile devices may produce unreliable proctoring results.
            </AlertDescription>
          </Alert>
        </div>
      )}
      {cam.status === "disconnected" && (
        <div className="m-4">
          <Alert variant="destructive">
            <AlertTitle>Camera disconnected</AlertTitle>
            <AlertDescription>The camera stream was lost. Reconnect your camera and refresh to continue.</AlertDescription>
          </Alert>
        </div>
      )}

      {!lockdown.fullscreen && (
        <div className="m-4">
          <Alert>
            <AlertTitle>Fullscreen required</AlertTitle>
            <AlertDescription>Return to fullscreen to continue. This event has been logged.</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Hidden video for capture + small preview */}
      <video
        ref={cam.videoRef}
        muted
        playsInline
        className="fixed bottom-3 right-3 z-40 h-24 w-32 rounded-md border border-border bg-black object-cover shadow-md"
      />

      {children}
    </div>
  );
}
