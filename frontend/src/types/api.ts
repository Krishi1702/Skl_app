export interface Pagination {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any> | null;
}

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "teacher" | "student";
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: UserProfile;
}

export interface Class {
  id: string;
  name: string;
  is_active: boolean;
  section_count: number;
  created_at: string;
}

export interface Section {
  id: string;
  class_id: string;
  class_name: string;
  name: string;
  is_active: boolean;
  student_count: number;
  teacher_count: number;
  created_at: string;
  lesson_count?: number; // teacher portal adds this
}

export interface AdminUserView {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "teacher" | "student";
  is_active: boolean;
  created_at: string;
  assigned_section?: { section_id: string; section_name: string; class_name: string } | null;
  assigned_sections?: Array<{ section_id: string; section_name: string; class_name: string }> | null;
}

export interface TeacherAssignment {
  id: string;
  teacher_id: string;
  teacher_name: string;
  teacher_email: string;
  section_id: string;
  section_name: string;
  class_name: string;
  assigned_by_name?: string;
  is_active: boolean;
  assigned_at: string;
  unassigned_at: string | null;
}

export interface StudentAssignment {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  section_id: string;
  section_name: string;
  class_name: string;
  assigned_by_name?: string;
  is_active: boolean;
  assigned_at: string;
  unassigned_at: string | null;
}

export interface AdminDashboard {
  summary: {
    total_classes: number;
    total_sections: number;
    total_teachers: number;
    total_students: number;
    unassigned_teachers: number;
    unassigned_students: number;
  };
  weekly_activity: {
    lessons_uploaded: number;
    reading_sessions_completed: number;
    active_students: number;
  };
  unassigned_users: Array<{
    id: string;
    full_name: string;
    email: string;
    role: string;
    created_at: string;
  }>;
}

export interface Lesson {
  id: string;
  section_id: string;
  uploaded_by_id: string;
  uploaded_by_name: string;
  title: string;
  description: string | null;
  language: "english" | "tamil";
  pdf_extraction_status: "pending" | "success" | "failed";
  display_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface LessonWithStats extends Lesson {
  attempt_count: number;
  avg_score: number | null;
}

export interface LessonWithStudentProgress extends Lesson {
  my_best_score: number | null;
  my_attempt_count: number;
  completion_status: "not_started" | "in_progress" | "completed";
}

export interface TeacherSectionDashboard {
  section: { id: string; name: string; class_name: string };
  summary: {
    total_students: number;
    active_students_last_7_days: number;
    avg_overall_score: number | null;
    avg_overall_score_prev_week: number | null;
    avg_accuracy_score: number | null;
    avg_fluency_score: number | null;
    total_sessions_this_week: number;
    lessons_published: number;
  };
  top_leaderboard: LeaderboardEntry[];
}

export interface StudentProgressRow {
  student_id: string;
  student_name: string;
  lessons_completed: number;
  total_sessions: number;
  avg_overall_score: number | null;
  avg_accuracy_score: number | null;
  avg_fluency_score: number | null;
  current_streak: number;
  last_session_date: string | null;
  current_rank: number | null;
}

export interface SkillTrend {
  date: string;
  accuracy_score: number;
  fluency_score: number;
  pronunciation_score: number;
  overall_score: number;
}

export interface StudentSkillProfile {
  avg_accuracy_score: number;
  avg_fluency_score: number;
  avg_pronunciation_score: number;
  avg_overall_score: number;
  strength_tags: string[];
  weakness_tags: string[];
}

export interface StudentProgressDetail {
  student: { id: string; full_name: string; email: string };
  skill_profile: StudentSkillProfile;
  skill_trend: SkillTrend[];
  session_history: Array<{
    session_id: string;
    lesson_id: string;
    lesson_title: string;
    attempt_number: number;
    overall_score: number | null;
    accuracy_score: number | null;
    fluency_score: number | null;
    pronunciation_score: number | null;
    duration_seconds: number | null;
    completed_at: string;
  }>;
}

export interface LeaderboardEntry {
  rank: number;
  student_id: string;
  student_name: string;
  composite_score: number;
  sessions_completed: number;
  avg_overall_score: number;
  is_current_user: boolean;
}

export interface WeeklyLeaderboard {
  section_name: string;
  week_start: string;
  week_end: string;
  entries: LeaderboardEntry[];
}

export interface StudentWeeklyLeaderboard extends WeeklyLeaderboard {
  my_rank: number | null;
}

export interface ReadingSession {
  id: string;
  student_id: string;
  lesson_id: string;
  lesson_title: string;
  attempt_number: number;
  status: "in_progress" | "completed" | "abandoned";
  language: "english" | "tamil";
  assessment_status: "pending" | "processing" | "completed" | "failed";
  duration_seconds: number | null;
  started_at: string;
  completed_at: string | null;
}

export interface AssessmentResult {
  id: string;
  session_id: string;
  accuracy_score: number;
  fluency_score: number;
  pronunciation_score: number;
  overall_score: number;
  words_per_minute: number;
  pause_count: number;
  filler_word_count: number;
  mispronounced_words: string[];
  pronunciation_issues: Array<{ word: string; issue: string }>;
  grammatical_mistakes: Array<{ original: string; spoken: string; type: string }>;
  strength_tags: string[];
  weakness_tags: string[];
  summary: string;
  assessed_at: string;
}

export interface StudentDashboard {
  student: { id: string; full_name: string; section_name: string; class_name: string };
  streak: { current_streak: number; longest_streak: number; last_session_date: string | null };
  current_rank: number | null;
  progress: {
    overall_progress_percent: number;
    lessons_completed: number;
    total_lessons: number;
    total_sessions: number;
  };
  skill_profile: StudentSkillProfile;
  recent_sessions: Array<{
    session_id: string;
    lesson_id: string;
    lesson_title: string;
    overall_score: number | null;
    attempt_number: number;
    completed_at: string;
  }>;
  next_lesson: {
    lesson_id: string;
    title: string;
    language: string;
    estimated_minutes: number | null;
    my_best_score: number | null;
  } | null;
}

export interface StudentProgressResponse {
  trend: SkillTrend[];
  summary: {
    best_overall_score: number | null;
    most_improved_skill: string | null;
    most_improved_delta: number | null;
  };
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: "streak" | "sessions" | "lessons" | "score" | "skill";
  icon: string;
  earned: boolean;
  progress: number;
  target: number;
}

export interface StudentAchievements {
  total_earned: number;
  total_available: number;
  earned: Achievement[];
  locked: Achievement[];
}
