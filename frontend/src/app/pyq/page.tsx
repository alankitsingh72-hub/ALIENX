"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  FileText,
  Filter,
  GraduationCap,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import AppShell from "@/app/components/AppShell";
import { api, type PYQPaper, type PYQQuestion, type Subject } from "@/lib/api";
import { useAuth } from "@/lib/store";

export default function PYQPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Filters
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"papers" | "practice">("papers");

  // Practice state
  const [revealedSolutions, setRevealedSolutions] = useState<Record<number, boolean>>({});

  // Modals
  const [paperModalOpen, setPaperModalOpen] = useState(false);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);

  // New Paper state
  const [pSubjectId, setPSubjectId] = useState<number | "">("");
  const [pTitle, setPTitle] = useState("");
  const [pYear, setPYear] = useState(2024);
  const [pExamType, setPExamType] = useState("End-Term");
  const [pUniversity, setPUniversity] = useState("Apex Technical University");
  const [pDescription, setPDescription] = useState("");
  const [pFileUrl, setPFileUrl] = useState("");

  // New Question state
  const [qSubjectId, setQSubjectId] = useState<number | "">("");
  const [qPaperId, setQPaperId] = useState<number | "">("");
  const [qYear, setQYear] = useState(2024);
  const [qText, setQText] = useState("");
  const [qMarks, setQMarks] = useState(5);
  const [qType, setQType] = useState("short_answer");
  const [qSolution, setQSolution] = useState("");
  const [qDifficulty, setQDifficulty] = useState("medium");

  const subjects = useQuery({
    queryKey: ["subjects"],
    queryFn: () => api<Subject[]>("/subjects"),
  });

  const papersQuery = useQuery({
    queryKey: ["pyq-papers", selectedSubjectId, selectedYear, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedSubjectId) params.append("subject_id", selectedSubjectId);
      if (selectedYear) params.append("year", selectedYear);
      if (search) params.append("search", search);
      return api<PYQPaper[]>(`/pyq/papers?${params.toString()}`);
    },
  });

  const questionsQuery = useQuery({
    queryKey: ["pyq-questions", selectedSubjectId, selectedYear, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedSubjectId) params.append("subject_id", selectedSubjectId);
      if (selectedYear) params.append("year", selectedYear);
      if (search) params.append("search", search);
      return api<PYQQuestion[]>(`/pyq/questions?${params.toString()}`);
    },
  });

  const createPaperMutation = useMutation({
    mutationFn: async () => {
      return api("/pyq/papers", {
        method: "POST",
        body: JSON.stringify({
          subject_id: Number(pSubjectId),
          title: pTitle,
          year: Number(pYear),
          exam_type: pExamType,
          university: pUniversity,
          description: pDescription,
          file_url: pFileUrl || null,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pyq-papers"] });
      setPaperModalOpen(false);
      setPTitle("");
      setPDescription("");
      setPFileUrl("");
    },
    onError: (err: Error) => alert(`Error: ${err.message}`),
  });

  const createQuestionMutation = useMutation({
    mutationFn: async () => {
      return api("/pyq/questions", {
        method: "POST",
        body: JSON.stringify({
          subject_id: Number(qSubjectId),
          paper_id: qPaperId ? Number(qPaperId) : null,
          year: Number(qYear),
          question_text: qText,
          marks: Number(qMarks),
          question_type: qType,
          solution: qSolution || null,
          difficulty: qDifficulty,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pyq-questions"] });
      setQuestionModalOpen(false);
      setQText("");
      setQSolution("");
    },
    onError: (err: Error) => alert(`Error: ${err.message}`),
  });

  const deletePaperMutation = useMutation({
    mutationFn: async (id: number) => api(`/pyq/papers/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pyq-papers"] }),
    onError: (err: Error) => alert(`Could not delete paper: ${err.message}`),
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: number) => api(`/pyq/questions/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pyq-questions"] }),
    onError: (err: Error) => alert(`Could not delete question: ${err.message}`),
  });

  const isPrivileged = user?.role === "admin" || user?.role === "faculty";

  const toggleSolution = (id: number) => {
    setRevealedSolutions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <AppShell
      currentPath="/pyq"
      title="Previous Year Questions"
      subtitle="University archives, structured questions & interactive practice repository"
      action={
        isPrivileged ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuestionModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Plus size={14} />
              Add Question
            </button>
            <button
              onClick={() => setPaperModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-teal px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#076f79]"
            >
              <Plus size={14} />
              Add Paper
            </button>
          </div>
        ) : undefined
      }
    >
      {/* Top Filter Bar & Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Tabs */}
        <div className="flex rounded-xl bg-slate-200/60 p-1 text-xs font-bold text-slate-600">
          <button
            onClick={() => setActiveTab("papers")}
            className={`rounded-lg px-4 py-1.5 transition ${
              activeTab === "papers" ? "bg-white text-navy shadow-sm" : "hover:text-navy"
            }`}
          >
            Exam Papers Archive
          </button>
          <button
            onClick={() => setActiveTab("practice")}
            className={`rounded-lg px-4 py-1.5 transition ${
              activeTab === "practice" ? "bg-white text-navy shadow-sm" : "hover:text-navy"
            }`}
          >
            Structured Questions (Practice)
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-teal"
          >
            <option value="">All Subjects</option>
            {(subjects.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-teal"
          >
            <option value="">All Years</option>
            {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <div className="relative w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs outline-none focus:border-teal"
            />
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* PAPERS TAB                                                     */}
      {/* ============================================================== */}
      {activeTab === "papers" && (
        <div className="mt-8">
          {papersQuery.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card h-48 animate-pulse bg-slate-50" />
              ))}
            </div>
          ) : (papersQuery.data ?? []).length === 0 ? (
            <div className="card p-12 text-center text-xs text-slate-400">
              No previous year papers match your filter criteria.
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {(papersQuery.data ?? []).map((paper) => (
                <div
                  key={paper.id}
                  className="card flex flex-col justify-between p-6 transition duration-200 hover:border-teal/40 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="rounded-lg bg-teal/10 px-2 py-0.5 text-xs font-bold text-teal">
                        {paper.year} • {paper.exam_type}
                      </span>
                      {isPrivileged && (
                        <button
                          onClick={() => {
                            if (confirm(`Delete paper "${paper.title}"?`)) {
                              deletePaperMutation.mutate(paper.id);
                            }
                          }}
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <h3 className="mt-3 text-base font-bold text-navy">{paper.title}</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-400">{paper.university}</p>
                    <p className="mt-2 line-clamp-2 text-xs text-slate-500">
                      {paper.description || "University term examination archive paper."}
                    </p>
                  </div>

                  <div className="mt-6 border-t border-slate-100 pt-4 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400">
                      {paper.subject_name || "General"}
                    </span>

                    {paper.file_url ? (
                      <a
                        href={paper.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-navy hover:bg-teal hover:text-white transition"
                      >
                        <Download size={13} />
                        Download PDF
                      </a>
                    ) : (
                      <span className="text-[11px] text-slate-400">Digital Archive</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* PRACTICE TAB (Structured Questions)                            */}
      {/* ============================================================== */}
      {activeTab === "practice" && (
        <div className="mt-8 space-y-4">
          {questionsQuery.isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card h-32 animate-pulse bg-slate-50" />
              ))}
            </div>
          ) : (questionsQuery.data ?? []).length === 0 ? (
            <div className="card p-12 text-center text-xs text-slate-400">
              No questions found for selected criteria.
            </div>
          ) : (
            (questionsQuery.data ?? []).map((q, idx) => {
              const isRevealed = !!revealedSolutions[q.id];
              return (
                <div key={q.id} className="card p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-xs font-bold text-navy">
                        {idx + 1}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-navy">
                        {q.year}
                      </span>
                      <span className="rounded-md bg-teal/10 px-2 py-0.5 text-[10px] font-bold uppercase text-teal">
                        {q.subject_name || "General"}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 capitalize">
                        {q.difficulty}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                        {q.marks} marks
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleSolution(q.id)}
                        className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        <Eye size={13} />
                        {isRevealed ? "Hide Solution" : "View Solution"}
                      </button>

                      {isPrivileged && (
                        <button
                          onClick={() => {
                            if (confirm("Delete this question?")) {
                              deleteQuestionMutation.mutate(q.id);
                            }
                          }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="mt-4 text-sm font-semibold leading-relaxed text-navy">
                    {q.question_text}
                  </p>

                  {/* Options if MCQ */}
                  {q.question_type === "mcq" && q.options && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`rounded-xl border px-3 py-2 text-xs font-medium ${
                            isRevealed && opt === q.correct_answer
                              ? "border-emerald-300 bg-emerald-50 text-emerald-900 font-semibold"
                              : "border-slate-200 bg-white text-slate-600"
                          }`}
                        >
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Solution block */}
                  {isRevealed && (
                    <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 animate-in fade-in">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                        Official Solution & Marking Scheme
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-emerald-950">
                        {q.solution || "No detailed solution provided."}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADD PAPER                                               */}
      {/* ============================================================== */}
      {paperModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-navy">Add Previous Year Exam Paper</h2>
            <p className="mt-1 text-xs text-slate-500">
              Upload or link an official university examination paper.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Subject *</label>
                <select
                  value={pSubjectId}
                  onChange={(e) => setPSubjectId(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal"
                >
                  <option value="">Select subject...</option>
                  {(subjects.data ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Paper Title *</label>
                <input
                  value={pTitle}
                  onChange={(e) => setPTitle(e.target.value)}
                  placeholder="e.g. DBMS End-Semester Examination 2024"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Year *</label>
                  <input
                    type="number"
                    value={pYear}
                    onChange={(e) => setPYear(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Exam Type</label>
                  <select
                    value={pExamType}
                    onChange={(e) => setPExamType(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal"
                  >
                    <option value="End-Term">End-Term</option>
                    <option value="Mid-Term">Mid-Term</option>
                    <option value="Improvement">Improvement</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">University / Institution</label>
                <input
                  value={pUniversity}
                  onChange={(e) => setPUniversity(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">PDF Document Link (URL)</label>
                <input
                  value={pFileUrl}
                  onChange={(e) => setPFileUrl(e.target.value)}
                  placeholder="https://... / paper.pdf"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={pDescription}
                  onChange={(e) => setPDescription(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPaperModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!pSubjectId || !pTitle.trim() || createPaperMutation.isPending}
                onClick={() => createPaperMutation.mutate()}
                className="rounded-xl bg-teal px-5 py-2 text-xs font-semibold text-white hover:bg-[#076f79] disabled:opacity-50"
              >
                Save Paper
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADD QUESTION                                            */}
      {/* ============================================================== */}
      {questionModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-navy">Add PYQ Question</h2>
            <p className="mt-1 text-xs text-slate-500">
              Add a standalone question from past exam archives.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Subject *</label>
                <select
                  value={qSubjectId}
                  onChange={(e) => setQSubjectId(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal"
                >
                  <option value="">Select subject...</option>
                  {(subjects.data ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Year *</label>
                  <input
                    type="number"
                    value={qYear}
                    onChange={(e) => setQYear(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Marks</label>
                  <input
                    type="number"
                    value={qMarks}
                    onChange={(e) => setQMarks(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Question Text *</label>
                <textarea
                  rows={3}
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  placeholder="Enter full exam question..."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Official Solution</label>
                <textarea
                  rows={3}
                  value={qSolution}
                  onChange={(e) => setQSolution(e.target.value)}
                  placeholder="Detailed solution, proof or marking scheme..."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setQuestionModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!qSubjectId || !qText.trim() || createQuestionMutation.isPending}
                onClick={() => createQuestionMutation.mutate()}
                className="rounded-xl bg-teal px-5 py-2 text-xs font-semibold text-white hover:bg-[#076f79] disabled:opacity-50"
              >
                Save Question
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

