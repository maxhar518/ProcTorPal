import { useEffect, useRef, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { uploadSnapshot, logEvents } from "./proctoring.functions";

type FaceStatus = "ok" | "missing" | "multiple" | "unknown";
type ObjectStatus = "none" | "phone" | "unknown";

declare global {
  interface Window {
    FaceDetector?: any;
    facefilter?: any;
    faceFilter?: any;
    FaceFilter?: any;
    FaceFilterLib?: any;
    tf?: any;
    cocoSsd?: any;
    blazeface?: any;
  }
}

export type WebcamStatus = "idle" | "requesting" | "ready" | "denied" | "disconnected";

export function useWebcamProctor(
  attemptId: string | undefined,
  intervalMs = 6000
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectorRef = useRef<any>(null);
  const objectDetectorRef = useRef<any>(null);
  const intervalIdRef = useRef<number | null>(null);
  const verificationSentRef = useRef(false);
  const lastObjectRef = useRef<ObjectStatus>("unknown");
  const [status, setStatus] = useState<WebcamStatus>("idle");
  const [lastFace, setLastFace] = useState<FaceStatus>("unknown");
  const [lastObject, setLastObject] = useState<ObjectStatus>("unknown");
  const [isMobile, setIsMobile] = useState(false);

  const upload = useServerFn(uploadSnapshot);
  const log = useServerFn(logEvents);

  const logEvent = useCallback(
    (event_type: string, severity: "info" | "warn" | "critical" = "info", details: Record<string, any> = {}) => {
      if (!attemptId) return;
      log({ data: { attemptId, events: [{ event_type, severity, details }] } }).catch(() => {});
    },
    [attemptId, log]
  );

  const loadScript = useCallback(async (src: string) => {
    if (document.querySelector(`script[src="${src}"]`)) return;
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`failed to load ${src}`));
      document.head.appendChild(s);
    });
  }, []);

  const detectFaces = useCallback(async (canvas: HTMLCanvasElement): Promise<FaceStatus> => {
    if (!detectorRef.current) return "unknown";
    try {
      let faces: any;
      if (typeof detectorRef.current.detect === "function") {
        faces = await detectorRef.current.detect(canvas);
      } else if (typeof detectorRef.current.estimateFaces === "function") {
        faces = await detectorRef.current.estimateFaces(canvas, false);
      } else {
        return "unknown";
      }

      const count = Array.isArray(faces) ? faces.length : typeof faces === "number" ? faces : 0;
      if (!count || count === 0) return "missing";
      if (count > 1) return "multiple";
      return "ok";
    } catch {
      return "unknown";
    }
  }, []);

  const detectObjects = useCallback(async (canvas: HTMLCanvasElement): Promise<ObjectStatus> => {
    if (!objectDetectorRef.current) return "unknown";
    try {
      const objects = await objectDetectorRef.current.detect(canvas);
      if (!Array.isArray(objects) || objects.length === 0) return "none";
      const hasPhone = objects.some((obj: any) => {
        const label = typeof obj.class === "string" ? obj.class : typeof obj.label === "string" ? obj.label : undefined;
        return label?.toLowerCase().includes("phone");
      });
      return hasPhone ? "phone" : "none";
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
      const objectStatus = await detectObjects(canvas);
      setLastFace(faceStatus);
      setLastObject(objectStatus);

      if (faceStatus === "multiple") {
        logEvent("multiple_faces", "critical", { kind });
      } else if (faceStatus === "missing") {
        logEvent("face_missing", "warn", { kind });
      }

      if (objectStatus === "phone" && lastObjectRef.current !== "phone") {
        logEvent("phone_detected", "critical", { kind, label: "cell phone" });
      }
      lastObjectRef.current = objectStatus;

      const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
      const base64 = dataUrl.split(",")[1] ?? "";
      try {
        await upload({ data: { attemptId, kind, imageBase64: base64, faceStatus } });
      } catch (e) {
        // swallow; lockdown event logging will report repeated failures via UI
      }
    },
    [attemptId, detectFaces, detectObjects, logEvent, upload]
  );

  const attachVideoToStream = useCallback(async () => {
    if (!videoRef.current || !streamRef.current) return;
    if (videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      await videoRef.current.play().catch(() => {});
    }
  }, []);

  const stop = useCallback((resetStatus = true) => {
    if (intervalIdRef.current) {
      window.clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (resetStatus) {
      setStatus("idle");
    }
  }, []);

  const requestAccess = useCallback(async () => {
    if (!attemptId) {
      throw new Error("Attempt ID is required to start webcam proctoring.");
    }
    if (status === "requesting" || status === "ready") return;

    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
      streamRef.current = stream;
      await attachVideoToStream();
      setStatus("ready");
      logEvent("camera_granted", "info");

      try {
        const mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent || "");
        setIsMobile(mobile);
        if (mobile) logEvent("face_detector_unavailable", "warn", { mobile: true });
      } catch {}

      if (window.FaceDetector) {
        try {
          detectorRef.current = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 5 });
        } catch {
          logEvent("face_detector_unavailable", "info");
        }
      }

      if (!detectorRef.current) {
        try {
          await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.21.0/dist/tf.min.js");
          await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow-models/blazeface@0.0.7/dist/blazeface.min.js");
          await window.tf?.ready?.();
          if (window.blazeface?.load) {
            const model = await window.blazeface.load();
            detectorRef.current = model;
          }
        } catch {
          logEvent("face_detector_unavailable", "info", { fallback: "blazeface" });
        }
      }

      if (!objectDetectorRef.current) {
        try {
          await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.21.0/dist/tf.min.js");
          await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.2/dist/coco-ssd.min.js");
          await window.tf?.ready?.();
          if (window.cocoSsd?.load) {
            objectDetectorRef.current = await window.cocoSsd.load();
          }
        } catch {
          logEvent("face_detector_unavailable", "info", { object_detection: true });
        }
      }

      stream.getVideoTracks().forEach((t) => {
        t.addEventListener("ended", () => {
          setStatus("disconnected");
          logEvent("camera_disconnected", "critical");
        });
      });

      window.setTimeout(async () => {
        if (verificationSentRef.current) return;
        verificationSentRef.current = true;
        const start = Date.now();
        while (!detectorRef.current && Date.now() - start < 1500) {
          await new Promise((r) => setTimeout(r, 100));
        }
        await captureAndUpload("verification");
      }, 1200);

      intervalIdRef.current = window.setInterval(() => {
        const track = streamRef.current?.getVideoTracks()[0];
        if (!track || track.readyState !== "live") {
          setStatus("disconnected");
          logEvent("camera_disconnected", "critical");
          return;
        }
        captureAndUpload("periodic");
      }, intervalMs);
    } catch (err: any) {
      stop(false);
      setStatus("denied");
      logEvent("camera_denied", "critical", { message: err?.message ?? "denied" });
      throw err;
    }
  }, [attemptId, attachVideoToStream, captureAndUpload, intervalMs, loadScript, logEvent, stop, status]);

  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      attachVideoToStream().catch(() => {});
    }
  }, [attachVideoToStream, status]);

  useEffect(() => {
    return () => stop(false);
  }, [stop]);

  return { videoRef, status, lastFace, lastObject, isMobile, requestAccess, stop };
}
