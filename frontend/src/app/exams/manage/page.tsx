"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Flame, Lock, Plus, Radio, Rocket, Search, Trash2 } from "lucide-react";
import { api, type Exam, type Question, type Subject } from "@/lib/api";

export default function ManageExamsPage() {
  const client = useQueryClient();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [search, setSearch] = useState("");

  const subjects = useQuery({ queryKey: ["subjects"], queryFn: () => api<Subject[]>("/subjects") });
  const questions = useQuery({ queryKey: ["questions"], queryFn: () => api<Question[]>("/questions") });
  const exams = useQuery({
    queryKey: ["exams", selectedSubjectId],
    queryFn: () => {
      const url = selectedSubjectId ? `/exams?subject_id=${selectedSubjectId}` : "/exams";
      return api<Exam[]>(url);
    },
  });

  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [subjectId, setSubjectId] = useState<number | "">("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [negativeMarking, setNegativeMarking] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [shuffle, setShuffle] = useState(true);
  const [pickerDiff, setPickerDiff] = useState<string>("all");
  const [pickerHots, setPickerHots] = useState<boolean | null>(null);

  const create = useMutation({
    mutationFn: (payload: object) => api<Exam>("/exams", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: (newExam) => {
      void client.invalidateQueries({ queryKey: ["exams"] });
      setShowForm(false);
      setError("");
      setSelected([]);
      setTitle("");
      setDescription("");
      setSubjectId("");
      setSuccess(`Examination "${newExam.title}" created successfully as draft.`);
      setTimeout(() => setSuccess(""), 4000);
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "Could not create examination"),
  });

  const publish = useMutation({
    mutationFn: ({ id, published }: { id: number; published: boolean }) =>
      api<Exam>(`/exams/${id}/publish?published=${published}`, { method: "PATCH" }),
    onSuccess: (updated) => {
      void client.invalidateQueries({ queryKey: ["exams"] });
      setSuccess(`Examination "${updated.title}" ${updated.is_published ? "published" : "unpublished"}.`);
      setTimeout(() => setSuccess(""), 4000);
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "Could not update publication state"),
  });

  const closeExam = useMutation({
    mutationFn: (id: number) => api<Exam>(`/exams/${id}/close`, { method: "PATCH" }),
    onSuccess: (closed) => {
      void client.invalidateQueries({ queryKey: ["exams"] });
      setSuccess(`Examination "${closed.title}" has been closed.`);
      setTimeout(() => setSuccess(""), 4000);
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "Could not close examination"),
  });

  const deleteExam = useMutation({
    mutationFn: (id: number) => api(`/exams/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["exams"] });
      setSuccess("Examination removed.");
      setTimeout(() => setSuccess(""), 4000);
    },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "Could not delete examination"),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!selected.length) {
      setError("Select at least one question.");
      return;
    }
    if (!startTime || !endTime || new Date(endTime) <= new Date(startTime)) {
      setError("Choose a valid examination window where close time is after open time.");
      return;
    }
    create.mutate({
      subject_id: subjectId ? Number(subjectId) : null,
      title,
      description,
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      duration_minutes: duration,
      negative_marking: negativeMarking,
      question_ids: selected,
      shuffle_questions: shuffle,
      shuffle_options: shuffle,
    });
  };

  const toggleQuestion = (id: number) =>
    setSelected((value) => (value.includes(id) ? value.filter((item) => item !== id) : [...value, id]));

  const filteredExams = useMemo(() => {
    return (exams.data ?? []).filter((e) =>
      `${e.title} ${e.description} ${e.subject_name || ""}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [exams.data, search]);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-8 md:px-10 md:py-10">
      <a href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-navy">
        <ArrowLeft size={16} />
        Workspace
      </a>
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">Faculty tools</div>
          <h1 className="mt-2 text-3xl font-semibold text-navy">Examinations</h1>
          <p className="mt-2 text-sm text-slate-500">
            Schedule assessments, link subjects, control publishing windows, and review cohort submissions.
          </p>
        </div>
        <button
          onClick={() => setShowForm((value) => !value)}
          className="inline-flex items-center gap-2 rounded-xl bg-teal px-4 py-3 text-sm font-semibold text-white hover:bg-[#076f79]"
        >
          <Plus size={16} />
          Create examination
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card mt-6 p-5 md:p-7">
          <h2 className="text-lg font-semibold text-navy">New examination</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-semibold text-navy">Subject *</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value ? Number(e.target.value) : "")}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-teal text-sm"
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
              <label className="text-sm font-semibold text-navy">Title *</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={240}
                placeholder="e.g. Operating Systems Final"
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-teal text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-navy">Duration (minutes)</label>
              <input
                required
                type="number"
                min={1}
                max={600}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-teal text-sm"
              />
            </div>
          </div>
          <label className="mt-4 block text-sm font-semibold text-navy">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional instructions for students..."
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-teal"
            />
          </label>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="text-sm font-semibold text-navy">
              Opens
              <input
                required
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-teal"
              />
            </label>
            <label className="text-sm font-semibold text-navy">
              Closes
              <input
                required
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-teal"
              />
            </label>
            <label className="text-sm font-semibold text-navy">
              Penalty per incorrect MCQ
              <input
                type="number"
                min={0}
                step="0.25"
                max={100}
                value={negativeMarking}
                onChange={(e) => setNegativeMarking(Number(e.target.value))}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-teal"
              />
            </label>
          </div>
          <div className="mt-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="text-sm font-semibold text-navy">Add questions ({selected.length} selected)</div>
              <div className="flex items-center gap-1 text-xs">
                {(["all", "easy", "medium", "tough"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setPickerDiff(d)}
                    className={`rounded-lg px-2 py-0.5 font-semibold capitalize transition ${
                      pickerDiff === d ? "bg-teal text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {d}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPickerHots(pickerHots === true ? null : true)}
                  className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold transition border ${
                    pickerHots === true ? "bg-rose-600 text-white border-rose-600" : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  <Flame size={11} /> HOTS
                </button>
              </div>
            </div>
            {questions.isLoading ? (
              <div className="text-sm text-slate-400">Loading question bank…</div>
            ) : (questions.data ?? []).length === 0 ? (
              <div className="rounded-xl border border-slate-100 p-4 text-sm text-slate-500">
                No questions found in your bank.{" "}
                <a href="/questions" className="font-semibold text-teal hover:underline">
                  Add questions here first
                </a>
                .
              </div>
            ) : (
              <div className="max-h-60 space-y-1.5 overflow-auto rounded-xl border border-slate-100 p-3">
                {(questions.data ?? [])
                  .filter((q) => {
                    const normDiff = (q.difficulty || "medium").toLowerCase();
                    const matchesDiff =
                      pickerDiff === "all" || normDiff === pickerDiff || (pickerDiff === "tough" && normDiff === "hard");
                    const matchesHots = pickerHots === null || Boolean(q.is_hots) === pickerHots;
                    return matchesDiff && matchesHots;
                  })
                  .map((question) => (
                    <label key={question.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={selected.includes(question.id)}
                        onChange={() => toggleQuestion(question.id)}
                        className="accent-teal"
                      />
                      <span className="flex-1 text-sm text-slate-700">{question.title}</span>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold capitalize text-slate-600">
                          {question.difficulty || "medium"}
                        </span>
                        {question.is_hots && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-600 border border-rose-200">
                            <Flame size={10} /> HOTS
                          </span>
                        )}
                        <span className="text-slate-400">
                          {question.type.replace("_", " ")} · {question.marks} pts
                        </span>
                      </div>
                    </label>
                  ))}
              </div>
            )}
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} className="accent-teal" />
            Randomize question and option order for each student attempt
          </label>
          {error && <p role="alert" className="mt-4 text-sm text-rose-700">{error}</p>}
          <div className="mt-5 flex gap-2">
            <button
              disabled={create.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              <CalendarDays size={15} />
              {create.isPending ? "Creating…" : "Create draft"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && !showForm && (
        <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <div className="card mt-7 overflow-hidden">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-navy">{filteredExams.length} examinations</span>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 outline-none focus:border-teal"
            >
              <option value="">All Subjects</option>
              {(subjects.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {s.name}
                </option>
              ))}
            </select>
          </div>
          <label className="relative sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search examinations..."
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-teal"
            />
          </label>
        </div>

        {exams.isLoading ? (
          <div className="p-8 text-sm text-slate-400">Loading examinations…</div>
        ) : exams.error ? (
          <div role="alert" className="p-8 text-sm text-rose-700">
            {(exams.error as Error).message}
          </div>
        ) : filteredExams.length ? (
          <div className="divide-y divide-slate-100">
            {filteredExams.map((exam) => {
              const statusTag = exam.is_closed ? "CLOSED" : exam.is_published ? "PUBLISHED" : "DRAFT";
              const tagStyle = exam.is_closed
                ? "bg-rose-50 text-rose-700"
                : exam.is_published
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700";
              return (
                <article key={exam.id} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eaf4f5] text-teal">
                    <CalendarDays size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-navy">{exam.title}</h3>
                      {exam.subject_name && (
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          {exam.subject_name}
                        </span>
                      )}
                      <span className={`rounded-full px-3 py-0.5 text-[10px] font-bold ${tagStyle}`}>{statusTag}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(exam.start_time).toLocaleString()} to {new Date(exam.end_time).toLocaleString()} ·{" "}
                      {exam.duration_minutes} min · {exam.question_count} question{exam.question_count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={`/exam-results/${exam.id}`}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-center text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Results
                    </a>
                    {!exam.is_closed && (
                      <>
                        <button
                          disabled={publish.isPending}
                          onClick={() => publish.mutate({ id: exam.id, published: !exam.is_published })}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                        >
                          {exam.is_published ? <Radio size={14} className="text-teal" /> : <Rocket size={14} />}
                          {exam.is_published ? "Unpublish" : "Publish"}
                        </button>
                        <button
                          disabled={closeExam.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Close "${exam.title}" now? Students will no longer be able to start new attempts.`
                              )
                            ) {
                              closeExam.mutate(exam.id);
                            }
                          }}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                        >
                          <Lock size={14} /> Close
                        </button>
                      </>
                    )}
                    {!exam.is_published && (
                      <button
                        disabled={deleteExam.isPending}
                        onClick={() => {
                          if (window.confirm(`Delete examination "${exam.title}"?`)) {
                            deleteExam.mutate(exam.id);
                          }
                        }}
                        className="rounded-lg p-2 text-slate-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                        title="Delete exam"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <CalendarDays className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">No examinations found.</p>
          </div>
        )}
      </div>
    </main>
  );
}
