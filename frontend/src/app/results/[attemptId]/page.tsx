"use client";

import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpenCheck, CheckCircle2, CircleHelp, Clock3, FileText } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

type Answer = { question_id: number; title: string; marks: number; answer_text: string; selected_option: string | null; auto_score: number | null; final_score: number | null; confidence: number | null; review_status: string; feedback: string | null };
type Result = { attempt_id: number; examination_id: number; examination_title: string; status: string; total_score: number | null; total_marks: number; answers: Answer[] };

export default function ResultPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const router = useRouter();
  const result = useQuery({ queryKey: ["result", attemptId], queryFn: () => api<Result>(`/attempts/${attemptId}/result`) });
  if (result.isLoading) return <main className="grid min-h-screen place-items-center text-sm text-slate-500">Loading your result…</main>;
  if (result.error || !result.data) return <main className="grid min-h-screen place-items-center p-5"><div className="card max-w-md p-7 text-center"><CircleHelp className="mx-auto text-rose-500"/><h1 className="mt-3 font-semibold">Result unavailable</h1><p className="mt-2 text-sm text-slate-500">{(result.error as Error)?.message ?? "The result could not be loaded."}</p><button onClick={() => router.push("/dashboard")} className="mt-5 rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white">Back to dashboard</button></div></main>;
  const data = result.data;
  const reviewPending = data.answers.some((answer) => answer.final_score === null);
  return <main className="min-h-screen px-4 py-8 md:px-8 md:py-12"><div className="mx-auto max-w-3xl">
    <a href="/dashboard" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-navy"><ArrowLeft size={16}/>Back to workspace</a>
    <section className="relative overflow-hidden rounded-[24px] bg-[#15364f] p-7 text-white md:p-10"><div className="absolute -right-20 -top-32 h-80 w-80 rounded-full border border-white/10"/><div className="relative"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-teal-300"><BookOpenCheck size={15}/>ALIENX results</div><h1 className="mt-4 text-2xl font-semibold md:text-3xl">{data.examination_title}</h1><p className="mt-2 text-sm text-slate-300">Your examination has been submitted. Here’s your feedback and score breakdown.</p><div className="mt-7 flex flex-wrap items-end gap-x-8 gap-y-4"><div><div className="text-xs text-slate-400">Final score</div><div className="mt-1 text-4xl font-semibold">{data.total_score === null ? "Pending" : <>{data.total_score}<span className="text-xl text-slate-400"> / {data.total_marks}</span></>}</div></div><div className={`rounded-full px-3 py-1.5 text-xs font-semibold ${reviewPending ? "bg-amber-300/15 text-amber-200" : "bg-emerald-300/15 text-emerald-200"}`}>{reviewPending ? "Faculty review in progress" : "Grading complete"}</div></div></div></section>
    <div className="mb-4 mt-8 flex items-center justify-between"><div><div className="eyebrow">Feedback</div><h2 className="mt-1 text-lg font-semibold text-navy">Question breakdown</h2></div><div className="flex items-center gap-1.5 text-xs text-slate-400"><FileText size={14}/>{data.answers.length} questions</div></div>
    <div className="space-y-3">{data.answers.map((answer, index) => <article key={answer.question_id} className="card p-5 md:p-6"><div className="flex items-start gap-4"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-50 text-xs font-semibold text-slate-500">{index + 1}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-3"><h3 className="font-semibold leading-6 text-navy">{answer.title}</h3><span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">{answer.final_score === null ? "Pending review" : `${answer.final_score} / ${answer.marks}`}</span></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{answer.selected_option ?? answer.answer_text ?? "No response provided"}</p>{answer.feedback && <div className="mt-4 rounded-xl bg-[#f7f9fa] px-4 py-3 text-xs leading-5 text-slate-500">{answer.feedback}</div>}<div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">{answer.review_status === "faculty_review" ? <><Clock3 size={13}/>Awaiting faculty review</> : <><CheckCircle2 size={13} className="text-teal"/>Graded</>}</div></div></div></article>)}</div>
  </div></main>;
}
