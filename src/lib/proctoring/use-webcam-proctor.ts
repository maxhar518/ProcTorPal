import { useEffect, useRef, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { uploadSnapshot, logEvents } from "./proctoring.functions";

type FaceStatus = "ok" | "missing" | "multiple" | "unknown";

declare global {
  // Chromium experimental Face Detector API
  interface Window { FaceDetector?: any }
}

export type WebcamStatus = "idle" | "requesting" | "ready" | "denied" | "disconnected";

export function useWebcamProctor(
  attemptId: string | undefined,
  enabled: boolean,
  intervalMs = 6000
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectorRef = useRef<any>(null);
  const intervalIdRef = useRef<number | null>(null);
  const verificationSentRef = useRef(false);
  const [status, setStatus] = useState<WebcamStatus>("idle");
  const [lastFace, setLastFace] = useState<FaceStatus>("unknown");

  const upload = useServerFn(uploadSnapshot);
  const log = useServerFn(logEvents);

  const logEvent = useCallback(
    (event_type: string, severity: "info" | "warn" | "critical" = "info", details: Record<string, any> = {}) => {
      if (!attemptId) return;
      log({ data: { attemptId, events: [{ event_type, severity, details }] } }).catch(() => {});
    },
    [attemptId, log]
  );

  const detectFaces = useCallback(async (canvas: HTMLCanvasElement): Promise<FaceStatus> => {
    if (!detectorRef.current) return "unknown";
    try {
      const faces = await detectorRef.current.detect(canvas);
      if (!faces || faces.length === 0) return "missing";
      if (faces.length > 1) return "multiple";
      return "ok";
    } catch {
      return "unknown";
    }
  }, []);

  const captureAndUpload = useCallback(
    async (kind: "verification" | "periodic") => {
      const video = videoRef.current;
      if (!video || !attemptId) return;
      if (video.readyState < 2 || video.videoWidth === 0) return;

      const w = 480;
      const h = Math.round((video.videoHeight / video.videoWidth) * w) || 360;
      if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
      const canvas = canvasRef.current;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);

      const faceStatus = await detectFaces(canvas);
      setLastFace(faceStatus);

      const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
      const base64 = dataUrl.split(",")[1] ?? "";
      try {
        await upload({ data: { attemptId, kind, imageBase64: base64, faceStatus } });
      } catch (e) {
        // swallow; lockdown event logging will report repeated failures via UI
      }
    },
    [attemptId, detectFaces, upload]
  );

  // Start camera
  useEffect(() => {
    if (!enabled || !attemptId || typeof window === "undefined") return;
    let cancelled = false;

    (async () => {
      setStatus("requesting");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setStatus("ready");
        logEvent("camera_granted", "info");

        // Face detector setup
        if (window.FaceDetector) {
          try {
            detectorRef.current = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 3 });
          } catch {
            logEvent("face_detector_unavailable", "info");
          }
        } else {
          logEvent("face_detector_unavailable", "info");
        }

        // Track disconnection
        stream.getVideoTracks().forEach((t) => {
          t.addEventListener("ended", () => {
            setStatus("disconnected");
            logEvent("camera_disconnected", "critical");
          });
        });

        // Verification snapshot then periodic
        window.setTimeout(async () => {
          if (cancelled || verificationSentRef.current) return;
          verificationSentRef.current = true;
          await captureAndUpload("verification");
        }, 1200);

        intervalIdRef.current = window.setInterval(() => {
          if (cancelled) return;
          // also re-check track liveness
          const track = streamRef.current?.getVideoTracks()[0];
          if (!track || track.readyState !== "live") {
            setStatus("disconnected");
            logEvent("camera_disconnected", "critical");
            return;
          }
          captureAndUpload("periodic");
        }, intervalMs);
      } catch (err: any) {
        setStatus("denied");
        logEvent("camera_denied", "critical", { message: err?.message ?? "denied" });
      }
    })();

    return () => {
      cancelled = true;
      if (intervalIdRef.current) {
        window.clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [enabled, attemptId, intervalMs, captureAndUpload, logEvent]);

  return { videoRef, status, lastFace };
}
