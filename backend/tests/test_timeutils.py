from datetime import datetime, timezone

from app.schemas import ExamCreate
from app.timeutils import as_utc


def test_naive_sqlite_timestamps_are_interpreted_as_utc():
    timestamp = datetime(2026, 10, 27, 12, 0)

    assert as_utc(timestamp) == datetime(2026, 10, 27, 12, 0, tzinfo=timezone.utc)


def test_exam_payload_normalizes_naive_schedule_times():
    exam = ExamCreate(
        title="Test examination",
        start_time=datetime(2026, 10, 27, 12, 0),
        end_time=datetime(2026, 10, 27, 13, 0),
        duration_minutes=60,
        question_ids=[1],
    )

    assert exam.start_time.tzinfo == timezone.utc
    assert exam.end_time.tzinfo == timezone.utc


def test_exam_payload_accepts_and_normalizes_offset_times():
    exam = ExamCreate(
        title="Test examination",
        start_time="2026-10-27T17:30:00+05:30",
        end_time="2026-10-27T18:30:00+05:30",
        duration_minutes=60,
        question_ids=[1],
    )

    assert exam.start_time == datetime(2026, 10, 27, 12, 0, tzinfo=timezone.utc)
    assert exam.end_time == datetime(2026, 10, 27, 13, 0, tzinfo=timezone.utc)
