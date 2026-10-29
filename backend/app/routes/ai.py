import os
import random
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_roles
from app.models import QuestionType, Subject, User, UserRole
from app.schemas import AIGenerateRequest, AIGeneratedQuestionItem, AIGenerateResponse

router = APIRouter(prefix="/ai", tags=["ai generation"])

# Rich academic curriculum templates mapped by subject code / keyword
KNOWLEDGE_TEMPLATES = {
    "DBMS": [
        {
            "mcq": {
                "title": "ACID Properties: {topic} Integrity",
                "content": "In a distributed transaction management context regarding '{topic}', which guarantee ensures that concurrent transactions result in an equivalent state to serial execution?",
                "options": ["Serializability (Isolation)", "Atomicity", "Durability", "Consistency Check"],
                "correct_answer": "Serializability (Isolation)",
                "explanation": "Isolation prevents transactions from interfering with one another; serializability ensures that schedule execution yields results identical to a strictly serial schedule.",
                "keywords": ["isolation", "acid", "serializability", "transactions"],
                "marks": 2.0,
            },
            "short_answer": {
                "title": "Design Principles of {topic}",
                "content": "Explain the role and significance of '{topic}' in modern database architecture.",
                "model_answer": "'{topic}' provides structural integrity and minimizes anomalous states by formalizing relationships, constraints, and query execution guarantees in database systems.",
                "explanation": "Evaluates foundational understanding of database paradigms and operational invariants.",
                "keywords": ["database", "schema", "invariants", "optimization"],
                "marks": 5.0,
            },
            "descriptive": {
                "title": "Comprehensive Architecture of {topic}",
                "content": "Provide an in-depth analysis of '{topic}'. Discuss the structural trade-offs, concurrency implications, and storage engine layout required for high-throughput transactional environments.",
                "model_answer": "'{topic}' directly impacts storage layout and transaction isolation. Systems must balance locking overhead against serializability guarantees, utilizing multi-version concurrency control (MVCC) or write-ahead logging (WAL) to preserve consistency without crippling parallelism.",
                "explanation": "Tests architectural depth, storage subsystem implications, and transaction management trade-offs.",
                "keywords": ["wal", "mvcc", "concurrency", "storage", "throughput"],
                "marks": 10.0,
            },
        }
    ],
    "DSA": [
        {
            "mcq": {
                "title": "Asymptotic Complexity of {topic}",
                "content": "What is the worst-case time complexity of standard operations performed on '{topic}' when implemented without specialized balancing?",
                "options": ["O(n)", "O(log n)", "O(1)", "O(n log n)"],
                "correct_answer": "O(n)",
                "explanation": "Without balancing or memoization, degenerate worst-case inputs cause linear decay.",
                "keywords": ["complexity", "worst-case", "asymptotic", "data-structures"],
                "marks": 2.0,
            },
            "short_answer": {
                "title": "Invariant Properties in {topic}",
                "content": "Describe the core algorithmic invariant that must be maintained during operations in '{topic}'.",
                "model_answer": "The structure maintains strict structural or order invariants: every recursive subproblem or node partition must satisfy comparison constraints and pointer validity across all mutations.",
                "explanation": "Verifies mastery of algorithmic invariants and inductive proof concepts.",
                "keywords": ["invariant", "subproblem", "recursion", "partition"],
                "marks": 5.0,
            },
            "descriptive": {
                "title": "Algorithmic Analysis & Proof: {topic}",
                "content": "Formulate the operational mechanics of '{topic}'. Provide recurrence relations, prove asymptotic termination, and contrast its memory footprint with alternative traversal structures.",
                "model_answer": "The algorithmic recurrence typically resolves using the Master Theorem to O(n log n) or O(log n). Memory complexity is bounded by recursion depth O(h), whereas auxiliary hash-based structures exchange spatial complexity O(n) for amortized constant time.",
                "explanation": "Requires formal algorithmic reasoning, recurrence analysis, and space-time trade-off evaluation.",
                "keywords": ["recurrence", "master theorem", "asymptotic", "spatial complexity"],
                "marks": 10.0,
            },
        }
    ],
    "PYPROG": [
        {
            "mcq": {
                "title": "Python Language Mechanics: {topic}",
                "content": "Which internal Python mechanism governs execution behavior and memory allocation for '{topic}'?",
                "options": ["Reference counting and cyclic GC", "Direct stack unwinding", "Compile-time symbol resolution", "Static struct embedding"],
                "correct_answer": "Reference counting and cyclic GC",
                "explanation": "CPython uses reference counting supplemented by a cyclic garbage collector to reclaim heap allocated PyObjects.",
                "keywords": ["cpython", "memory", "gc", "reference counting"],
                "marks": 2.0,
            },
            "short_answer": {
                "title": "Idiomatic Application of {topic}",
                "content": "Explain how '{topic}' is idiomatically implemented in Python using standard library or dunder methods.",
                "model_answer": "'{topic}' utilizes Python special methods (dunder protocols) and generators or descriptors to present an ergonomic, clean interface adhering to PEP 8 standards.",
                "explanation": "Evaluates practical pythonic design patterns and interpreter protocol familiarity.",
                "keywords": ["dunder", "protocols", "pep 8", "idiomatic"],
                "marks": 5.0,
            },
            "descriptive": {
                "title": "Design & Architecture using {topic}",
                "content": "Design a production-grade module demonstrating '{topic}'. Discuss exception safety, concurrency caveats with the GIL, and memory overhead in large-scale data processing.",
                "model_answer": "Implementation must ensure thread-safety given GIL switching on bytecode boundaries. Utilizing slots, context managers, and generator streams ensures bounded memory footprint and robust resource disposal under uncaught exceptions.",
                "explanation": "Comprehensive test of production Python engineering, GIL behavior, and memory optimization.",
                "keywords": ["gil", "thread-safety", "context manager", "slots"],
                "marks": 10.0,
            },
        }
    ],
    "DEFAULT": [
        {
            "mcq": {
                "title": "Core Foundations: {topic}",
                "content": "Which fundamental principle directly underpins effective implementation of '{topic}'?",
                "options": ["Modular abstraction and separation of concerns", "Hard-coded memory offsets", "Monolithic single-tier bundling", "Unchecked state mutation"],
                "correct_answer": "Modular abstraction and separation of concerns",
                "explanation": "Separation of concerns ensures decoupled, maintainable, and verifiable engineering architectures.",
                "keywords": ["abstraction", "modularity", "architecture"],
                "marks": 2.0,
            },
            "short_answer": {
                "title": "Operational Overview: {topic}",
                "content": "Define '{topic}' and summarize two key engineering advantages it delivers in practical systems.",
                "model_answer": "'{topic}' provides a systematic framework that eliminates ambiguous state transitions, improves testability, and guarantees predictable operational outputs across variable workloads.",
                "explanation": "Evaluates concise conceptual definition and practical engineering utility.",
                "keywords": ["framework", "predictability", "engineering"],
                "marks": 5.0,
            },
            "descriptive": {
                "title": "Comprehensive Technical Assessment: {topic}",
                "content": "Examine the technical mechanisms of '{topic}'. Detail the operational workflow, edge conditions, failure recovery, and architectural best practices.",
                "model_answer": "A rigorous deployment of '{topic}' requires formal requirement mapping, defensive boundary validation, deterministic error handling, and end-to-end monitoring to prevent silent failure propagation.",
                "explanation": "Assesses thorough technical analysis and system design expertise.",
                "keywords": ["architecture", "edge cases", "recovery", "best practices"],
                "marks": 10.0,
            },
        }
    ],
}


@router.post("/generate-questions", response_model=AIGenerateResponse)
def generate_questions(
    payload: AIGenerateRequest,
    user: User = Depends(require_roles(UserRole.admin, UserRole.faculty)),
    db: Session = Depends(get_db),
):
    subject = db.get(Subject, payload.subject_id)
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    code_key = subject.code.upper()
    templates = KNOWLEDGE_TEMPLATES.get(code_key, KNOWLEDGE_TEMPLATES["DEFAULT"])
    q_type_str = payload.question_type.value

    generated_items: list[AIGeneratedQuestionItem] = []
    topic_cleaned = payload.topic.strip()

    difficulty_marks_map = {
        ("mcq", "easy"): 1.0,
        ("mcq", "medium"): 2.0,
        ("mcq", "hard"): 3.0,
        ("short_answer", "easy"): 3.0,
        ("short_answer", "medium"): 5.0,
        ("short_answer", "hard"): 7.0,
        ("descriptive", "easy"): 8.0,
        ("descriptive", "medium"): 10.0,
        ("descriptive", "hard"): 15.0,
    }

    base_marks = difficulty_marks_map.get((q_type_str, payload.difficulty), 5.0)

    # Sub-topics / angle variations for bulk generation
    variation_angles = [
        "Fundamental Concepts & Syntax",
        "Performance Optimization & Latency",
        "Edge Cases & Boundary Conditions",
        "Fault Tolerance & Error Recovery",
        "Concurrency & State Synchronization",
        "Architectural Trade-offs & Scalability",
        "Security Safeguards & Access Control",
        "Integration & Protocol Compatibility",
        "Memory Footprint & Resource Lifecycle",
        "Verification, Invariants & Unit Testing",
    ]

    for i in range(payload.count):
        angle = variation_angles[i % len(variation_angles)]
        tmpl_group = templates[i % len(templates)]
        tmpl = tmpl_group.get(q_type_str, tmpl_group.get("short_answer", {}))

        title_rendered = f"{topic_cleaned} - {angle}"
        content_rendered = (
            tmpl.get("content", f"Explain {topic_cleaned} with respect to {angle}.")
            .replace("{topic}", f"{topic_cleaned} ({angle})")
        )
        options_rendered = tmpl.get("options")
        correct_rendered = tmpl.get("correct_answer")
        model_rendered = (
            tmpl.get("model_answer", "")
            .replace("{topic}", f"{topic_cleaned} with respect to {angle}")
            if tmpl.get("model_answer")
            else None
        )
        explanation_rendered = tmpl.get("explanation", f"Detailed reference explanation for {topic_cleaned} focusing on {angle}.")
        keywords = list(set((tmpl.get("keywords") or []) + [topic_cleaned.lower(), angle.lower().split()[0]]))

        item = AIGeneratedQuestionItem(
            title=title_rendered,
            content=content_rendered,
            type=payload.question_type,
            options=options_rendered,
            correct_answer=correct_rendered,
            model_answer=model_rendered,
            keywords=keywords,
            explanation=explanation_rendered,
            marks=base_marks,
            difficulty=payload.difficulty,
            tags=[subject.code.lower(), topic_cleaned.lower().replace(" ", "-")],
        )
        generated_items.append(item)

    return AIGenerateResponse(
        subject_id=subject.id,
        subject_name=subject.name,
        topic=topic_cleaned,
        questions=generated_items,
    )

