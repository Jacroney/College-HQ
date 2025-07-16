import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Person as PersonIcon,
  School as SchoolIcon,
  EmojiEvents as GoalsIcon,
  TrendingUp as ProgressIcon,
  SupervisorAccount as AdvisorIcon,
  Save as SaveIcon,
  Email as EmailIcon,
  AssignmentInd as StudentIdIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

// --- Types ---
export interface University {
  name: string;
  domain: string;
  country: string;
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
}

// --- Dropdown Options ---
const colleges = [
  'College of Engineering',
  'College of Science',
  'College of Arts & Letters',
  'College of Business',
];
const majors = [
  'Computer Science',
  'Mechanical Engineering',
  'Business Administration',
  'Psychology',
  'Biology',
];
const concentrations = [
  'Software Engineering',
  'AI & Machine Learning',
  'Entrepreneurship',
  'Clinical Psychology',
  'Genetics',
];
const minors = [
  'Mathematics',
  'Philosophy',
  'Data Science',
  'Economics',
];
const academicYears = [
  'Freshman',
  'Sophomore',
  'Junior',
  'Senior',
  'Super Senior',
];
const learningStyles = [
  'Visual',
  'Auditory',
  'Reading/Writing',
  'Kinesthetic',
  'Blended',
];
const careerGoalsList = [
  'Software Engineer',
  'Research Scientist',
  'Startup Founder',
  'Medical School',
  'Graduate School',
  'Data Analyst',
  'Product Manager',
];
const academicInterestsList = [
  'Artificial Intelligence',
  'Web Development',
  'Robotics',
  'Psychology',
  'Genetics',
  'Finance',
  'Philosophy',
  'Design',
];

// --- Styled Components ---
const ProfileContainer = styled(motion(Box))(({ theme }) => ({
  maxWidth: 900,
  margin: '2rem auto',
  padding: theme.spacing(4),
  background: theme.palette.surface?.main || theme.palette.background.default,
  borderRadius: theme.spacing(2),
  boxShadow: theme.shadows[2],
}));

const SectionPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  background: theme.palette.surface?.paper || theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.spacing(2),
}));

const SectionHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  marginBottom: theme.spacing(2),
}));

const SaveButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(2),
  minWidth: 140,
}));

// --- Placeholder Data ---
const placeholderProfile: StudentProfile = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane.doe@stateu.edu',
  studentId: 'S1234567',
  university: { name: 'Stanford University', domain: 'stanford.edu', country: 'USA' },
  college: 'College of Engineering',
  major: 'Computer Science',
  concentration: 'Software Engineering',
  minor: 'Mathematics',
  academicYear: 'Junior',
  expectedGraduation: '2025-05',
  gpa: 3.6,
  totalCredits: 92,
  currentSemesterCredits: 16,
  careerGoals: ['Software Engineer', 'Startup Founder'],
  learningStyle: 'Blended',
  academicInterests: ['Artificial Intelligence', 'Web Development'],
  advisorName: 'Dr. Alan Turing',
  advisorEmail: 'aturing@stateu.edu',
  advisorNotes: 'Excellent progress. Consider research opportunities.',
};

// --- API Placeholders ---
async function loadProfile(): Promise<StudentProfile> {
  // TODO: Integrate with AWS backend
  return new Promise((resolve) => setTimeout(() => resolve(placeholderProfile), 800));
}
async function saveProfile(profile: StudentProfile): Promise<void> {
  // TODO: Integrate with AWS backend
  console.log('Saving profile:', profile);
  return new Promise((resolve) => setTimeout(resolve, 1200));
}

// --- Main Component ---
const Profile: React.FC = () => {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [universities, setUniversities] = useState<University[]>([]);

  useEffect(() => {
    setLoading(true);
    loadProfile()
      .then((data) => setProfile(data))
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch('/universities.json')
      .then(res => res.json())
      .then(setUniversities)
      .catch(() => setUniversities([]));
  }, []);

  const handleFieldChange = <K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) => {
    setProfile((prev) => prev ? { ...prev, [key]: value } : prev);
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setSuccess(false);
    setError(null);
    try {
      await saveProfile(profile);
      setSuccess(true);
    } catch {
      setError('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProfileContainer
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Typography variant="h4" sx={{ mb: 4, fontWeight: 700 }}>
        Student Profile
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <CircularProgress />
        </Box>
      ) : profile ? (
        <>
          {success && <Alert severity="success" sx={{ mb: 2 }}>Profile saved successfully!</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {/* Personal Information */}
          <SectionPaper>
            <SectionHeader>
              <PersonIcon color="primary" />
              <Typography variant="h6">Personal Information</Typography>
            </SectionHeader>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="First Name"
                  value={profile.firstName}
                  onChange={e => handleFieldChange('firstName', e.target.value)}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Last Name"
                  value={profile.lastName}
                  onChange={e => handleFieldChange('lastName', e.target.value)}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Email"
                  value={profile.email}
                  onChange={e => handleFieldChange('email', e.target.value)}
                  fullWidth
                  required
                  InputProps={{ startAdornment: <EmailIcon sx={{ mr: 1 }} /> }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Student ID"
                  value={profile.studentId}
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
              <SchoolIcon color="primary" />
              <Typography variant="h6">Academic Information</Typography>
            </SectionHeader>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  options={universities}
                  getOptionLabel={(option) => option.name}
                  value={profile.university}
                  onChange={(_, value) => handleFieldChange('university', value)}
                  renderInput={(params) => <TextField {...params} label="University" fullWidth />}
                  isOptionEqualToValue={(option, value) => !!option && !!value && option.name === value.name}
                  loading={universities.length === 0}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>College</InputLabel>
                  <Select
                    value={profile.college}
                    label="College"
                    onChange={e => handleFieldChange('college', e.target.value)}
                  >
                    {colleges.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Major</InputLabel>
                  <Select
                    value={profile.major}
                    label="Major"
                    onChange={e => handleFieldChange('major', e.target.value)}
                  >
                    {majors.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Concentration</InputLabel>
                  <Select
                    value={profile.concentration}
                    label="Concentration"
                    onChange={e => handleFieldChange('concentration', e.target.value)}
                  >
                    {concentrations.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Minor</InputLabel>
                  <Select
                    value={profile.minor}
                    label="Minor"
                    onChange={e => handleFieldChange('minor', e.target.value)}
                  >
                    {minors.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Academic Year</InputLabel>
                  <Select
                    value={profile.academicYear}
                    label="Academic Year"
                    onChange={e => handleFieldChange('academicYear', e.target.value)}
                  >
                    {academicYears.map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Expected Graduation"
                  type="month"
                  value={profile.expectedGraduation}
                  onChange={e => handleFieldChange('expectedGraduation', e.target.value)}
                  fullWidth
                />
              </Grid>
            </Grid>
          </SectionPaper>

          {/* Academic Progress */}
          <SectionPaper>
            <SectionHeader>
              <ProgressIcon color="primary" />
              <Typography variant="h6">Academic Progress</Typography>
            </SectionHeader>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6}>
                <Typography gutterBottom>Current GPA</Typography>
                <Slider
                  value={profile.gpa}
                  min={0}
                  max={4}
                  step={0.01}
                  marks={[{ value: 0, label: '0.0' }, { value: 4, label: '4.0' }]}
                  valueLabelDisplay="on"
                  onChange={(_, value) => handleFieldChange('gpa', value as number)}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Total Credits"
                  type="number"
                  value={profile.totalCredits}
                  onChange={e => handleFieldChange('totalCredits', Number(e.target.value))}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Current Semester Credits"
                  type="number"
                  value={profile.currentSemesterCredits}
                  onChange={e => handleFieldChange('currentSemesterCredits', Number(e.target.value))}
                  fullWidth
                />
              </Grid>
            </Grid>
          </SectionPaper>

          {/* Goals & Interests */}
          <SectionPaper>
            <SectionHeader>
              <GoalsIcon color="primary" />
              <Typography variant="h6">Goals & Interests</Typography>
            </SectionHeader>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  multiple
                  options={careerGoalsList}
                  value={profile.careerGoals}
                  onChange={(_, value) => handleFieldChange('careerGoals', value)}
                  renderTags={(value: string[], getTagProps) =>
                    value.map((option: string, index: number) => (
                      <Chip label={option} {...getTagProps({ index })} key={option} />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Career Goals" placeholder="Add goal" />
                  )}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Learning Style</InputLabel>
                  <Select
                    value={profile.learningStyle}
                    label="Learning Style"
                    onChange={e => handleFieldChange('learningStyle', e.target.value)}
                  >
                    {learningStyles.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  options={academicInterestsList}
                  value={profile.academicInterests}
                  onChange={(_, value) => handleFieldChange('academicInterests', value)}
                  renderTags={(value: string[], getTagProps) =>
                    value.map((option: string, index: number) => (
                      <Chip label={option} {...getTagProps({ index })} key={option} />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Academic Interests" placeholder="Add interest" />
                  )}
                  fullWidth
                />
              </Grid>
            </Grid>
          </SectionPaper>

          {/* Advisor Information */}
          <SectionPaper>
            <SectionHeader>
              <AdvisorIcon color="primary" />
              <Typography variant="h6">Advisor Information</Typography>
            </SectionHeader>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Advisor Name"
                  value={profile.advisorName}
                  onChange={e => handleFieldChange('advisorName', e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Advisor Email"
                  value={profile.advisorEmail}
                  onChange={e => handleFieldChange('advisorEmail', e.target.value)}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Additional Notes"
                  value={profile.advisorNotes}
                  onChange={e => handleFieldChange('advisorNotes', e.target.value)}
                  fullWidth
                  multiline
                  minRows={2}
                />
              </Grid>
            </Grid>
          </SectionPaper>

          <SaveButton
            variant="contained"
            color="primary"
            startIcon={saving ? <CircularProgress size={18} /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </SaveButton>
        </>
      ) : (
        <Alert severity="error">Profile not found.</Alert>
      )}
    </ProfileContainer>
  );
};

export default Profile; 