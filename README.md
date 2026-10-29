# ALIENX — Online Examination Auto-Grading & Academic Learning Platform

ALIENX is an enterprise-grade academic assessment and learning platform engineered with Next.js 16 (App Router), FastAPI, PostgreSQL / SQLite, SQLAlchemy 2, Alembic, Recharts, and Tailwind CSS. It delivers server-validated exam proctoring, AI-assisted question generation, previous year questions (PYQ) practice, interactive lab manuals, and deep performance analytics.

---

## 🚀 Key Modules & System Capabilities

### 1. Multi-Subject System
- **Pre-populated Subjects (12 Core Disciplines):**
  1. *Computer Organization & Architecture (COA)*
  2. *Technical Communication (TC)*
  3. *Mathematics (MATH)*
  4. *Python Programming (PYPROG)*
  5. *C Programming (CPROG)*
  6. *Soft Skills (SOFTSKILLS)*
  7. *Discrete Structures & Theory of Logic (DSTL)*
  8. *Web Development (WEBDEV)*
  9. *Data Structures (DSA)*
  10. *Operating Systems (OS)*
  11. *Database Management Systems (DBMS)*
  12. *Software Engineering (SE)*
- **Subject CRUD:** Admin and Faculty can create, edit, and organize subjects.
- **Global Linkage & Filters:** Every Question, Exam, PYQ Paper, and Lab Manual is linked to a subject, with instant filtering across dashboards.

### 2. Student & Cohort Performance Analytics (Powered by Recharts)
- **Student Dashboard:**
  - Overall performance overview (total attempts, average percentage, points earned vs available).
  - Overall accuracy percentage.
  - Strongest and weakest subject identification.
  - Interactive **Subject-wise Performance Bar Chart** (Average score % per subject).
  - Interactive **Score Trend Line Chart** tracking chronological progression across exam attempts.
  - Question-type performance breakdown (Multiple Choice vs. Subjective/Theory).
- **Faculty & Admin Dashboard:**
  - Cohort mastery overview (active student counts, exams, submissions, class average score %).
  - Subject-wise average score bar chart.
  - Score distribution histogram (0–20%, 21–40%, 41–60%, 61–80%, 81–100%).
  - Top Performers leaderboard table (ranked by average score and completion count).
  - Examination comparisons table with pass rate (≥ 40%) and attempt statistics.
  - Subject filter to analyze specific course sections.

### 3. AI Question & Answer Generation
- Dedicated **“AI Question Generator”** workspace under Faculty tools (`/questions/ai`).
- Multi-dimensional generation by Subject, Topic/Concept, Difficulty (Easy, Medium, Hard), and Question Type (MCQ, Short Answer, Descriptive).
- Bulk generation support (1, 3, 5, or 10 questions at once).
- Generates titles, questions, options (with correct answer highlighting), model answers, key concept keywords, marks, and explanations.
- Interactive card preview with inline editing mode: refine questions before saving.
- One-click bulk approval directly into the Question Bank (`/questions`).

### 4. Previous Year Questions (PYQ) Module
- **Exam Papers Archive:**
  - Categorized by Subject, Year, University, and Exam Type (End-Term, Mid-Term).
  - Downloadable PDF documents and full past papers.
- **Structured Practice Mode:**
  - Students can browse standalone past exam questions.
  - Interactive "View Solution" toggle to reveal official solution proofs and marking schemes.
  - Faculty management tools to add, categorize, and tag past papers and questions.

### 5. Lab Manuals Module
- Complete laboratory manuals linked to course subjects.
- Structured laboratory specification:
  - Experiment Title & Lab Number
  - Learning Objectives
  - Theoretical Background
  - Step-by-step Procedure
  - Formatted Sample Code with one-click copy
  - Expected Terminal Output block
  - Viva Voce Questions & Answers
  - Official PDF manual download link
- **Progress Tracking:** Students can mark experiments as completed with a live progress bar.

### 6. Examination Engine & Auto-Grading
- Timed examination attempts with server-validated countdown and autosave.
- Anti-cheating randomized question and option shuffling.
- Automatic MCQ grading with configurable negative marking penalties.
- Subjective answer evaluation using keyword coverage, precision thresholds, and optional NLP embeddings (`sentence-transformers` and `spacy`).
- Faculty review queue for triage, grading adjustments, and individual student feedback.

### 7. Question Bank with Granular Difficulty Levels
- Multi-tier difficulty classification on every question: **Easy**, **Medium**, and **Tough**.
- Pre-seeded with 120+ high-yield curricular questions (10 questions per subject: 5 Objective/MCQ + 5 Subjective/Descriptive) spanning all 12 major disciplines.
- Color-coded difficulty badges (Green for Easy, Amber for Medium, Rose/Red for Tough).
- Real-time difficulty filters across Question Bank, Exam Authoring, and HOTS practice workspaces.

### 8. Events Module
- Campus & hackathon tournament suite supporting 5 premier technical event categories:
  - 🏆 **Quizathon**: High-speed competitive trivia and rapid-fire algorithmic quizzes.
  - 💻 **Hackathon**: 24-48 hour prototype builds solving institutional or industry challenges.
  - 💡 **Ideathon**: Creative solution pitches, problem modeling, and architecture design.
  - 🛠️ **Buildathon**: Deep engineering, open-source sprints, and production feature shipping.
  - 🚀 **Innovathon**: Interdisciplinary breakthrough innovation combining AI, hardware, and software.
- Full Admin/Faculty lifecycle management (create, publish, manage registrations, define cash/tech prize pools).
- Student registration toggle with live seat countdown, rules viewer, and timeframe filters (Upcoming / Ongoing / Past).

### 9. Resume-to-Question Answer Generator
- Intelligent career and interview readiness pipeline accessible at `/resume-qa`.
- Dual input mode: upload PDF resumes or paste parsed resume markdown/text directly.
- Automated extraction of candidate skills, expertise domains, and education metrics.
- Multi-category interview question generation:
  - **Technical Questions**: Deep-dive algorithmic, framework, and language inquiries matching candidate experience.
  - **Behavioral Questions**: STAR-method leadership, conflict resolution, and teamwork scenarios.
  - **System Design / Architecture**: Scalability, trade-off, and systems questions tailored to candidate tech stack.
- Complete model answers, evaluation rubrics, and suggested difficulty for each generated item.
- Faculty one-click export directly into the ALIENX Question Bank.

### 10. HOTS (Higher Order Thinking Skills) Module
- Dedicated analytical thinking workspace at `/hots`.
- Flags challenging, scenario-driven, and conceptual questions requiring Bloom's taxonomy analysis and synthesis.
- Practice mode allowing students to test themselves on HOTS MCQs with instant verification and study descriptive models with comprehensive grading rubrics.
- Dedicated filtering by subject and difficulty.

### 11. Quiz History & Student Progress Tracking
- Comprehensive audit of every exam and quiz attempt (timestamp, subject, percentage score, duration, difficulty breakdown).
- **Strengths & Weaker Areas Analysis**: Automatically surfaces subjects where accuracy is highest (≥75%) alongside weak subjects requiring remediation (<70%).
- **Interactive Data Visualizations (Recharts)**:
  - Chronological Score Progression Line Chart.
  - Subject-wise accuracy and mastery bar graphs.
  - Multi-tier difficulty performance breakdown (Easy vs. Medium vs. Tough score comparisons).
- Faculty cohort diagnostics highlighting class-wide weaker areas to inform curriculum interventions.

### 12. Certification Courses & Digital Verification
- Career acceleration tracks hosted at `/courses` (e.g., Full-Stack Web Development, Advanced Data Structures, Database Administration, AI & ML).
- Modular syllabus viewer tracking module completion with interactive progress percentage.
- One-click student enrollment and completion tracking.
- Instant verifiable digital certificates with unique hash identifiers (e.g. `ALX-CERT-FSW-101-88A9F2`), student name, issue date, and printable styling.

---

## 👥 Demo Accounts

All seeded demo accounts use the standard password: `AlienxDemo!2026`

| Role | Email | Capabilities |
|---|---|---|
| **Administrator** | `admin@alienx.demo` | Full system access, User management, Subject CRUD, Audit logs |
| **Faculty** | `faculty@alienx.demo` | Question Bank, AI Generator, Exam authoring, PYQs, Lab Manuals, Grading |
| **Student** | `student@alienx.demo` | Taking exams, Results, PYQ practice, Lab manuals completion, Analytics |

---

## 🏃 Local Development & Execution

### Prerequisites
- Python 3.11+
- Node.js 20+

### 1. Backend (FastAPI + SQLite / PostgreSQL)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt

# Run migrations and start API
.\.venv\Scripts\alembic.exe upgrade head
.\.venv\Scripts\python.exe -m app.seed
.\.venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --reload
```

- API Base URL: `http://localhost:8000`
- Interactive OpenAPI Docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

### 2. Frontend (Next.js 16 + Tailwind CSS)

```powershell
cd frontend
npm install
npm run dev
```

- Web Application: `http://localhost:3000`

---

## 🧪 Testing

The backend includes a comprehensive pytest suite verifying all authentication, RBAC, subject management, examination attempts, negative marking grading, PYQs, lab manuals, and analytics:

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest
```

---

## 📦 Docker Deployment

To launch the complete production stack (FastAPI + Next.js + PostgreSQL):

```powershell
docker compose up --build
```
