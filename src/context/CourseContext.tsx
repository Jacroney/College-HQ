import React, { createContext, useContext, useReducer, ReactNode } from 'react';

interface Course {
  id: string;
  code: string;
  name: string;
  units: number;
  term: string;
  status: 'planned' | 'in-progress' | 'completed';
}

interface CourseState {
  courses: Course[];
}

type CourseAction =
  | { type: 'ADD_COURSE'; payload: Course }
  | { type: 'DELETE_COURSE'; payload: string }
  | { type: 'UPDATE_COURSE_STATUS'; payload: { id: string; status: Course['status'] } }
  | { type: 'SET_COURSES'; payload: Course[] };

const initialState: CourseState = {
  courses: [],
};

const CourseContext = createContext<{
  state: CourseState;
  dispatch: React.Dispatch<CourseAction>;
} | undefined>(undefined);

const courseReducer = (state: CourseState, action: CourseAction): CourseState => {
  switch (action.type) {
    case 'ADD_COURSE':
      return {
        ...state,
        courses: [...state.courses, action.payload],
      };
    case 'DELETE_COURSE':
      return {
        ...state,
        courses: state.courses.filter(course => course.id !== action.payload),
      };
    case 'UPDATE_COURSE_STATUS':
      return {
        ...state,
        courses: state.courses.map(course =>
          course.id === action.payload.id
            ? { ...course, status: action.payload.status }
            : course
        ),
      };
    case 'SET_COURSES':
      return {
        ...state,
        courses: action.payload,
      };
    default:
      return state;
  }
};

export const CourseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(courseReducer, initialState);

  return (
    <CourseContext.Provider value={{ state, dispatch }}>
      {children}
    </CourseContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCourseContext = () => {
  const context = useContext(CourseContext);
  if (context === undefined) {
    throw new Error('useCourseContext must be used within a CourseProvider');
  }
  return context;
}; 