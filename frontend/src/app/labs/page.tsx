"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code,
  Copy,
  Download,
  FileText,
  Filter,
  FlaskConical,
  HelpCircle,
  Plus,
  Search,
  Terminal,
  Trash2,
} from "lucide-react";
import AppShell from "@/app/components/AppShell";
import { api, type LabManual, type Subject } from "@/lib/api";
import { useAuth } from "@/lib/store";

export default function LabsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Filters & State
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [expandedLabId, setExpandedLabId] = useState<number | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<number | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [subjectId, setSubjectId] = useState<number | "">("");
  const [title, setTitle] = useState("");
  const [labNumber, setLabNumber] = useState(1);
  const [objectives, setObjectives] = useState("");
  const [theory, setTheory] = useState("");
  const [procedure, setProcedure] = useState("");
  const [sampleCode, setSampleCode] = useState("");
  const [programmingLanguage, setProgrammingLanguage] = useState("python");
  const [expectedOutput, setExpectedOutput] = useState("");
  const [vivaInput, setVivaInput] = useState("");
  const [fileUrl, setFileUrl] = useState("");

  const subjects = useQuery({
    queryKey: ["subjects"],
    queryFn: () => api<Subject[]>("/subjects"),
  });

  const labsQuery = useQuery({
    queryKey: ["lab-manuals", selectedSubjectId, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedSubjectId) params.append("subject_id", selectedSubjectId);
      if (search) params.append("search", search);
      return api<LabManual[]>(`/labs?${params.toString()}`);
    },
  });

  const toggleCompleteMutation = useMutation({
    mutationFn: async (manualId: number) => {
      return api<{ manual_id: number; is_completed: boolean }>(`/labs/${manualId}/toggle-complete`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-manuals"] });
    },
    onError: (err: Error) => alert(`Could not toggle completion: ${err.message}`),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      // Parse viva questions from text lines (Question? Answer)
      const viva_questions = vivaInput
        .split("\n")
        .filter((line) => line.includes("?"))
        .map((line) => {
          const parts = line.split("?");
          return { question: parts[0].trim() + "?", answer: parts[1]?.trim() || "See theory" };
        });

      return api("/labs", {
        method: "POST",
        body: JSON.stringify({
          subject_id: Number(subjectId),
          title,
          lab_number: Number(labNumber),
          objectives,
          theory,
          procedure,
          sample_code: sampleCode || null,
          programming_language: programmingLanguage,
          expected_output: expectedOutput || null,
          viva_questions,
          file_url: fileUrl || null,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-manuals"] });
      setModalOpen(false);
      resetForm();
    },
    onError: (err: Error) => alert(`Error: ${err.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api(`/labs/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lab-manuals"] }),
    onError: (err: Error) => alert(`Could not delete lab: ${err.message}`),
  });

  const resetForm = () => {
    setTitle("");
    setLabNumber(1);
    setObjectives("");
    setTheory("");
    setProcedure("");
    setSampleCode("");
    setExpectedOutput("");
    setVivaInput("");
    setFileUrl("");
  };

  const copyCode = (id: number, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const isStudent = user?.role === "student";
  const isPrivileged = user?.role === "admin" || user?.role === "faculty";

  const labsList = labsQuery.data ?? [];
  const completedCount = labsList.filter((m) => m.is_completed).length;
  const progressPercent = labsList.length > 0 ? Math.round((completedCount / labsList.length) * 100) : 0;

  return (
    <AppShell
      currentPath="/labs"
      title="Lab Manuals"
      subtitle="Laboratory syllabi, executable code templates, viva Q&A & completion tracking"
      action={
        isPrivileged ? (
          <button
            onClick={() => {
              resetForm();
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-teal px-4 py-2 text-xs font-bold text-white hover:bg-[#076f79]"
          >
            <Plus size={15} />
            Create Lab Manual
          </button>
        ) : undefined
      }
    >
      {/* Top Filter & Progress Header */}
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter size={15} className="text-slate-400" />
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
            </div>

            <div className="relative w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search experiments..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-3 text-xs outline-none focus:border-teal"
              />
            </div>
          </div>

          {/* Student Progress Bar */}
          {isStudent && (
            <div className="flex items-center gap-4 rounded-2xl bg-white px-4 py-2.5 shadow-sm border border-slate-200">
              <div>
                <div className="text-xs font-bold text-navy">
                  Progress: {completedCount} / {labsList.length} Labs
                </div>
                <div className="text-[10px] text-slate-400">{progressPercent}% Completed</div>
              </div>
              <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-teal transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Lab Manuals Accordion / Card List */}
        {labsQuery.isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card h-28 animate-pulse bg-slate-50" />
            ))}
          </div>
        ) : labsList.length === 0 ? (
          <div className="card p-12 text-center text-xs text-slate-400">
            No lab manuals match your current filter.
          </div>
        ) : (
          <div className="space-y-4">
            {labsList.map((manual) => {
              const isExpanded = expandedLabId === manual.id;
              return (
                <div
                  key={manual.id}
                  className={`card overflow-hidden transition-all duration-200 ${
                    manual.is_completed ? "border-emerald-200 bg-emerald-50/20" : ""
                  }`}
                >
                  {/* Header Row */}
                  <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3.5">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal/10 font-bold text-teal text-sm">
                        #{manual.lab_number}
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-navy text-base">{manual.title}</h3>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            {manual.subject_name || "General"}
                          </span>
                          {manual.programming_language && (
                            <span className="rounded-md bg-teal/10 px-2 py-0.5 text-[10px] font-bold uppercase text-teal">
                              {manual.programming_language}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                          {manual.objectives || "Laboratory procedure and code exercise."}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Student Completion Checkbox */}
                      {isStudent && (
                        <button
                          onClick={() => toggleCompleteMutation.mutate(manual.id)}
                          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                            manual.is_completed
                              ? "bg-emerald-600 text-white hover:bg-emerald-700"
                              : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <CheckCircle2 size={14} />
                          {manual.is_completed ? "Completed" : "Mark Complete"}
                        </button>
                      )}

                      {/* Download PDF button if link exists */}
                      {manual.file_url && (
                        <a
                          href={manual.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          <Download size={13} />
                          PDF
                        </a>
                      )}

                      {/* Expand / Collapse Button */}
                      <button
                        onClick={() => setExpandedLabId(isExpanded ? null : manual.id)}
                        className="flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-navy hover:bg-slate-200"
                      >
                        {isExpanded ? "Collapse" : "Open Manual"}
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      {isPrivileged && (
                        <button
                          onClick={() => {
                            if (confirm(`Delete lab manual "${manual.title}"?`)) {
                              deleteMutation.mutate(manual.id);
                            }
                          }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Manual Content */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-white p-6 space-y-6 animate-in fade-in">
                      {/* Objectives */}
                      <div>
                        <div className="eyebrow text-teal">Objectives</div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-700">
                          {manual.objectives || "No specific objectives stated."}
                        </p>
                      </div>

                      {/* Theory */}
                      {manual.theory && (
                        <div>
                          <div className="eyebrow text-teal">Theoretical Background</div>
                          <p className="mt-1 text-xs leading-relaxed text-slate-700 whitespace-pre-line">
                            {manual.theory}
                          </p>
                        </div>
                      )}

                      {/* Procedure */}
                      {manual.procedure && (
                        <div>
                          <div className="eyebrow text-teal">Procedure & Instructions</div>
                          <p className="mt-1 text-xs leading-relaxed text-slate-700 whitespace-pre-line">
                            {manual.procedure}
                          </p>
                        </div>
                      )}

                      {/* Sample Code Block */}
                      {manual.sample_code && (
                        <div>
                          <div className="flex items-center justify-between">
                            <div className="eyebrow flex items-center gap-1.5 text-teal">
                              <Code size={13} />
                              Sample Implementation ({manual.programming_language || "code"})
                            </div>
                            <button
                              onClick={() => copyCode(manual.id, manual.sample_code!)}
                              className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-teal"
                            >
                              {copiedCodeId === manual.id ? (
                                <>
                                  <Check size={12} className="text-emerald-600" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy size={12} />
                                  Copy Code
                                </>
                              )}
                            </button>
                          </div>
                          <div className="mt-2 overflow-x-auto rounded-xl bg-slate-900 p-4 font-mono text-xs text-emerald-400">
                            <pre>{manual.sample_code}</pre>
                          </div>
                        </div>
                      )}

                      {/* Expected Output */}
                      {manual.expected_output && (
                        <div>
                          <div className="eyebrow flex items-center gap-1.5 text-teal">
                            <Terminal size={13} />
                            Expected Terminal Output
                          </div>
                          <div className="mt-2 overflow-x-auto rounded-xl bg-slate-950 p-3.5 font-mono text-xs text-slate-200 border border-slate-800">
                            <pre>{manual.expected_output}</pre>
                          </div>
                        </div>
                      )}

                      {/* Viva Questions */}
                      {manual.viva_questions && manual.viva_questions.length > 0 && (
                        <div>
                          <div className="eyebrow flex items-center gap-1.5 text-teal">
                            <HelpCircle size={13} />
                            Viva Voce Examination Questions
                          </div>
                          <div className="mt-3 space-y-2.5">
                            {manual.viva_questions.map((v, vIdx) => (
                              <div
                                key={vIdx}
                                className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs"
                              >
                                <div className="font-bold text-navy">
                                  Q{vIdx + 1}: {v.question}
                                </div>
                                <div className="mt-1 text-slate-600">
                                  <span className="font-semibold text-teal">Answer: </span>
                                  {v.answer}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL: CREATE LAB MANUAL                                        */}
      {/* ============================================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl my-8">
            <h2 className="text-lg font-bold text-navy">Create Lab Manual</h2>
            <p className="mt-1 text-xs text-slate-500">
              Provide laboratory experiment objectives, theory, sample code, and viva questions.
            </p>

            <div className="mt-5 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700">Subject *</label>
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(Number(e.target.value))}
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
                  <label className="block text-xs font-semibold text-slate-700">Lab # *</label>
                  <input
                    type="number"
                    min={1}
                    value={labNumber}
                    onChange={(e) => setLabNumber(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Lab Title *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Lab 1: Schema Definition & SQL Constraints"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Objectives</label>
                <textarea
                  rows={2}
                  value={objectives}
                  onChange={(e) => setObjectives(e.target.value)}
                  placeholder="Key learning outcomes and objectives..."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Theory</label>
                <textarea
                  rows={3}
                  value={theory}
                  onChange={(e) => setTheory(e.target.value)}
                  placeholder="Theoretical background and principles..."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Procedure / Steps</label>
                <textarea
                  rows={3}
                  value={procedure}
                  onChange={(e) => setProcedure(e.target.value)}
                  placeholder="1. Step one&#10;2. Step two..."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700">Sample Code</label>
                  <textarea
                    rows={4}
                    value={sampleCode}
                    onChange={(e) => setSampleCode(e.target.value)}
                    placeholder="Executable code snippet..."
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono outline-none focus:border-teal"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Language</label>
                  <select
                    value={programmingLanguage}
                    onChange={(e) => setProgrammingLanguage(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal"
                  >
                    <option value="python">Python</option>
                    <option value="c">C</option>
                    <option value="sql">SQL</option>
                    <option value="typescript">TypeScript</option>
                    <option value="javascript">JavaScript</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Expected Output</label>
                <textarea
                  rows={2}
                  value={expectedOutput}
                  onChange={(e) => setExpectedOutput(e.target.value)}
                  placeholder="Expected terminal output..."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono outline-none focus:border-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Viva Questions (One per line with question mark, e.g. Question? Answer)
                </label>
                <textarea
                  rows={3}
                  value={vivaInput}
                  onChange={(e) => setVivaInput(e.target.value)}
                  placeholder="What is primary key? Uniquely identifies rows.&#10;What is foreign key? Enforces referential integrity."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">PDF Document Link (URL)</label>
                <input
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://... / lab-manual.pdf"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!subjectId || !title.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate()}
                className="rounded-xl bg-teal px-5 py-2 text-xs font-semibold text-white hover:bg-[#076f79] disabled:opacity-50"
              >
                Save Lab Manual
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

