export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export type User = {
  id: number;
  email: string;
  full_name: string;
  role: "admin" | "faculty" | "student";
  is_active: boolean;
};

export type Subject = {
  id: number;
  name: string;
  code: string;
  description: string;
  created_by?: number;
  created_at?: string;
  question_count?: number;
  exam_count?: number;
  pyq_count?: number;
  lab_count?: number;
};

export type Question = {
  id: number;
  subject_id?: number | null;
  subject_name?: string | null;
  title: string;
  content: string;
  type: "mcq" | "short_answer" | "descriptive";
  options?: string[] | null;
  correct_answer?: string | null;
  model_answer?: string | null;
  keywords?: string[];
  explanation?: string | null;
  marks: number;
  difficulty: "easy" | "medium" | "tough" | "hard" | string;
  is_hots?: boolean;
  tags?: string[];
  created_by: number;
};

export type Exam = {
  id: number;
  subject_id?: number | null;
  subject_name?: string | null;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  attempt_limit: number;
  negative_marking?: number;
  is_published: boolean;
  is_closed: boolean;
  created_by: number;
  question_count: number;
};

export type Event = {
  id: number;
  title: string;
  event_type: "Quizathon" | "Hackathon" | "Ideathon" | "Buildathon" | "Innovathon" | string;
  description: string;
  rules: string;
  prizes: string;
  start_time: string;
  end_time: string;
  duration: string;
  registration_deadline?: string | null;
  max_participants: number;
  is_published: boolean;
  created_by: number;
  created_at: string;
  registration_count: number;
  is_registered: boolean;
  status: "upcoming" | "ongoing" | "past";
};

export type CourseModule = {
  id: string;
  title: string;
  description: string;
  duration: string;
};

export type Course = {
  id: number;
  title: string;
  code: string;
  description: string;
  duration_hours: number;
  level: "Beginner" | "Intermediate" | "Advanced" | string;
  skills_covered: string[];
  syllabus: CourseModule[];
  certificate_preview: string;
  is_published: boolean;
  created_by: number;
  created_at: string;
  enrollment_count: number;
  is_enrolled: boolean;
  student_progress: number;
  student_status?: "enrolled" | "in_progress" | "completed" | null;
  certificate_id?: string | null;
};

export type CourseEnrollment = {
  id: number;
  course_id: number;
  user_id: number;
  progress_percentage: number;
  completed_modules: string[];
  status: string;
  certificate_id?: string | null;
  enrolled_at: string;
  completed_at?: string | null;
  course_title?: string;
  course_code?: string;
  student_name?: string;
};

export type CertificateVerification = {
  valid: boolean;
  certificate_id: string;
  recipient_name: string;
  course_title: string;
  course_code: string;
  duration_hours: number;
  level: string;
  skills_covered: string[];
  completed_at?: string | null;
  issuer: string;
  verification_url: string;
};

export type ResumeAnalyzeRequest = {
  resume_text: string;
  target_role: string;
  candidate_name: string;
  subject_id?: number | null;
};

export type ResumeQuestionItem = {
  category: "technical" | "behavioral" | "system_design" | "problem_solving" | string;
  title: string;
  content: string;
  type: "mcq" | "short_answer" | "descriptive";
  options?: string[] | null;
  correct_answer?: string | null;
  model_answer: string;
  skills_targeted: string[];
  difficulty: "easy" | "medium" | "tough";
  marks: number;
};

export type ResumeAnalyzeResponse = {
  candidate_name: string;
  target_role: string;
  extracted_skills: string[];
  experience_summary: string;
  questions: ResumeQuestionItem[];
};

export type QuizHistoryItem = {
  attempt_id: number;
  exam_id: number;
  exam_title: string;
  subject_name: string;
  subject_code: string;
  started_at?: string | null;
  submitted_at?: string | null;
  date: string;
  time_spent_seconds: number;
  time_spent_formatted: string;
  score: number;
  total_marks: number;
  percentage: number;
  passed: boolean;
  passing_percentage: number;
  status: string;
  dominant_difficulty: "easy" | "medium" | "tough" | string;
  difficulty_breakdown: {
    [key: string]: {
      earned: number;
      total: number;
      percentage: number;
    };
  };
  hots_count: number;
};

export type StudentStrength = {
  subject: string;
  code: string;
  accuracy: number;
  attempts: number;
  status?: string;
};

export type StudentWeakerArea = {
  subject: string;
  code: string;
  accuracy: number;
  attempts: number;
  recommendation: string;
};

export type StudentAnalyticsResponse = {
  student_id: number;
  overall: {
    total_attempts: number;
    average_percentage: number;
    total_score_earned: number;
    total_score_possible: number;
    overall_accuracy_percentage: number;
  };
  subject_bars: {
    subject_id: number;
    subject_name: string;
    subject_code: string;
    attempts: number;
    avg_percentage: number;
    total_earned: number;
    total_possible: number;
  }[];
  score_trends: {
    attempt_id: number;
    exam_id: number;
    exam_title: string;
    subject_name: string;
    date: string;
    percentage: number;
    score: number;
    total_marks: number;
    time_spent_minutes: number;
  }[];
  strongest_subject: string;
  weakest_subject: string;
  strengths?: StudentStrength[];
  weaker_areas?: StudentWeakerArea[];
  difficulty_performance?: {
    [key: string]: {
      attempted: number;
      accuracy_percentage: number;
      earned: number;
      possible: number;
    };
  };
  hots_performance?: {
    attempted: number;
    earned: number;
    possible: number;
    accuracy_percentage: number;
  };
  quiz_history?: QuizHistoryItem[];
  question_type_stats: {
    mcq: {
      attempted: number;
      correct: number;
      accuracy_percentage: number;
    };
    subjective: {
      attempted: number;
      points_earned: number;
      points_possible: number;
      accuracy_percentage: number;
    };
  };
};

export type AdminFacultyAnalyticsResponse = {
  class_overview: {
    total_students: number;
    total_exams: number;
    total_attempts: number;
    class_average_percentage: number;
  };
  subject_averages: {
    subject_id: number;
    subject_name: string;
    subject_code: string;
    average_percentage: number;
    submissions_count: number;
    exam_count: number;
  }[];
  class_weak_areas?: {
    subject_name: string;
    subject_code: string;
    average_percentage: number;
    submissions_count: number;
    insight: string;
  }[];
  top_performers: {
    student_id: number;
    full_name: string;
    email: string;
    completed_attempts: number;
    average_percentage: number;
  }[];
  score_distribution: {
    range: string;
    count: number;
  }[];
  exam_comparisons: {
    exam_id: number;
    title: string;
    subject_name: string;
    attempts: number;
    average_percentage: number;
    pass_rate: number;
    total_marks: number;
  }[];
  examinations?: {
    exam_id: number;
    title: string;
    attempt_count: number;
    graded_count: number;
    average_percentage: number | null;
    total_marks: number;
  }[];
};

export type PYQPaper = {
  id: number;
  subject_id: number;
  subject_name?: string | null;
  title: string;
  year: number;
  exam_type: string;
  university: string;
  description?: string;
  file_url?: string | null;
  created_by: number;
  created_at: string;
  question_count?: number;
};

export type PYQQuestion = {
  id: number;
  subject_id: number;
  subject_name?: string | null;
  paper_id?: number | null;
  year: number;
  question_text: string;
  marks: number;
  question_type: "mcq" | "short_answer" | "descriptive" | string;
  options?: string[] | null;
  correct_answer?: string | null;
  solution?: string | null;
  difficulty: "easy" | "medium" | "tough" | "hard" | string;
  tags?: string[];
  created_by: number;
  created_at: string;
};

export type LabManual = {
  id: number;
  subject_id: number;
  subject_name?: string | null;
  title: string;
  lab_number: number;
  objectives: string;
  theory: string;
  procedure: string;
  sample_code?: string | null;
  programming_language?: string;
  expected_output?: string | null;
  viva_questions?: { question: string; answer: string }[];
  file_url?: string | null;
  created_by: number;
  created_at: string;
  is_completed?: boolean;
};

export type AIGenerateRequest = {
  subject_id: number;
  topic: string;
  difficulty: "easy" | "medium" | "tough" | "hard";
  question_type: "mcq" | "short_answer" | "descriptive";
  count: number;
};

export type AIGeneratedQuestionItem = {
  title: string;
  content: string;
  type: "mcq" | "short_answer" | "descriptive";
  options?: string[] | null;
  correct_answer?: string | null;
  model_answer?: string | null;
  keywords?: string[];
  explanation?: string | null;
  marks: number;
  difficulty: "easy" | "medium" | "tough" | "hard" | string;
  is_hots?: boolean;
  tags?: string[];
};

export type AIGenerateResponse = {
  subject_id: number;
  subject_name: string;
  topic: string;
  questions: AIGeneratedQuestionItem[];
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("alienx_access_token");
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("alienx_refresh_token");
}

let refreshRequest: Promise<string | null> | null = null;

function getErrorMessage(detail: unknown, fallback: string): string {
  if (typeof detail === "string" && detail.length > 0) return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item) return String(item.msg);
        return "";
      })
      .filter(Boolean);
    return messages.join("; ") || fallback;
  }
  return fallback;
}

async function fetchApi(input: RequestInfo | URL, init: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Could not connect to the ALIENX API at ${API_URL}. Start the backend service and try again.`);
    }
    throw error;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const tokens = (await response.json()) as { access_token: string; refresh_token: string };
  localStorage.setItem("alienx_access_token", tokens.access_token);
  localStorage.setItem("alienx_refresh_token", tokens.refresh_token);
  return tokens.access_token;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const send = (token: string | null) =>
    fetchApi(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
      cache: "no-store",
    });
  let response = await send(getToken());
  if (response.status === 401 && !path.endsWith("/auth/refresh") && getRefreshToken()) {
    refreshRequest ??= refreshAccessToken().finally(() => {
      refreshRequest = null;
    });
    const refreshedToken = await refreshRequest;
    if (refreshedToken) {
      response = await send(refreshedToken);
    } else {
      localStorage.removeItem("alienx_access_token");
      localStorage.removeItem("alienx_refresh_token");
    }
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(getErrorMessage(body?.detail, `Request failed (${response.status})`));
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = getToken();
  const response = await fetchApi(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(getErrorMessage(body?.detail, `Upload failed (${response.status})`));
  }
  return response.json() as Promise<T>;
}
