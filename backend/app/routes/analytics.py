from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models import Answer, Attempt, Examination, ExaminationQuestion, Question, Subject, User, UserRole

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/student")
def student_analytics(
    student_id: int | None = Query(default=None),
    subject_id: int | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_student_id = user.id
    if user.role in (UserRole.admin, UserRole.faculty) and student_id is not None:
        target_student_id = student_id
    elif user.role == UserRole.student and student_id is not None and student_id != user.id:
        raise HTTPException(status_code=403, detail="Students may only view their own analytics")

    # Fetch all completed/submitted attempts
    query = (
        select(Attempt)
        .options(
            selectinload(Attempt.examination).selectinload(Examination.subject),
            selectinload(Attempt.examination).selectinload(Examination.questions).selectinload(ExaminationQuestion.question),
        )
        .where(
            Attempt.student_id == target_student_id,
            Attempt.status.in_(["submitted", "completed"]),
        )
        .order_by(Attempt.submitted_at.asc())
    )
    attempts = list(db.scalars(query).all())

    # Filter by subject if specified
    if isinstance(subject_id, int):
        attempts = [a for a in attempts if a.examination and a.examination.subject_id == subject_id]

    score_trends = []
    subject_stats = {}  # subject_name -> {subject_id, subject_code, scores, max_scores, count, ...}
    total_earned = 0.0
    total_possible = 0.0

    mcq_attempted = 0
    mcq_correct = 0
    subjective_attempted = 0
    subjective_earned = 0.0
    subjective_possible = 0.0

    all_percentages = []

    # Difficulty tracking across student attempts
    diff_stats = {
        "easy": {"attempted": 0, "correct": 0, "earned": 0.0, "possible": 0.0},
        "medium": {"attempted": 0, "correct": 0, "earned": 0.0, "possible": 0.0},
        "tough": {"attempted": 0, "correct": 0, "earned": 0.0, "possible": 0.0},
    }
    hots_stats = {"attempted": 0, "earned": 0.0, "possible": 0.0}

    quiz_history = []

    for att in attempts:
        exam = att.examination
        if not exam:
            continue

        answers = list(
            db.scalars(
                select(Answer)
                .options(joinedload(Answer.question))
                .where(Answer.attempt_id == att.id)
            ).all()
        )

        exam_total_marks = sum(q.marks for q in [eq.question for eq in exam.questions if eq.question]) or 1.0
        att_score = sum(ans.final_score or 0.0 for ans in answers)
        att_pct = round((att_score / exam_total_marks) * 100, 1)
        all_percentages.append(att_pct)

        total_earned += att_score
        total_possible += exam_total_marks

        sub = exam.subject
        sub_name = sub.name if sub else "General"
        sub_code = sub.code if sub else "GEN"
        sub_id = sub.id if sub else 0

        if sub_name not in subject_stats:
            subject_stats[sub_name] = {
                "subject_id": sub_id,
                "subject_name": sub_name,
                "subject_code": sub_code,
                "attempts": 0,
                "total_earned": 0.0,
                "total_possible": 0.0,
                "percentages": [],
            }
        subject_stats[sub_name]["attempts"] += 1
        subject_stats[sub_name]["total_earned"] += att_score
        subject_stats[sub_name]["total_possible"] += exam_total_marks
        subject_stats[sub_name]["percentages"].append(att_pct)

        sub_time = att.submitted_at or att.started_at
        date_str = sub_time.strftime("%d %b %Y") if sub_time else "Recent"

        score_trends.append({
            "attempt_id": att.id,
            "exam_id": exam.id,
            "exam_title": exam.title,
            "subject_name": sub_name,
            "date": date_str,
            "percentage": att_pct,
            "score": round(att_score, 2),
            "total_marks": round(exam_total_marks, 2),
            "time_spent_minutes": round(att.time_spent_seconds / 60, 1) if att.time_spent_seconds else 0,
        })

        # Track per-attempt difficulty counts
        att_diff_counter = {"easy": 0, "medium": 0, "tough": 0}
        att_diff_scores = {
            "easy": {"earned": 0.0, "total": 0.0},
            "medium": {"earned": 0.0, "total": 0.0},
            "tough": {"earned": 0.0, "total": 0.0},
        }
        att_hots_count = 0

        for ans in answers:
            q = ans.question
            if not q:
                continue

            diff = (q.difficulty or "medium").lower()
            if diff == "hard":
                diff = "tough"
            if diff not in diff_stats:
                diff = "medium"

            q_score = ans.final_score or 0.0
            q_marks = q.marks or 1.0

            att_diff_counter[diff] = att_diff_counter.get(diff, 0) + 1
            att_diff_scores[diff]["earned"] += q_score
            att_diff_scores[diff]["total"] += q_marks

            diff_stats[diff]["attempted"] += 1
            diff_stats[diff]["earned"] += q_score
            diff_stats[diff]["possible"] += q_marks
            if q_score >= q_marks * 0.7:
                diff_stats[diff]["correct"] += 1

            if q.is_hots:
                att_hots_count += 1
                hots_stats["attempted"] += 1
                hots_stats["earned"] += q_score
                hots_stats["possible"] += q_marks

            if q.type.value == "mcq":
                mcq_attempted += 1
                if ans.final_score is not None and ans.final_score >= q.marks:
                    mcq_correct += 1
            else:
                subjective_attempted += 1
                subjective_earned += q_score
                subjective_possible += q.marks

        # Determine dominant difficulty
        dominant_diff = max(att_diff_counter, key=att_diff_counter.get) if any(att_diff_counter.values()) else "medium"

        # Check pass status
        passing_pct = getattr(exam, "passing_percentage", None) or 40.0
        passed = att_pct >= passing_pct

        quiz_history.append({
            "attempt_id": att.id,
            "exam_id": exam.id,
            "exam_title": exam.title,
            "subject_name": sub_name,
            "subject_code": sub_code,
            "started_at": att.started_at.isoformat() if att.started_at else None,
            "submitted_at": att.submitted_at.isoformat() if att.submitted_at else None,
            "date": date_str,
            "time_spent_seconds": att.time_spent_seconds or 0,
            "time_spent_formatted": f"{(att.time_spent_seconds or 0) // 60}m {(att.time_spent_seconds or 0) % 60}s",
            "score": round(att_score, 2),
            "total_marks": round(exam_total_marks, 2),
            "percentage": att_pct,
            "passed": passed,
            "passing_percentage": passing_pct,
            "status": att.status,
            "dominant_difficulty": dominant_diff,
            "difficulty_breakdown": {
                k: {
                    "earned": round(v["earned"], 1),
                    "total": round(v["total"], 1),
                    "percentage": round((v["earned"] / v["total"] * 100), 1) if v["total"] > 0 else 0.0,
                }
                for k, v in att_diff_scores.items()
            },
            "hots_count": att_hots_count,
        })

    # Sort quiz history reverse chronological
    quiz_history.reverse()

    # Subject performance list
    subject_bars = []
    for s_data in subject_stats.values():
        avg_pct = round(sum(s_data["percentages"]) / len(s_data["percentages"]), 1) if s_data["percentages"] else 0.0
        subject_bars.append({
            "subject_id": s_data["subject_id"],
            "subject_name": s_data["subject_name"],
            "subject_code": s_data["subject_code"],
            "attempts": s_data["attempts"],
            "avg_percentage": avg_pct,
            "total_earned": round(s_data["total_earned"], 2),
            "total_possible": round(s_data["total_possible"], 2),
        })

    subject_bars.sort(key=lambda x: x["avg_percentage"], reverse=True)

    # Strengths and Weaker Areas calculation
    strengths = []
    weaker_areas = []
    for bar in subject_bars:
        if bar["avg_percentage"] >= 75.0:
            strengths.append({
                "subject": bar["subject_name"],
                "code": bar["subject_code"],
                "accuracy": bar["avg_percentage"],
                "attempts": bar["attempts"],
                "status": "Mastered",
            })
        elif bar["avg_percentage"] < 70.0:
            weaker_areas.append({
                "subject": bar["subject_name"],
                "code": bar["subject_code"],
                "accuracy": bar["avg_percentage"],
                "attempts": bar["attempts"],
                "recommendation": f"Practice more HOTS & subjective questions in {bar['subject_name']}",
            })

    # If student has few attempts, provide fallback guidance
    if not strengths and subject_bars:
        strengths.append({
            "subject": subject_bars[0]["subject_name"],
            "code": subject_bars[0]["subject_code"],
            "accuracy": subject_bars[0]["avg_percentage"],
            "attempts": subject_bars[0]["attempts"],
            "status": "Top Subject",
        })
    if not weaker_areas and len(subject_bars) > 1:
        weaker_areas.append({
            "subject": subject_bars[-1]["subject_name"],
            "code": subject_bars[-1]["subject_code"],
            "accuracy": subject_bars[-1]["avg_percentage"],
            "attempts": subject_bars[-1]["attempts"],
            "recommendation": f"Review core concepts and take practice quizzes in {subject_bars[-1]['subject_name']}",
        })

    # Difficulty performance summary
    difficulty_performance = {}
    for d_key, d_val in diff_stats.items():
        pct = round((d_val["earned"] / d_val["possible"] * 100), 1) if d_val["possible"] > 0 else 0.0
        difficulty_performance[d_key] = {
            "attempted": d_val["attempted"],
            "accuracy_percentage": pct,
            "earned": round(d_val["earned"], 2),
            "possible": round(d_val["possible"], 2),
        }

    hots_pct = round((hots_stats["earned"] / hots_stats["possible"] * 100), 1) if hots_stats["possible"] > 0 else 0.0
    hots_performance = {
        "attempted": hots_stats["attempted"],
        "earned": round(hots_stats["earned"], 2),
        "possible": round(hots_stats["possible"], 2),
        "accuracy_percentage": hots_pct,
    }

    strongest_subject = subject_bars[0]["subject_name"] if subject_bars else "N/A"
    weakest_subject = subject_bars[-1]["subject_name"] if subject_bars else "N/A"

    overall_accuracy = (
        round(((mcq_correct + (subjective_earned / subjective_possible * subjective_attempted if subjective_possible else 0)) / (mcq_attempted + subjective_attempted)) * 100, 1)
        if (mcq_attempted + subjective_attempted) > 0
        else 0.0
    )

    mcq_accuracy = round((mcq_correct / mcq_attempted) * 100, 1) if mcq_attempted > 0 else 0.0
    subjective_accuracy = round((subjective_earned / subjective_possible) * 100, 1) if subjective_possible > 0 else 0.0

    return {
        "student_id": target_student_id,
        "overall": {
            "total_attempts": len(attempts),
            "average_percentage": round(sum(all_percentages) / len(all_percentages), 1) if all_percentages else 0.0,
            "total_score_earned": round(total_earned, 2),
            "total_score_possible": round(total_possible, 2),
            "overall_accuracy_percentage": overall_accuracy,
        },
        "subject_bars": subject_bars,
        "score_trends": score_trends,
        "strongest_subject": strongest_subject,
        "weakest_subject": weakest_subject,
        "strengths": strengths,
        "weaker_areas": weaker_areas,
        "difficulty_performance": difficulty_performance,
        "hots_performance": hots_performance,
        "quiz_history": quiz_history,
        "question_type_stats": {
            "mcq": {
                "attempted": mcq_attempted,
                "correct": mcq_correct,
                "accuracy_percentage": mcq_accuracy,
            },
            "subjective": {
                "attempted": subjective_attempted,
                "points_earned": round(subjective_earned, 2),
                "points_possible": round(subjective_possible, 2),
                "accuracy_percentage": subjective_accuracy,
            },
        },
    }


@router.get("/quiz-history")
def get_quiz_history(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    student_id: int | None = Query(default=None),
):
    """Returns detailed history of all quiz attempts taken by the student."""
    res = student_analytics(student_id=student_id, user=user, db=db)
    return res.get("quiz_history", [])


@router.get("/progress")
def get_student_progress(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    student_id: int | None = Query(default=None),
):
    """Returns student progress tracking, strengths, weak areas, and difficulty performance."""
    return student_analytics(student_id=student_id, user=user, db=db)


@router.get("/admin-faculty")
@router.get("/faculty")
def admin_faculty_analytics(
    user: User = Depends(require_roles(UserRole.admin, UserRole.faculty)),
    db: Session = Depends(get_db),
    subject_id: int | None = Query(default=None),
):
    # 1. Total counts
    total_students = db.scalar(select(func.count(User.id)).where(User.role == UserRole.student, User.is_active.is_(True))) or 0

    exam_query = select(Examination).options(joinedload(Examination.subject))
    if user.role == UserRole.faculty:
        exam_query = exam_query.where(Examination.created_by == user.id)
    if isinstance(subject_id, int):
        exam_query = exam_query.where(Examination.subject_id == subject_id)
    exams = list(db.scalars(exam_query.order_by(Examination.created_at.desc())).all())

    exam_ids = [e.id for e in exams]

    attempts_query = (
        select(Attempt)
        .options(
            joinedload(Attempt.examination).joinedload(Examination.subject),
            selectinload(Attempt.student),
        )
        .where(
            Attempt.status.in_(["submitted", "completed"]),
        )
    )
    if exam_ids:
        attempts_query = attempts_query.where(Attempt.examination_id.in_(exam_ids))
    elif user.role == UserRole.faculty:
        attempts_query = attempts_query.where(Attempt.examination_id == -1)

    attempts = list(db.scalars(attempts_query).all())

    # Pre-calculate marks per exam
    exam_marks_map = {}
    for exam in exams:
        tm = db.scalar(
            select(func.coalesce(func.sum(Question.marks), 0.0))
            .join(ExaminationQuestion, ExaminationQuestion.question_id == Question.id)
            .where(ExaminationQuestion.examination_id == exam.id)
        ) or 0.0
        exam_marks_map[exam.id] = tm

    # Score distribution bins
    distribution = {
        "0-20%": 0,
        "21-40%": 0,
        "41-60%": 0,
        "61-80%": 0,
        "81-100%": 0,
    }

    all_pcts = []
    student_performance = {}  # student_id -> {full_name, email, pcts: []}

    exam_stats = {}  # exam_id -> {title, subject_name, attempts, pcts, pass_count}
    for e in exams:
        exam_stats[e.id] = {
            "exam_id": e.id,
            "title": e.title,
            "subject_name": e.subject.name if e.subject else "General",
            "attempts": 0,
            "percentages": [],
            "pass_count": 0,
            "total_marks": exam_marks_map.get(e.id, 0.0),
        }

    for att in attempts:
        exam = att.examination
        if not exam:
            continue

        exam_total = exam_marks_map.get(exam.id, 0.0) or 1.0
        att_score = db.scalar(
            select(func.coalesce(func.sum(Answer.final_score), 0.0))
            .where(Answer.attempt_id == att.id)
        ) or 0.0
        pct = round((att_score / exam_total) * 100, 1)
        all_pcts.append(pct)

        if pct <= 20:
            distribution["0-20%"] += 1
        elif pct <= 40:
            distribution["21-40%"] += 1
        elif pct <= 60:
            distribution["41-60%"] += 1
        elif pct <= 80:
            distribution["61-80%"] += 1
        else:
            distribution["81-100%"] += 1

        if att.student_id not in student_performance:
            st = att.student
            student_performance[att.student_id] = {
                "student_id": att.student_id,
                "full_name": st.full_name if st else f"Student #{att.student_id}",
                "email": st.email if st else "",
                "percentages": [],
            }
        student_performance[att.student_id]["percentages"].append(pct)

        if exam.id in exam_stats:
            exam_stats[exam.id]["attempts"] += 1
            exam_stats[exam.id]["percentages"].append(pct)
            if pct >= (getattr(exam, "passing_percentage", None) or 40.0):
                exam_stats[exam.id]["pass_count"] += 1

    # Subject performance
    subject_map = {}
    for e in exams:
        sub = e.subject
        if not sub:
            continue
        if sub.id not in subject_map:
            subject_map[sub.id] = {
                "subject_id": sub.id,
                "subject_name": sub.name,
                "subject_code": sub.code,
                "exam_count": 0,
                "percentages": [],
            }
        subject_map[sub.id]["exam_count"] += 1
        subject_map[sub.id]["percentages"].extend(exam_stats[e.id]["percentages"])

    subject_averages = []
    for s in subject_map.values():
        avg_p = round(sum(s["percentages"]) / len(s["percentages"]), 1) if s["percentages"] else 0.0
        subject_averages.append({
            "subject_id": s["subject_id"],
            "subject_name": s["subject_name"],
            "subject_code": s["subject_code"],
            "average_percentage": avg_p,
            "submissions_count": len(s["percentages"]),
            "exam_count": s["exam_count"],
        })
    subject_averages.sort(key=lambda x: x["average_percentage"], reverse=True)

    # Class-level weak areas for faculty
    class_weak_areas = []
    for s in subject_averages:
        if s["average_percentage"] < 70.0 and s["submissions_count"] > 0:
            class_weak_areas.append({
                "subject_name": s["subject_name"],
                "subject_code": s["subject_code"],
                "average_percentage": s["average_percentage"],
                "submissions_count": s["submissions_count"],
                "insight": f"Low class average ({s['average_percentage']}%) indicates students need revision sessions.",
            })

    # Top performers
    top_performers = []
    for sp in student_performance.values():
        p_list = sp["percentages"]
        avg = round(sum(p_list) / len(p_list), 1) if p_list else 0.0
        top_performers.append({
            "student_id": sp["student_id"],
            "full_name": sp["full_name"],
            "email": sp["email"],
            "completed_attempts": len(p_list),
            "average_percentage": avg,
        })
    top_performers.sort(key=lambda x: x["average_percentage"], reverse=True)

    # Exam comparisons
    exam_comparisons = []
    for es in exam_stats.values():
        p_list = es["percentages"]
        avg = round(sum(p_list) / len(p_list), 1) if p_list else 0.0
        pass_rate = round((es["pass_count"] / len(p_list)) * 100, 1) if p_list else 0.0
        exam_comparisons.append({
            "exam_id": es["exam_id"],
            "title": es["title"],
            "subject_name": es["subject_name"],
            "attempts": es["attempts"],
            "average_percentage": avg,
            "pass_rate": pass_rate,
            "total_marks": es["total_marks"],
        })

    # Legacy summaries
    legacy_summaries = [
        {
            "exam_id": ec["exam_id"],
            "title": ec["title"],
            "attempt_count": ec["attempts"],
            "graded_count": ec["attempts"],
            "average_percentage": ec["average_percentage"],
            "total_marks": ec["total_marks"],
        }
        for ec in exam_comparisons
    ]

    return {
        "class_overview": {
            "total_students": total_students,
            "total_exams": len(exams),
            "total_attempts": len(attempts),
            "class_average_percentage": round(sum(all_pcts) / len(all_pcts), 1) if all_pcts else 0.0,
        },
        "subject_averages": subject_averages,
        "class_weak_areas": class_weak_areas,
        "top_performers": top_performers[:10],
        "score_distribution": [{"range": k, "count": v} for k, v in distribution.items()],
        "exam_comparisons": exam_comparisons,
        "examinations": legacy_summaries,
    }


faculty_analytics = admin_faculty_analytics
