"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  Eye,
  EyeOff,
  Flame,
  HelpCircle,
  Lightbulb,
  Search,
  Sparkles,
  Tag,
  XCircle,
} from "lucide-react";
import AppShell from "@/app/components/AppShell";
import { api, type Question, type Subject } from "@/lib/api";

export default function HotsPracticePage() {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [revealedSolutions, setRevealedSolutions] = useState<{ [id: number]: boolean }>({});
  const [selectedMcqAnswers, setSelectedMcqAnswers] = useState<{ [id: number]: string }>({});

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: () => api<Subject[]>("/subjects"),
  });

  const { data: questions, isLoading } = useQuery({
    queryKey: ["hots-questions", selectedSubjectId, difficultyFilter, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedSubjectId !== "all") params.append("subject_id", selectedSubjectId);
      if (difficultyFilter !== "all") params.append("difficulty", difficultyFilter);
      if (search.trim()) params.append("search", search.trim());
      const query = params.toString() ? `?${params.toString()}` : "";
      return api<Question[]>(`/questions/hots${query}`);
    },
  });

  const toggleReveal = (qId: number) => {
    setRevealedSolutions((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  const handleMcqSelect = (qId: number, option: string) => {
    setSelectedMcqAnswers((prev) => ({ ...prev, [qId]: option }));
  };

  const getDifficultyBadge = (diff: string) => {
    switch (diff.toLowerCase()) {
      case "easy":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "medium":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "tough":
      case "hard":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <AppShell
      currentPath="/hots"
      title="HOTS Practice Zone"
      subtitle="Higher Order Thinking Skills • Analysis, Synthesis & Architectural Rigor"
    >
      {/* Banner */}
      <div className="mb-8 rounded-3xl border border-slate-200 bg-gradient-to-r from-[#1b1b2f] via-[#241e3d] to-[#102a43] p-6 text-white shadow-sm md:p-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-300 backdrop-blur-md border border-rose-500/30">
            <Flame size={14} className="text-rose-400" /> Advanced Cognitive Challenges
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">
            Higher Order Thinking Skills (HOTS)
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Push beyond rote memorization. Practice deep analytical, application-based, and architectural problems
            designed to evaluate system tradeoffs, concurrency anomalies, and rigorous formal proofs.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="mb-6 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm border border-slate-200 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {/* Subject Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Subject:</span>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-navy outline-none focus:border-teal"
            >
              <option value="all">All Subjects (12)</option>
              {subjects?.map((sub) => (
                <option key={sub.id} value={sub.id.toString()}>
                  {sub.code} - {sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Difficulty:</span>
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-navy outline-none focus:border-teal capitalize"
            >
              <option value="all">All Levels</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="tough">Tough</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search concepts or proofs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-teal"
          />
        </div>
      </div>

      {/* Questions List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-3xl border border-slate-200 bg-white p-6" />
          ))}
        </div>
      ) : questions && questions.length > 0 ? (
        <div className="space-y-5">
          {questions.map((q, index) => {
            const isRevealed = Boolean(revealedSolutions[q.id]);
            const selectedOpt = selectedMcqAnswers[q.id];
            const isCorrect = selectedOpt === q.correct_answer;

            return (
              <div
                key={q.id}
                className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm transition hover:border-teal/30 hover:shadow-md"
              >
                {/* Header Pills */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-xl bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">
                      <Flame size={12} className="text-rose-500" /> HOTS
                    </span>
                    {q.subject_name && (
                      <span className="rounded-xl bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                        {q.subject_name}
                      </span>
                    )}
                    <span className={`rounded-xl border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${getDifficultyBadge(q.difficulty)}`}>
                      {q.difficulty}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <span className="capitalize">{q.type.replace("_", " ")}</span>
                    <span>•</span>
                    <span className="text-teal font-bold">{q.marks} Marks</span>
                  </div>
                </div>

                {/* Question Prompt */}
                <div className="mt-4">
                  <h3 className="text-base font-bold text-navy">
                    {index + 1}. {q.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-700 whitespace-pre-line font-mono bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                    {q.content}
                  </p>
                </div>

                {/* Interactive MCQ Section */}
                {q.type === "mcq" && q.options && q.options.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="text-[11px] font-semibold text-slate-500">Select your hypothesis:</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {q.options.map((opt) => {
                        const isChosen = selectedOpt === opt;
                        const isOptCorrect = opt === q.correct_answer;
                        let btnStyle = "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700";

                        if (selectedOpt) {
                          if (isChosen && isCorrect) {
                            btnStyle = "bg-emerald-50 border-emerald-400 text-emerald-800 font-semibold";
                          } else if (isChosen && !isCorrect) {
                            btnStyle = "bg-rose-50 border-rose-400 text-rose-800 font-semibold";
                          } else if (isOptCorrect) {
                            btnStyle = "bg-emerald-50/50 border-emerald-300 text-emerald-700";
                          }
                        }

                        return (
                          <button
                            key={opt}
                            onClick={() => handleMcqSelect(q.id, opt)}
                            className={`flex items-center justify-between rounded-xl border p-2.5 text-left text-xs transition ${btnStyle}`}
                          >
                            <span>{opt}</span>
                            {selectedOpt && isChosen && (
                              <span>
                                {isCorrect ? (
                                  <CheckCircle2 size={16} className="text-emerald-600" />
                                ) : (
                                  <XCircle size={16} className="text-rose-600" />
                                )}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {q.tags && q.tags.length > 0 && (
                  <div className="mt-3.5 flex flex-wrap gap-1.5">
                    {q.tags.map((t) => (
                      <span key={t} className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Model Answer / Solution Expander */}
                <div className="mt-5 border-t border-slate-100 pt-3.5">
                  <button
                    onClick={() => toggleReveal(q.id)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-teal hover:underline"
                  >
                    {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                    {isRevealed ? "Hide Solution & Rubric" : "View Model Solution & Analysis"}
                  </button>

                  {isRevealed && (
                    <div className="mt-3 rounded-2xl bg-teal/5 p-4 border border-teal/20 text-xs">
                      {q.explanation && (
                        <div className="mb-2.5">
                          <div className="flex items-center gap-1 font-bold text-teal">
                            <Lightbulb size={13} /> Explanation & Logic:
                          </div>
                          <p className="mt-1 text-slate-700 leading-relaxed">{q.explanation}</p>
                        </div>
                      )}

                      {q.model_answer && (
                        <div className="mb-2.5">
                          <div className="flex items-center gap-1 font-bold text-navy">
                            <CheckCircle2 size={13} className="text-emerald-600" /> Benchmark Model Answer:
                          </div>
                          <p className="mt-1 text-slate-700 leading-relaxed whitespace-pre-line">{q.model_answer}</p>
                        </div>
                      )}

                      {q.keywords && q.keywords.length > 0 && (
                        <div className="mt-2.5 border-t border-teal/10 pt-2 text-[11px] text-slate-500">
                          <span className="font-semibold text-navy">Key Conceptual Keywords: </span>
                          {q.keywords.join(", ")}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Brain size={36} className="mx-auto text-slate-400" />
          <h3 className="mt-3 text-sm font-bold text-navy">No HOTS Questions Found</h3>
          <p className="mt-1 text-xs text-slate-500">Try adjusting your subject or difficulty filters.</p>
        </div>
      )}
    </AppShell>
  );
}

