import re
from functools import lru_cache

from app.config import settings
from app.models import Answer, Question, QuestionType


@lru_cache(maxsize=1)
def _sentence_model():
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer(settings.nlp_model_name)


@lru_cache(maxsize=1)
def _spacy_pipeline():
    import spacy

    return spacy.load(settings.spacy_model_name, disable=["ner", "parser"])


def _tokens(text: str | None) -> set[str]:
    if not text:
        return set()
    if settings.nlp_spacy_enabled:
        return {
            token.lemma_.lower()
            for token in _spacy_pipeline()(text)
            if not token.is_stop and token.is_alpha and len(token.lemma_) > 2
        }
    return {token for token in re.findall(r"[a-z0-9]+", text.lower()) if len(token) > 2}


def grade_answer(answer: Answer, question: Question, negative_marking: float = 0.0) -> None:
    if question.type == QuestionType.mcq:
        if not answer.selected_option:
            answer.auto_score = 0.0
            answer.confidence = 1.0
            answer.review_status = "auto_graded"
            answer.feedback = "Unanswered."
        elif answer.selected_option == question.correct_answer:
            answer.auto_score = question.marks
            answer.confidence = 1.0
            answer.review_status = "auto_graded"
            answer.feedback = "Correct."
        else:
            answer.auto_score = -abs(negative_marking) if negative_marking else 0.0
            answer.confidence = 1.0
            answer.review_status = "auto_graded"
            answer.feedback = "Incorrect."
    else:
        response = (answer.answer_text or "").strip()
        response_tokens = _tokens(response)
        expected_tokens = _tokens(" ".join([question.model_answer or "", *(question.keywords or [])]))
        if not response or not expected_tokens:
            score_ratio = 0.0
        else:
            coverage = len(response_tokens & expected_tokens) / len(expected_tokens)
            precision = len(response_tokens & expected_tokens) / max(len(response_tokens), 1)
            keyword_score = min(1.0, coverage * 0.75 + precision * 0.25)
            if settings.nlp_semantic_enabled:
                model_answer = question.model_answer or " ".join(question.keywords or [])
                embeddings = _sentence_model().encode([response, model_answer], normalize_embeddings=True)
                semantic_score = float(embeddings[0] @ embeddings[1])
                score_ratio = min(1.0, max(0.0, 0.6 * semantic_score + 0.4 * keyword_score))
            else:
                score_ratio = keyword_score
        answer.confidence = round(score_ratio, 2)
        answer.auto_score = round(question.marks * score_ratio, 2)
        if score_ratio >= settings.grading_auto_accept_threshold:
            answer.review_status = "auto_graded"
            answer.final_score = answer.auto_score
            answer.feedback = "Automatically assessed using model-answer similarity and keyword coverage."
        elif score_ratio < settings.grading_review_threshold:
            answer.review_status = "auto_rejected"
            answer.final_score = 0.0
            answer.feedback = "The response did not sufficiently match the model answer. Contact your instructor if you believe this is incorrect."
        else:
            answer.review_status = "faculty_review"
            answer.final_score = None
            answer.feedback = "This response is awaiting faculty review."
        return
    answer.final_score = answer.auto_score
