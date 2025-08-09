// Re-export all types from specific type files
export * from './auth.types';
export * from './profile.types';
export * from './schedule.types';

// Dashboard and Widget types
export interface Widget {
  id: string;
  title: string;
  content: string;
  priority: boolean;
  type: 'academic' | 'social' | 'study' | 'decision' | 'ai';
}

// Study group types
export interface StudyGroup {
  id: string;
  name: string;
  course: string;
  members: User[];
  schedule: {
    startTime: Date;
    endTime: Date;
    location: string;
  };
  resources: {
    id: string;
    name: string;
    type: 'document' | 'link' | 'note';
    url: string;
  }[];
}

// User type for general app usage (different from AuthUser)
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  academicStatus: {
    gpa: number;
    major: string;
    year: number;
  };
}

// Goal tracking types
export interface Goal {
  id: string;
  title: string;
  description: string;
  category: 'academic' | 'social' | 'personal' | 'career';
  deadline: Date;
  status: 'not_started' | 'in_progress' | 'completed';
  milestones: {
    id: string;
    title: string;
    completed: boolean;
    dueDate: Date;
  }[];
}

// UI state types
export interface CursorState {
  type: 'default' | 'hover' | 'active' | 'drag';
  position: {
    x: number;
    y: number;
  };
  isVisible: boolean;
} 