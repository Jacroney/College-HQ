export interface Widget {
  id: string;
  title: string;
  content: string;
  priority: boolean;
  type: 'academic' | 'social' | 'study' | 'decision' | 'ai';
}

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

export interface Event {
  id: string;
  title: string;
  description: string;
  type: 'social' | 'academic' | 'study';
  startTime: Date;
  endTime: Date;
  location: string;
  attendees: User[];
  capacity: number;
  resources?: {
    id: string;
    name: string;
    type: 'item' | 'service';
    quantity: number;
  }[];
}

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

export interface CursorState {
  type: 'default' | 'hover' | 'active' | 'drag';
  position: {
    x: number;
    y: number;
  };
  isVisible: boolean;
} 