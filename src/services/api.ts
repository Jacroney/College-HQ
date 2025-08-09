import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { fetchAuthSession, signOut } from 'aws-amplify/auth';
import { env } from '../config/env';

// Get the current user's ID token from Cognito
const getAuthToken = async () => {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() || null;
  } catch (error) {
    // Error fetching auth token
    return null;
  }
};

const clearAuthToken = async () => {
  try {
    await signOut();
  } catch (error) {
    // Error clearing auth session
  }
};

// Use API URL from environment configuration
const API_URL = env.apiUrl;

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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

// API-specific types that differ from the main app types
export interface ApiUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface ApiCourse {
  id: string;
  code: string;
  name: string;
  description: string;
  credits: number;
  department: string;
}

export interface ApiEvent {
  id: string;
  title: string;
  description?: string;
  start: string; // ISO string from API
  end: string; // ISO string from API
  type: 'class' | 'study' | 'personal' | 'other';
  location?: string;
  courseId?: string;
}

// Profile API - Updated for new profile-service
export const profileApi = {
  // Get user profile (userId from JWT token in backend)
  getProfile: (userId: string) => api.get<{profile: ApiUser}>(`/profile/${userId}`),
  updateProfile: (userId: string, userData: Partial<ApiUser>) => 
    api.put<{profile: ApiUser}>(`/profile/${userId}`, userData),
  // Create user profile 
  createProfile: (userId: string, userData: Partial<ApiUser>) => 
    api.post<{profile: ApiUser}>(`/profile/${userId}`, userData),
  deleteProfile: (userId: string) => api.delete(`/profile/${userId}`),
};

// Courses API - Updated for new course-service
export const coursesApi = {
  // Get courses with filters
  getAll: (params?: {
    university?: string;
    major?: string; 
    department?: string;
    limit?: number;
  }) => api.get<{courses: ApiCourse[]}>('/courses', { params }),
  
  // Get specific course
  getById: (courseId: string) => api.get<ApiCourse>(`/courses/${courseId}`),
  
  // Search courses with context
  search: (searchParams: {
    university: string;
    message?: string;
    studentProfile?: any;
  }) => api.post<{courses: ApiCourse[]; degreeRequirements: any}>('/courses/search', searchParams),
  
  // Get degree requirements
  getDegreeRequirements: (majorId: string) => 
    api.get<any>(`/degree-requirements/${majorId}`),
  
  // Get course flowchart
  getFlowchart: (majorId: string, params?: {year?: string}) => 
    api.get<any>(`/flowchart/${majorId}`, { params }),
};

// Calendar/Events API
export const eventsApi = {
  getAll: () => api.get<ApiEvent[]>('/api/events'),
  getByDateRange: (start: string, end: string) =>
    api.get<ApiEvent[]>('/api/events', { params: { start, end } }),
  create: (eventData: Omit<ApiEvent, 'id'>) => api.post<ApiEvent>('/api/events', eventData),
  update: (id: string, eventData: Partial<ApiEvent>) => api.put<ApiEvent>(`/api/events/${id}`, eventData),
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

// Advising API - Updated for new advising-service
export const advisingApi = {
  // Send message to AI advisor
  sendMessage: (data: {
    userId: string;
    message: string;
    conversationId?: string;
  }) => api.post<{
    agent: string;
    userId: string;
    conversationId: string;
    response: string;
    timestamp: string;
    profileUsed: boolean;
    coursesReferenced: number;
    degreeRequirementsUsed: boolean;
    studentMajor: string;
    studentYear: string;
    university: string;
  }>('/advising', data),
};

// Conversation API - New conversation-service
export const conversationApi = {
  // Create new conversation
  createConversation: (data: {
    userId: string;
    title?: string;
    agentType?: string;
  }) => api.post<{conversation: any}>('/conversations', data),
  
  // Get specific conversation
  getConversation: (userId: string, conversationId: string) => 
    api.get<any>(`/conversations/${userId}/${conversationId}`),
  
  // List all conversations for user
  listConversations: (userId: string) => 
    api.get<{conversations: any[]; count: number}>(`/conversations/${userId}`),
  
  // Delete conversation
  deleteConversation: (userId: string, conversationId: string) => 
    api.delete(`/conversations/${userId}/${conversationId}`),
  
  // Store message in conversation
  storeMessage: (data: {
    userId: string;
    conversationId: string;
    userMessage?: string;
    assistantResponse?: string;
  }) => api.post('/conversations/message', data),
};

// College planning API - Deprecated, use coursesApi instead
export const planningApi = {
  getDegreeRequirements: (majorId: string) => coursesApi.getDegreeRequirements(majorId),
  getCourseCatalog: (params?: any) => coursesApi.getAll(params),
  checkPrerequisites: (courseId: string) => coursesApi.getById(courseId),
  getGraduationPlan: (majorId: string) => coursesApi.getFlowchart(majorId),
  saveGraduationPlan: (plan: object) => api.post('/planning/graduation-plan', plan),
};

export default api;
