from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel


class StreakInfo(BaseModel):
    current_streak: int
    longest_streak: int
    last_session_date: date | None


class LeaderboardEntry(BaseModel):
    rank: int
    student_id: UUID
    student_name: str
    composite_score: float
    sessions_completed: int
    avg_overall_score: float
    is_current_user: bool = False


class SkillTrend(BaseModel):
    date: date
    accuracy_score: float
    fluency_score: float
    pronunciation_score: float
    overall_score: float


class SkillProfile(BaseModel):
    avg_accuracy_score: float
    avg_fluency_score: float
    avg_pronunciation_score: float
    avg_overall_score: float
    strength_tags: list[str]
    weakness_tags: list[str]


class RecentSession(BaseModel):
    session_id: UUID
    lesson_id: UUID
    lesson_title: str
    overall_score: float | None
    attempt_number: int
    completed_at: datetime


class NextLesson(BaseModel):
    lesson_id: UUID
    title: str
    language: str
    estimated_minutes: int | None = None
    my_best_score: float | None = None


class StudentDashboard(BaseModel):
    student: dict
    streak: StreakInfo
    current_rank: int | None
    progress: dict
    skill_profile: SkillProfile
    recent_sessions: list[RecentSession]
    next_lesson: NextLesson | None


class StudentProgressRow(BaseModel):
    student_id: UUID
    student_name: str
    lessons_completed: int
    total_sessions: int
    avg_overall_score: float | None
    avg_accuracy_score: float | None
    avg_fluency_score: float | None
    current_streak: int
    last_session_date: date | None
    current_rank: int | None


class TeacherSectionDashboard(BaseModel):
    section: dict
    summary: dict
    top_leaderboard: list[LeaderboardEntry]


class AdminDashboard(BaseModel):
    summary: dict
    weekly_activity: dict
    unassigned_users: list[dict]
