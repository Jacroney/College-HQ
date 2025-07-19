import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme/theme';
import Navigation from './components/Navigation/Navigation';
import Dashboard from './components/Dashboard/Dashboard';
import Profile from './pages/Profile';
import Schedule from './pages/Schedule';
import NotFound from './pages/NotFound';
import Advising from './pages/Advising';
import { CourseProvider } from './context/CourseContext';
import { ProfileProvider } from './context/ProfileContext';

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ProfileProvider>
        <CourseProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Navigation />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="profile" element={<Profile />} />
                <Route path="schedule" element={<Schedule />} />
                <Route path="advising" element={<Advising />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
        </CourseProvider>
      </ProfileProvider>
    </ThemeProvider>
  );
};

export default App;
