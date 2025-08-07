import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';

// Import types from Profile component
export interface University {
  name: string;
  domain: string;
  country: string;
  academicCalendar?: UniversityCalendarData;
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

export interface UniversityCalendarData {
  semesterSystem: 'semester' | 'quarter' | 'trimester';
  academicYear: {
    start: Date;
    end: Date;
  };
  semesters: Semester[];
  holidays: Holiday[];
  importantDates: ImportantDate[];
}

export interface Semester {
  id: string;
  name: string;
  type: 'fall' | 'spring' | 'summer' | 'winter';
  startDate: Date;
  endDate: Date;
  registrationStart: Date;
  registrationEnd: Date;
  dropDeadline: Date;
  withdrawalDeadline: Date;
  finalsWeekStart: Date;
  finalsWeekEnd: Date;
  gradeDueDate: Date;
}

export interface Holiday {
  id: string;
  name: string;
  date: Date;
  endDate?: Date;
  type: 'federal' | 'university' | 'academic';
  description?: string;
}

export interface ImportantDate {
  id: string;
  title: string;
  date: Date;
  endDate?: Date;
  type: 'registration' | 'deadline' | 'exam' | 'orientation' | 'graduation' | 'other';
  description?: string;
  location?: string;
  isRequired?: boolean;
}

interface ProfileState {
  profile: StudentProfile | null;
  isLoading: boolean;
  error: string | null;
}

type ProfileAction =
  | { type: 'SET_PROFILE'; payload: StudentProfile }
  | { type: 'UPDATE_PROFILE'; payload: Partial<StudentProfile> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_PROFILE' };

const initialState: ProfileState = {
  profile: null,
  isLoading: false,
  error: null,
};

const ProfileContext = createContext<{
  state: ProfileState;
  dispatch: React.Dispatch<ProfileAction>;
  updateProfile: (updates: Partial<StudentProfile>) => void;
  getUniversityCalendar: () => UniversityCalendarData | null;
} | undefined>(undefined);

const profileReducer = (state: ProfileState, action: ProfileAction): ProfileState => {
  switch (action.type) {
    case 'SET_PROFILE':
      return {
        ...state,
        profile: action.payload,
        error: null,
      };
    case 'UPDATE_PROFILE':
      return {
        ...state,
        profile: state.profile ? { ...state.profile, ...action.payload } : null,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    case 'CLEAR_PROFILE':
      return initialState;
    default:
      return state;
  }
};

// Sample university calendar data for different universities
const getUniversityCalendarData = (universityName: string): UniversityCalendarData => {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  // Default academic calendar structure
  const defaultCalendar: UniversityCalendarData = {
    semesterSystem: 'semester',
    academicYear: {
      start: new Date(currentYear, 7, 15), // August 15
      end: new Date(nextYear, 4, 15), // May 15
    },
    semesters: [
      {
        id: 'fall-2024',
        name: 'Fall 2024',
        type: 'fall',
        startDate: new Date(currentYear, 7, 26), // August 26
        endDate: new Date(currentYear, 11, 15), // December 15
        registrationStart: new Date(currentYear, 6, 1), // July 1
        registrationEnd: new Date(currentYear, 7, 20), // August 20
        dropDeadline: new Date(currentYear, 8, 5), // September 5
        withdrawalDeadline: new Date(currentYear, 10, 1), // November 1
        finalsWeekStart: new Date(currentYear, 11, 9), // December 9
        finalsWeekEnd: new Date(currentYear, 11, 15), // December 15
        gradeDueDate: new Date(currentYear, 11, 18), // December 18
      },
      {
        id: 'spring-2025',
        name: 'Spring 2025',
        type: 'spring',
        startDate: new Date(nextYear, 0, 13), // January 13
        endDate: new Date(nextYear, 4, 5), // May 5
        registrationStart: new Date(currentYear, 10, 1), // November 1
        registrationEnd: new Date(nextYear, 0, 8), // January 8
        dropDeadline: new Date(nextYear, 0, 25), // January 25
        withdrawalDeadline: new Date(nextYear, 2, 20), // March 20
        finalsWeekStart: new Date(nextYear, 3, 28), // April 28
        finalsWeekEnd: new Date(nextYear, 4, 5), // May 5
        gradeDueDate: new Date(nextYear, 4, 8), // May 8
      },
    ],
    holidays: [
      {
        id: 'labor-day',
        name: 'Labor Day',
        date: new Date(currentYear, 8, 2), // September 2
        type: 'federal',
        description: 'Federal holiday - No classes',
      },
      {
        id: 'thanksgiving',
        name: 'Thanksgiving Break',
        date: new Date(currentYear, 10, 25), // November 25
        endDate: new Date(currentYear, 10, 29), // November 29
        type: 'university',
        description: 'Thanksgiving holiday break',
      },
      {
        id: 'winter-break',
        name: 'Winter Break',
        date: new Date(currentYear, 11, 16), // December 16
        endDate: new Date(nextYear, 0, 12), // January 12
        type: 'academic',
        description: 'Winter holiday break',
      },
      {
        id: 'spring-break',
        name: 'Spring Break',
        date: new Date(nextYear, 2, 3), // March 3
        endDate: new Date(nextYear, 2, 10), // March 10
        type: 'academic',
        description: 'Spring break week',
      },
    ],
    importantDates: [
      {
        id: 'orientation',
        title: 'New Student Orientation',
        date: new Date(currentYear, 7, 20), // August 20
        endDate: new Date(currentYear, 7, 22), // August 22
        type: 'orientation',
        description: 'Mandatory orientation for new students',
        location: 'Main Campus',
        isRequired: true,
      },
      {
        id: 'add-drop',
        title: 'Add/Drop Period Ends',
        date: new Date(currentYear, 8, 5), // September 5
        type: 'deadline',
        description: 'Last day to add or drop classes without penalty',
        isRequired: false,
      },
      {
        id: 'midterm-week',
        title: 'Midterm Examinations',
        date: new Date(currentYear, 9, 14), // October 14
        endDate: new Date(currentYear, 9, 18), // October 18
        type: 'exam',
        description: 'Midterm examination period',
        isRequired: false,
      },
      {
        id: 'graduation-app',
        title: 'Graduation Application Deadline',
        date: new Date(currentYear, 9, 1), // October 1
        type: 'deadline',
        description: 'Deadline to apply for graduation',
        isRequired: false,
      },
      {
        id: 'commencement',
        title: 'Commencement Ceremony',
        date: new Date(nextYear, 4, 12), // May 12
        type: 'graduation',
        description: 'Graduation ceremony',
        location: 'Main Stadium',
        isRequired: false,
      },
    ],
  };

  // Customize calendar based on university
  switch (universityName.toLowerCase()) {
    case 'university of california, berkeley':
    case 'uc berkeley':
      return {
        ...defaultCalendar,
        semesterSystem: 'semester',
        holidays: [
          ...defaultCalendar.holidays,
          {
            id: 'cesar-chavez-day',
            name: 'César Chávez Day',
            date: new Date(nextYear, 2, 31), // March 31
            type: 'university',
            description: 'UC system holiday',
          },
        ],
        importantDates: [
          ...defaultCalendar.importantDates,
          {
            id: 'cal-day',
            title: 'Cal Day (Open House)',
            date: new Date(nextYear, 3, 19), // April 19
            type: 'other',
            description: 'Annual open house event',
            location: 'UC Berkeley Campus',
            isRequired: false,
          },
        ],
      };

    case 'stanford university':
      return {
        ...defaultCalendar,
        semesterSystem: 'quarter',
        semesters: [
          {
            id: 'autumn-2024',
            name: 'Autumn Quarter 2024',
            type: 'fall',
            startDate: new Date(currentYear, 8, 23), // September 23
            endDate: new Date(currentYear, 11, 6), // December 6
            registrationStart: new Date(currentYear, 7, 15),
            registrationEnd: new Date(currentYear, 8, 20),
            dropDeadline: new Date(currentYear, 9, 7),
            withdrawalDeadline: new Date(currentYear, 10, 15),
            finalsWeekStart: new Date(currentYear, 11, 2),
            finalsWeekEnd: new Date(currentYear, 11, 6),
            gradeDueDate: new Date(currentYear, 11, 10),
          },
          {
            id: 'winter-2025',
            name: 'Winter Quarter 2025',
            type: 'winter',
            startDate: new Date(nextYear, 0, 6), // January 6
            endDate: new Date(nextYear, 2, 14), // March 14
            registrationStart: new Date(currentYear, 11, 1),
            registrationEnd: new Date(nextYear, 0, 3),
            dropDeadline: new Date(nextYear, 0, 20),
            withdrawalDeadline: new Date(nextYear, 1, 21),
            finalsWeekStart: new Date(nextYear, 2, 10),
            finalsWeekEnd: new Date(nextYear, 2, 14),
            gradeDueDate: new Date(nextYear, 2, 18),
          },
        ],
      };

    case 'massachusetts institute of technology':
    case 'mit':
      return {
        ...defaultCalendar,
        holidays: [
          ...defaultCalendar.holidays,
          {
            id: 'patriots-day',
            name: "Patriots' Day",
            date: new Date(nextYear, 3, 21), // April 21
            type: 'university',
            description: 'Massachusetts state holiday',
          },
        ],
        importantDates: [
          ...defaultCalendar.importantDates,
          {
            id: 'cpw',
            title: 'Campus Preview Weekend',
            date: new Date(nextYear, 3, 10), // April 10
            endDate: new Date(nextYear, 3, 13), // April 13
            type: 'other',
            description: 'Admitted students preview weekend',
            location: 'MIT Campus',
            isRequired: false,
          },
        ],
      };

    case 'california polytechnic state university':
    case 'cal poly':
    case 'cal poly san luis obispo':
    case 'california polytechnic state university, san luis obispo':
      return {
        ...defaultCalendar,
        semesterSystem: 'quarter',
        semesters: [
          {
            id: 'fall-2024',
            name: 'Fall Quarter 2024',
            type: 'fall',
            startDate: new Date(currentYear, 8, 19), // September 19
            endDate: new Date(currentYear, 11, 6), // December 6
            registrationStart: new Date(currentYear, 6, 15), // July 15
            registrationEnd: new Date(currentYear, 8, 16), // September 16
            dropDeadline: new Date(currentYear, 8, 30), // September 30
            withdrawalDeadline: new Date(currentYear, 10, 8), // November 8
            finalsWeekStart: new Date(currentYear, 11, 2), // December 2
            finalsWeekEnd: new Date(currentYear, 11, 6), // December 6
            gradeDueDate: new Date(currentYear, 11, 10), // December 10
          },
          {
            id: 'winter-2025',
            name: 'Winter Quarter 2025',
            type: 'winter',
            startDate: new Date(nextYear, 0, 6), // January 6
            endDate: new Date(nextYear, 2, 14), // March 14
            registrationStart: new Date(currentYear, 11, 1), // December 1
            registrationEnd: new Date(nextYear, 0, 3), // January 3
            dropDeadline: new Date(nextYear, 0, 17), // January 17
            withdrawalDeadline: new Date(nextYear, 1, 21), // February 21
            finalsWeekStart: new Date(nextYear, 2, 10), // March 10
            finalsWeekEnd: new Date(nextYear, 2, 14), // March 14
            gradeDueDate: new Date(nextYear, 2, 18), // March 18
          },
          {
            id: 'spring-2025',
            name: 'Spring Quarter 2025',
            type: 'spring',
            startDate: new Date(nextYear, 2, 31), // March 31
            endDate: new Date(nextYear, 5, 6), // June 6
            registrationStart: new Date(nextYear, 2, 1), // March 1
            registrationEnd: new Date(nextYear, 2, 28), // March 28
            dropDeadline: new Date(nextYear, 3, 11), // April 11
            withdrawalDeadline: new Date(nextYear, 4, 16), // May 16
            finalsWeekStart: new Date(nextYear, 5, 2), // June 2
            finalsWeekEnd: new Date(nextYear, 5, 6), // June 6
            gradeDueDate: new Date(nextYear, 5, 10), // June 10
          },
        ],
        holidays: [
          ...defaultCalendar.holidays,
          {
            id: 'veterans-day',
            name: 'Veterans Day',
            date: new Date(currentYear, 10, 11), // November 11
            type: 'federal',
            description: 'Federal holiday - No classes',
          },
          {
            id: 'cal-poly-holiday',
            name: 'Cal Poly Holiday',
            date: new Date(currentYear, 11, 23), // December 23
            endDate: new Date(nextYear, 0, 5), // January 5
            type: 'university',
            description: 'Extended winter break',
          },
          {
            id: 'presidents-day',
            name: "Presidents' Day",
            date: new Date(nextYear, 1, 17), // February 17
            type: 'federal',
            description: 'Federal holiday - No classes',
          },
        ],
        importantDates: [
          ...defaultCalendar.importantDates,
          {
            id: 'poly-royal',
            title: 'Poly Royal Weekend',
            date: new Date(nextYear, 3, 11), // April 11
            endDate: new Date(nextYear, 3, 13), // April 13
            type: 'other',
            description: 'Annual open house and celebration',
            location: 'Cal Poly Campus',
            isRequired: false,
          },
          {
            id: 'week-of-welcome',
            title: 'Week of Welcome (WOW)',
            date: new Date(currentYear, 8, 12), // September 12
            endDate: new Date(currentYear, 8, 18), // September 18
            type: 'orientation',
            description: 'New student orientation week',
            location: 'Cal Poly Campus',
            isRequired: true,
          },
          {
            id: 'career-fair-fall',
            title: 'Fall Career Fair',
            date: new Date(currentYear, 9, 15), // October 15
            endDate: new Date(currentYear, 9, 16), // October 16
            type: 'other',
            description: 'Engineering and business career fair',
            location: 'Recreation Center',
            isRequired: false,
          },
          {
            id: 'career-fair-spring',
            title: 'Spring Career Fair',
            date: new Date(nextYear, 1, 20), // February 20
            endDate: new Date(nextYear, 1, 21), // February 21
            type: 'other',
            description: 'All majors career fair',
            location: 'Recreation Center',
            isRequired: false,
          },
        ],
      };

    default:
      return defaultCalendar;
  }
};

export const ProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(profileReducer, initialState);

  // Load profile from localStorage on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('studentProfile');
    if (savedProfile) {
      try {
        const profile = JSON.parse(savedProfile);
        // Convert date strings back to Date objects if needed
        dispatch({ type: 'SET_PROFILE', payload: profile });
      } catch (error) {
        console.error('Error loading profile:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load profile' });
      }
    }
  }, []);

  // Save profile to localStorage whenever it changes
  useEffect(() => {
    if (state.profile) {
      localStorage.setItem('studentProfile', JSON.stringify(state.profile));
    }
  }, [state.profile]);

  const updateProfile = (updates: Partial<StudentProfile>) => {
    dispatch({ type: 'UPDATE_PROFILE', payload: updates });
  };

  const getUniversityCalendar = (): UniversityCalendarData | null => {
    if (!state.profile?.university) {
      return null;
    }
    
    return getUniversityCalendarData(state.profile.university.name);
  };

  return (
    <ProfileContext.Provider 
      value={{ 
        state, 
        dispatch, 
        updateProfile, 
        getUniversityCalendar 
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useProfileContext = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfileContext must be used within a ProfileProvider');
  }
  return context;
};