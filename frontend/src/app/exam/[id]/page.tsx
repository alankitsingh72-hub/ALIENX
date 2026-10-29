"use client";

import { api } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, Clock3, Flag, LoaderCircle, WifiOff, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Question = { id: number; title: string; content: string; type: "mcq" | "short_answer" | "descriptive"; options: string[]; marks: number };
type ExamSession = { attempt_id: number; started_at: string; deadline: string; duration_minutes: number; questions: Question[]; answers: DraftEntry[] };
type Draft = { answer_text: string; selected_option: string | null; marked_for_review: boolean };
type DraftEntry = Draft & { question_id: number };
type SaveStatus = "saved" | "saving" | "unsaved" | "offline";

export default function ExamTakingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<ExamSession | null>(null);
  const [active, setActive] = useState(0);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [pageError, setPageError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const pendingRef = useRef<Record<number, Draft>>({});
  const saveInFlight = useRef<Promise<boolean> | null>(null);
  const timeoutSubmissionStarted = useRef(false);
  const questions = session?.questions ?? [];
  const current = questions[active];
  const currentDraft = current ? drafts[current.id] ?? { answer_text: "", selected_option: null, marked_for_review: false } : null;

  const flushSaves = useCallback(async (): Promise<boolean> => {
    if (saveInFlight.current) {
      const saved = await saveInFlight.current;
      if (!saved) return false;
      if (Object.keys(pendingRef.current).length > 0) return flushSaves();
      return true;
    }
    if (!session || Object.keys(pendingRef.current).length === 0) return true;
    setSaveStatus("saving");
    const batch = { ...pendingRef.current };
    pendingRef.current = {};
    const operation = (async (): Promise<boolean> => {
      try {
        for (const [questionId, draft] of Object.entries(batch)) {
          await api(`/attempts/${session.attempt_id}/answers`, {
            method: "PUT", body: JSON.stringify({ question_id: Number(questionId), ...draft }),
          });
        }
        setSaveStatus("saved");
        return true;
      } catch (error) {
        pendingRef.current = { ...batch, ...pendingRef.current };
        setSaveStatus(navigator.onLine ? "unsaved" : "offline");
        if (error instanceof Error && error.message.toLowerCase().includes("time limit")) setPageError("The scheduled time has ended. Submitting your saved responses now.");
        return false;
      } finally {
        saveInFlight.current = null;
      }
    })();
    saveInFlight.current = operation;
    const saved = await operation;
    if (saved && Object.keys(pendingRef.current).length > 0) return flushSaves();
    return saved;
  }, [session]);

  useEffect(() => {
    if (!localStorage.getItem("alienx_access_token")) { router.replace("/login"); return; }
    let activeEffect = true;
    api<ExamSession>(`/exams/${id}/attempts`, { method: "POST" })
      .then((result) => {
        if (!activeEffect) return;
        const key = `alienx_attempt_${result.attempt_id}`;
        const remoteDrafts = Object.fromEntries(result.answers.map((answer) => [answer.question_id, {
          answer_text: answer.answer_text, selected_option: answer.selected_option, marked_for_review: answer.marked_for_review,
        }]));
        const saved = localStorage.getItem(key);
        let mergedDrafts = remoteDrafts;
        if (saved) {
          try {
            const parsed = JSON.parse(saved) as Record<number, Draft>;
            mergedDrafts = { ...remoteDrafts, ...parsed };
            pendingRef.current = parsed;
          } catch {
            localStorage.removeItem(key);
          }
        }
        setDrafts(mergedDrafts);
        if (Object.keys(pendingRef.current).length > 0) setSaveStatus("unsaved");
        setSession(result);
        setSecondsLeft(Math.max(0, Math.floor((new Date(result.deadline).getTime() - Date.now()) / 1000)));
      })
      .catch((error: Error) => {
        if (activeEffect) setPageError(error.message);
      });
    return () => { activeEffect = false; };
  }, [id, router]);

  useEffect(() => {
    const timer = window.setInterval(() => setSecondsLeft((currentSeconds) => Math.max(0, currentSeconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!session) return;
    const saveInterval = window.setInterval(() => void flushSaves(), 3500);
    return () => window.clearInterval(saveInterval);
  }, [session, flushSaves]);

  useEffect(() => {
    if (!session) return;
    localStorage.setItem(`alienx_attempt_${session.attempt_id}`, JSON.stringify(drafts));
    if (Object.keys(pendingRef.current).length > 0) setSaveStatus("unsaved");
  }, [drafts, session]);

  const submitMutation = useMutation({
    mutationFn: async (timedOut: boolean) => {
      if (!timedOut && !await flushSaves()) throw new Error("Some answers could not be saved. Check your connection and try again.");
      return api(`/attempts/${session?.attempt_id}/submit`, { method: "POST" });
    },
    onSuccess: () => {
      localStorage.removeItem(`alienx_attempt_${session?.attempt_id}`);
      router.replace(`/results/${session?.attempt_id}`);
    },
    onError: (error) => {
      setPageError(error instanceof Error ? error.message : "Submission failed. Your saved answers remain available.");
      setSubmitting(false);
    },
  });

  const updateDraft = (patch: Partial<Draft>) => {
    if (!current || !currentDraft) return;
    const next = { ...currentDraft, ...patch };
    pendingRef.current = { ...pendingRef.current, [current.id]: next };
    setDrafts((existing) => ({ ...existing, [current.id]: next }));
    setSaveStatus("unsaved");
  };

  const submit = async () => {
    if (submitMutation.isPending) return;
    if (!window.confirm("Submit your examination now? You will not be able to change your answers afterward.")) return;
    setSubmitting(true);
    submitMutation.mutate(false);
  };

  useEffect(() => {
    if (session && secondsLeft === 0 && !timeoutSubmissionStarted.current) {
      timeoutSubmissionStarted.current = true;
      setSubmitting(true);
      submitMutation.mutate(true);
    }
  }, [secondsLeft, session]);

  const answeredCount = useMemo(() => questions.filter((question) => {
    const draft = drafts[question.id];
    return Boolean(draft?.selected_option || draft?.answer_text.trim());
  }).length, [questions, drafts]);

  const timeLabel = `${Math.floor(secondsLeft / 60).toString().padStart(2, "0")}:${(secondsLeft % 60).toString().padStart(2, "0")}`;
  if (pageError && !session) return <main className="grid min-h-screen place-items-center p-6"><div role="alert" className="card max-w-md p-7 text-center"><AlertCircle className="mx-auto text-rose-500"/><h1 className="mt-3 text-lg font-semibold">Unable to open exam</h1><p className="mt-2 text-sm text-slate-500">{pageError}</p><button onClick={() => router.push("/dashboard")} className="mt-5 rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white">Back to dashboard</button></div></main>;
  if (!session || !current || !currentDraft) return <main className="grid min-h-screen place-items-center text-sm text-slate-500"><LoaderCircle className="mr-2 animate-spin"/>Preparing your exam…</main>;

  const statusLabel = saveStatus === "saved" ? "All changes saved" : saveStatus === "saving" ? "Saving your work…" : saveStatus === "offline" ? "Offline · changes queued" : "Changes not saved yet";
  return <main className="min-h-screen bg-[#f2f5f7]">
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-3"><a href="/dashboard" aria-label="Exit exam to dashboard" className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"><ArrowLeft size={17}/></a><div><div className="text-xs font-bold tracking-[.18em] text-navy">ALIENX</div><div className="text-[11px] text-slate-400">Examination in progress</div></div></div>
        <div className={`flex items-center gap-2 rounded-xl px-3 py-2 font-mono text-lg font-bold tabular-nums ${secondsLeft < 300 ? "bg-rose-50 text-rose-600" : "bg-[#f0f5f7] text-navy"}`}><Clock3 size={17}/>{timeLabel}</div>
        <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">{saveStatus === "offline" ? <WifiOff size={15} className="text-amber-500"/> : <span className={`h-2 w-2 rounded-full ${saveStatus === "saved" ? "bg-emerald-500" : "bg-amber-400"}`}/>}<span>{statusLabel}</span></div>
      </div>
    </header>
    {pageError && session && <div role="alert" className="mx-auto mt-4 max-w-[1320px] rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{pageError}</div>}
    <div className="mx-auto grid max-w-[1320px] gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:px-8 lg:py-9">
      <section>
        <div className="mb-4 flex items-center justify-between"><div className="eyebrow">Question {active + 1} of {questions.length}</div><div className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-500">{current.marks} {current.marks === 1 ? "mark" : "marks"}</div></div>
        <article className="card min-h-[410px] p-6 md:p-9">
          <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#eaf4f5] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-teal">{current.type.replace("_", " ")}</span>{currentDraft.marked_for_review && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700"><Flag size={11}/>Review later</span>}</div>
          <h1 className="mt-6 max-w-3xl text-xl font-semibold leading-8 text-navy md:text-[23px]">{current.content}</h1>
          {current.type === "mcq" ? (
            <div className="mt-8 space-y-3">
              {current.options.map((option, index) => (
                <label key={`${current.id}-${option}`} className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition ${currentDraft.selected_option === option ? "border-teal bg-teal/5 ring-2 ring-teal/10" : "border-slate-200 hover:border-slate-300"}`}>
                  <input className="sr-only" type="radio" name={`question-${current.id}`} value={option} checked={currentDraft.selected_option === option} onChange={() => updateDraft({ selected_option: option, answer_text: option })}/>
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border text-xs font-semibold ${currentDraft.selected_option === option ? "border-teal bg-teal text-white" : "border-slate-200 text-slate-500"}`}>{String.fromCharCode(65 + index)}</span>
                  <span className="text-sm font-medium text-slate-700">{option}</span>
                  {currentDraft.selected_option === option && <Check size={17} className="ml-auto text-teal"/>}
                </label>
              ))}
              {currentDraft.selected_option && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => updateDraft({ selected_option: null, answer_text: "" })}
                    className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-rose-600"
                  >
                    <X size={13} /> Clear choice
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-8">
              <textarea value={currentDraft.answer_text} onChange={(event) => updateDraft({ answer_text: event.target.value })} maxLength={20000} rows={current.type === "descriptive" ? 11 : 6} placeholder="Write your answer here…" className="w-full resize-y rounded-xl border border-slate-200 bg-[#fbfcfd] p-4 text-sm leading-6 text-slate-700 outline-none focus:border-teal focus:bg-white focus:ring-4 focus:ring-teal/10"/>
              <div className="mt-2 text-right text-xs text-slate-400">{currentDraft.answer_text.length} / 20,000 characters</div>
            </div>
          )}
          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-5">
            <button onClick={() => updateDraft({ marked_for_review: !currentDraft.marked_for_review })} className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${currentDraft.marked_for_review ? "bg-amber-50 text-amber-700" : "text-slate-500 hover:bg-slate-50"}`}>
              <Flag size={15}/>{currentDraft.marked_for_review ? "Remove review mark" : "Mark for review"}
            </button>
            <div className="flex gap-2">
              <button disabled={active === 0} onClick={() => setActive((value) => value - 1)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40">
                <ArrowLeft size={14}/>Previous
              </button>
              <button disabled={active === questions.length - 1} onClick={() => setActive((value) => value + 1)} className="inline-flex items-center gap-2 rounded-lg bg-navy px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">
                Next<ArrowRight size={14}/>
              </button>
            </div>
          </div>
        </article>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-white px-4 py-3 text-xs text-slate-500 sm:hidden">{saveStatus === "offline" ? <WifiOff size={14}/> : <span className={`h-2 w-2 rounded-full ${saveStatus === "saved" ? "bg-emerald-500" : "bg-amber-400"}`}/>}<span>{statusLabel}</span></div>
      </section>
      <aside className="space-y-5">
        <section className="card p-5">
          <div className="flex items-center justify-between">
            <div><div className="eyebrow">Your progress</div><div className="mt-2 text-lg font-semibold text-navy">{answeredCount} <span className="text-sm font-normal text-slate-400">of {questions.length} answered</span></div></div>
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#eaf4f5] text-teal"><CheckCircle2 size={19}/></div>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-teal transition-all" style={{ width: `${questions.length ? answeredCount / questions.length * 100 : 0}%` }}/>
          </div>
          <div className="mt-5 grid grid-cols-5 gap-2">
            {questions.map((question, index) => {
              const draft = drafts[question.id];
              const answered = Boolean(draft?.selected_option || draft?.answer_text.trim());
              return <button key={question.id} onClick={() => setActive(index)} aria-label={`Go to question ${index + 1}`} className={`relative grid aspect-square place-items-center rounded-lg border text-xs font-semibold transition ${active === index ? "border-navy bg-navy text-white" : answered ? "border-teal/20 bg-teal/10 text-teal" : "border-slate-200 bg-white text-slate-500"} ${draft?.marked_for_review ? "ring-2 ring-amber-300 ring-offset-1" : ""}`}>{index + 1}</button>;
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-teal"/>Answered</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-slate-200"/>Not answered</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-300"/>Review</span>
          </div>
        </section>
        <section className="card bg-[#fffdf8] p-5">
          <div className="flex gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600"><AlertCircle size={17}/></div>
            <div>
              <div className="text-sm font-semibold text-navy">Before you submit</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">Review any flagged questions, then submit when you’re ready. Your answers save automatically.</p>
            </div>
          </div>
        </section>
        <button disabled={submitting || submitMutation.isPending} onClick={submit} className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-teal/15 transition hover:bg-[#076f79] disabled:opacity-60">
          {submitting || submitMutation.isPending ? <LoaderCircle size={16} className="animate-spin"/> : <CheckCircle2 size={17}/>}Submit examination
        </button>
      </aside>
    </div>
  </main>;
}
