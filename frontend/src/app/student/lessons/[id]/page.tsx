"use client";
import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import { StudentLayout } from "@/components/layout/student-layout";
import { useStudentLesson, useStudentLessonPdfUrl } from "@/hooks/use-student-data";
import { useStartSession, useSubmitSession, useAbandonSession, useSessionResult } from "@/hooks/use-student-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PdfViewer from "@/components/student/PdfViewer";
import {
  Mic, Square, Globe, ChevronLeft, TrendingUp,
  CheckCircle2, AlertCircle, Star, ExternalLink,
  Volume2, VolumeX, Play, Pause, RotateCcw, FileText,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { AssessmentResult } from "@/types/api";

// ─── TTS Rate Selector ────────────────────────────────────────────────────────
const RATE_OPTIONS = [
  { label: "Slow", value: "slow" as const },
  { label: "Normal", value: "normal" as const },
  { label: "Fast", value: "fast" as const },
];

export default function LessonDetailPage() {
  const params = useParams();
  const lessonId = (params?.id ?? "") as string;

  const { data: lesson, isLoading, isError } = useStudentLesson(lessonId);
  const { data: pdfUrlData } = useStudentLessonPdfUrl(lessonId);
  const startSession = useStartSession();
  const submitSession = useSubmitSession();
  const abandonSession = useAbandonSession();

  // ── Recording state ──────────────────────────────────────────────────────
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [assessmentStatus, setAssessmentStatus] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [phase, setPhase] = useState<"idle" | "recording" | "submitting" | "processing" | "done">("idle");
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [waveHeights, setWaveHeights] = useState(Array.from({ length: 20 }, () => 20));
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── TTS / Listen state ───────────────────────────────────────────────────
  const [ttsRate, setTtsRate] = useState<"slow" | "normal" | "fast">("slow");
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [ttsPaused, setTtsPaused] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Stop playback and free blob URL when navigating away
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        if (audioRef.current.src.startsWith("blob:")) URL.revokeObjectURL(audioRef.current.src);
      }
    };
  }, []);

  // ── Poll for assessment result ───────────────────────────────────────────
  const { data: resultData } = useSessionResult(sessionId ?? "", assessmentStatus);

  useEffect(() => {
    if (resultData) {
      const d = resultData as any;
      if (d.status === 200 && d.data?.result) {
        setResult(d.data.result);
        setPhase("done");
        setAssessmentStatus("completed");
        setShowResult(true);
        toast.dismiss();
        toast.success("Assessment complete!");
      } else if (d.data?.assessment_status === "failed") {
        setPhase("idle");
        setAssessmentStatus(null);
        toast.dismiss();
        toast.error("Assessment failed. Please try again.");
      }
    }
  }, [resultData]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
        setWaveHeights(Array.from({ length: 20 }, () => Math.floor(Math.random() * 40) + 10));
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRecording]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // ── TTS Handlers ─────────────────────────────────────────────────────────

  const handleTtsPlay = async () => {
    const text = ((lesson as any)?.extracted_text as string | undefined)?.trim();
    if (!text) { toast.error("No text available for this lesson"); return; }

    setAudioLoading(true);
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("auth-storage") : null;
      const token = raw ? (JSON.parse(raw) as any)?.state?.token : null;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "/api/v1"}/student/tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ text, language: (lesson as any).language ?? "english", rate: ttsRate }),
        }
      );
      if (!res.ok) throw new Error("TTS request failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        if (audioRef.current.src.startsWith("blob:")) URL.revokeObjectURL(audioRef.current.src);
        audioRef.current.src = url;
        await audioRef.current.play();
      }
      setTtsPlaying(true);
      setTtsPaused(false);
    } catch {
      toast.error("Failed to generate audio. Please try again.");
    } finally {
      setAudioLoading(false);
    }
  };

  const handleTtsPause = () => {
    audioRef.current?.pause();
    setTtsPaused(true);
    setTtsPlaying(false);
  };

  const handleTtsResume = () => {
    audioRef.current?.play();
    setTtsPaused(false);
    setTtsPlaying(true);
  };

  const handleTtsStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setTtsPlaying(false);
    setTtsPaused(false);
  };

  // ── Recording Handlers ────────────────────────────────────────────────────

  const handleStartRecording = async () => {
    if (!lesson) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.start(1000);

      const session = await startSession.mutateAsync({
        lesson_id: lessonId,
        language: lesson.language as "english" | "tamil",
      });
      setSessionId(session.session_id);
      setIsRecording(true);
      setPhase("recording");
      setRecordingTime(0);
      toast.success("Recording started!");
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        toast.error("Microphone permission denied. Please allow microphone access.");
      } else {
        toast.error(err.response?.data?.detail || "Failed to start recording");
      }
    }
  };

  const handleStopRecording = async () => {
    if (!sessionId || !mediaRecorderRef.current) return;
    setIsRecording(false);
    setPhase("submitting");

    await new Promise<void>((resolve) => {
      mediaRecorderRef.current!.onstop = () => resolve();
      mediaRecorderRef.current!.stop();
      mediaRecorderRef.current!.stream?.getTracks().forEach((t) => t.stop());
    });

    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");
    formData.append("duration_seconds", String(recordingTime));

    try {
      toast.loading("Submitting recording… (transcription may take up to 60 seconds)");
      const submitRes = await submitSession.mutateAsync({ sessionId, formData });
      toast.dismiss();
      setAssessmentStatus(submitRes.assessment_status);
      setPhase("processing");
      toast.loading("Analyzing your reading…");
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.response?.data?.detail || "Failed to submit recording");
      setPhase("idle");
    }
  };

  const handleAbandon = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop());
    }
    setIsRecording(false);
    if (sessionId) {
      await abandonSession.mutateAsync(sessionId).catch(() => {});
    }
    setSessionId(null);
    setPhase("idle");
    setRecordingTime(0);
    toast.info("Session cancelled");
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <StudentLayout breadcrumbs={[{ label: "Student" }, { label: "Lessons", href: "/student/lessons" }, { label: "Loading…" }]}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[640px] rounded-xl" />
          <Skeleton className="h-[640px] rounded-xl" />
        </div>
      </StudentLayout>
    );
  }

  if (isError || !lesson) {
    return (
      <StudentLayout breadcrumbs={[{ label: "Student" }, { label: "Lessons", href: "/student/lessons" }, { label: "Error" }]}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load lesson. Please go back and try again.</AlertDescription>
        </Alert>
      </StudentLayout>
    );
  }

  const extractedText = (lesson as any).extracted_text as string | undefined;
  const pdfReady = lesson.pdf_extraction_status === "success";

  return (
    <StudentLayout breadcrumbs={[{ label: "Student" }, { label: "Lessons", href: "/student/lessons" }, { label: lesson.title }]}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/student/lessons">
            <Button variant="ghost" size="sm" className="gap-1">
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">{lesson.title}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {lesson.language === "english" ? "English" : "Tamil"}
              </Badge>
              <span className="text-xs text-muted-foreground">By {lesson.uploaded_by_name}</span>
              {lesson.my_attempt_count > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {lesson.my_attempt_count} attempt{lesson.my_attempt_count !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Left Panel: Read + Listen Tabs ─────────────────────────── */}
          <Card className="rounded-xl">
            <CardContent className="p-3">
              <Tabs defaultValue="read">
                <div className="flex items-center justify-between mb-3">
                  <TabsList className="h-8">
                    <TabsTrigger value="read" className="text-xs gap-1.5 h-7">
                      <FileText className="h-3.5 w-3.5" /> Read
                    </TabsTrigger>
                    <TabsTrigger value="listen" className="text-xs gap-1.5 h-7">
                      <Volume2 className="h-3.5 w-3.5" /> Listen
                    </TabsTrigger>
                  </TabsList>
                  {pdfUrlData?.url && (
                    <a
                      href={pdfUrlData.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" /> New tab
                    </a>
                  )}
                </div>

                {/* ── Read Tab ── */}
                <TabsContent value="read" className="mt-0">
                  {pdfUrlData?.url ? (
                    <div
                      className="w-full rounded-lg border bg-muted/20 overflow-y-auto"
                      style={{ height: "530px" }}
                    >
                      <PdfViewer url={pdfUrlData.url} />
                    </div>
                  ) : lesson.pdf_extraction_status === "pending" ? (
                    <div className="rounded-lg bg-muted/30 flex items-center justify-center" style={{ height: "530px" }}>
                      <div className="text-center space-y-2">
                        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-sm text-muted-foreground">PDF is being processed…</p>
                      </div>
                    </div>
                  ) : lesson.pdf_extraction_status === "failed" ? (
                    <div className="rounded-lg bg-destructive/5 border border-destructive/20 flex items-center justify-center" style={{ height: "530px" }}>
                      <p className="text-sm text-destructive text-center px-4">
                        PDF processing failed. Contact your teacher.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-muted/30 flex items-center justify-center" style={{ height: "530px" }}>
                      <p className="text-sm text-muted-foreground">Loading PDF…</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Read carefully, then record your reading session on the right
                  </p>
                </TabsContent>

                {/* ── Listen Tab ── */}
                <TabsContent value="listen" className="mt-0">
                  <div className="rounded-xl border bg-muted/10 flex flex-col overflow-hidden" style={{ height: "530px" }}>
                    {/* PDF viewer — follow along while listening */}
                    <div className="border-b overflow-y-auto" style={{ height: "295px" }}>
                      {pdfUrlData?.url ? (
                        <PdfViewer url={pdfUrlData.url} />
                      ) : (
                        <div className="flex items-center justify-center h-full bg-muted/20 rounded-t-xl">
                          <p className="text-xs text-muted-foreground">PDF loading…</p>
                        </div>
                      )}
                    </div>

                    {/* Compact AI reading header */}
                    <div className="px-4 py-2.5 border-b bg-blue-50/50 dark:bg-blue-950/30 flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                        <Volume2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold">AI Reference Reading</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">
                          Clear Indian English · Follow along in the PDF above
                        </p>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex-1 flex flex-col justify-center p-4 space-y-3">
                      {/* Speed selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground shrink-0">Speed:</span>
                        <div className="flex gap-1">
                          {RATE_OPTIONS.map(({ label, value }) => (
                            <button
                              key={value}
                              onClick={() => { setTtsRate(value); handleTtsStop(); }}
                              className={cn(
                                "px-2 py-0.5 rounded text-xs font-medium transition-colors",
                                ttsRate === value
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Play / Pause / Stop */}
                      <div className="flex items-center gap-2">
                        {audioLoading ? (
                          <Button size="sm" disabled className="gap-2 flex-1">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Generating audio…
                          </Button>
                        ) : !ttsPlaying && !ttsPaused ? (
                          <Button
                            size="sm"
                            className="gap-2 flex-1 bg-blue-600 hover:bg-blue-700"
                            onClick={handleTtsPlay}
                            disabled={!extractedText}
                          >
                            <Play className="h-4 w-4" /> Play AI Reading
                          </Button>
                        ) : ttsPlaying ? (
                          <>
                            <Button size="sm" variant="outline" className="gap-1.5 flex-1" onClick={handleTtsPause}>
                              <Pause className="h-4 w-4" /> Pause
                            </Button>
                            <Button size="sm" variant="ghost" className="gap-1.5" onClick={handleTtsStop}>
                              <VolumeX className="h-4 w-4" /> Stop
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" className="gap-1.5 flex-1" onClick={handleTtsResume}>
                              <Play className="h-4 w-4" /> Resume
                            </Button>
                            <Button size="sm" variant="ghost" className="gap-1.5" onClick={handleTtsStop}>
                              <RotateCcw className="h-4 w-4" /> Restart
                            </Button>
                          </>
                        )}
                      </div>

                      {ttsPlaying && (
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5 items-end">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div
                                key={i}
                                className="w-1 bg-blue-500 rounded-full animate-pulse"
                                style={{
                                  height: `${8 + Math.sin(i * 1.2) * 6}px`,
                                  animationDelay: `${i * 0.1}s`,
                                }}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-blue-600 dark:text-blue-400">Reading…</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Follow along in the PDF while the AI reads clearly in Indian English.
                  </p>
                  {/* Hidden audio element for TTS playback */}
                  <audio
                    ref={audioRef}
                    onEnded={() => { setTtsPlaying(false); setTtsPaused(false); }}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* ── Right Panel: Recording Studio ─────────────────────────── */}
          <div className="space-y-4">
            <Card className="rounded-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Recording Studio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Timer ring */}
                <div className="text-center">
                  <div className={cn(
                    "inline-flex items-center justify-center h-24 w-24 rounded-full border-4 transition-all",
                    isRecording
                      ? "border-red-500 bg-red-50 dark:bg-red-950"
                      : phase === "done"
                      ? "border-green-500 bg-green-50 dark:bg-green-950"
                      : "border-muted bg-muted/30"
                  )}>
                    {isRecording ? (
                      <div className="text-center">
                        <div className="h-2 w-2 rounded-full bg-red-500 mx-auto mb-1 animate-pulse" />
                        <span className="text-lg font-mono font-bold">{formatTime(recordingTime)}</span>
                      </div>
                    ) : (
                      <Mic className={cn("h-10 w-10", phase === "done" ? "text-green-500" : "text-muted-foreground")} />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {phase === "idle" && "Press Start to begin recording"}
                    {phase === "recording" && "Recording in progress…"}
                    {phase === "submitting" && "Submitting recording (please wait)…"}
                    {phase === "processing" && "AI is analysing your reading…"}
                    {phase === "done" && "Assessment complete!"}
                  </p>
                </div>

                {/* Waveform */}
                {isRecording && (
                  <div className="flex items-center justify-center gap-0.5 h-12">
                    {waveHeights.map((h, i) => (
                      <div
                        key={i}
                        className="w-1.5 rounded-full bg-red-500 transition-all duration-100"
                        style={{ height: `${h}px` }}
                      />
                    ))}
                  </div>
                )}

                {/* Buttons */}
                <div className="flex justify-center gap-3">
                  {phase === "idle" && (
                    <Button
                      size="lg"
                      className="gap-2 px-8 bg-green-600 hover:bg-green-700"
                      onClick={handleStartRecording}
                      disabled={startSession.isPending || !pdfReady}
                    >
                      <Mic className="h-5 w-5" />
                      {!pdfReady ? "PDF Not Ready" : "Start Recording"}
                    </Button>
                  )}
                  {phase === "recording" && (
                    <div className="flex gap-2">
                      <Button size="lg" variant="destructive" className="gap-2 px-8" onClick={handleStopRecording}>
                        <Square className="h-5 w-5" /> Stop & Submit
                      </Button>
                      <Button size="lg" variant="outline" onClick={handleAbandon}>Cancel</Button>
                    </div>
                  )}
                  {(phase === "submitting" || phase === "processing") && (
                    <div className="text-center space-y-2">
                      <Button size="lg" disabled className="gap-2 px-8">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        {phase === "submitting" ? "Transcribing audio…" : "Analysing reading…"}
                      </Button>
                      {phase === "submitting" && (
                        <p className="text-xs text-muted-foreground">
                          Transcription takes 30–60 seconds. Please wait…
                        </p>
                      )}
                    </div>
                  )}
                  {phase === "done" && (
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => { setPhase("idle"); setRecordingTime(0); setSessionId(null); setAssessmentStatus(null); }}>
                        Try Again
                      </Button>
                      <Button onClick={() => setShowResult(true)} className="gap-2">
                        <TrendingUp className="h-4 w-4" /> View Results
                      </Button>
                    </div>
                  )}
                </div>

                {/* Tips */}
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Reading Tips</p>
                  {[
                    "Listen to the reference reading first to understand the pace",
                    "Read clearly and at a comfortable, natural pace",
                    "Pronounce each word carefully — don't rush",
                    "Use the same language as the lesson",
                    "Record in a quiet room for best results",
                  ].map((tip, i) => (
                    <p key={i} className="text-xs text-blue-600 dark:text-blue-400 flex items-start gap-1.5">
                      <span className="mt-0.5">•</span> {tip}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ── Assessment Result Dialog ─────────────────────────────────── */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" /> Your Assessment Results
            </DialogTitle>
          </DialogHeader>
          {result && (
            <div className="space-y-4">
              <div className="text-center py-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
                <p className="text-5xl font-black text-green-600">{result.overall_score.toFixed(0)}%</p>
                <p className="text-sm text-muted-foreground mt-1">Overall Score</p>
                <div className="flex justify-center gap-3 mt-3">
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    {result.words_per_minute} WPM
                  </Badge>
                  <Badge variant="secondary">{result.pause_count} pauses</Badge>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { label: "Accuracy", value: result.accuracy_score, color: "text-blue-600" },
                  { label: "Fluency", value: result.fluency_score, color: "text-purple-600" },
                  { label: "Pronunciation", value: result.pronunciation_score, color: "text-orange-600" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className={cn("text-sm font-bold", item.color)}>{item.value.toFixed(1)}%</span>
                    </div>
                    <Progress value={item.value} className="h-2" />
                  </div>
                ))}
              </div>

              {(result.strength_tags.length > 0 || result.weakness_tags.length > 0) && (
                <div className="grid grid-cols-2 gap-3">
                  {result.strength_tags.length > 0 && (
                    <div className="rounded-lg bg-green-50 dark:bg-green-950 p-3">
                      <p className="text-xs font-semibold text-green-700 dark:text-green-300 flex items-center gap-1 mb-2">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Strengths
                      </p>
                      {result.strength_tags.map((tag) => (
                        <p key={tag} className="text-xs text-green-600 dark:text-green-400">• {tag}</p>
                      ))}
                    </div>
                  )}
                  {result.weakness_tags.length > 0 && (
                    <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3">
                      <p className="text-xs font-semibold text-red-700 dark:text-red-300 flex items-center gap-1 mb-2">
                        <AlertCircle className="h-3.5 w-3.5" /> Improve
                      </p>
                      {result.weakness_tags.map((tag) => (
                        <p key={tag} className="text-xs text-red-600 dark:text-red-400">• {tag}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {result.summary && (
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">{result.summary}</p>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setShowResult(false); setPhase("idle"); setRecordingTime(0); setSessionId(null); setAssessmentStatus(null); }}
                >
                  Try Again
                </Button>
                <Link href="/student/progress" className="flex-1">
                  <Button className="w-full">View Progress</Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </StudentLayout>
  );
}
