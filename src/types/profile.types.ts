/**
 * Profile and academic related type definitions
 */

export interface University {
  name: string;
  domain: string;
  country: string;
}

export interface Course {
  university_course_id: string;
  course_code: string;
  course_name: string;
  units: number;
  description: string;
  prerequisites: string[];
  difficulty_level: string;
  required_for_majors: string[];
}

export interface StudentProfile {
  firstName: string;
  lastName: string;
  email: string;
  studentId: string;
  university: University | null;
  college: string;
  major: string;
  concentration: string;
  minor: string;
  academicYear: string;
  expectedGraduation: string;
  gpa: number;
  totalCredits: number;
  currentSemesterCredits: number;
  careerGoals: string[];
  learningStyle: string;
  academicInterests: string[];
  advisorName: string;
  advisorEmail: string;
  advisorNotes: string;
  completedCourses: string[];
  currentCourses: string[];
  plannedCourses: string[];
}

export interface DegreeProgress {
  totalRequired: number;
  completed: number;
  inProgress: number;
  remaining: number;
  percentComplete: number;
}