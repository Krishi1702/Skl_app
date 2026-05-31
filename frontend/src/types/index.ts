export type UserRole = "admin" | "teacher" | "student";
export type Language = "english" | "tamil";
export type SessionStatus = "in_progress" | "completed" | "abandoned";
export type AssessmentStatus = "pending" | "processing" | "completed" | "failed";
export type CompletionStatus = "not_started" | "in_progress" | "completed";

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface SchoolClass {
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
}

export interface Lesson {
  id: string;
  section_id: string;
  uploaded_by: string;
  uploaded_by_name: string;
  title: string;
  description: string | null;
  language: Language;
  pdf_extraction_status: "pending" | "success" | "failed";
  display_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface LessonWithProgress extends Lesson {
  my_best_score: number | null;
  my_attempt_count: number;
  completion_status: CompletionStatus;
}

export interface ReadingSession {
  id: string;
  student_id: string;
  lesson_id: string;
  lesson_title: string;
  attempt_number: number;
  status: SessionStatus;
  language: Language;
  assessment_status: AssessmentStatus;
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
  summary_text: string;
  assessed_at: string;
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

export interface StreakInfo {
  current_streak: number;
  longest_streak: number;
  last_session_date: string | null;
}
