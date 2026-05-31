from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints import auth
from app.api.v1.endpoints.admin import classes, dashboard as admin_dashboard
from app.api.v1.endpoints.admin import sections, student_assignments, teacher_assignments, users
from app.api.v1.endpoints.teacher import dashboard as teacher_dashboard
from app.api.v1.endpoints.teacher import lessons as teacher_lessons
from app.api.v1.endpoints.teacher import sections as teacher_sections
from app.api.v1.endpoints.student import dashboard as student_dashboard
from app.api.v1.endpoints.student import lessons as student_lessons
from app.api.v1.endpoints.student import sessions as student_sessions
from app.api.v1.endpoints.student import tts as student_tts

api_router = APIRouter()

# Auth
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])

# Admin
api_router.include_router(classes.router,              prefix="/admin/classes",                    tags=["Admin — Classes"])
api_router.include_router(sections.router,             prefix="/admin/sections",                   tags=["Admin — Sections"])
api_router.include_router(users.router,                prefix="/admin/users",                      tags=["Admin — Users"])
api_router.include_router(teacher_assignments.router,  prefix="/admin/assignments/teachers",       tags=["Admin — Teacher Assignments"])
api_router.include_router(student_assignments.router,  prefix="/admin/assignments/students",       tags=["Admin — Student Assignments"])
api_router.include_router(admin_dashboard.router,      prefix="/admin/dashboard",                  tags=["Admin — Dashboard"])

# Teacher
api_router.include_router(teacher_sections.router,     prefix="/teacher/sections",                 tags=["Teacher — Sections"])
api_router.include_router(teacher_lessons.router,      prefix="/teacher/sections",                 tags=["Teacher — Lessons"])
api_router.include_router(teacher_dashboard.router,    prefix="/teacher/sections",                 tags=["Teacher — Dashboard"])

# Student
api_router.include_router(student_lessons.router,      prefix="/student/lessons",                  tags=["Student — Lessons"])
api_router.include_router(student_sessions.router,     prefix="/student",                          tags=["Student — Sessions"])
api_router.include_router(student_tts.router,          prefix="/student",                          tags=["Student — TTS"])
api_router.include_router(student_dashboard.router,    prefix="/student",                          tags=["Student — Dashboard"])
