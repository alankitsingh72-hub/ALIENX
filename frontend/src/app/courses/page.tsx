"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Award,
  BookCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  GraduationCap,
  Layers,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import AppShell from "@/app/components/AppShell";
import { api, type Course, type CourseEnrollment } from "@/lib/api";
import { useAuth } from "@/lib/store";

export default function CoursesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [levelFilter, setLevelFilter] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [expandedCourseId, setExpandedCourseId] = useState<number | null>(null);
  const [activeCertificate, setActiveCertificate] = useState<{
    course: Course;
    certificate_id: string;
  } | null>(null);

  // Create Course Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [durationHours, setDurationHours] = useState(15);
  const [level, setLevel] = useState("Beginner");
  const [skillsInput, setSkillsInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses", levelFilter, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (levelFilter !== "All") params.append("level", levelFilter);
      if (search.trim()) params.append("search", search.trim());
      const query = params.toString() ? `?${params.toString()}` : "";
      return api<Course[]>(`/courses${query}`);
    },
  });

  const enrollMutation = useMutation({
    mutationFn: (courseId: number) => api<CourseEnrollment>(`/courses/${courseId}/enroll`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });

  const progressMutation = useMutation({
    mutationFn: ({ courseId, moduleId, progressPct }: { courseId: number; moduleId: string; progressPct: number }) =>
      api<CourseEnrollment>(`/courses/${courseId}/progress`, {
        method: "POST",
        body: JSON.stringify({ completed_module_id: moduleId, progress_percentage: progressPct }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (newCourse: Partial<Course>) => api<Course>("/courses", { method: "POST", body: JSON.stringify(newCourse) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || "Failed to create course");
    },
  });

  const resetForm = () => {
    setTitle("");
    setCode("");
    setDescription("");
    setDurationHours(15);
    setLevel("Beginner");
    setSkillsInput("");
    setErrorMsg("");
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !code || !description) {
      setErrorMsg("Please fill in all required fields");
      return;
    }
    const skills = skillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    createMutation.mutate({
      title,
      code,
      description,
      duration_hours: Number(durationHours),
      level,
      skills_covered: skills.length > 0 ? skills : ["Engineering", "Algorithms"],
      syllabus: [
        { id: "m1", title: "Core Architecture & Principles", description: "Foundations and setup", duration: "3h" },
        { id: "m2", title: "Hands-on Implementation", description: "Practical development", duration: "5h" },
        { id: "m3", title: "Testing & Validation", description: "Automated test suites", duration: "4h" },
        { id: "m4", title: "Production Deployment", description: "Cloud release and monitoring", duration: "3h" },
      ],
      certificate_preview: `Verified Certification in ${title}`,
      is_published: true,
    });
  };

  const getLevelBadge = (lvl: string) => {
    switch (lvl.toLowerCase()) {
      case "beginner":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "intermediate":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "advanced":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <AppShell
      currentPath="/courses"
      title="Certification Courses"
      subtitle="Industry Credentials, Modular Syllabus & Verified Certificates"
      action={
        user?.role !== "student" ? (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-teal px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 transition"
          >
            <Plus size={16} />
            Create Course
          </button>
        ) : null
      }
    >
      {/* Overview Banner */}
      <div className="mb-8 rounded-3xl border border-slate-200 bg-gradient-to-r from-[#102a43] via-[#1a365d] to-[#0d544b] p-6 text-white shadow-sm md:p-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-teal-200 backdrop-blur-md">
            <Award size={14} /> Official ALIENX Credentials
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">
            Professional Certification & Skill Mastery
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Enroll in structured, self-paced engineering certifications. Master specialized modules, track progress,
            and earn tamper-proof digital completion certificates with verifiable credentials.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-2xl bg-slate-200/80 p-1 text-xs font-semibold text-slate-600">
          {(["All", "Beginner", "Intermediate", "Advanced"] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              className={`rounded-xl px-4 py-2 transition ${
                levelFilter === lvl ? "bg-white text-navy shadow-sm" : "hover:text-navy"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search courses or skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-teal"
          />
        </div>
      </div>

      {/* Courses Grid */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-3xl border border-slate-200 bg-white p-6" />
          ))}
        </div>
      ) : courses && courses.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {courses.map((course) => {
            const isExpanded = expandedCourseId === course.id;
            const syllabus = course.syllabus || [];
            const isCompleted = course.student_progress >= 100;

            return (
              <div
                key={course.id}
                className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-xl bg-slate-100 px-2.5 py-1 text-[11px] font-bold tracking-wider text-slate-700">
                      {course.code}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-xl border px-2.5 py-0.5 text-[11px] font-semibold ${getLevelBadge(course.level)}`}>
                        {course.level}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                        <Clock size={12} className="text-teal" /> {course.duration_hours}h
                      </span>
                    </div>
                  </div>

                  <h3 className="mt-3 text-lg font-bold text-navy">{course.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">{course.description}</p>

                  {/* Skills tags */}
                  {course.skills_covered && course.skills_covered.length > 0 && (
                    <div className="mt-3.5 flex flex-wrap gap-1.5">
                      {course.skills_covered.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-lg bg-teal/10 px-2 py-0.5 text-[10px] font-semibold text-teal"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Enrollment Status & Progress */}
                  {course.is_enrolled ? (
                    <div className="mt-4 rounded-2xl bg-slate-50 p-3.5 border border-slate-100">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                        <span>Course Progress</span>
                        <span className={isCompleted ? "text-emerald-600 font-bold" : "text-teal"}>
                          {course.student_progress}% {isCompleted && "• Completed"}
                        </span>
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCompleted ? "bg-emerald-500" : "bg-teal"
                          }`}
                          style={{ width: `${course.student_progress}%` }}
                        />
                      </div>
                    </div>
                  ) : null}

                  {/* Expandable Syllabus */}
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <button
                      onClick={() => setExpandedCourseId(isExpanded ? null : course.id)}
                      className="flex w-full items-center justify-between text-xs font-semibold text-slate-600 hover:text-navy transition"
                    >
                      <span className="flex items-center gap-1.5">
                        <Layers size={14} className="text-teal" /> Modules & Curriculum ({syllabus.length})
                      </span>
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 space-y-2 border-t border-slate-100 pt-2 text-xs">
                        {syllabus.map((mod, idx) => {
                          const modIndexPct = Math.round(((idx + 1) / syllabus.length) * 100);
                          return (
                            <div
                              key={mod.id || idx}
                              className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-2.5 border border-slate-100"
                            >
                              <div>
                                <div className="font-semibold text-navy">
                                  {idx + 1}. {mod.title}
                                </div>
                                <div className="text-[11px] text-slate-500">{mod.description}</div>
                              </div>
                              {course.is_enrolled && !isCompleted && user?.role === "student" ? (
                                <button
                                  onClick={() =>
                                    progressMutation.mutate({
                                      courseId: course.id,
                                      moduleId: mod.id || `m${idx + 1}`,
                                      progressPct: modIndexPct,
                                    })
                                  }
                                  className="shrink-0 rounded-lg bg-teal/10 px-2 py-1 text-[10px] font-bold text-teal hover:bg-teal hover:text-white transition"
                                >
                                  Complete Module
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-medium">{mod.duration}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                  {course.is_enrolled ? (
                    isCompleted ? (
                      <button
                        onClick={() =>
                          setActiveCertificate({
                            course,
                            certificate_id: course.certificate_id || `ALX-CERT-${course.code}-DEMO`,
                          })
                        }
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
                      >
                        <Award size={16} /> View Official Certificate
                      </button>
                    ) : (
                      <div className="flex w-full items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">In Progress</span>
                        <button
                          onClick={() => setExpandedCourseId(course.id)}
                          className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-navy hover:bg-slate-200 transition"
                        >
                          Continue Learning
                        </button>
                      </div>
                    )
                  ) : (
                    <button
                      onClick={() => enrollMutation.mutate(course.id)}
                      disabled={enrollMutation.isPending}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal py-2.5 text-xs font-bold text-white shadow-sm hover:opacity-90 transition"
                    >
                      <GraduationCap size={16} /> Enroll in Certification (Free)
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <GraduationCap size={36} className="mx-auto text-slate-400" />
          <h3 className="mt-3 text-sm font-bold text-navy">No Certification Courses Found</h3>
          <p className="mt-1 text-xs text-slate-500">Try modifying your level filter or search keywords.</p>
        </div>
      )}

      {/* Digital Certificate Modal */}
      {activeCertificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 md:p-8 shadow-2xl relative">
            <button
              onClick={() => setActiveCertificate(null)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
            >
              <X size={18} />
            </button>

            {/* Certificate Canvas */}
            <div
              id="printable-certificate"
              className="relative rounded-2xl border-4 border-double border-[#0f3057] bg-gradient-to-b from-[#fafdff] to-[#f0f6fa] p-8 text-center shadow-inner"
            >
              {/* Header Crest */}
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#102a43] text-teal shadow-md">
                <Award size={32} />
              </div>

              <div className="font-serif text-xs font-bold tracking-[.3em] uppercase text-[#0f3057]">
                ALIENX AUTONOMOUS EXAMINATION SYSTEM
              </div>
              <h2 className="mt-2 text-2xl font-black tracking-wide text-navy md:text-3xl font-serif">
                CERTIFICATE OF ACHIEVEMENT
              </h2>
              <p className="mt-1 text-xs italic text-slate-500">This is to officially certify that</p>

              {/* Student Name */}
              <div className="my-4 border-b border-t border-slate-300/80 py-2">
                <span className="font-serif text-2xl font-bold text-[#102a43] md:text-3xl">
                  {user?.full_name || "Alex Student"}
                </span>
              </div>

              <p className="text-xs text-slate-600">
                has successfully completed all rigorous curriculum modules, laboratory implementations, and assessment criteria for
              </p>
              <h3 className="mt-1 text-lg font-bold text-teal">{activeCertificate.course.title}</h3>
              <p className="text-[11px] font-semibold text-slate-500">
                Course Code: {activeCertificate.course.code} • Duration: {activeCertificate.course.duration_hours} Practical Hours
              </p>

              {/* Skills badges on certificate */}
              {activeCertificate.course.skills_covered && (
                <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                  {activeCertificate.course.skills_covered.map((s) => (
                    <span key={s} className="rounded-md bg-slate-200/60 px-2 py-0.5 text-[10px] font-medium text-navy">
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {/* Bottom Signatures & Verification */}
              <div className="mt-8 flex items-end justify-between border-t border-slate-200 pt-4 text-left text-[10px] text-slate-500">
                <div>
                  <div className="font-mono font-bold text-navy">
                    Credential ID: {activeCertificate.certificate_id}
                  </div>
                  <div>Issued by: ALIENX Academic Board</div>
                  <div>Date: {new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</div>
                </div>

                <div className="text-right">
                  <div className="font-serif text-sm font-bold italic text-navy">Dr. Ada Faculty</div>
                  <div className="border-t border-slate-400 pt-0.5 text-[9px] uppercase tracking-wider text-slate-500">
                    Academic Director
                  </div>
                </div>
              </div>
            </div>

            {/* Actions: Print / Download */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-navy hover:bg-slate-50 transition"
              >
                <Printer size={15} /> Print / Save as PDF
              </button>
              <button
                onClick={() => setActiveCertificate(null)}
                className="rounded-xl bg-navy px-5 py-2 text-xs font-semibold text-white hover:opacity-90 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Course Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-navy">Create Certification Course</h3>
              <button onClick={() => setIsCreateOpen(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                <AlertCircle size={15} /> {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700">Course Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Distributed Database Engineering"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700">Course Code *</label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. DDE-301"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Duration (Hours) *</label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    required
                    value={durationHours}
                    onChange={(e) => setDurationHours(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700">Proficiency Level *</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700">Description *</label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe key learning outcomes and course objectives..."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700">Skills Covered (comma separated)</label>
                <input
                  type="text"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  placeholder="e.g. PostgreSQL, MVCC, B+ Trees, Sharding"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="rounded-xl bg-teal px-5 py-2 text-xs font-semibold text-white hover:opacity-90 shadow-sm"
                >
                  {createMutation.isPending ? "Creating..." : "Create Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

