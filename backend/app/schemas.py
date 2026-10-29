from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.models import QuestionType, UserRole


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    full_name: str = Field(min_length=1, max_length=160)

    @field_validator("full_name")
    @classmethod
    def normalize_full_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Full name cannot be blank")
        return normalized


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserRead(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
    model_config = ConfigDict(from_attributes=True)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserRead


class RefreshRequest(BaseModel):
    refresh_token: str


class ProfileUpdate(BaseModel):
    full_name: str = Field(min_length=1, max_length=160)

    @field_validator("full_name")
    @classmethod
    def normalize_full_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Full name cannot be blank")
        return normalized


class AdminUserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    full_name: str = Field(min_length=1, max_length=160)
    role: UserRole

    @field_validator("full_name")
    @classmethod
    def normalize_full_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Full name cannot be blank")
        return normalized


class AdminUserUpdate(BaseModel):
    full_name: str = Field(min_length=1, max_length=160)
    role: UserRole
    is_active: bool

    @field_validator("full_name")
    @classmethod
    def normalize_full_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Full name cannot be blank")
        return normalized


class SubjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    code: str = Field(min_length=2, max_length=32)
    description: str = ""

    @field_validator("name", "code")
    @classmethod
    def strip_text(cls, value: str) -> str:
        v = value.strip()
        if not v:
            raise ValueError("Field cannot be blank")
        return v


class SubjectRead(BaseModel):
    id: int
    name: str
    code: str
    description: str
    created_by: int | None = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class QuestionCreate(BaseModel):
    subject_id: int | None = None
    title: str = Field(min_length=1, max_length=240)
    content: str = Field(min_length=1)
    type: QuestionType
    options: list[str] | None = None
    correct_answer: str | None = None
    model_answer: str | None = None
    keywords: list[str] = Field(default_factory=list)
    explanation: str | None = None
    marks: float = Field(gt=0)
    difficulty: str = "medium"
    is_hots: bool = False
    tags: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_answer_shape(self):
        if self.type == QuestionType.mcq and (not self.options or self.correct_answer not in self.options):
            raise ValueError("MCQ questions require options containing the correct answer")
        if self.type != QuestionType.mcq and not self.model_answer:
            raise ValueError("Subjective questions require a model answer")
        return self


class QuestionRead(QuestionCreate):
    id: int
    created_by: int
    subject_name: str | None = None
    model_config = ConfigDict(from_attributes=True)


class ExamCreate(BaseModel):
    subject_id: int | None = None
    title: str = Field(min_length=1, max_length=240)
    description: str = ""
    start_time: datetime
    end_time: datetime
    duration_minutes: int = Field(gt=0, le=600)
    attempt_limit: int = Field(default=1, gt=0, le=10)
    negative_marking: float = Field(default=0, ge=0, le=100)
    question_ids: list[int] = Field(min_length=1)
    shuffle_questions: bool = False
    shuffle_options: bool = False

    @field_validator("start_time", "end_time")
    @classmethod
    def normalize_time_to_utc(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    @model_validator(mode="after")
    def validate_times(self):
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class ExamRead(BaseModel):
    id: int
    subject_id: int | None = None
    subject_name: str | None = None
    title: str
    description: str
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    attempt_limit: int
    negative_marking: float
    is_published: bool
    is_closed: bool
    created_by: int
    question_count: int


class AnswerSave(BaseModel):
    question_id: int
    answer_text: str = Field(default="", max_length=20000)
    selected_option: str | None = Field(default=None, max_length=500)
    marked_for_review: bool = False


class ReviewRequest(BaseModel):
    final_score: float = Field(ge=0)
    feedback: str = Field(default="", max_length=5000)


class AnswerResult(BaseModel):
    question_id: int
    title: str
    marks: float
    answer_text: str
    selected_option: str | None
    auto_score: float | None
    final_score: float | None
    confidence: float | None
    review_status: str
    feedback: str | None


class AttemptResult(BaseModel):
    attempt_id: int
    examination_id: int
    examination_title: str
    subject_name: str | None = None
    status: str
    total_score: float | None
    total_marks: float
    answers: list[AnswerResult]


class PYQPaperCreate(BaseModel):
    subject_id: int
    title: str = Field(min_length=2, max_length=240)
    year: int = Field(ge=1990, le=2050)
    exam_type: str = "End-Term"
    university: str = "University"
    description: str = ""
    file_url: str | None = None


class PYQPaperRead(PYQPaperCreate):
    id: int
    created_by: int
    created_at: datetime
    subject_name: str | None = None
    question_count: int = 0
    model_config = ConfigDict(from_attributes=True)


class PYQQuestionCreate(BaseModel):
    subject_id: int
    paper_id: int | None = None
    year: int = Field(ge=1990, le=2050)
    question_text: str = Field(min_length=3)
    marks: float = Field(default=5.0, gt=0)
    question_type: str = "short_answer"
    options: list[str] | None = None
    correct_answer: str | None = None
    solution: str | None = None
    difficulty: str = "medium"
    tags: list[str] = Field(default_factory=list)


class PYQQuestionRead(PYQQuestionCreate):
    id: int
    created_by: int
    created_at: datetime
    subject_name: str | None = None
    model_config = ConfigDict(from_attributes=True)


class LabManualCreate(BaseModel):
    subject_id: int
    title: str = Field(min_length=2, max_length=240)
    lab_number: int = Field(default=1, ge=1)
    objectives: str = ""
    theory: str = ""
    procedure: str = ""
    sample_code: str | None = None
    programming_language: str = "python"
    expected_output: str | None = None
    viva_questions: list[dict] = Field(default_factory=list)
    file_url: str | None = None


class LabManualRead(LabManualCreate):
    id: int
    created_by: int
    created_at: datetime
    subject_name: str | None = None
    is_completed: bool = False
    model_config = ConfigDict(from_attributes=True)


class AIGenerateRequest(BaseModel):
    subject_id: int
    topic: str = Field(min_length=2, max_length=200)
    difficulty: str = "medium"  # easy, medium, hard
    question_type: QuestionType = QuestionType.mcq
    count: int = Field(default=3, ge=1, le=10)


class AIGeneratedQuestionItem(BaseModel):
    title: str
    content: str
    type: QuestionType
    options: list[str] | None = None
    correct_answer: str | None = None
    model_answer: str | None = None
    keywords: list[str] = Field(default_factory=list)
    explanation: str | None = None
    marks: float = 2.0
    difficulty: str = "medium"
    is_hots: bool = False
    tags: list[str] = Field(default_factory=list)


class AIGenerateResponse(BaseModel):
    subject_id: int
    subject_name: str
    topic: str
    questions: list[AIGeneratedQuestionItem]


# -------------------------------------------------------------
# EVENTS SCHEMAS
# -------------------------------------------------------------
class EventCreate(BaseModel):
    title: str = Field(min_length=2, max_length=240)
    event_type: str = "Hackathon"  # Quizathon, Hackathon, Ideathon, Buildathon, Innovathon
    description: str = Field(min_length=5)
    rules: str = ""
    prizes: str = ""
    start_time: datetime
    end_time: datetime
    duration: str = "24 Hours"
    registration_deadline: datetime | None = None
    max_participants: int = 500
    is_published: bool = True


class EventUpdate(BaseModel):
    title: str | None = None
    event_type: str | None = None
    description: str | None = None
    rules: str | None = None
    prizes: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    duration: str | None = None
    registration_deadline: datetime | None = None
    max_participants: int | None = None
    is_published: bool | None = None


class EventRead(EventCreate):
    id: int
    created_by: int
    created_at: datetime
    registration_count: int = 0
    is_registered: bool = False
    status: str = "upcoming"  # upcoming, ongoing, past
    model_config = ConfigDict(from_attributes=True)


class EventRegistrationRead(BaseModel):
    id: int
    event_id: int
    user_id: int
    status: str
    registered_at: datetime
    user_name: str | None = None
    user_email: str | None = None
    event_title: str | None = None
    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# CERTIFICATION COURSES SCHEMAS
# -------------------------------------------------------------
class CourseModule(BaseModel):
    id: int
    title: str
    description: str
    duration: str = "1h"


class CourseCreate(BaseModel):
    title: str = Field(min_length=2, max_length=240)
    code: str = Field(min_length=2, max_length=32)
    description: str = Field(min_length=5)
    duration_hours: int = Field(default=10, gt=0)
    level: str = "Beginner"  # Beginner, Intermediate, Advanced
    skills_covered: list[str] = Field(default_factory=list)
    syllabus: list[dict] = Field(default_factory=list)
    certificate_preview: str = ""
    is_published: bool = True


class CourseUpdate(BaseModel):
    title: str | None = None
    code: str | None = None
    description: str | None = None
    duration_hours: int | None = None
    level: str | None = None
    skills_covered: list[str] | None = None
    syllabus: list[dict] | None = None
    certificate_preview: str | None = None
    is_published: bool | None = None


class CourseRead(CourseCreate):
    id: int
    created_by: int
    created_at: datetime
    enrollment_count: int = 0
    is_enrolled: bool = False
    student_progress: int = 0
    student_status: str | None = None
    certificate_id: str | None = None
    model_config = ConfigDict(from_attributes=True)


class CourseProgressUpdate(BaseModel):
    completed_module_id: str
    progress_percentage: int = Field(ge=0, le=100)


class CourseEnrollmentRead(BaseModel):
    id: int
    course_id: int
    user_id: int
    progress_percentage: int
    completed_modules: list[str]
    status: str
    certificate_id: str | None = None
    enrolled_at: datetime
    completed_at: datetime | None = None
    course_title: str | None = None
    course_code: str | None = None
    student_name: str | None = None
    model_config = ConfigDict(from_attributes=True)


# -------------------------------------------------------------
# RESUME TO Q&A GENERATOR SCHEMAS
# -------------------------------------------------------------
class ResumeAnalyzeRequest(BaseModel):
    resume_text: str = Field(min_length=20)
    target_role: str = "Software Engineer"
    candidate_name: str = "Candidate"
    subject_id: int | None = None


class ResumeQuestionItem(BaseModel):
    category: str  # technical, behavioral, system_design, problem_solving
    title: str
    content: str
    type: QuestionType = QuestionType.short_answer
    options: list[str] | None = None
    correct_answer: str | None = None
    model_answer: str
    skills_targeted: list[str] = Field(default_factory=list)
    difficulty: str = "medium"  # easy, medium, tough
    marks: float = 5.0


class ResumeAnalyzeResponse(BaseModel):
    candidate_name: str
    target_role: str
    extracted_skills: list[str]
    experience_summary: str
    questions: list[ResumeQuestionItem]


# -------------------------------------------------------------
# QUIZ HISTORY & ADVANCED PROGRESS SCHEMAS
# -------------------------------------------------------------
class QuizHistoryItem(BaseModel):
    attempt_id: int
    exam_id: int
    exam_title: str
    subject_name: str
    subject_code: str
    started_at: datetime
    submitted_at: datetime | None
    time_spent_seconds: int
    score: float
    total_marks: float
    percentage: float
    status: str
    difficulty_breakdown: dict = Field(default_factory=dict)  # easy: score/total, medium: ..., tough: ...


class StudentProgressSummary(BaseModel):
    student_id: int
    overall_exams_taken: int
    overall_accuracy_percentage: float = 0.0
    strengths: list[dict] = Field(default_factory=list)  # [{subject, avg_percentage, attempts}]
    weaker_areas: list[dict] = Field(default_factory=list)  # [{subject, avg_percentage, attempts}]
    difficulty_performance: dict = Field(default_factory=dict)  # easy: %, medium: %, tough: %
    quiz_history: list[QuizHistoryItem] = Field(default_factory=list)

