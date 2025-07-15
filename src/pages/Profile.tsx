import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Avatar,
  IconButton,
  MenuItem,
  Alert,
} from '@mui/material';
import { PhotoCamera } from '@mui/icons-material';
// TODO: Replace with AWS Cognito authentication
type User = {
  firstName: string;
  lastName: string;
  major?: string;
  year: 'Freshman' | 'Sophomore' | 'Junior' | 'Senior' | 'Graduate';
  gpa?: number;
  interests?: string[];
  avatar?: string;
};

const Profile: React.FC = () => {
  // TODO: Replace with AWS Cognito user data
  const user: User = {
    firstName: 'Demo',
    lastName: 'User',
    major: 'Computer Science',
    year: 'Junior',
    gpa: 3.8,
    interests: ['Web Development', 'Machine Learning'],
  };

  const updateProfile = async (data: Partial<User>) => {
    // TODO: Implement AWS Cognito profile update
    console.log('Update profile with AWS Cognito:', data);
    return Promise.resolve();
  };

  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    major: user?.major || '',
    year: user?.year || 'Freshman',
    gpa: user?.gpa?.toString() || '',
    interests: user?.interests?.join(', ') || '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const interests = formData.interests
        .split(',')
        .map((interest) => interest.trim())
        .filter(Boolean);

      const gpa = formData.gpa ? parseFloat(formData.gpa) : undefined;

      await updateProfile({
        ...formData,
        interests,
        year: formData.year as User['year'],
        gpa,
      });
      setSuccess('Profile updated successfully');
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to update profile');
    }
  };

  const years = [
    { value: 'Freshman', label: 'Freshman' },
    { value: 'Sophomore', label: 'Sophomore' },
    { value: 'Junior', label: 'Junior' },
    { value: 'Senior', label: 'Senior' },
    { value: 'Graduate', label: 'Graduate' },
  ] as const;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Profile
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center' }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={user?.avatar}
                  alt={`${user?.firstName} ${user?.lastName}`}
                  sx={{ width: 100, height: 100 }}
                />
                <IconButton
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    backgroundColor: 'background.paper',
                  }}
                >
                  <PhotoCamera />
                </IconButton>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Major"
                name="major"
                value={formData.major}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Year"
                name="year"
                value={formData.year}
                onChange={handleChange}
              >
                {years.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="GPA"
                name="gpa"
                type="number"
                inputProps={{ step: 0.01, min: 0, max: 4.0 }}
                value={formData.gpa}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Interests (comma-separated)"
                name="interests"
                value={formData.interests}
                onChange={handleChange}
                helperText="Enter your interests separated by commas"
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
              >
                Save Changes
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Box>
  );
};

export default Profile; 