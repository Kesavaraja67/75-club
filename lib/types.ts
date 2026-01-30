export type SubjectType = 'Theory' | 'Practical' | 'Clinical' | 'Lab';

export interface Subject {
  id: string;
  name: string;
  code?: string;
  type: SubjectType;
  totalHours: number;
  hoursPresent: number;
  threshold: number; // e.g., 75
  // Calculated fields (optional in DB, but used in UI)
  attendancePercentage?: number;
  bunkLimit?: number;
  requiredAttendance?: number;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  university?: string;
  programType?: string;
  isPro?: boolean;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  date: string; // ISO string from DB
  title: string;
  description: string;
  type: 'holiday' | 'exam' | 'assignment' | 'personal' | 'important';
  is_class_off: boolean;
}

