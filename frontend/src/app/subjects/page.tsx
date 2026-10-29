"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  CalendarDays,
  FileQuestion,
  FlaskConical,
  FolderGit2,
  Plus,
  Search,
  Trash2,
  Edit,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import AppShell from "@/app/components/AppShell";
import { api, type Subject } from "@/lib/api";
import { useAuth } from "@/lib/store";

export default function SubjectsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const subjects = useQuery({
    queryKey: ["subjects", search],
    queryFn: () => api<Subject[]>(`/subjects${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      setErrorMessage("");
      if (editingSubject) {
        return api<Subject>(`/subjects/${editingSubject.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name, code, description }),
        });
      } else {
        return api<Subject>("/subjects", {
          method: "POST",
          body: JSON.stringify({ name, code, description }),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      setModalOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      setErrorMessage(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return api(`/subjects/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
    },
    onError: (err: Error) => {
      alert(`Could not delete subject: ${err.message}`);
    },
  });

  const resetForm = () => {
    setName("");
    setCode("");
    setDescription("");
    setEditingSubject(null);
    setErrorMessage("");
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (sub: Subject) => {
    setEditingSubject(sub);
    setName(sub.name);
    setCode(sub.code);
    setDescription(sub.description || "");
    setErrorMessage("");
    setModalOpen(true);
  };

  const isPrivileged = user?.role === "admin" || user?.role === "faculty";
  const isAdmin = user?.role === "admin";

  return (
    <AppShell
      currentPath="/subjects"
      title="Subjects"
      subtitle="Academic disciplines, curriculum linkages & course catalog"
      action={
        isPrivileged ? (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-xl bg-teal px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#076f79]"
          >
            <Plus size={16} />
            Add Subject
          </button>
        ) : undefined
      }
    >
      {/* Top filter banner */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy">Curriculum Subjects</h1>
          <p className="mt-1 text-sm text-slate-500">
            All questions, examinations, PYQs, and lab manuals are systematically categorized by subject.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subjects or code..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal"
          />
        </div>
      </div>

      {/* Grid of Subjects */}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-48 animate-pulse p-6 bg-slate-50/50" />
          ))
        ) : subjects.isError ? (
          <div className="col-span-full card p-8 text-center text-sm text-rose-700">
            Could not load subjects: {(subjects.error as Error).message}
          </div>
        ) : (subjects.data ?? []).length === 0 ? (
          <div className="col-span-full card p-12 text-center text-slate-400">
            No subjects match your search.
          </div>
        ) : (
          (subjects.data ?? []).map((sub) => (
            <div
              key={sub.id}
              className="card group flex flex-col justify-between p-6 transition-all duration-200 hover:border-teal/40 hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded-lg bg-teal/10 px-2.5 py-1 text-xs font-bold tracking-wider text-teal">
                    {sub.code}
                  </span>
                  {isPrivileged && (
                    <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100">
                      <button
                        onClick={() => openEditModal(sub)}
                        title="Edit Subject"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Edit size={14} />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete subject "${sub.name}"?`)) {
                              deleteMutation.mutate(sub.id);
                            }
                          }}
                          title="Delete Subject"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <h3 className="mt-3 text-lg font-bold text-navy group-hover:text-teal transition-colors">
                  {sub.name}
                </h3>
                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-500">
                  {sub.description || "Foundational computing and academic curriculum discipline."}
                </p>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="text-xs font-bold text-navy">{sub.question_count ?? 0}</div>
                    <div className="text-[10px] text-slate-400">Questions</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="text-xs font-bold text-navy">{sub.exam_count ?? 0}</div>
                    <div className="text-[10px] text-slate-400">Exams</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="text-xs font-bold text-navy">{sub.pyq_count ?? 0}</div>
                    <div className="text-[10px] text-slate-400">PYQs</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <div className="text-xs font-bold text-navy">{sub.lab_count ?? 0}</div>
                    <div className="text-[10px] text-slate-400">Labs</div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 pt-2">
                  <a
                    href={`/pyq?subject_id=${sub.id}`}
                    className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-teal"
                  >
                    <FolderGit2 size={12} />
                    PYQs
                  </a>
                  <a
                    href={`/labs?subject_id=${sub.id}`}
                    className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-teal"
                  >
                    <FlaskConical size={12} />
                    Labs
                  </a>
                  <a
                    href={`/analytics?subject_id=${sub.id}`}
                    className="flex items-center gap-1 text-[11px] font-semibold text-teal hover:underline"
                  >
                    Analytics
                    <ArrowRight size={11} />
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Subject Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-navy">
              {editingSubject ? "Edit Subject" : "Create New Subject"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Add a new course or academic subject to the ALIENX curriculum.
            </p>

            {errorMessage && (
              <div className="mt-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
                {errorMessage}
              </div>
            )}

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Subject Name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Distributed Systems"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Subject Code *</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. DIST"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Overview of topics and course objectives..."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!name.trim() || !code.trim() || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
                className="rounded-xl bg-teal px-5 py-2 text-xs font-semibold text-white hover:bg-[#076f79] disabled:opacity-50"
              >
                {saveMutation.isPending ? "Saving..." : editingSubject ? "Update Subject" : "Create Subject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

