"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  BarChart3,
  BookOpen,
  BookOpenCheck,
  CalendarDays,
  CircleHelp,
  ClipboardCheck,
  FileQuestion,
  FileText,
  Flame,
  FlaskConical,
  FolderGit2,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { api, type User } from "@/lib/api";
import { useAuth } from "@/lib/store";

interface AppShellProps {
  currentPath: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export default function AppShell({ currentPath, title, subtitle, action, children }: AppShellProps) {
  const router = useRouter();
  const { user, setUser } = useAuth();

  const profile = useQuery({
    queryKey: ["me"],
    queryFn: () => api<User>("/auth/me"),
    retry: false,
  });

  useEffect(() => {
    if (!localStorage.getItem("alienx_access_token") && !localStorage.getItem("alienx_refresh_token")) {
      router.replace("/login");
    }
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

  const logout = () => {
    localStorage.removeItem("alienx_access_token");
    localStorage.removeItem("alienx_refresh_token");
    setUser(null);
    router.replace("/login");
  };

  if (!currentUser) {
    return <div className="grid min-h-screen place-items-center text-sm text-slate-400">Loading your workspace…</div>;
  }

  const roleLabel = currentUser.role === "admin" ? "Administrator" : currentUser.role === "faculty" ? "Faculty" : "Student";

  const workspaceGroup = [
    { label: "Overview", icon: LayoutDashboard, href: "/dashboard" },
    { label: "Subjects", icon: BookOpen, href: "/subjects" },
    { label: "Progress & History", icon: BarChart3, href: "/analytics" },
    { label: "HOTS Practice", icon: Flame, href: "/hots" },
    { label: "Events", icon: Trophy, href: "/events" },
    { label: "Courses & Certs", icon: Award, href: "/courses" },
    { label: "PYQ Papers", icon: FolderGit2, href: "/pyq" },
    { label: "Lab Manuals", icon: FlaskConical, href: "/labs" },
  ];

  const assessmentGroup = [
    ...(currentUser.role !== "student"
      ? [
          { label: "Question bank", icon: FileQuestion, href: "/questions" },
          { label: "AI Generator", icon: Sparkles, href: "/questions/ai" },
          { label: "Resume to Q&A", icon: FileText, href: "/resume-qa" },
          { label: "Examinations", icon: ClipboardCheck, href: "/exams/manage" },
          { label: "Review queue", icon: CircleHelp, href: "/reviews" },
        ]
      : [
          { label: "My examinations", icon: CalendarDays, href: "/dashboard#examinations" },
          { label: "Resume to Q&A", icon: FileText, href: "/resume-qa" },
        ]),
  ];

  const manageGroup = [
    ...(currentUser.role === "admin" ? [{ label: "Users", icon: Users, href: "/users" }] : []),
    { label: "Settings", icon: Settings2, href: "/profile" },
  ];

  return (
    <div className="app-shell flex min-h-screen">
      <aside className="fixed inset-y-0 z-20 hidden w-[252px] flex-col overflow-y-auto bg-[#102a43] px-5 py-6 lg:flex">
        <a href="/dashboard" className="mb-6 flex items-center gap-3 px-2 text-sm font-bold tracking-[.2em] text-white">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal text-white">
            <BookOpenCheck size={19} />
          </span>
          ALIENX
        </a>

        <div className="mb-5">
          <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-slate-400">Workspace</div>
          <nav className="space-y-1">
            {workspaceGroup.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={`side-link ${currentPath === item.href ? "active" : ""}`}
              >
                <item.icon size={17} />
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mb-5">
          <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-slate-400">
            {currentUser.role === "student" ? "Assessments & Tools" : "Assessments"}
          </div>
          <nav className="space-y-1">
            {assessmentGroup.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={`side-link ${currentPath === item.href ? "active" : ""}`}
              >
                <item.icon size={17} />
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mb-4">
          <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-slate-400">Manage</div>
          <nav className="space-y-1">
            {manageGroup.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={`side-link ${currentPath === item.href ? "active" : ""}`}
              >
                <item.icon size={17} />
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <ShieldCheck size={15} className="text-teal" />
            Active Session
          </div>
          <p className="mt-1 text-[11px] leading-5 text-slate-400">Role: <span className="font-semibold text-white">{roleLabel}</span></p>
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
            <div className="eyebrow">ALIENX / {title.toLowerCase()}</div>
            <div className="mt-0.5 text-xs text-slate-500">{subtitle ?? `${roleLabel} workspace`}</div>
          </div>
          <div className="flex items-center gap-4">
            {action}
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
          <a
            href="/dashboard"
            className={`rounded-xl px-3 py-2 text-xs font-medium whitespace-nowrap ${currentPath === "/dashboard" ? "bg-[#102a43] text-white" : "bg-white text-slate-600 border border-slate-200"}`}
          >
            Overview
          </a>
          <a
            href="/subjects"
            className={`rounded-xl px-3 py-2 text-xs font-medium whitespace-nowrap ${currentPath === "/subjects" ? "bg-[#102a43] text-white" : "bg-white text-slate-600 border border-slate-200"}`}
          >
            Subjects
          </a>
          <a
            href="/analytics"
            className={`rounded-xl px-3 py-2 text-xs font-medium whitespace-nowrap ${currentPath === "/analytics" ? "bg-[#102a43] text-white" : "bg-white text-slate-600 border border-slate-200"}`}
          >
            Progress
          </a>
          <a
            href="/hots"
            className={`rounded-xl px-3 py-2 text-xs font-medium whitespace-nowrap ${currentPath === "/hots" ? "bg-[#102a43] text-white" : "bg-white text-slate-600 border border-slate-200"}`}
          >
            HOTS
          </a>
          <a
            href="/events"
            className={`rounded-xl px-3 py-2 text-xs font-medium whitespace-nowrap ${currentPath === "/events" ? "bg-[#102a43] text-white" : "bg-white text-slate-600 border border-slate-200"}`}
          >
            Events
          </a>
          <a
            href="/courses"
            className={`rounded-xl px-3 py-2 text-xs font-medium whitespace-nowrap ${currentPath === "/courses" ? "bg-[#102a43] text-white" : "bg-white text-slate-600 border border-slate-200"}`}
          >
            Courses
          </a>
          <a
            href="/resume-qa"
            className={`rounded-xl px-3 py-2 text-xs font-medium whitespace-nowrap ${currentPath === "/resume-qa" ? "bg-[#102a43] text-white" : "bg-white text-slate-600 border border-slate-200"}`}
          >
            Resume Q&A
          </a>
          <a
            href="/pyq"
            className={`rounded-xl px-3 py-2 text-xs font-medium whitespace-nowrap ${currentPath === "/pyq" ? "bg-[#102a43] text-white" : "bg-white text-slate-600 border border-slate-200"}`}
          >
            PYQ
          </a>
          <a
            href="/labs"
            className={`rounded-xl px-3 py-2 text-xs font-medium whitespace-nowrap ${currentPath === "/labs" ? "bg-[#102a43] text-white" : "bg-white text-slate-600 border border-slate-200"}`}
          >
            Labs
          </a>
          {currentUser.role !== "student" && (
            <>
              <a
                href="/questions"
                className={`rounded-xl px-3 py-2 text-xs font-medium whitespace-nowrap ${currentPath === "/questions" ? "bg-[#102a43] text-white" : "bg-white text-slate-600 border border-slate-200"}`}
              >
                Questions
              </a>
              <a
                href="/questions/ai"
                className={`rounded-xl px-3 py-2 text-xs font-medium whitespace-nowrap ${currentPath === "/questions/ai" ? "bg-[#102a43] text-white" : "bg-white text-slate-600 border border-slate-200"}`}
              >
                AI Generator
              </a>
              <a
                href="/exams/manage"
                className={`rounded-xl px-3 py-2 text-xs font-medium whitespace-nowrap ${currentPath === "/exams/manage" ? "bg-[#102a43] text-white" : "bg-white text-slate-600 border border-slate-200"}`}
              >
                Exams
              </a>
            </>
          )}
        </nav>

        <div className="p-5 md:p-10">{children}</div>
      </main>
    </div>
  );
}
