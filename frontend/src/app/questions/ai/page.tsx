"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Copy,
  Edit2,
  FileQuestion,
  HelpCircle,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import AppShell from "@/app/components/AppShell";
import { api, type AIGeneratedQuestionItem, type AIGenerateResponse, type Subject } from "@/lib/api";
import { useAuth } from "@/lib/store";

export default function AIQuestionGeneratorPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Generator form inputs
  const [subjectId, setSubjectId] = useState<number | "">("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [questionType, setQuestionType] = useState<"mcq" | "short_answer" | "descriptive">("mcq");
  const [count, setCount] = useState<number>(5);

  // Generated state
  const [generatedBatch, setGeneratedBatch] = useState<AIGeneratedQuestionItem[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [savedSuccessMessage, setSavedSuccessMessage] = useState<string>("");

  const subjects = useQuery({
    queryKey: ["subjects"],
    queryFn: () => api<Subject[]>("/subjects"),
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      setSavedSuccessMessage("");
      return api<AIGenerateResponse>("/ai/generate-questions", {
        method: "POST",
        body: JSON.stringify({
          subject_id: Number(subjectId),
          topic,
          difficulty,
          question_type: questionType,
          count,
        }),
      });
    },
    onSuccess: (data) => {
      setGeneratedBatch(data.questions);
    },
    onError: (err: Error) => {
      alert(`AI Generation error: ${err.message}`);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (questionsToSave: AIGeneratedQuestionItem[]) => {
      const payloads = questionsToSave.map((q) => ({
        subject_id: Number(subjectId),
        title: q.title,
        content: q.content,
        type: q.type,
        options: q.options,
        correct_answer: q.correct_answer,
        model_answer: q.model_answer,
        keywords: q.keywords,
        explanation: q.explanation,
        marks: q.marks,
        difficulty: q.difficulty,
        tags: q.tags,
      }));

      return api("/questions/bulk", {
        method: "POST",
        body: JSON.stringify(payloads),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      setSavedSuccessMessage(
        `Successfully added ${generatedBatch.length} question(s) to your Question Bank!`
      );
      setGeneratedBatch([]);
    },
    onError: (err: Error) => {
      alert(`Could not save questions: ${err.message}`);
    },
  });

  const handleUpdateQuestion = (index: number, updated: Partial<AIGeneratedQuestionItem>) => {
    setGeneratedBatch((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...updated } : item))
    );
  };

  const handleRemoveQuestion = (index: number) => {
    setGeneratedBatch((prev) => prev.filter((_, idx) => idx !== index));
  };

  return (
    <AppShell
      currentPath="/questions/ai"
      title="AI Question Generator"
      subtitle="Synthesize curriculum-aligned assessments, model answers & scoring criteria"
      action={
        <a
          href="/questions"
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <FileQuestion size={14} />
          View Question Bank
        </a>
      }
    >
      <div className="grid gap-8 lg:grid-cols-12">
        {/* Left Form: Parameter Selection */}
        <div className="lg:col-span-4">
          <div className="card sticky top-24 p-6">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal/10 text-teal">
                <Wand2 size={16} />
              </span>
              <div>
                <h2 className="text-base font-bold text-navy">Generation Prompt</h2>
                <div className="eyebrow text-[10px]">Configure generator</div>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Target Subject *</label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value ? Number(e.target.value) : "")}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-teal"
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
                <label className="block text-xs font-semibold text-slate-700">Topic or Concept *</label>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Normalization & BCNF, AVL Trees, Concurrency..."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-teal"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-teal"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Quantity (Bulk)</label>
                  <select
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-teal"
                  >
                    <option value={1}>1 Question</option>
                    <option value={3}>3 Questions</option>
                    <option value={5}>5 Questions</option>
                    <option value={10}>10 Questions</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Question Format</label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {[
                    { id: "mcq", label: "MCQ" },
                    { id: "short_answer", label: "Short" },
                    { id: "descriptive", label: "Descriptive" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setQuestionType(t.id as any)}
                      className={`rounded-xl border py-2 text-xs font-semibold transition ${
                        questionType === t.id
                          ? "border-teal bg-teal/10 text-teal"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={!subjectId || !topic.trim() || generateMutation.isPending}
                onClick={() => generateMutation.mutate()}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-teal py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#076f79] disabled:opacity-50"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Generating Questions...
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    Generate {count} Question{count > 1 ? "s" : ""}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Preview & Action Area */}
        <div className="lg:col-span-8">
          {savedSuccessMessage && (
            <div className="mb-6 flex items-center justify-between rounded-2xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 border border-emerald-200">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" />
                <span>{savedSuccessMessage}</span>
              </div>
              <a
                href="/questions"
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-700"
              >
                Go to Question Bank
                <ArrowRight size={13} />
              </a>
            </div>
          )}

          {generatedBatch.length === 0 && !generateMutation.isPending && (
            <div className="card grid place-items-center p-12 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-50 text-slate-400">
                <Bot size={28} />
              </div>
              <h3 className="mt-4 text-base font-bold text-navy">Ready to generate</h3>
              <p className="mt-1 max-w-md text-xs text-slate-400">
                Select a subject, specify your concept or curriculum topic, and our AI engine will
                produce high-caliber exam questions with options, rubrics, and model answers.
              </p>
            </div>
          )}

          {generateMutation.isPending && (
            <div className="card space-y-4 p-8 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-teal/10 text-teal animate-spin">
                <RefreshCw size={24} />
              </div>
              <h3 className="text-sm font-bold text-navy">Synthesizing questions...</h3>
              <p className="text-xs text-slate-400">
                Aligning evaluation criteria and constructing model answers.
              </p>
            </div>
          )}

          {generatedBatch.length > 0 && (
            <div className="space-y-6">
              {/* Batch Actions Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-navy">
                    {generatedBatch.length} Generated Question{generatedBatch.length > 1 ? "s" : ""}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Review and edit before approving into Question Bank
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setGeneratedBatch([])}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Discard Batch
                  </button>
                  <button
                    disabled={saveMutation.isPending}
                    onClick={() => saveMutation.mutate(generatedBatch)}
                    className="flex items-center gap-1.5 rounded-xl bg-teal px-4 py-1.5 text-xs font-bold text-white hover:bg-[#076f79] disabled:opacity-50"
                  >
                    <Save size={14} />
                    {saveMutation.isPending ? "Saving..." : "Approve & Save All to Bank"}
                  </button>
                </div>
              </div>

              {/* Generated Cards */}
              {generatedBatch.map((q, idx) => (
                <div
                  key={idx}
                  className="card p-6 transition duration-150 hover:border-slate-300"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-xs font-bold text-navy">
                        {idx + 1}
                      </span>
                      <span className="rounded-md bg-teal/10 px-2 py-0.5 text-[10px] font-bold uppercase text-teal">
                        {q.type.replace("_", " ")}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                        {q.marks} marks
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 capitalize">
                        {q.difficulty}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingIndex(editingIndex === idx ? null : idx)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-navy"
                        title="Edit question"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleRemoveQuestion(idx)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        title="Remove question"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {editingIndex === idx ? (
                    /* Inline Edit Mode */
                    <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-600">Title</label>
                        <input
                          value={q.title}
                          onChange={(e) => handleUpdateQuestion(idx, { title: e.target.value })}
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-navy outline-none focus:border-teal"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-600">Question Content</label>
                        <textarea
                          rows={3}
                          value={q.content}
                          onChange={(e) => handleUpdateQuestion(idx, { content: e.target.value })}
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-navy outline-none focus:border-teal"
                        />
                      </div>
                      {q.type === "mcq" && q.options && (
                        <div>
                          <label className="text-[11px] font-bold text-slate-600">Options (Comma separated)</label>
                          <input
                            value={q.options.join(", ")}
                            onChange={(e) =>
                              handleUpdateQuestion(idx, {
                                options: e.target.value.split(",").map((s) => s.trim()),
                              })
                            }
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-teal"
                          />
                        </div>
                      )}
                      {q.type !== "mcq" && (
                        <div>
                          <label className="text-[11px] font-bold text-slate-600">Model Answer</label>
                          <textarea
                            rows={3}
                            value={q.model_answer || ""}
                            onChange={(e) => handleUpdateQuestion(idx, { model_answer: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-teal"
                          />
                        </div>
                      )}
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setEditingIndex(null)}
                          className="rounded-lg bg-teal px-3 py-1 text-xs font-semibold text-white"
                        >
                          Done Editing
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display Mode */
                    <div className="mt-3">
                      <h4 className="text-sm font-bold text-navy">{q.title}</h4>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-700">{q.content}</p>

                      {/* MCQ Choices */}
                      {q.type === "mcq" && q.options && (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {q.options.map((opt, oIdx) => {
                            const isCorrect = opt === q.correct_answer;
                            return (
                              <div
                                key={oIdx}
                                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${
                                  isCorrect
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-900 font-semibold"
                                    : "border-slate-200 bg-white text-slate-600"
                                }`}
                              >
                                {isCorrect && <Check size={14} className="text-emerald-600" />}
                                <span>{opt}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Model Answer for Subjective */}
                      {q.type !== "mcq" && q.model_answer && (
                        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3.5">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Model Answer & Rubric
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-slate-700">
                            {q.model_answer}
                          </p>
                        </div>
                      )}

                      {/* Explanation */}
                      {q.explanation && (
                        <div className="mt-2.5 text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-700">Explanation: </span>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

