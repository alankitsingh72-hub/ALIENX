from app.grading import grade_answer
from app.models import Answer, Question, QuestionType


def question(question_type: QuestionType, **values) -> Question:
    return Question(
        title="Test", content="Test prompt", type=question_type, marks=4,
        options=values.get("options"), correct_answer=values.get("correct_answer"),
        model_answer=values.get("model_answer"), keywords=values.get("keywords", []),
    )


def test_mcq_grades_exact_answer_and_negative_marking():
    item = question(QuestionType.mcq, options=["A", "B"], correct_answer="A")
    correct = Answer(selected_option="A")
    incorrect = Answer(selected_option="B")
    unanswered = Answer(selected_option=None)

    grade_answer(correct, item, negative_marking=0.5)
    grade_answer(incorrect, item, negative_marking=0.5)
    grade_answer(unanswered, item, negative_marking=0.5)

    assert correct.auto_score == 4
    assert correct.final_score == 4
    assert correct.feedback == "Correct."

    assert incorrect.auto_score == -0.5
    assert incorrect.final_score == -0.5
    assert incorrect.review_status == "auto_graded"
    assert incorrect.feedback == "Incorrect."

    assert unanswered.auto_score == 0.0
    assert unanswered.final_score == 0.0
    assert unanswered.review_status == "auto_graded"
    assert unanswered.feedback == "Unanswered."


def test_empty_subjective_answer_is_auto_rejected():
    item = question(QuestionType.short_answer, model_answer="Relational data normalization reduces duplication", keywords=["normalization"])
    answer = Answer(answer_text="")

    grade_answer(answer, item)

    assert answer.auto_score == 0
    assert answer.final_score == 0
    assert answer.review_status == "auto_rejected"


def test_medium_similarity_is_routed_to_faculty():
    item = question(
        QuestionType.descriptive,
        model_answer="Distributed operating systems coordinate multiple nodes",
        keywords=[],
    )
    answer = Answer(answer_text="Systems coordinate nodes")

    grade_answer(answer, item)

    assert 0 < answer.confidence < 0.75
    assert answer.final_score is None
    assert answer.review_status == "faculty_review"
