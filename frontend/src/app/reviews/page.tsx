"use client";

import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, ClipboardList, MessageSquareText } from "lucide-react";
import { useState } from "react";

type Answer = { question_id: number; title: string; marks: number; answer_text: string; selected_option: string | null; auto_score: number | null; final_score: number | null; confidence: number | null; review_status: string; feedback: string | null };
type AttemptResult = { attempt_id: number; examination_id: number; examination_title: string; status: string; total_score: number | null; total_marks: number; answers: Answer[] };

function ReviewCard({ attempt, onSaved }: { attempt: AttemptResult; onSaved: () => void }) {
  const [scores, setScores] = useState<Record<number, string>>({});
  const [feedback, setFeedback] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: (answer: Answer) => api(`/attempts/${attempt.attempt_id}/answers/${answer.question_id}/review`, { method: "PATCH", body: JSON.stringify({ final_score: Number(scores[answer.question_id] ?? answer.auto_score ?? 0), feedback: feedback[answer.question_id] ?? "" }) }),
    onSuccess: () => { setError(""); onSaved(); },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "Could not save review"),
  });
  const flagged = attempt.answers.filter((answer) => answer.review_status === "faculty_review");
  return <article className="card p-5 md:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-sm font-semibold text-navy">{attempt.examination_title}</div><div className="mt-1 text-xs text-slate-400">Attempt #{attempt.attempt_id} · {flagged.length} answer{flagged.length === 1 ? "" : "s"} flagged</div></div><span className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold text-amber-700">NEEDS REVIEW</span></div>{error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}<div className="mt-5 space-y-4">{flagged.map((answer)=><section key={answer.question_id} className="rounded-xl border border-slate-100 p-4"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-navy">{answer.title}</h3><span className="text-xs text-slate-400">AI: {answer.auto_score ?? 0} / {answer.marks} · confidence {Math.round((answer.confidence ?? 0) * 100)}%</span></div><div className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">{answer.selected_option ?? answer.answer_text ?? "No response"}</div><div className="mt-3 grid gap-3 md:grid-cols-[150px_1fr_auto]"><label className="text-xs font-semibold text-slate-500">Final score<input type="number" min="0" max={answer.marks} step="0.25" value={scores[answer.question_id] ?? answer.auto_score ?? 0} onChange={(e)=>setScores((value)=>({...value,[answer.question_id]:e.target.value}))} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"/></label><label className="text-xs font-semibold text-slate-500">Feedback<textarea rows={1} value={feedback[answer.question_id] ?? ""} onChange={(e)=>setFeedback((value)=>({...value,[answer.question_id]:e.target.value}))} placeholder="Feedback for the student" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-700"/></label><button onClick={()=>mutation.mutate(answer)} disabled={mutation.isPending} className="self-end inline-flex items-center justify-center gap-2 rounded-lg bg-teal px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50"><CheckCircle2 size={14}/>Save</button></div></section>)}</div></article>;
}

export default function ReviewsPage() {
  const client = useQueryClient();
  const queue = useQuery({ queryKey: ["review-queue"], queryFn: () => api<AttemptResult[]>("/attempts/review-queue") });
  const refresh = () => void client.invalidateQueries({ queryKey: ["review-queue"] });
  return <main className="mx-auto min-h-screen max-w-6xl px-5 py-8 md:px-10 md:py-10"><a href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500"><ArrowLeft size={16}/>Workspace</a><div className="mt-8"><div className="eyebrow">Faculty tools</div><h1 className="mt-2 text-3xl font-semibold text-navy">Review queue</h1><p className="mt-2 text-sm text-slate-500">Review AI-flagged answers, set a final score, and provide student feedback.</p></div><div className="mt-7 space-y-4">{queue.isLoading ? <div className="card p-8 text-sm text-slate-400">Loading flagged answers…</div> : queue.error ? <div role="alert" className="card p-8 text-sm text-rose-700">{(queue.error as Error).message}</div> : queue.data?.length ? queue.data.map((attempt)=><ReviewCard key={attempt.attempt_id} attempt={attempt} onSaved={refresh}/>) : <div className="card p-12 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><ClipboardList size={20}/></div><h2 className="mt-4 font-semibold text-navy">You’re all caught up</h2><p className="mt-1 text-sm text-slate-500">No subjective responses need review right now.</p></div>}</div></main>;
}
