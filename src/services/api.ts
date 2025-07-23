import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { fetchAuthSession, signOut } from 'aws-amplify/auth';

// Get the current user's ID token from Cognito
const getAuthToken = async () => {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() || null;
  } catch (error) {
    console.error('Error fetching auth token:', error);
    return null;
  }
};

const clearAuthToken = async () => {
  try {
    await signOut();
  } catch (error) {
    console.error('Error clearing auth session:', error);
  }
};

// Use your actual AWS API Gateway URL
const API_URL = import.meta.env.VITE_API_URL || 'https://lm8ngppg22.execute-api.us-east-1.amazonaws.com/dev';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getAuthToken();
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    
    // Handle 401 Unauthorized responses
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Cognito automatically refreshes tokens when calling fetchAuthSession
        const token = await getAuthToken();
        
        if (token) {
          // Retry the original request with the refreshed token
          if (originalRequest.headers) {
            originalRequest.headers.set('Authorization', `Bearer ${token}`);
          }
          return api(originalRequest);
        } else {
          // No valid session, clear auth and redirect to login
          await clearAuthToken();
          window.location.href = '/';
          return Promise.reject(new Error('Authentication required'));
        }
      } catch (refreshError) {
        // Failed to refresh token, clear auth and redirect
        await clearAuthToken();
        window.location.href = '/';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  description: string;
  credits: number;
  department: string;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  type: 'class' | 'study' | 'personal' | 'other';
  location?: string;
  courseId?: string;
}

// Auth API - These endpoints should be implemented in your API Gateway/Lambda
export const authApi = {
  // Get user profile from your backend (using Cognito ID token for auth)
  getProfile: () => api.get<User>('/api/users/me'),
  updateProfile: (userData: Partial<User>) => api.put<User>('/api/users/me', userData),
  // Create user profile in backend after Cognito signup
  createProfile: (userData: { email: string; name: string }) => 
    api.post<User>('/api/users/profile', userData),
};

// Courses API
export const coursesApi = {
  getAll: () => api.get<Course[]>('/api/courses'),
  getById: (id: string) => api.get<Course>(`/api/courses/${id}`),
  create: (courseData: Omit<Course, 'id'>) => api.post<Course>('/api/courses', courseData),
  update: (id: string, courseData: Partial<Course>) => api.put<Course>(`/api/courses/${id}`, courseData),
  delete: (id: string) => api.delete(`/api/courses/${id}`),
};

// Calendar/Events API
export const eventsApi = {
  getAll: () => api.get<Event[]>('/api/events'),
  getByDateRange: (start: string, end: string) =>
    api.get<Event[]>('/api/events', { params: { start, end } }),
  create: (eventData: Omit<Event, 'id'>) => api.post<Event>('/api/events', eventData),
  update: (id: string, eventData: Partial<Event>) => api.put<Event>(`/api/events/${id}`, eventData),
  delete: (id: string) => api.delete(`/api/events/${id}`),
};

// Study Tools API
export const studyToolsApi = {
  getStudySessions: () => api.get('/api/study/sessions'),
  createStudySession: (data: { duration: number; subject: string }) =>
    api.post('/api/study/sessions', data),
  getResources: (subject?: string) =>
    api.get('/api/study/resources', subject ? { params: { subject } } : undefined),
};

// Dashboard API - for AWS backend integration
export const dashboardApi = {
  getAcademicOverview: () => api.get('/api/dashboard/academic'),
  getUpcomingAssignments: () => api.get('/api/dashboard/assignments'),
  getTodaysSchedule: () => api.get('/api/dashboard/schedule'),
  getStudyInsights: () => api.get('/api/dashboard/study-insights'),
  getCareerGoals: () => api.get('/api/dashboard/career-goals'),
};

// College planning API
export const planningApi = {
  getDegreeRequirements: () => api.get('/api/planning/degree-requirements'),
  getCourseCatalog: () => api.get('/api/planning/course-catalog'),
  checkPrerequisites: (courseId: string) => api.get(`/api/planning/prerequisites/${courseId}`),
  getGraduationPlan: () => api.get('/api/planning/graduation-plan'),
  saveGraduationPlan: (plan: object) => api.post('/api/planning/graduation-plan', plan),
};

export default api;
