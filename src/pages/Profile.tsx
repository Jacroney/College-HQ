import React, { useState, useEffect } from 'react';
import { useProfileContext } from '../context/ProfileContext';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import {
  Box,
  Paper,
  Grid,
  Typography,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Autocomplete,
  Chip,
  Slider,
  Button,
  Alert,
  CircularProgress,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Badge,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Person as PersonIcon,
  School as SchoolIcon,
  TrendingUp as ProgressIcon,
  Save as SaveIcon,
  Email as EmailIcon,
  AssignmentInd as StudentIdIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
  Class as CourseIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

// --- Enhanced Types ---
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
  // Enhanced course tracking
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

// ====================================
// STYLED COMPONENTS
// ====================================

/**
 * Main container for the profile page with animation support
 */
const ProfileContainer = styled(motion(Box))(({ theme }) => ({
  maxWidth: 1400,
  margin: '0 auto',
  padding: theme.spacing(3),
  background: 'transparent',
}));

/**
 * Hero section with gradient background
 */
const HeroSection = styled(Box)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.secondary.main}15 100%)`,
  borderRadius: theme.spacing(3),
  padding: theme.spacing(4),
  marginBottom: theme.spacing(4),
  border: `1px solid ${theme.palette.divider}`,
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `linear-gradient(135deg, ${theme.palette.primary.main}08 0%, ${theme.palette.secondary.main}08 100%)`,
    borderRadius: theme.spacing(3),
  },
}));

/**
 * Profile header with avatar and basic info
 */
const ProfileHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(3),
  marginBottom: theme.spacing(3),
  position: 'relative',
  zIndex: 1,
}));

/**
 * Large avatar for profile header
 */
const ProfileAvatar = styled(Box)(({ theme }) => ({
  width: 120,
  height: 120,
  borderRadius: '50%',
  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: theme.shadows[3],
  color: theme.palette.primary.contrastText,
  fontSize: '3rem',
  fontWeight: 'bold',
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 4,
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.1)',
  },
}));

/**
 * Paper component for individual profile sections
 */
const SectionPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  marginBottom: theme.spacing(3),
  background: theme.palette.background.paper, // fixed: removed theme.palette.surface
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.spacing(2),
  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
    transform: 'translateY(-2px)',
  },
}));

/**
 * Header styling for each profile section
 */
const SectionHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  marginBottom: theme.spacing(3),
  paddingBottom: theme.spacing(2),
  borderBottom: `2px solid ${theme.palette.divider}`,
}));

const CourseChecklistItem = styled(ListItem)(({ theme }) => ({
  borderRadius: theme.spacing(1),
  marginBottom: theme.spacing(0.5),
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

/**
 * Progress card with gradient background
 */
const ProgressCard = styled(Card)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.success.main}08, ${theme.palette.info.main}08)`,
  border: `1px solid ${theme.palette.success.main}30`,
  borderRadius: theme.spacing(2),
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
    transform: 'translateY(-4px)',
  },
}));

/**
 * Stats container for displaying metrics
 */
const StatsContainer = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(3),
}));

/**
 * Individual stat card
 */
const StatCard = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2.5),
  background: theme.palette.background.paper, // fixed: removed theme.palette.surface
  borderRadius: theme.spacing(1.5),
  border: `1px solid ${theme.palette.divider}`,
  textAlign: 'center',
  transition: 'all 0.2s ease',
  '&:hover': {
    background: theme.palette.background.default, // fixed: removed theme.palette.surface
    transform: 'translateY(-1px)',
  },
}));

// --- API Functions ---
const API_BASE_URL = 'https://lm8ngppg22.execute-api.us-east-1.amazonaws.com/dev';

// Get current user ID from Cognito (sub is the universal unique identifier)
function getCurrentUserId(user: any): string {
  // Use Cognito's sub (subject) as the unique user ID - this is the standard approach
  if (user?.attributes?.sub) {
    return user.attributes.sub;
  }
  if (user?.username) {
    return user.username; // Fallback to username if sub not available
  }
  
  // Don't return anonymous - return null if no user
  console.error('No authenticated user found');
  return null;
}

async function loadUniversities(): Promise<University[]> {
  // This would typically come from your course catalog
  return [
    { name: "Cal Poly San Luis Obispo", domain: "calpoly.edu", country: "USA" },
    { name: "Stanford University", domain: "stanford.edu", country: "USA" },
    { name: "University of California, Berkeley", domain: "berkeley.edu", country: "USA" },
  ];
}

async function loadCoursesForUniversity(universityName: string, major?: string, user?: any): Promise<Course[]> {
  try {
    console.log('Loading courses for university:', universityName, 'major:', major);
    
    // If no major is selected yet, return empty array
    if (!major) {
      console.log('No major selected, returning empty course list');
      return [];
    }
    
    const userId = getCurrentUserId(user);
    if (!userId) {
      console.log('No authenticated user, returning empty course list');
      return [];
    }
    
    // Call your enhanced profile Lambda with course lookup action
    const response = await fetch(`${API_BASE_URL}/profile/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'getCourses',
        university: universityName,
        major: major
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to load courses:', errorData);
      
      // If it's a 404, the major isn't available yet
      if (response.status === 404) {
        console.log('Degree requirements not found for this major');
        return [];
      }
      
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Courses loaded successfully:', data);
    
    if (data.success && data.courses) {
      // Convert the API response format to your Course interface
      return data.courses.map((course: any) => ({
        university_course_id: `${universityName.toLowerCase().replace(/\s+/g, '')}_${course.id.toLowerCase().replace(/\s+/g, '')}`,
        course_code: course.id,
        course_name: course.name,
        units: course.units,
        description: `${course.name} - ${course.units} units`, // You could enhance this with better descriptions
        prerequisites: [], // Could be enhanced to parse prerequisites
        difficulty_level: course.type === 'major' ? 'Intermediate' : 'Introductory',
        required_for_majors: [major] // This course is required for the selected major
      }));
    }
    
    return [];
    
  } catch (error) {
    console.error('Error loading courses:', error);
    
    // Return empty array on error rather than sample data
    return [];
  }
}

// Also update the loadUniversityData function to pass the major:

async function loadMajorsForUniversity(universityName: string): Promise<string[]> {
  if (universityName === "Cal Poly San Luis Obispo") {
    return [
      "Computer Science",
      "Software Engineering", 
      "Computer Engineering",
      "Mechanical Engineering",
      "Civil Engineering",
      "Business Administration",
      "Mathematics"
    ];
  }
  return ["Computer Science", "Engineering", "Business"];
}

async function loadConcentrationsForMajor(major: string): Promise<string[]> {
  if (major === "Computer Science") {
    return [
      "Software Engineering",
      "AI & Machine Learning", 
      "Cybersecurity",
      "Data Science",
      "Human-Computer Interaction"
    ];
  }
  return [];
}

// --- Main Component ---
const Profile: React.FC = () => {
  const { state: profileState, updateProfile, dispatch } = useProfileContext();
  const { user, updateUserProfile, signIn } = useAuth();
  
  // Local state for form
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Enhanced state for course tracking
  const [universities, setUniversities] = useState<University[]>([]);
  const [availableMajors, setAvailableMajors] = useState<string[]>([]);
  const [availableConcentrations, setAvailableConcentrations] = useState<string[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [degreeProgress, setDegreeProgress] = useState<DegreeProgress | null>(null);

  // Load initial data
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        const [universitiesData, profileData] = await Promise.all([
          loadUniversities(),
          loadProfile(user)
        ]);
        
        setUniversities(universitiesData);
        dispatch({ type: 'SET_PROFILE', payload: profileData });
        
        if (profileData.university) {
          await loadUniversityData(profileData.university.name, profileData.major);
        }
      } catch (err) {
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };
    
    // Only run if we have a user
    if (user) {
      initializeData();
    } else {
      setLoading(false);
    }
  }, [user]); // Re-run when user changes

  // Load university-specific data when university changes
  const loadUniversityData = async (universityName: string, major?: string) => {
    try {
      const majorsData = await loadMajorsForUniversity(universityName);
      setAvailableMajors(majorsData);
      
      // Only load courses if we have a major
      if (major) {
        const coursesData = await loadCoursesForUniversity(universityName, major, user);
        setAvailableCourses(coursesData);
      } else {
        setAvailableCourses([]);
      }
    } catch (err) {
      console.error('Error loading university data:', err);
    }
  };

  // Load concentrations when major changes
  const loadConcentrationData = async (major: string) => {
    try {
      const concentrations = await loadConcentrationsForMajor(major);
      setAvailableConcentrations(concentrations);
    } catch (err) {
      console.error('Error loading concentrations:', err);
    }
  };

  // Calculate degree progress
  const calculateDegreeProgress = (): DegreeProgress => {
    if (!profileState.profile || !availableCourses.length) {
      return { totalRequired: 0, completed: 0, inProgress: 0, remaining: 0, percentComplete: 0 };
    }

    const requiredCourses = availableCourses.filter(course => 
      course.required_for_majors.includes(profileState.profile!.major)
    );
    2
    const totalRequired = requiredCourses.length;
    const completed = profileState.profile!.completedCourses.length;
    const inProgress = profileState.profile!.currentCourses.length;
    const remaining = Math.max(0, totalRequired - completed - inProgress);
    const percentComplete = totalRequired > 0 ? (completed / totalRequired) * 100 : 0;

    return { totalRequired, completed, inProgress, remaining, percentComplete };
  };

  // Handle field changes
  const handleFieldChange = <K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) => {
    updateProfile({ [key]: value } as Partial<StudentProfile>);
    
    // Handle cascading changes
    if (key === 'university' && value) {
      const uni = value as University;
      loadUniversityData(uni.name);
      updateProfile({ major: '', concentration: '' });
      setAvailableCourses([]);
    } else if (key === 'major' && value && profileState.profile?.university) {
      const major = value as string;
      loadConcentrationData(major);
      loadCoursesForUniversity(profileState.profile.university.name, major, user).then(courses => {
        setAvailableCourses(courses);
      });
      updateProfile({ concentration: '' });
    }
  };

  // Handle course completion toggles
  const handleCourseToggle = (courseCode: string, listType: 'completed' | 'current' | 'planned') => {
    if (!profileState.profile) return;

    const currentList = profileState.profile[`${listType}Courses`] as string[];
    const otherLists = [
      listType !== 'completed' ? 'completedCourses' : null,
      listType !== 'current' ? 'currentCourses' : null,
      listType !== 'planned' ? 'plannedCourses' : null,
    ].filter(Boolean) as (keyof StudentProfile)[];

    let updatedList: string[];
    if (currentList.includes(courseCode)) {
      // Remove from current list
      updatedList = currentList.filter(code => code !== courseCode);
    } else {
      // Add to current list and remove from others
      updatedList = [...currentList, courseCode];
      
      // Remove from other lists to avoid duplicates
      otherLists.forEach(listKey => {
        const otherList = profileState.profile![listKey] as string[];
        if (otherList.includes(courseCode)) {
          handleFieldChange(listKey, otherList.filter(code => code !== courseCode));
        }
      });
    }

    handleFieldChange(`${listType}Courses` as keyof StudentProfile, updatedList);
  };

  // Group courses by category
  const groupedCourses = React.useMemo(() => {
    if (!availableCourses.length || !profileState.profile) return {};

    const groups: { [key: string]: Course[] } = {
      'Core Requirements': [],
      'Major Requirements': [],
      'Mathematics': [],
      'Science': [],
      'Electives': []
    };

    availableCourses.forEach(course => {
      if (course.course_code.startsWith('CSC') && parseInt(course.course_code.split(' ')[1]) < 300) {
        groups['Core Requirements'].push(course);
      } else if (course.course_code.startsWith('CSC')) {
        groups['Major Requirements'].push(course);
      } else if (course.course_code.startsWith('MATH')) {
        groups['Mathematics'].push(course);
      } else if (course.course_code.startsWith('STAT') || course.course_code.startsWith('PHYS')) {
        groups['Science'].push(course);
      } else {
        groups['Electives'].push(course);
      }
    });

    return groups;
  }, [availableCourses, profileState.profile]);

  const renderCourseChecklist = () => {
    if (!profileState.profile || !availableCourses.length) {
      return (
        <Alert severity="info">
          Select a university and major to see your course requirements.
        </Alert>
      );
    }

    return Object.entries(groupedCourses).map(([category, courses]) => {
      if (!courses.length) return null;

      const completedCount = courses.filter(course => 
        profileState.profile!.completedCourses.includes(course.course_code)
      ).length;

      return (
        <Accordion key={category} defaultExpanded={category === 'Core Requirements'}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
              <Typography variant="h6">{category}</Typography>
              <Badge 
                badgeContent={`${completedCount}/${courses.length}`} 
                color={completedCount === courses.length ? "success" : "primary"}
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <List dense>
              {courses.map(course => {
                // Only declare these variables here, not above
                const isCompleted = profileState.profile!.completedCourses.includes(course.course_code);
                const isCurrent = profileState.profile!.currentCourses.includes(course.course_code);
                const isPlanned = profileState.profile!.plannedCourses.includes(course.course_code);

                return (
                  <CourseChecklistItem key={course.university_course_id}>
                    <ListItemIcon>
                      <Checkbox
                        edge="start"
                        checked={isCompleted}
                        icon={<UncheckedIcon />}
                        checkedIcon={<CheckCircleIcon />}
                        onChange={() => handleCourseToggle(course.course_code, 'completed')}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              textDecoration: isCompleted ? 'line-through' : 'none',
                              fontWeight: isCompleted ? 'normal' : 'medium'
                            }}
                          >
                            {course.course_code} - {course.course_name}
                          </Typography>
                          <Chip 
                            label={`${course.units} units`} 
                            size="small" 
                            variant="outlined" 
                          />
                          {isCurrent && <Chip label="Current" size="small" color="primary" />}
                          {isPlanned && <Chip label="Planned" size="small" color="secondary" />}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            {course.description.substring(0, 100)}...
                          </Typography>
                          {course.prerequisites.length > 0 && (
                            <Typography variant="caption" color="textSecondary">
                              Prerequisites: {course.prerequisites.join(', ')}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Button
                        size="small"
                        variant={isCurrent ? "contained" : "outlined"}
                        onClick={() => handleCourseToggle(course.course_code, 'current')}
                        disabled={isCompleted}
                      >
                        Current
                      </Button>
                      <Button
                        size="small"
                        variant={isPlanned ? "contained" : "outlined"}
                        onClick={() => handleCourseToggle(course.course_code, 'planned')}
                        disabled={isCompleted || isCurrent}
                      >
                        Planned
                      </Button>
                    </Box>
                  </CourseChecklistItem>
                );
              })}
            </List>
          </AccordionDetails>
        </Accordion>
      );
    });
  };

  const progress = calculateDegreeProgress();

  // Save function
  const handleSave = async () => {
    if (!profileState.profile || !user) return;
    setSaving(true);
    setSuccess(false);
    setError(null);
    try {
      await saveProfile(profileState.profile, user);
      setSuccess(true);
    } catch (error) {
      console.error('Save error:', error);
      setError('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProfileContainer>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <CircularProgress />
        </Box>
      </ProfileContainer>
    );
  }

  // Show sign-in prompt if user is not authenticated
  if (!user) {
    return (
      <ProfileContainer>
        <Alert severity="info">
          Please sign in to view your profile.
        </Alert>
      </ProfileContainer>
    );
  }

  if (!profileState.profile) {
    return (
      <ProfileContainer>
        <Alert severity="error">Profile not found.</Alert>
      </ProfileContainer>
    );
  }

  return (
    <ProfileContainer
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Hero Section */}
      <HeroSection>
        <ProfileHeader>
          <ProfileAvatar>
            {profileState.profile?.firstName?.charAt(0)?.toUpperCase() || 'S'}
            {profileState.profile?.lastName?.charAt(0)?.toUpperCase() || 'U'}
          </ProfileAvatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
              {profileState.profile?.firstName && profileState.profile?.lastName 
                ? `${profileState.profile.firstName} ${profileState.profile.lastName}`
                : 'Student Profile'
              }
            </Typography>
            <Typography variant="h6" sx={{ color: 'text.secondary', mb: 2 }}>
              {profileState.profile?.major || 'Select your major'} • {profileState.profile?.academicYear || 'Academic Year'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {profileState.profile?.university && (
                <Chip 
                  label={profileState.profile.university.name} 
                  color="primary" 
                  variant="outlined"
                  size="small"
                />
              )}
              {profileState.profile?.concentration && (
                <Chip 
                  label={profileState.profile.concentration} 
                  color="secondary" 
                  variant="outlined"
                  size="small"
                />
              )}
              {profileState.profile?.gpa > 0 && (
                <Chip 
                  label={`GPA: ${profileState.profile.gpa.toFixed(2)}`} 
                  color="success" 
                  variant="outlined"
                  size="small"
                />
              )}
            </Box>
          </Box>
        </ProfileHeader>
      </HeroSection>

      {/* Success/Error Messages */}
      {success && <Alert severity="success" sx={{ mb: 3 }}>Profile saved successfully!</Alert>}
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {/* Left Column - Profile Information */}
        <Grid item xs={12} md={6}>
          {/* Personal Information */}
          <SectionPaper>
            <SectionHeader>
              <PersonIcon color="primary" sx={{ fontSize: 28 }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>Personal Information</Typography>
                <Typography variant="body2" color="textSecondary">
                  Your basic profile details
                </Typography>
              </Box>
            </SectionHeader>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="First Name"
                  value={profileState.profile.firstName}
                  onChange={e => handleFieldChange('firstName', e.target.value)}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Last Name"
                  value={profileState.profile.lastName}
                  onChange={e => handleFieldChange('lastName', e.target.value)}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Email"
                  value={profileState.profile.email}
                  onChange={e => handleFieldChange('email', e.target.value)}
                  fullWidth
                  required
                  InputProps={{ startAdornment: <EmailIcon sx={{ mr: 1 }} /> }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Student ID"
                  value={profileState.profile.studentId}
                  onChange={e => handleFieldChange('studentId', e.target.value)}
                  fullWidth
                  required
                  InputProps={{ startAdornment: <StudentIdIcon sx={{ mr: 1 }} /> }}
                />
              </Grid>
            </Grid>
          </SectionPaper>

          {/* Academic Information */}
          <SectionPaper>
            <SectionHeader>
              <SchoolIcon color="primary" sx={{ fontSize: 28 }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>Academic Information</Typography>
                <Typography variant="body2" color="textSecondary">
                  Your university and program details
                </Typography>
              </Box>
            </SectionHeader>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Autocomplete
                  options={universities}
                  getOptionLabel={(option) => option.name}
                  value={profileState.profile.university}
                  onChange={(_, value) => handleFieldChange('university', value)}
                  renderInput={(params) => <TextField {...params} label="University" fullWidth required />}
                  isOptionEqualToValue={(option, value) => !!option && !!value && option.name === value.name}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Major</InputLabel>
                  <Select
                    value={profileState.profile.major}
                    label="Major"
                    onChange={e => handleFieldChange('major', e.target.value)}
                    disabled={!profileState.profile.university}
                  >
                    {availableMajors.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Concentration</InputLabel>
                  <Select
                    value={profileState.profile.concentration}
                    label="Concentration"
                    onChange={e => handleFieldChange('concentration', e.target.value)}
                    disabled={!profileState.profile.major}
                  >
                    {availableConcentrations.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Academic Year</InputLabel>
                  <Select
                    value={profileState.profile.academicYear}
                    label="Academic Year"
                    onChange={e => handleFieldChange('academicYear', e.target.value)}
                  >
                    {['Freshman', 'Sophomore', 'Junior', 'Senior', 'Super Senior'].map(y => 
                      <MenuItem key={y} value={y}>{y}</MenuItem>
                    )}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Expected Graduation"
                  type="month"
                  value={profileState.profile.expectedGraduation}
                  onChange={e => handleFieldChange('expectedGraduation', e.target.value)}
                  fullWidth
                />
              </Grid>
            </Grid>
          </SectionPaper>

          {/* Academic Progress */}
          <SectionPaper>
            <SectionHeader>
              <ProgressIcon color="primary" sx={{ fontSize: 28 }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>Academic Progress</Typography>
                <Typography variant="body2" color="textSecondary">
                  Your GPA and credit information
                </Typography>
              </Box>
            </SectionHeader>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography gutterBottom>Current GPA: {profileState.profile.gpa}</Typography>
                <Slider
                  value={profileState.profile.gpa}
                  min={0}
                  max={4}
                  step={0.01}
                  marks={[{ value: 0, label: '0.0' }, { value: 4, label: '4.0' }]}
                  valueLabelDisplay="auto"
                  onChange={(_, value) => handleFieldChange('gpa', value as number)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Total Credits"
                  type="number"
                  value={profileState.profile.totalCredits}
                  onChange={e => handleFieldChange('totalCredits', Number(e.target.value))}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Current Semester Credits"
                  type="number"
                  value={profileState.profile.currentSemesterCredits}
                  onChange={e => handleFieldChange('currentSemesterCredits', Number(e.target.value))}
                  fullWidth
                />
              </Grid>
            </Grid>
          </SectionPaper>
        </Grid>

        {/* Right Column - Course Tracking */}
        <Grid item xs={12} md={6}>
          {/* Degree Progress */}
          <ProgressCard sx={{ mb: 3 }}>
            <CardContent>
              <SectionHeader>
                <TimelineIcon color="primary" />
                <Typography variant="h6">Degree Progress</Typography>
              </SectionHeader>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  {Math.round(progress.percentComplete)}% Complete
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={progress.percentComplete} 
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={3}>
                  <Typography align="center" variant="h6" color="success.main">
                    {progress.completed}
                  </Typography>
                  <Typography align="center" variant="caption">
                    Completed
                  </Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography align="center" variant="h6" color="primary.main">
                    {progress.inProgress}
                  </Typography>
                  <Typography align="center" variant="caption">
                    In Progress
                  </Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography align="center" variant="h6" color="warning.main">
                    {progress.remaining}
                  </Typography>
                  <Typography align="center" variant="caption">
                    Remaining
                  </Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography align="center" variant="h6">
                    {progress.totalRequired}
                  </Typography>
                  <Typography align="center" variant="caption">
                    Total
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </ProgressCard>

          {/* Course Checklist */}
          <SectionPaper>
            <SectionHeader>
              <CourseIcon color="primary" />
              <Typography variant="h6">Course Requirements</Typography>
            </SectionHeader>
            {renderCourseChecklist()}
          </SectionPaper>
        </Grid>
      </Grid>

      {/* Save Button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <Button
          variant="contained"
          size="large"
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
          sx={{ 
            minWidth: 250,
            py: 1.5,
            px: 4,
            borderRadius: 3,
            fontSize: '1.1rem',
            fontWeight: 600,
            textTransform: 'none',
            background: 'linear-gradient(45deg, #2563EB, #7C3AED)',
            boxShadow: '0 4px 20px rgba(37, 99, 235, 0.3)',
            '&:hover': {
              background: 'linear-gradient(45deg, #1E40AF, #5B21B6)',
              boxShadow: '0 8px 32px rgba(37, 99, 235, 0.4)',
              transform: 'translateY(-2px)',
            },
            '&:disabled': {
              background: 'linear-gradient(45deg, #94A3B8, #CBD5E1)',
              boxShadow: 'none',
            },
          }}
        >
          {saving ? 'Saving Profile...' : 'Save Profile & Courses'}
        </Button>
      </Box>
    </ProfileContainer>
  );
};

// Profile API functions using Cognito sub as user ID
async function loadProfile(user: any): Promise<StudentProfile> {
  try {
    if (!user) {
      return createDefaultProfile(user);
    }

    // Try to get existing profile from API
    const profile = await authApi.getProfile();
    return profile.data;
  } catch (error: any) {
    console.error('Error loading profile:', error);
    
    // If profile doesn't exist (404), create a new one
    if (error.response?.status === 404) {
      console.log('Profile not found, creating new profile for user');
      return await createInitialProfile(user);
    }
    
    // For other errors, return default profile
    return createDefaultProfile(user);
  }
}

async function saveProfile(profile: StudentProfile, user: any): Promise<void> {
  try {
    if (!user) {
      throw new Error('User not authenticated');
    }

    await authApi.updateProfile(profile);
    console.log('Profile saved successfully');
  } catch (error) {
    console.error('Error saving profile:', error);
    throw error;
  }
}

// Create initial profile for new users
async function createInitialProfile(user: any): Promise<StudentProfile> {
  try {
    const initialProfile = createDefaultProfile(user);
    
    // Create profile in backend
    await authApi.createProfile({
      email: initialProfile.email,
      name: `${initialProfile.firstName} ${initialProfile.lastName}`.trim() || 'Student'
    });
    
    return initialProfile;
  } catch (error) {
    console.error('Error creating initial profile:', error);
    return createDefaultProfile(user);
  }
}


/**
 * Create a default profile with Cognito user data as starting point
 * @returns {StudentProfile} Default profile object
 */
function createDefaultProfile(user?: any): StudentProfile {
  const attrs = user?.attributes || {};
  return {
    firstName: attrs.given_name || '',
    lastName: attrs.family_name || '',
    email: user?.email || attrs.email || '',
    studentId: '',
    university: null,
    college: '',
    major: '',
    concentration: '',
    minor: '',
    academicYear: '',
    expectedGraduation: '',
    gpa: 0,
    totalCredits: 0,
    currentSemesterCredits: 0,
    careerGoals: [],
    learningStyle: '',
    academicInterests: [],
    advisorName: '',
    advisorEmail: '',
    advisorNotes: '',
    completedCourses: [],
    currentCourses: [],
    plannedCourses: []
  };
}

/**
 * Test function for the advising agent API
 * @param {string} message - Message to send to the advising agent
 * @returns {Promise<string>} Response from the advising agent
 */
async function testAdvisingAgent(message: string, user: any): Promise<string> {
  try {
    const userId = getCurrentUserId(user);
    
    const response = await fetch(`${API_BASE_URL}/advising`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId,
        message: message
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Error testing advising agent:', error);
    throw error;
  }
}

export default Profile;