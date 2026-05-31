from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


class Section(TimestampMixin, Base):
    __tablename__ = "sections"
    __table_args__ = (UniqueConstraint("class_id", "name", name="uq_section_class_name"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    class_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("classes.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    school_class: Mapped[SchoolClass] = relationship("SchoolClass", back_populates="sections")
    teacher_assignments: Mapped[list[TeacherSectionAssignment]] = relationship(
        "TeacherSectionAssignment", back_populates="section"
    )
    student_assignments: Mapped[list[StudentSectionAssignment]] = relationship(
        "StudentSectionAssignment", back_populates="section"
    )
    lessons: Mapped[list[Lesson]] = relationship("Lesson", back_populates="section")
    weekly_leaderboard_entries: Mapped[list[WeeklyLeaderboard]] = relationship(
        "WeeklyLeaderboard", back_populates="section"
    )
