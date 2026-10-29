"use client";

import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, FileCheck2, Users } from "lucide-react";
import { useParams } from "next/navigation";

type AttemptResult = {
  attempt_id: number;
  examination_title: string;
  student_id: number;
  student_name: string;
  submitted_at: string;
  total_score: number | null;
  total_marks: number;
  answers: { final_score: number | null }[];
};

function csvCell(value: string | number) {
  const text = String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export default function ExamResultsPage() {
  const { examId } = useParams<{ examId: string }>();
  const results = useQuery({ queryKey: ["exam-results", examId], queryFn: () => api<AttemptResult[]>(`/attempts/exam/${examId}/results`) });
  const downloadCsv = () => {
    if (!results.data?.length) return;
    const rows = [
      ["Student ID", "Student", "Submitted", "Score", "Maximum", "Review pending"],
      ...results.data.map((result) => [
        result.student_id,
        result.student_name,
        new Date(result.submitted_at).toISOString(),
        result.total_score ?? "Pending",
        result.total_marks,
        result.answers.some((answer) => answer.final_score === null) ? "Yes" : "No",
      ]),
    ];
    const blob = new Blob([rows.map((row) => row.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `alienx-exam-${examId}-results.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return <main className="mx-auto min-h-screen max-w-6xl px-5 py-8 md:px-10 md:py-10">
    <a href="/exams/manage" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500"><ArrowLeft size={16}/>Examinations</a>
    <div className="mt-8 flex flex-wrap items-end justify-between gap-4"><div><div className="eyebrow">Faculty tools</div><h1 className="mt-2 text-3xl font-semibold text-navy">Examination results</h1><p className="mt-2 text-sm text-slate-500">Review cohort submissions and export this examination’s score summary.</p></div><button onClick={downloadCsv} disabled={!results.data?.length} className="inline-flex items-center gap-2 rounded-xl bg-teal px-4 py-3 text-sm font-semibold text-white disabled:opacity-40"><Download size={16}/>Export CSV</button></div>
    {results.isLoading ? <div className="card mt-7 p-8 text-sm text-slate-400">Loading submissions…</div> : results.error ? <div role="alert" className="card mt-7 p-8 text-sm text-rose-700">{(results.error as Error).message}</div> : results.data?.length ? <div className="card mt-7 overflow-hidden"><div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 text-sm font-semibold text-navy"><Users size={16} className="text-teal"/>{results.data.length} submitted attempt{results.data.length === 1 ? "" : "s"}</div><div className="divide-y divide-slate-100">{results.data.map((result)=><article key={result.attempt_id} className="flex flex-wrap items-center gap-4 px-5 py-4"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#eaf4f5] text-teal"><FileCheck2 size={17}/></div><div className="min-w-[180px] flex-1"><div className="text-sm font-semibold text-navy">{result.student_name}</div><div className="mt-1 text-xs text-slate-400">Student #{result.student_id} · Submitted {new Date(result.submitted_at).toLocaleString()}</div></div><div className="text-right"><div className="text-sm font-semibold text-navy">{result.total_score === null ? "Review pending" : `${result.total_score} / ${result.total_marks}`}</div><div className="mt-1 text-xs text-slate-400">{result.answers.length} answers</div></div><a href={`/results/${result.attempt_id}`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">View feedback</a></article>)}</div></div> : <div className="card mt-7 p-12 text-center"><FileCheck2 className="mx-auto text-slate-300"/><p className="mt-3 text-sm font-semibold text-navy">No submissions yet</p><p className="mt-1 text-xs text-slate-400">Results appear here after students submit their attempts.</p></div>}
  </main>;
}
