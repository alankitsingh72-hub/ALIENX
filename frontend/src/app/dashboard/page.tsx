"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  BookOpenCheck,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  FileQuestion,
  FlaskConical,
  FolderGit2,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api, type Exam, type User } from "@/lib/api";
import { useAuth } from "@/lib/store";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, setUser } = useAuth();
  const [search, setSearch] = useState("");

  const profile = useQuery({ queryKey: ["me"], queryFn: () => api<User>("/auth/me"), retry: false });
  const exams = useQuery({ queryKey: ["exams"], queryFn: () => api<Exam[]>("/exams") });
  const myResults = useQuery({
    queryKey: ["my-results"],
    queryFn: () =>
      api<
        {
          attempt_id: number;
          examination_title: string;
          total_score: number | null;
          total_marks: number;
          answers: { final_score: number | null }[];
        }[]
      >("/attempts/mine/results"),
    enabled: (user ?? profile.data)?.role === "student",
  });
  const analytics = useQuery({
    queryKey: ["analytics"],
    queryFn: () =>
      api<{ users: number; examinations: number; attempts: number; submitted_attempts: number }>(
        "/admin/analytics"
      ),
    enabled: (user ?? profile.data)?.role === "admin",
  });
  const facultyAnalytics = useQuery({
    queryKey: ["faculty-analytics"],
    queryFn: () =>
      api<{
        examinations: {
          exam_id: number;
          title: string;
          attempt_count: number;
          graded_count: number;
          average_percentage: number | null;
        }[];
      }>("/analytics/faculty"),
    enabled: (user ?? profile.data)?.role === "faculty",
  });

  useEffect(() => {
    if (!localStorage.getItem("alienx_access_token") && !localStorage.getItem("alienx_refresh_token"))
      router.replace("/login");
  }, [router]);

  useEffect(() => {
    if (profile.data) setUser(profile.data);
    if (profile.isError) {
      localStorage.removeItem("alienx_access_token");
      localStorage.removeItem("alienx_refresh_token");
      router.replace("/login");
    }
  }, [profile.data, profile.isError, setUser, router]);

  const currentUser = user ?? profile.data;
  const visibleExams = useMemo(
    () =>
      (exams.data ?? []).filter((exam) =>
        `${exam.title} ${exam.description} ${exam.subject_name || ""}`.toLowerCase().includes(search.toLowerCase())
      ),
    [exams.data, search]
  );
  const roleLabel =
    currentUser?.role === "admin" ? "Administrator" : currentUser?.role === "faculty" ? "Faculty" : "Student";

  const logout = () => {
    localStorage.removeItem("alienx_access_token");
    localStorage.removeItem("alienx_refresh_token");
    setUser(null);
    router.replace("/login");
  };

  if (!currentUser)
    return <div className="grid min-h-screen place-items-center text-sm text-slate-400">Preparing your workspace…</div>;

  const menu = [
    {
      title: "Workspace",
      items: [
        { label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
        { label: "Subjects", icon: BookOpen, href: "/subjects" },
        { label: "Analytics", icon: BarChart3, href: "/analytics" },
        { label: "PYQ Papers", icon: FolderGit2, href: "/pyq" },
        { label: "Lab Manuals", icon: FlaskConical, href: "/labs" },
      ],
    },
    {
      title: currentUser.role === "student" ? "Examinations" : "Assessments",
      items: [
        ...(currentUser.role !== "student"
          ? [
              { label: "Question bank", icon: FileQuestion, href: "/questions" },
              { label: "AI Generator", icon: Sparkles, href: "/questions/ai" },
              { label: "Examinations", icon: ClipboardCheck, href: "/exams/manage" },
              { label: "Review queue", icon: CircleHelp, href: "/reviews" },
            ]
          : [{ label: "My examinations", icon: CalendarDays, href: "#examinations" }]),
      ],
    },
    {
      title: "Manage",
      items: [
        ...(currentUser.role === "admin" ? [{ label: "Users", icon: Users, href: "/users" }] : []),
        { label: "Settings", icon: Settings2, href: "/profile" },
      ],
    },
  ];

  return (
    <div className="app-shell flex min-h-screen">
      <aside className="fixed inset-y-0 z-20 hidden w-[252px] flex-col bg-[#102a43] px-5 py-6 lg:flex">
        <a href="/dashboard" className="mb-8 flex items-center gap-3 px-2 text-sm font-bold tracking-[.2em] text-white">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal">
            <BookOpenCheck size={19} />
          </span>
          ALIENX
        </a>

        {menu.map((group) => (
          <div key={group.title} className="mb-5">
            <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-slate-500">
              {group.title}
            </div>
            <nav className="space-y-1">
              {group.items.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className={`side-link ${item.href === "/dashboard" ? "active" : ""}`}
                >
                  <item.icon size={17} />
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        ))}

        <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <ShieldCheck size={15} className="text-teal-300" />
            Your workspace is secure
          </div>
          <p className="mt-1 text-[11px] leading-5 text-slate-400">Authenticated as {roleLabel}.</p>
        </div>

        <button
          onClick={logout}
          className="mt-3 flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white"
        >
          <LogOut size={17} />
          Sign out
        </button>
      </aside>

      <main className="min-w-0 flex-1 lg:ml-[252px]">
        <header className="sticky top-0 z-10 flex h-[72px] items-center justify-between border-b border-slate-200/70 bg-[#f4f7fa]/90 px-5 backdrop-blur-xl md:px-10">
          <div>
            <div className="eyebrow">ALIENX / workspace</div>
            <div className="mt-1 text-xs text-slate-500">{roleLabel} portal</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold text-navy">{currentUser.full_name}</div>
              <div className="text-[11px] capitalize text-slate-400">{currentUser.role}</div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[#dbe9ed] text-sm font-bold text-teal">
              {currentUser.full_name
                .split(" ")
                .map((p) => p[0])
                .slice(0, 2)
                .join("")}
            </div>
          </div>
        </header>

        {/* Mobile Navigation */}
        <nav className="flex gap-2 overflow-x-auto px-5 pt-4 lg:hidden">
          <a href="/dashboard" className="whitespace-nowrap rounded-lg bg-white px-3 py-2 text-xs font-semibold text-navy">
            Overview
          </a>
          <a href="/subjects" className="whitespace-nowrap rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600">
            Subjects
          </a>
          <a href="/analytics" className="whitespace-nowrap rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600">
            Analytics
          </a>
          <a href="/pyq" className="whitespace-nowrap rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600">
            PYQs
          </a>
          <a href="/labs" className="whitespace-nowrap rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600">
            Labs
          </a>
          {currentUser.role !== "student" && (
            <>
              <a href="/questions" className="whitespace-nowrap rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                Questions
              </a>
              <a href="/questions/ai" className="whitespace-nowrap rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                AI Generator
              </a>
              <a href="/exams/manage" className="whitespace-nowrap rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                Examinations
              </a>
              <a href="/reviews" className="whitespace-nowrap rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                Reviews
              </a>
            </>
          )}
          {currentUser.role === "admin" && (
            <a href="/users" className="whitespace-nowrap rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600">
              Users
            </a>
          )}
          <a href="/profile" className="whitespace-nowrap rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-600">
            Profile
          </a>
        </nav>

        <div className="mx-auto max-w-[1440px] px-5 py-8 md:px-10 md:py-10">
          <section className="relative overflow-hidden rounded-[24px] bg-[#15364f] px-7 py-8 text-white md:px-10 md:py-9">
            <div className="absolute -right-10 -top-32 h-96 w-96 rounded-full border border-white/10" />
            <div className="absolute -right-2 -top-24 h-80 w-80 rounded-full border border-white/10" />
            <div className="relative max-w-[650px]">
              <div className="text-xs font-bold uppercase tracking-[.2em] text-teal-300">Your learning, in focus</div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-[38px]">
                Good to see you, {currentUser.full_name.split(" ")[0]}.
              </h1>
              <p className="mt-3 max-w-lg text-sm leading-6 text-slate-300">
                Your academic workspace is ready. Explore subjects, practice past papers, complete lab manuals, or review
                performance analytics.
              </p>
            </div>
            <div className="relative mt-7 flex flex-wrap gap-3">
              <a
                href={currentUser.role === "student" ? "#examinations" : "/exams/manage"}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-navy transition hover:bg-teal-50"
              >
                {currentUser.role === "student" ? "Browse examinations" : "Manage examinations"}
                <ChevronRight size={16} />
              </a>
              <a
                href="/subjects"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
              >
                <BookOpen size={16} />
                Explore Subjects
              </a>
              <a
                href="/analytics"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
              >
                <BarChart3 size={16} />
                Performance Analytics
              </a>
            </div>
          </section>

          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {(currentUser.role === "admin"
              ? [
                  { label: "Registered users", value: analytics.data?.users, icon: Users, note: "Across all roles" },
                  { label: "Examinations", value: analytics.data?.examinations, icon: ClipboardCheck, note: "Created in ALIENX" },
                  { label: "Total attempts", value: analytics.data?.attempts, icon: Activity, note: "Student submissions" },
                  { label: "Submitted", value: analytics.data?.submitted_attempts, icon: GraduationCap, note: "Ready for results" },
                ]
              : [
                  { label: "Available exams", value: visibleExams.length, icon: ClipboardCheck, note: "Published assessments" },
                  { label: "Questions", value: currentUser.role === "student" ? "—" : "Your bank", icon: FileQuestion, note: currentUser.role === "student" ? "Practice and prepare" : "Curated for your courses" },
                  { label: "Next assessment", value: visibleExams[0] ? formatDate(visibleExams[0].start_time).split(",")[0] : "—", icon: Clock3, note: "Upcoming schedule" },
                  { label: "Your role", value: roleLabel, icon: ShieldCheck, note: "Access verified securely" },
                ]
            ).map((stat, index) => (
              <div key={stat.label} className="card p-5">
                <div className="flex items-start justify-between">
                  <div className="eyebrow">{stat.label}</div>
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e8f4f3] text-teal">
                    <stat.icon size={17} />
                  </span>
                </div>
                <div className="mt-4 text-2xl font-semibold text-navy">
                  {stat.value ?? <span className="inline-block h-7 w-12 animate-pulse rounded bg-slate-100" />}
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                  {index % 2 === 0 ? <ArrowUpRight size={13} className="text-teal" /> : <ArrowDownRight size={13} />}{" "}
                  {stat.note}
                </div>
              </div>
            ))}
          </div>

          <section id="examinations" className="mt-9">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <div className="eyebrow">Your schedule</div>
                <h2 className="mt-2 text-xl font-semibold text-navy">
                  {currentUser.role === "student" ? "Available examinations" : "Recent examinations"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">A clear view of assessments across your subjects.</p>
              </div>
              <label className="relative block sm:w-[260px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search assessments..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal"
                />
              </label>
            </div>

            <div className="card mt-5 overflow-hidden">
              {exams.isLoading ? (
                <div className="space-y-3 p-6">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-16 animate-pulse rounded-xl bg-slate-50" />
                  ))}
                </div>
              ) : exams.error ? (
                <div role="alert" className="p-8 text-sm text-rose-700">
                  Could not load examinations. {(exams.error as Error).message}
                </div>
              ) : visibleExams.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-50 text-slate-400">
                    <CalendarDays size={20} />
                  </div>
                  <div className="mt-4 text-sm font-semibold text-slate-700">No examinations to show</div>
                  <p className="mt-1 text-xs text-slate-400">Published examinations will appear here.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {visibleExams.map((exam) => {
                    const now = new Date();
                    const starts = new Date(exam.start_time);
                    const ends = new Date(exam.end_time);
                    const open = exam.is_published && !exam.is_closed && now >= starts && now < ends;
                    return (
                      <article key={exam.id} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#edf4f7] text-teal">
                          <BookOpenCheck size={19} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-navy">{exam.title}</h3>
                            {exam.subject_name && (
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                {exam.subject_name}
                              </span>
                            )}
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                open ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {open ? "OPEN NOW" : now < starts ? "UPCOMING" : "CLOSED"}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                            {exam.description || "A scheduled ALIENX assessment."}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                            <span>{formatDate(exam.start_time)}</span>
                            <span>{exam.duration_minutes} min</span>
                            <span>{exam.question_count} questions</span>
                          </div>
                        </div>
                        {currentUser.role === "student" && open && (
                          <a
                            href={`/exam/${exam.id}`}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#076f79]"
                          >
                            Start exam
                            <ChevronRight size={15} />
                          </a>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {currentUser.role === "student" && (
            <section className="mt-9">
              <div className="eyebrow">Your progress</div>
              <h2 className="mt-2 text-xl font-semibold text-navy">Recent results</h2>
              {myResults.isLoading ? (
                <div className="card mt-4 h-20 animate-pulse" />
              ) : myResults.error ? (
                <div role="alert" className="card mt-4 p-5 text-sm text-rose-700">
                  {(myResults.error as Error).message}
                </div>
              ) : myResults.data?.length ? (
                <div className="card mt-4 divide-y divide-slate-100">
                  {myResults.data.slice(0, 5).map((result) => (
                    <a
                      key={result.attempt_id}
                      href={`/results/${result.attempt_id}`}
                      className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50"
                    >
                      <div>
                        <div className="text-sm font-semibold text-navy">{result.examination_title}</div>
                        <div className="mt-1 text-xs text-slate-400">{result.answers.length} questions</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-navy">
                          {result.total_score === null ? "Review pending" : `${result.total_score} / ${result.total_marks}`}
                        </div>
                        <div className="mt-1 text-xs text-teal">View feedback</div>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="card mt-4 p-6 text-sm text-slate-400">
                  Submitted examination results will appear here.
                </div>
              )}
            </section>
          )}

          <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <span>© 2026 ALIENX Academic Platform</span>
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              All systems operational
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}
