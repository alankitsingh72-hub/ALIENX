"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  ExternalLink,
  Filter,
  Flame,
  GraduationCap,
  History,
  Lightbulb,
  LineChart as LineChartIcon,
  Percent,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import AppShell from "@/app/components/AppShell";
import { api, type AdminFacultyAnalyticsResponse, type StudentAnalyticsResponse, type Subject } from "@/lib/api";
import { useAuth } from "@/lib/store";

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");

  const subjects = useQuery({
    queryKey: ["subjects"],
    queryFn: () => api<Subject[]>("/subjects"),
  });

  const studentAnalytics = useQuery({
    queryKey: ["student-analytics", selectedSubjectId],
    queryFn: () =>
      api<StudentAnalyticsResponse>(
        `/analytics/student${selectedSubjectId ? `?subject_id=${selectedSubjectId}` : ""}`
      ),
    enabled: user?.role === "student",
  });

  const adminFacultyAnalytics = useQuery({
    queryKey: ["admin-faculty-analytics", selectedSubjectId],
    queryFn: () =>
      api<AdminFacultyAnalyticsResponse>(
        `/analytics/admin-faculty${selectedSubjectId ? `?subject_id=${selectedSubjectId}` : ""}`
      ),
    enabled: user?.role === "admin" || user?.role === "faculty",
  });

  const isStudent = user?.role === "student";

  const getDifficultyBadgeStyle = (diff: string) => {
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
    <AppShell
      currentPath="/analytics"
      title="Performance & History"
      subtitle={isStudent ? "Student Mastery, Strengths, Weak Areas & Full Quiz History" : "Cohort Mastery, Weak Areas & Exam Comparisons"}
      action={
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-slate-400" />
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-teal"
          >
            <option value="">All Subjects</option>
            {(subjects.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} - {s.name}
              </option>
            ))}
          </select>
        </div>
      }
    >
      {/* ============================================================== */}
      {/* STUDENT PERFORMANCE DASHBOARD                                   */}
      {/* ============================================================== */}
      {isStudent && (
        <div className="space-y-8">
          {studentAnalytics.isLoading ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="card h-28 animate-pulse bg-slate-50" />
                ))}
              </div>
              <div className="card h-80 animate-pulse bg-slate-50" />
            </div>
          ) : studentAnalytics.isError ? (
            <div className="card p-8 text-center text-rose-700">
              Could not load analytics: {(studentAnalytics.error as Error).message}
            </div>
          ) : studentAnalytics.data ? (
            <>
              {/* Stat Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="card p-5">
                  <div className="flex items-center justify-between">
                    <span className="eyebrow">Average Score</span>
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal/10 text-teal">
                      <Percent size={18} />
                    </span>
                  </div>
                  <div className="mt-3 text-3xl font-extrabold text-navy">
                    {studentAnalytics.data.overall.average_percentage}%
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Earned {studentAnalytics.data.overall.total_score_earned} of{" "}
                    {studentAnalytics.data.overall.total_score_possible} marks
                  </p>
                </div>

                <div className="card p-5">
                  <div className="flex items-center justify-between">
                    <span className="eyebrow">Overall Accuracy</span>
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                      <CheckCircle2 size={18} />
                    </span>
                  </div>
                  <div className="mt-3 text-3xl font-extrabold text-emerald-600">
                    {studentAnalytics.data.overall.overall_accuracy_percentage}%
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Total attempts: {studentAnalytics.data.overall.total_attempts}</p>
                </div>

                <div className="card p-5">
                  <div className="flex items-center justify-between">
                    <span className="eyebrow">Strongest Subject</span>
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-600">
                      <Trophy size={18} />
                    </span>
                  </div>
                  <div className="mt-3 truncate text-xl font-bold text-navy">
                    {studentAnalytics.data.strongest_subject}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Mastery demonstrated</p>
                </div>

                <div className="card p-5">
                  <div className="flex items-center justify-between">
                    <span className="eyebrow">Focus Needed</span>
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 text-rose-600">
                      <TrendingDown size={18} />
                    </span>
                  </div>
                  <div className="mt-3 truncate text-xl font-bold text-navy">
                    {studentAnalytics.data.weakest_subject}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Target for practice</p>
                </div>
              </div>

              {/* Strengths & Weaker Areas Cards */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Strengths Card */}
                <div className="card p-6 border-l-4 border-l-emerald-500">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                        <Trophy size={15} />
                      </span>
                      <h3 className="text-sm font-bold text-navy">Verified Strengths</h3>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                      ≥ 75% Score
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {studentAnalytics.data.strengths && studentAnalytics.data.strengths.length > 0 ? (
                      studentAnalytics.data.strengths.map((item) => (
                        <div
                          key={item.subject}
                          className="flex items-center justify-between rounded-xl bg-slate-50 p-3 border border-slate-100"
                        >
                          <div>
                            <div className="text-xs font-bold text-navy">{item.subject}</div>
                            <div className="text-[10px] text-slate-400">
                              {item.attempts} examination attempt{item.attempts > 1 ? "s" : ""} logged
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-extrabold text-emerald-600">{item.accuracy}%</div>
                            <div className="text-[10px] font-semibold text-slate-500 uppercase">{item.status || "Mastered"}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-400 p-2">Complete more quizzes to identify your top subject competencies.</div>
                    )}
                  </div>
                </div>

                {/* Weaker Areas Card */}
                <div className="card p-6 border-l-4 border-l-amber-500">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-100 text-amber-700">
                        <AlertTriangle size={15} />
                      </span>
                      <h3 className="text-sm font-bold text-navy">Weaker Areas & Growth Plan</h3>
                    </div>
                    <a
                      href="/hots"
                      className="text-[11px] font-semibold text-teal hover:underline flex items-center gap-1"
                    >
                      <Flame size={12} /> Practice HOTS
                    </a>
                  </div>

                  <div className="mt-4 space-y-3">
                    {studentAnalytics.data.weaker_areas && studentAnalytics.data.weaker_areas.length > 0 ? (
                      studentAnalytics.data.weaker_areas.map((item) => (
                        <div
                          key={item.subject}
                          className="rounded-xl bg-amber-50/50 p-3 border border-amber-200/60"
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-bold text-navy">{item.subject}</div>
                            <div className="text-sm font-extrabold text-amber-600">{item.accuracy}%</div>
                          </div>
                          <div className="mt-1 flex items-start gap-1.5 text-[11px] text-amber-800 leading-snug">
                            <Lightbulb size={13} className="shrink-0 text-amber-600 mt-0.5" />
                            <span>{item.recommendation}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-xl">
                        Great job! No major weak areas detected below threshold. Continue practicing to maintain mastery.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Difficulty-Wise Performance (Easy vs Medium vs Tough) */}
              <div className="card p-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <div className="eyebrow">Cognitive Breakdown</div>
                    <h3 className="text-base font-bold text-navy">Difficulty-Wise Performance</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 border border-rose-200">
                      <Flame size={12} className="text-rose-500" />
                      HOTS Accuracy: {studentAnalytics.data.hots_performance?.accuracy_percentage ?? 0}%
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  {/* Easy */}
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                        Easy
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {studentAnalytics.data.difficulty_performance?.easy?.attempted ?? 0} questions
                      </span>
                    </div>
                    <div className="mt-3 text-2xl font-black text-navy">
                      {studentAnalytics.data.difficulty_performance?.easy?.accuracy_percentage ?? 0}%
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{
                          width: `${studentAnalytics.data.difficulty_performance?.easy?.accuracy_percentage ?? 0}%`,
                        }}
                      />
                    </div>
                    <p className="mt-2 text-[10px] text-slate-400">
                      Points: {studentAnalytics.data.difficulty_performance?.easy?.earned ?? 0} /{" "}
                      {studentAnalytics.data.difficulty_performance?.easy?.possible ?? 0}
                    </p>
                  </div>

                  {/* Medium */}
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                        Medium
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {studentAnalytics.data.difficulty_performance?.medium?.attempted ?? 0} questions
                      </span>
                    </div>
                    <div className="mt-3 text-2xl font-black text-navy">
                      {studentAnalytics.data.difficulty_performance?.medium?.accuracy_percentage ?? 0}%
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all duration-500"
                        style={{
                          width: `${studentAnalytics.data.difficulty_performance?.medium?.accuracy_percentage ?? 0}%`,
                        }}
                      />
                    </div>
                    <p className="mt-2 text-[10px] text-slate-400">
                      Points: {studentAnalytics.data.difficulty_performance?.medium?.earned ?? 0} /{" "}
                      {studentAnalytics.data.difficulty_performance?.medium?.possible ?? 0}
                    </p>
                  </div>

                  {/* Tough */}
                  <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="rounded-lg bg-purple-100 px-2 py-0.5 text-[11px] font-bold text-purple-700">
                        Tough
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {studentAnalytics.data.difficulty_performance?.tough?.attempted ?? 0} questions
                      </span>
                    </div>
                    <div className="mt-3 text-2xl font-black text-navy">
                      {studentAnalytics.data.difficulty_performance?.tough?.accuracy_percentage ?? 0}%
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-purple-500 transition-all duration-500"
                        style={{
                          width: `${studentAnalytics.data.difficulty_performance?.tough?.accuracy_percentage ?? 0}%`,
                        }}
                      />
                    </div>
                    <p className="mt-2 text-[10px] text-slate-400">
                      Points: {studentAnalytics.data.difficulty_performance?.tough?.earned ?? 0} /{" "}
                      {studentAnalytics.data.difficulty_performance?.tough?.possible ?? 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* 1. Subject-Wise Performance Bar Chart */}
                <div className="card p-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <div className="eyebrow">Subject Accuracy</div>
                      <h2 className="mt-1 text-base font-bold text-navy">Subject-wise Average Score (%)</h2>
                    </div>
                    <span className="rounded-lg bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-500">
                      {studentAnalytics.data.subject_bars.length} Subjects
                    </span>
                  </div>
                  <div className="mt-6 h-72 w-full">
                    {studentAnalytics.data.subject_bars.length === 0 ? (
                      <div className="grid h-full place-items-center text-xs text-slate-400">
                        No subject attempt data available.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={studentAnalytics.data.subject_bars}
                          margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf2f7" />
                          <XAxis
                            dataKey="subject_code"
                            tick={{ fill: "#64748b", fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            domain={[0, 100]}
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            formatter={(value: any) => [`${value}%`, "Average Score"]}
                            labelFormatter={(label: any, payload: any) =>
                              payload?.[0]?.payload?.subject_name ?? label
                            }
                            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                          />
                          <Bar dataKey="avg_percentage" fill="#087e8b" radius={[6, 6, 0, 0]} maxBarSize={48}>
                            {studentAnalytics.data.subject_bars.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={entry.avg_percentage >= 75 ? "#087e8b" : entry.avg_percentage >= 50 ? "#0ea5e9" : "#f59e0b"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* 2. Score Trend Line Chart */}
                <div className="card p-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <div className="eyebrow">Progression Trend</div>
                      <h2 className="mt-1 text-base font-bold text-navy">Score Trend Over Time</h2>
                    </div>
                    <span className="rounded-lg bg-teal/10 px-2 py-1 text-xs font-semibold text-teal">
                      Chronological
                    </span>
                  </div>
                  <div className="mt-6 h-72 w-full">
                    {studentAnalytics.data.score_trends.length === 0 ? (
                      <div className="grid h-full place-items-center text-xs text-slate-400">
                        Take examinations to view your performance progression line chart.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={studentAnalytics.data.score_trends}
                          margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf2f7" />
                          <XAxis
                            dataKey="date"
                            tick={{ fill: "#64748b", fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            domain={[0, 100]}
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            formatter={(value: any) => [`${value}%`, "Score"]}
                            labelFormatter={(label: any, payload: any) =>
                              `${payload?.[0]?.payload?.exam_title ?? ""} (${label})`
                            }
                            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="percentage"
                            stroke="#087e8b"
                            strokeWidth={3}
                            dot={{ fill: "#087e8b", strokeWidth: 2, r: 5 }}
                            activeDot={{ r: 7 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>

              {/* FULL QUIZ HISTORY TABLE */}
              <div className="card overflow-hidden">
                <div className="border-b border-slate-100 p-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History size={18} className="text-teal" />
                    <div>
                      <div className="eyebrow">Attempt Telemetry</div>
                      <h2 className="mt-0.5 text-base font-bold text-navy">Recent Quiz & Exam History</h2>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    {studentAnalytics.data.quiz_history?.length ?? 0} Recorded Quizzes
                  </span>
                </div>

                {!studentAnalytics.data.quiz_history || studentAnalytics.data.quiz_history.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">No completed quiz attempts found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <tr>
                          <th className="py-3 pl-6 pr-4">Date</th>
                          <th className="py-3 px-4">Exam Title</th>
                          <th className="py-3 px-4">Subject</th>
                          <th className="py-3 px-4 text-center">Difficulty</th>
                          <th className="py-3 px-4 text-center">Score</th>
                          <th className="py-3 px-4 text-center">Percentage</th>
                          <th className="py-3 px-4 text-center">Status</th>
                          <th className="py-3 px-4 text-center">Time Spent</th>
                          <th className="py-3 pr-6 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600">
                        {studentAnalytics.data.quiz_history.map((qItem) => (
                          <tr key={qItem.attempt_id} className="hover:bg-slate-50 transition">
                            <td className="py-3 pl-6 pr-4 font-medium text-slate-500 whitespace-nowrap">
                              {qItem.date}
                            </td>
                            <td className="py-3 px-4 font-semibold text-navy">
                              {qItem.exam_title}
                              {qItem.hots_count > 0 && (
                                <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                                  <Flame size={10} /> HOTS
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                                {qItem.subject_code}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`rounded-xl border px-2 py-0.5 text-[10px] font-bold uppercase ${getDifficultyBadgeStyle(
                                  qItem.dominant_difficulty
                                )}`}
                              >
                                {qItem.dominant_difficulty}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-navy">
                              {qItem.score} / {qItem.total_marks}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <span className="font-bold text-teal">{qItem.percentage}%</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {qItem.passed ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <CheckCircle2 size={12} /> Passed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                  <XCircle size={12} /> Failed
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-500">
                              {qItem.time_spent_formatted}
                            </td>
                            <td className="py-3 pr-6 text-right">
                              <a
                                href={`/attempts/${qItem.attempt_id}/result`}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-teal hover:underline"
                              >
                                Review <ExternalLink size={12} />
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ============================================================== */}
      {/* FACULTY & ADMIN PERFORMANCE DASHBOARD                           */}
      {/* ============================================================== */}
      {!isStudent && (
        <div className="space-y-8">
          {adminFacultyAnalytics.isLoading ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="card h-28 animate-pulse bg-slate-50" />
                ))}
              </div>
              <div className="card h-80 animate-pulse bg-slate-50" />
            </div>
          ) : adminFacultyAnalytics.isError ? (
            <div className="card p-8 text-center text-rose-700">
              Could not load cohort analytics: {(adminFacultyAnalytics.error as Error).message}
            </div>
          ) : adminFacultyAnalytics.data ? (
            <>
              {/* Overview Stat Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="card p-5">
                  <div className="flex items-center justify-between">
                    <span className="eyebrow">Class Average</span>
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal/10 text-teal">
                      <Percent size={18} />
                    </span>
                  </div>
                  <div className="mt-3 text-3xl font-extrabold text-navy">
                    {adminFacultyAnalytics.data.class_overview.class_average_percentage}%
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Across graded assessments</p>
                </div>

                <div className="card p-5">
                  <div className="flex items-center justify-between">
                    <span className="eyebrow">Total Students</span>
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-600">
                      <Users size={18} />
                    </span>
                  </div>
                  <div className="mt-3 text-3xl font-extrabold text-navy">
                    {adminFacultyAnalytics.data.class_overview.total_students}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Active enrolled candidates</p>
                </div>

                <div className="card p-5">
                  <div className="flex items-center justify-between">
                    <span className="eyebrow">Total Exams</span>
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-purple-50 text-purple-600">
                      <GraduationCap size={18} />
                    </span>
                  </div>
                  <div className="mt-3 text-3xl font-extrabold text-navy">
                    {adminFacultyAnalytics.data.class_overview.total_exams}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Created assessments</p>
                </div>

                <div className="card p-5">
                  <div className="flex items-center justify-between">
                    <span className="eyebrow">Total Submissions</span>
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                      <CheckCircle2 size={18} />
                    </span>
                  </div>
                  <div className="mt-3 text-3xl font-extrabold text-navy">
                    {adminFacultyAnalytics.data.class_overview.total_attempts}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Graded attempts logged</p>
                </div>
              </div>

              {/* Class-Level Weak Areas Alerts */}
              {adminFacultyAnalytics.data.class_weak_areas && adminFacultyAnalytics.data.class_weak_areas.length > 0 && (
                <div className="rounded-3xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                    <AlertTriangle size={18} className="text-amber-600" />
                    Class-Level Weak Areas Detected
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {adminFacultyAnalytics.data.class_weak_areas.map((wa) => (
                      <div key={wa.subject_code} className="rounded-2xl bg-white p-4 border border-amber-200/80">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-navy">{wa.subject_name}</span>
                          <span className="font-extrabold text-amber-600">{wa.average_percentage}% Avg</span>
                        </div>
                        <p className="mt-1.5 text-xs text-slate-600">{wa.insight}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Charts Section */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* 1. Subject-Wise Average Scores */}
                <div className="card p-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <div className="eyebrow">Curriculum Mastery</div>
                      <h2 className="mt-1 text-base font-bold text-navy">Subject-wise Average Scores (%)</h2>
                    </div>
                  </div>
                  <div className="mt-6 h-72 w-full">
                    {adminFacultyAnalytics.data.subject_averages.length === 0 ? (
                      <div className="grid h-full place-items-center text-xs text-slate-400">
                        No submissions recorded for subjects yet.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={adminFacultyAnalytics.data.subject_averages}
                          margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf2f7" />
                          <XAxis
                            dataKey="subject_code"
                            tick={{ fill: "#64748b", fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            domain={[0, 100]}
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            formatter={(value: any) => [`${value}%`, "Class Average"]}
                            labelFormatter={(label: any, payload: any) =>
                              payload?.[0]?.payload?.subject_name ?? label
                            }
                            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                          />
                          <Bar dataKey="average_percentage" fill="#087e8b" radius={[6, 6, 0, 0]} maxBarSize={48} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* 2. Score Distribution Graphs */}
                <div className="card p-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <div className="eyebrow">Cohort Dispersion</div>
                      <h2 className="mt-1 text-base font-bold text-navy">Score Distribution</h2>
                    </div>
                  </div>
                  <div className="mt-6 h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={adminFacultyAnalytics.data.score_distribution}
                        margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf2f7" />
                        <XAxis
                          dataKey="range"
                          tick={{ fill: "#64748b", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fill: "#94a3b8", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          formatter={(value: any) => [`${value} student(s)`, "Count"]}
                          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                        />
                        <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={44} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Top Performers Table */}
              <div className="card overflow-hidden">
                <div className="border-b border-slate-100 p-6">
                  <div className="eyebrow">Academic Excellence</div>
                  <h2 className="mt-1 text-base font-bold text-navy">Top Performers</h2>
                </div>
                {adminFacultyAnalytics.data.top_performers.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">No student submissions yet.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <tr>
                          <th className="py-3 pl-6 pr-4">Rank</th>
                          <th className="py-3 px-4">Student Name</th>
                          <th className="py-3 px-4">Email</th>
                          <th className="py-3 px-4 text-center">Completed Exams</th>
                          <th className="py-3 pr-6 text-right">Average Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600">
                        {adminFacultyAnalytics.data.top_performers.map((st, idx) => (
                          <tr key={st.student_id} className="hover:bg-slate-50">
                            <td className="py-3 pl-6 pr-4 font-bold text-navy">
                              {idx === 0 ? "🥇 #1" : idx === 1 ? "🥈 #2" : idx === 2 ? "🥉 #3" : `#${idx + 1}`}
                            </td>
                            <td className="py-3 px-4 font-semibold text-navy">{st.full_name}</td>
                            <td className="py-3 px-4 text-slate-400">{st.email}</td>
                            <td className="py-3 px-4 text-center">{st.completed_attempts}</td>
                            <td className="py-3 pr-6 text-right font-bold text-teal">
                              {st.average_percentage}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Comparison Between Examinations */}
              <div className="card overflow-hidden">
                <div className="border-b border-slate-100 p-6">
                  <div className="eyebrow">Comparative Evaluation</div>
                  <h2 className="mt-1 text-base font-bold text-navy">Examination Comparisons</h2>
                </div>
                {adminFacultyAnalytics.data.exam_comparisons.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">No examination data available.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <tr>
                          <th className="py-3 pl-6 pr-4">Exam Title</th>
                          <th className="py-3 px-4">Subject</th>
                          <th className="py-3 px-4 text-center">Submissions</th>
                          <th className="py-3 px-4 text-center">Pass Rate (≥40%)</th>
                          <th className="py-3 pr-6 text-right">Average Score</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-600">
                        {adminFacultyAnalytics.data.exam_comparisons.map((ec) => (
                          <tr key={ec.exam_id} className="hover:bg-slate-50">
                            <td className="py-3 pl-6 pr-4 font-semibold text-navy">{ec.title}</td>
                            <td className="py-3 px-4">
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                {ec.subject_name}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">{ec.attempts}</td>
                            <td className="py-3 px-4 text-center font-semibold text-emerald-600">
                              {ec.pass_rate}%
                            </td>
                            <td className="py-3 pr-6 text-right font-bold text-navy">
                              {ec.average_percentage}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}
