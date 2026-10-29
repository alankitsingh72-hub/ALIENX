"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Brain,
  Check,
  CheckCircle2,
  FileCode2,
  FileText,
  Flame,
  HelpCircle,
  Lightbulb,
  Plus,
  Save,
  Send,
  Sparkles,
  Upload,
  UserCheck,
  Users,
} from "lucide-react";
import AppShell from "@/app/components/AppShell";
import {
  api,
  apiUpload,
  type Question,
  type ResumeAnalyzeRequest,
  type ResumeAnalyzeResponse,
  type ResumeQuestionItem,
  type Subject,
} from "@/lib/api";
import { useAuth } from "@/lib/store";

export default function ResumeQAPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"paste" | "upload">("paste");
  const [resumeText, setResumeText] = useState(
    `Alex Student
Software Engineer with experience in Python, FastAPI, React, PostgreSQL, Docker, and Algorithms.
Built full-stack auto-grading platform handling automated test execution and asynchronous microservices.
Optimized database queries using composite indexes and eliminated N+1 query bottlenecks with joinedload.`
  );
  const [targetRole, setTargetRole] = useState("Full Stack Software Engineer");
  const [candidateName, setCandidateName] = useState(user?.full_name || "Alex Student");
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const [analysisResult, setAnalysisResult] = useState<ResumeAnalyzeResponse | null>(null);
  const [selectedQuestionIndices, setSelectedQuestionIndices] = useState<number[]>([]);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: () => api<Subject[]>("/subjects"),
  });

  const analyzeMutation = useMutation({
    mutationFn: (payload: ResumeAnalyzeRequest) =>
      api<ResumeAnalyzeResponse>("/resume/generate-qa", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      setAnalysisResult(data);
      setSelectedQuestionIndices(data.questions.map((_, i) => i));
      setErrorMsg("");
      setSaveSuccessMsg("");
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || "Failed to analyze resume text");
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => apiUpload<ResumeAnalyzeResponse>("/resume/upload", formData),
    onSuccess: (data) => {
      setAnalysisResult(data);
      setSelectedQuestionIndices(data.questions.map((_, i) => i));
      setErrorMsg("");
      setSaveSuccessMsg("");
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || "Failed to parse resume document");
    },
  });

  const saveToBankMutation = useMutation({
    mutationFn: (questionsToSave: Partial<Question>[]) =>
      api<Question[]>("/resume/save-to-question-bank", {
        method: "POST",
        body: JSON.stringify(questionsToSave),
      }),
    onSuccess: (data) => {
      setSaveSuccessMsg(`Successfully saved ${data.length} questions into Question Bank!`);
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || "Failed to save questions to bank");
    },
  });

  const handleAnalyze = () => {
    if (!resumeText.trim()) {
      setErrorMsg("Please provide your resume text or upload a document.");
      return;
    }
    analyzeMutation.mutate({
      resume_text: resumeText,
      target_role: targetRole,
      candidate_name: candidateName,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append("file", file);
    fd.append("target_role", targetRole);
    fd.append("candidate_name", candidateName);
    uploadMutation.mutate(fd);
  };

  const toggleQuestionSelect = (idx: number) => {
    setSelectedQuestionIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handleSaveToBank = () => {
    if (!analysisResult) return;
    const defaultSubjectId = selectedSubjectId || subjects?.[0]?.id || 1;

    const questionsToSave = selectedQuestionIndices.map((idx) => {
      const q = analysisResult.questions[idx];
      return {
        subject_id: defaultSubjectId,
        title: q.title,
        content: q.content,
        type: q.type,
        model_answer: q.model_answer,
        marks: q.marks,
        difficulty: q.difficulty,
        is_hots: q.difficulty === "tough" || q.category === "system_design",
        tags: ["resume-qa", q.category, ...(q.skills_targeted || [])],
      };
    });

    saveToBankMutation.mutate(questionsToSave);
  };

  const filteredQuestions = analysisResult?.questions.filter((q) => {
    if (selectedCategory === "All") return true;
    return q.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  const getCategoryBadge = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "technical":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "behavioral":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "system_design":
      case "problem_solving":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <AppShell
      currentPath="/resume-qa"
      title="Resume to Q&A Generator"
      subtitle="Autonomous AI Interview Question & Rubric Generation from Candidate Resumes"
    >
      {/* Banner */}
      <div className="mb-8 rounded-3xl border border-slate-200 bg-gradient-to-r from-[#102a43] via-[#1f3b5c] to-[#0c4a60] p-6 text-white shadow-sm md:p-8">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-teal-200 backdrop-blur-md">
            <Sparkles size={14} /> AI Talent & Interview Intelligence
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">
            Resume to Q&A Generator
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            Upload or paste any candidate resume. The system extracts core technical stacks, generates tailored
            technical, architectural, and behavioral interview questions with model answers, and allows instant
            addition to the Question Bank.
          </p>
        </div>
      </div>

      {/* Input Section */}
      <div className="mb-8 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("paste")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                activeTab === "paste"
                  ? "bg-navy text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <FileText size={15} /> Paste Resume Text
            </button>
            <button
              onClick={() => setActiveTab("upload")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                activeTab === "upload"
                  ? "bg-navy text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Upload size={15} /> Upload PDF / TXT
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div>
              <span className="font-semibold text-slate-500 mr-2">Target Role:</span>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Software Engineer"
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-navy outline-none focus:border-teal"
              />
            </div>
            <div>
              <span className="font-semibold text-slate-500 mr-2">Candidate:</span>
              <input
                type="text"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="Candidate Name"
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-navy outline-none focus:border-teal"
              />
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-rose-50 p-3.5 text-xs text-rose-700 border border-rose-200">
            <AlertCircle size={15} /> {errorMsg}
          </div>
        )}

        {/* Input Content */}
        <div className="mt-4">
          {activeTab === "paste" ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Paste Resume Text (Work Experience, Skills, Project Summaries):
              </label>
              <textarea
                rows={5}
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste candidate resume content here..."
                className="w-full rounded-2xl border border-slate-200 p-3.5 text-xs font-mono outline-none focus:border-teal"
              />
              <div className="mt-3 flex justify-end">
                <button
                  onClick={handleAnalyze}
                  disabled={analyzeMutation.isPending}
                  className="flex items-center gap-2 rounded-2xl bg-teal px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:opacity-90 transition"
                >
                  <Sparkles size={15} />
                  {analyzeMutation.isPending ? "Analyzing & Generating Q&A..." : "Generate Interview Q&A"}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center bg-slate-50/50">
              <Upload size={36} className="mx-auto text-teal" />
              <h4 className="mt-2 text-sm font-bold text-navy">Select Candidate Resume</h4>
              <p className="mt-1 text-xs text-slate-500">Supports PDF or plain text documents (.pdf, .txt)</p>
              <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-navy px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:opacity-90">
                <span>Choose File to Analyze</span>
                <input
                  type="file"
                  accept=".pdf,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploadMutation.isPending}
                />
              </label>
              {uploadMutation.isPending && (
                <div className="mt-3 text-xs font-semibold text-teal animate-pulse">
                  Extracting text streams and evaluating technical competencies...
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Analysis Results Display */}
      {analysisResult && (
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="eyebrow">Candidate Profile</div>
                <h3 className="mt-1 text-lg font-bold text-navy">
                  {analysisResult.candidate_name} • {analysisResult.target_role}
                </h3>
              </div>
              <div className="text-xs font-semibold text-slate-500">
                Generated {analysisResult.questions.length} Targeted Interview Questions
              </div>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              {analysisResult.experience_summary}
            </p>

            {/* Extracted Skills */}
            <div className="mt-4">
              <div className="text-xs font-semibold text-slate-700 mb-2">Detected Technical Proficiencies:</div>
              <div className="flex flex-wrap gap-1.5">
                {analysisResult.extracted_skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-xl bg-teal/10 px-2.5 py-1 text-xs font-semibold text-teal border border-teal/20"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Action Toolbar for Saving */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
            {/* Category tabs */}
            <div className="flex flex-wrap gap-1 text-xs">
              {(["All", "Technical", "Behavioral", "System Design"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat === "System Design" ? "system_design" : cat)}
                  className={`rounded-xl px-3.5 py-1.5 font-semibold transition ${
                    selectedCategory.toLowerCase() === (cat === "System Design" ? "system_design" : cat.toLowerCase())
                      ? "bg-navy text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Faculty Save Action */}
            {user?.role !== "student" && (
              <div className="flex items-center gap-3">
                <select
                  value={selectedSubjectId || ""}
                  onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-navy outline-none"
                >
                  <option value="">Link to Subject...</option>
                  {subjects?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleSaveToBank}
                  disabled={saveToBankMutation.isPending || selectedQuestionIndices.length === 0}
                  className="flex items-center gap-2 rounded-xl bg-teal px-4 py-2 text-xs font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-50"
                >
                  <Save size={14} />
                  {saveToBankMutation.isPending
                    ? "Saving..."
                    : `Save Selected (${selectedQuestionIndices.length}) to Bank`}
                </button>
              </div>
            )}
          </div>

          {saveSuccessMsg && (
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 border border-emerald-200">
              <CheckCircle2 size={16} className="text-emerald-600" /> {saveSuccessMsg}
            </div>
          )}

          {/* Generated Questions List */}
          <div className="space-y-4">
            {filteredQuestions?.map((q, idx) => {
              const originalIndex = analysisResult.questions.findIndex((item) => item.title === q.title);
              const isSelected = selectedQuestionIndices.includes(originalIndex);

              return (
                <div
                  key={q.title}
                  className={`rounded-3xl border bg-white p-6 shadow-sm transition ${
                    isSelected ? "border-teal/50 ring-1 ring-teal/20" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {user?.role !== "student" && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleQuestionSelect(originalIndex)}
                          className="h-4 w-4 rounded accent-teal cursor-pointer"
                        />
                      )}
                      <span
                        className={`rounded-xl border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${getCategoryBadge(
                          q.category
                        )}`}
                      >
                        {q.category.replace("_", " ")}
                      </span>
                      <span className="rounded-xl bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 capitalize">
                        {q.difficulty}
                      </span>
                      <span className="text-[11px] font-bold text-teal">{q.marks} Marks</span>
                    </div>
                  </div>

                  <h4 className="mt-3 text-base font-bold text-navy">{q.title}</h4>
                  <p className="mt-2 text-xs leading-relaxed text-slate-700 bg-slate-50/70 p-3 rounded-2xl border border-slate-100 font-sans">
                    {q.content}
                  </p>

                  {/* Skills Targeted */}
                  {q.skills_targeted && q.skills_targeted.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                      <span className="font-semibold text-navy">Skills Evaluated:</span>
                      {q.skills_targeted.map((st) => (
                        <span key={st} className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600 font-medium">
                          {st}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Model Answer / Rubric */}
                  <div className="mt-4 rounded-2xl bg-teal/5 p-3.5 border border-teal/15 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-navy">
                      <Lightbulb size={14} className="text-teal" /> Suggested Model Answer & Evaluation Criteria:
                    </div>
                    <p className="mt-1 text-slate-700 leading-relaxed whitespace-pre-line">{q.model_answer}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AppShell>
  );
}

