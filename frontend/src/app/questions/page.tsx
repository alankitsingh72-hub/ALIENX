"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileQuestion, Flame, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { api, type Question, type Subject } from "@/lib/api";

type DraftQuestion = Omit<Question, "id" | "created_by">;

const emptyQuestion: DraftQuestion = {
  subject_id: null,
  title: "",
  content: "",
  type: "mcq",
  options: ["", "", "", ""],
  correct_answer: "",
  model_answer: "",
  keywords: [],
  marks: 2,
  difficulty: "medium",
  is_hots: false,
  tags: [],
  explanation: "",
};

export default function QuestionsPage() {
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [filterHots, setFilterHots] = useState<boolean | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<DraftQuestion>(emptyQuestion);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const subjects = useQuery({
    queryKey: ["subjects"],
    queryFn: () => api<Subject[]>("/subjects"),
  });

  const questions = useQuery({
    queryKey: ["questions", selectedSubjectId],
    queryFn: () => {
      const url = selectedSubjectId ? `/questions?subject_id=${selectedSubjectId}` : "/questions";
      return api<Question[]>(url);
    },
  });

  const filtered = useMemo(() => {
    return (questions.data ?? []).filter((question) => {
      const matchesSearch = `${question.title} ${question.content}`.toLowerCase().includes(search.toLowerCase());
      const matchesType = filterType === "all" || question.type === filterType;
      const normalizedDiff = (question.difficulty || "medium").toLowerCase();
      const matchesDiff =
        filterDifficulty === "all" ||
        normalizedDiff === filterDifficulty ||
        (filterDifficulty === "tough" && normalizedDiff === "hard");
      const matchesHots = filterHots === null || Boolean(question.is_hots) === filterHots;
      return matchesSearch && matchesType && matchesDiff && matchesHots;
    });
  }, [questions.data, search, filterType, filterDifficulty, filterHots]);

  const create = useMutation({
    mutationFn: ({ id, payload }: { id: number | null; payload: DraftQuestion }) =>
      api<Question>(id ? `/questions/${id}` : "/questions", {
        method: id ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (saved) => {
      void client.invalidateQueries({ queryKey: ["questions"] });
      setDraft(emptyQuestion);
      setEditingId(null);
      setShowForm(false);
      setError("");
      setSuccess(`Question "${saved.title}" saved successfully.`);
      setTimeout(() => setSuccess(""), 4000);
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "Could not save question"),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api(`/questions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["questions"] });
      setSuccess("Question removed from bank.");
      setTimeout(() => setSuccess(""), 4000);
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "Could not delete question"),
  });

  const isMcq = draft.type === "mcq";
  const setField = (key: keyof DraftQuestion, value: unknown) => setDraft((current) => ({ ...current, [key]: value }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const payload: DraftQuestion = {
      ...draft,
      subject_id: draft.subject_id ? Number(draft.subject_id) : null,
      marks: Number(draft.marks),
      options: isMcq ? (draft.options ?? []).filter(Boolean) : null,
      correct_answer: isMcq ? draft.correct_answer : null,
      model_answer: isMcq ? null : draft.model_answer,
      keywords:
        typeof draft.keywords === "string"
          ? (draft.keywords as unknown as string).split(",").map((item) => item.trim()).filter(Boolean)
          : draft.keywords,
      difficulty: draft.difficulty.toLowerCase() === "hard" ? "tough" : draft.difficulty,
      is_hots: Boolean(draft.is_hots),
    };
    if (isMcq && (!payload.options?.length || !payload.options.includes(payload.correct_answer ?? ""))) {
      setError("Choose a correct answer that matches one of the options.");
      return;
    }
    if (!isMcq && !payload.model_answer?.trim()) {
      setError("Add a model answer to support auto-grading.");
      return;
    }
    create.mutate({ id: editingId, payload });
  };

  const editQuestion = (question: Question) => {
    setDraft({
      subject_id: question.subject_id ?? null,
      title: question.title,
      content: question.content,
      type: question.type,
      options: question.options ?? ["", "", "", ""],
      correct_answer: question.correct_answer ?? "",
      model_answer: question.model_answer ?? "",
      keywords: question.keywords ?? [],
      marks: question.marks,
      difficulty: question.difficulty === "hard" ? "tough" : question.difficulty,
      is_hots: Boolean(question.is_hots),
      tags: question.tags ?? [],
      explanation: question.explanation ?? "",
    });
    setEditingId(question.id);
    setShowForm(true);
    setError("");
  };

  const getDifficultyBadge = (diff: string) => {
    switch ((diff || "").toLowerCase()) {
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
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-8 md:px-10 md:py-10">
      <a href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-navy">
        <ArrowLeft size={16} />
        Workspace
      </a>
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">Faculty tools</div>
          <h1 className="mt-2 text-3xl font-semibold text-navy">Question bank</h1>
          <p className="mt-2 text-sm text-slate-500">
            Build, tag, and organize reusable questions with difficulty levels (Easy, Medium, Tough), HOTS flags, and auto-grading rubrics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/questions/ai"
            className="inline-flex items-center gap-2 rounded-xl border border-teal/40 bg-teal/5 px-4 py-3 text-sm font-semibold text-teal hover:bg-teal/10"
          >
            <Sparkles size={16} />
            AI Generator
          </a>
          <button
            onClick={() => {
              setShowForm((value) => !value);
              if (!showForm) {
                setEditingId(null);
                setDraft(emptyQuestion);
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-teal px-4 py-3 text-sm font-semibold text-white hover:bg-[#076f79]"
          >
            <Plus size={16} />
            Add question
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card mt-6 p-5 md:p-7">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-lg font-semibold text-navy">{editingId ? "Edit question" : "Create a question"}</h2>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setDraft(emptyQuestion);
              }}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-semibold text-navy">Subject *</label>
              <select
                value={draft.subject_id ?? ""}
                onChange={(e) => setField("subject_id", e.target.value ? Number(e.target.value) : null)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-teal text-sm"
              >
                <option value="">Select Subject...</option>
                {(subjects.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-navy">Title *</label>
              <input
                required
                value={draft.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="e.g. B+ Tree leaf node structure"
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-teal text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-navy">Question type *</label>
              <select
                value={draft.type}
                onChange={(e) => setField("type", e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-teal text-sm"
              >
                <option value="mcq">Multiple choice (MCQ)</option>
                <option value="short_answer">Short answer</option>
                <option value="descriptive">Descriptive essay</option>
              </select>
            </div>
          </div>

          <label className="mt-4 block text-sm font-semibold text-navy">
            Problem prompt *
            <textarea
              required
              value={draft.content}
              onChange={(e) => setField("content", e.target.value)}
              rows={3}
              placeholder="State the problem clearly, including any constraints..."
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-teal text-sm"
            />
          </label>

          {isMcq ? (
            <div className="mt-4 space-y-3">
              <label className="block text-sm font-semibold text-navy">Options & Correct Answer *</label>
              {(draft.options ?? []).map((option, index) => (
                <div key={index} className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="correct-answer"
                    checked={draft.correct_answer === option && option.length > 0}
                    onChange={() => setField("correct_answer", option)}
                    className="h-4 w-4 accent-teal"
                  />
                  <input
                    value={option}
                    onChange={(e) => {
                      const updated = [...(draft.options ?? [])];
                      updated[index] = e.target.value;
                      setField("options", updated);
                      if (draft.correct_answer === option) setField("correct_answer", e.target.value);
                    }}
                    placeholder={`Option ${index + 1}`}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal"
                  />
                </div>
              ))}
            </div>
          ) : (
            <>
              <label className="mt-4 block text-sm font-semibold text-navy">
                Model answer *
                <textarea
                  required
                  value={draft.model_answer ?? ""}
                  onChange={(e) => setField("model_answer", e.target.value)}
                  rows={3}
                  placeholder="The canonical benchmark model answer used to auto-grade student responses..."
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-teal text-sm"
                />
              </label>
              <label className="mt-4 block text-sm font-semibold text-navy">
                Keywords <span className="font-normal text-slate-400">(comma separated key concepts)</span>
                <input
                  value={Array.isArray(draft.keywords) ? draft.keywords.join(", ") : draft.keywords}
                  onChange={(e) => setField("keywords", e.target.value)}
                  placeholder="e.g. index, unique, b+tree, range scan"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-teal text-sm"
                />
              </label>
            </>
          )}

          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <label className="text-sm font-semibold text-navy">
              Marks *
              <input
                required
                type="number"
                step="0.5"
                min="0.5"
                value={draft.marks}
                onChange={(e) => setField("marks", Number(e.target.value))}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal"
              />
            </label>
            <label className="text-sm font-semibold text-navy">
              Difficulty Level *
              <select
                value={draft.difficulty}
                onChange={(e) => setField("difficulty", e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal capitalize"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="tough">Tough</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-navy">
              Tags <span className="font-normal text-slate-400">(comma separated)</span>
              <input
                value={(draft.tags ?? []).join(", ")}
                onChange={(e) =>
                  setField(
                    "tags",
                    e.target.value
                      .split(",")
                      .map((x) => x.trim())
                      .filter(Boolean)
                  )
                }
                placeholder="dbms, indexing, hots"
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal"
              />
            </label>
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 text-sm font-bold text-rose-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(draft.is_hots)}
                  onChange={(e) => setField("is_hots", e.target.checked)}
                  className="h-4 w-4 rounded accent-rose-600"
                />
                <span className="flex items-center gap-1">
                  <Flame size={15} /> Mark as HOTS Question
                </span>
              </label>
            </div>
          </div>

          <label className="mt-4 block text-sm font-semibold text-navy">
            Explanation / Rationale
            <textarea
              value={draft.explanation ?? ""}
              onChange={(e) => setField("explanation", e.target.value)}
              rows={2}
              placeholder="Why this answer is correct or conceptual insights..."
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal"
            />
          </label>

          {error && (
            <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setDraft(emptyQuestion);
              }}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="rounded-xl bg-teal px-5 py-2 text-sm font-semibold text-white hover:bg-[#076f79]"
            >
              {create.isPending ? "Saving..." : editingId ? "Save changes" : "Save question"}
            </button>
          </div>
        </form>
      )}

      {success && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {success}
        </div>
      )}

      {/* Questions List & Filter Bar */}
      <div className="card mt-6">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {/* Subject Filter */}
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-teal"
            >
              <option value="">All Subjects (12)</option>
              {(subjects.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>

            {/* Type Filter */}
            <div className="flex gap-1">
              {[
                { label: "All types", value: "all" },
                { label: "MCQ", value: "mcq" },
                { label: "Short", value: "short_answer" },
                { label: "Descriptive", value: "descriptive" },
              ].map((pill) => (
                <button
                  key={pill.value}
                  onClick={() => setFilterType(pill.value)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    filterType === pill.value ? "bg-navy text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Difficulty Filter */}
            <div className="flex gap-1">
              {[
                { label: "All Levels", value: "all" },
                { label: "Easy", value: "easy" },
                { label: "Medium", value: "medium" },
                { label: "Tough", value: "tough" },
              ].map((diffPill) => (
                <button
                  key={diffPill.value}
                  onClick={() => setFilterDifficulty(diffPill.value)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    filterDifficulty === diffPill.value ? "bg-teal text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {diffPill.label}
                </button>
              ))}
            </div>

            {/* HOTS Filter Button */}
            <button
              onClick={() => setFilterHots(filterHots === true ? null : true)}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition border ${
                filterHots === true
                  ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                  : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
              }`}
            >
              <Flame size={12} /> HOTS Only
            </button>
          </div>

          <label className="relative sm:w-60">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-teal"
            />
          </label>
        </div>

        {questions.isLoading ? (
          <div className="p-8 text-sm text-slate-400">Loading your questions…</div>
        ) : questions.error ? (
          <div role="alert" className="p-8 text-sm text-rose-700">
            {(questions.error as Error).message}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileQuestion className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">No questions match your current search and filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((question) => (
              <article key={question.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50/60 transition">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eaf4f5] text-teal">
                  <FileQuestion size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-navy text-sm">{question.title}</h3>
                    {question.subject_name && (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                        {question.subject_name}
                      </span>
                    )}
                    <span className="rounded-full bg-teal/10 px-2 py-0.5 text-[10px] font-bold uppercase text-teal">
                      {question.type.replace("_", " ")}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${getDifficultyBadge(
                        question.difficulty
                      )}`}
                    >
                      {question.difficulty}
                    </span>
                    {question.is_hots && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                        <Flame size={10} className="text-rose-600" /> HOTS
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600">{question.content}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-600">{question.marks} marks</span>
                    <span>·</span>
                    {question.tags?.map((tag) => (
                      <span key={tag} className="rounded-md bg-slate-100 px-1.5 py-0.2 text-[10px] text-slate-500">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  aria-label={`Edit ${question.title}`}
                  onClick={() => editQuestion(question)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Edit
                </button>
                <button
                  aria-label={`Delete ${question.title}`}
                  onClick={() => {
                    if (window.confirm(`Remove "${question.title}" from the question bank?`)) remove.mutate(question.id);
                  }}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 size={15} />
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
