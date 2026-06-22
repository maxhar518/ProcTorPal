import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, QrCode } from "lucide-react";
import { toast } from "sonner";
import { enrollByCode } from "@/lib/quizzes/student.functions";

export const Route = createFileRoute("/_authenticated/join")({
  head: () => ({ meta: [{ title: "Join quiz — ProctorAI" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ code: typeof s.code === "string" ? s.code : undefined }),
  component: JoinPage,
});

function JoinPage() {
  const { code: initialCode } = Route.useSearch();
  const { session, loading } = useCurrentUser();
  const navigate = useNavigate();
  const [code, setCode] = useState(initialCode ?? "");
  const [scanning, setScanning] = useState(false);

  const enroll = useServerFn(enrollByCode);
  const m = useMutation({
    mutationFn: (c: string) => enroll({ data: { code: c } }),
    onSuccess: ({ quizId }) => { toast.success("Enrolled!"); navigate({ to: "/my-quizzes" }); void quizId; },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (initialCode && session) m.mutate(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode, session]);

  if (loading || !session) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader role="student" />
      <main className="mx-auto max-w-md px-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Join a quiz</CardTitle>
            <CardDescription>Enter the quiz access code, or scan the QR shared by your teacher.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input placeholder="QUIZ-AB12CD" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="font-mono" />
              <Button onClick={() => m.mutate(code)} disabled={!code || m.isPending}>Join</Button>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setScanning((s) => !s)}>
              <QrCode className="mr-1 h-4 w-4" />{scanning ? "Stop scanner" : "Scan QR code"}
            </Button>
            {scanning && <QrScanner onCode={(c) => { setCode(c); setScanning(false); m.mutate(c); }} />}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function QrScanner({ onCode }: { onCode: (code: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const stopRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled || !ref.current) return;
      const id = "qr-reader-" + Math.random().toString(36).slice(2);
      ref.current.id = id;
      const scanner = new Html5Qrcode(id);
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 220 },
          (text) => {
            // Accept either raw code or join URL
            try {
              const u = new URL(text);
              const c = u.searchParams.get("code");
              if (c) { onCode(c.toUpperCase()); return; }
            } catch { /* not a URL */ }
            onCode(text.trim().toUpperCase());
          },
          () => { /* ignore per-frame errors */ }
        );
        stopRef.current = async () => { try { await scanner.stop(); await scanner.clear(); } catch { /* ignore */ } };
      } catch (e: any) {
        toast.error("Camera unavailable: " + e.message);
      }
    })();
    return () => {
      cancelled = true;
      stopRef.current?.();
    };
  }, [onCode]);

  return <div className="overflow-hidden rounded-md border" ref={ref} />;
}
