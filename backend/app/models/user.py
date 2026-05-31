from __future__ import annotations

import enum
import uuid

from sqlalchemy import Boolean, Enum, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class UserRole(str, enum.Enum):
    admin = "admin"
    teacher = "teacher"
    student = "student"


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(72), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole, name="userrole"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    teacher_assignments: Mapped[list[TeacherSectionAssignment]] = relationship(
        "TeacherSectionAssignment",
        back_populates="teacher",
        foreign_keys="TeacherSectionAssignment.teacher_id",
    )
    student_assignments: Mapped[list[StudentSectionAssignment]] = relationship(
        "StudentSectionAssignment",
        back_populates="student",
        foreign_keys="StudentSectionAssignment.student_id",
    )
    uploaded_lessons: Mapped[list[Lesson]] = relationship(
        "Lesson", back_populates="uploaded_by_user"
    )
    reading_sessions: Mapped[list[ReadingSession]] = relationship(
        "ReadingSession", back_populates="student"
    )
    skill_profile: Mapped[StudentSkillProfile | None] = relationship(
        "StudentSkillProfile", back_populates="student", uselist=False
    )
    streak: Mapped[Streak | None] = relationship(
        "Streak", back_populates="student", uselist=False
    )
    weekly_leaderboard_entries: Mapped[list[WeeklyLeaderboard]] = relationship(
        "WeeklyLeaderboard", back_populates="student"
    )
