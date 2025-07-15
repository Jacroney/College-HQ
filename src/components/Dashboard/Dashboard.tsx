import { Box, Grid, Paper, Typography, IconButton, Tooltip, Skeleton, Alert } from '@mui/material';
import { styled } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import {
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  Event as EventIcon,
  Psychology as PsychologyIcon,
  Work as WorkIcon,
  FitnessCenter as FitnessIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const DashboardContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  minHeight: '100vh',
  background: theme.palette.surface.main,
}));

const PageHeader = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
}));


const WidgetGrid = styled(Grid)(({ theme }) => ({
  marginBottom: theme.spacing(4),
}));

const Widget = styled(motion(Paper))(({ theme }) => ({
  padding: theme.spacing(3),
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  background: theme.palette.surface.paper,
  border: `1px solid ${theme.palette.divider}`,
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[4],
  },
}));

const WidgetHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: theme.spacing(2),
}));

const WidgetTitle = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.primary,
  fontWeight: 600,
}));

const WidgetContent = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}));

const StatCard = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  background: theme.palette.surface.elevated,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    background: theme.palette.action.hover,
  },
}));

const StatValue = styled(Typography)(({ theme }) => ({
  fontSize: '1.5rem',
  fontWeight: 700,
  color: theme.palette.text.primary,
}));

const StatLabel = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: '0.875rem',
}));


interface WidgetData {
  id: number;
  title: string;
  icon: JSX.Element;
  content: JSX.Element;
  loading?: boolean;
  error?: string;
}


// TODO: Replace with actual API calls to AWS backend
const fetchWidgetData = async (widgetId: number): Promise<WidgetData> => {
  // Remove setTimeout - this was just for demo
  // await new Promise(resolve => setTimeout(resolve, 1000));
  
  switch (widgetId) {
    case 1:
      // TODO: Fetch from /api/academic/overview
      return {
        id: 1,
        title: 'Academic Overview',
        icon: <SchoolIcon />,
        content: (
          <>
            <StatCard>
              <StatValue>-</StatValue>
              <StatLabel>Current GPA</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>-</StatValue>
              <StatLabel>Credits This Semester</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>-</StatValue>
              <StatLabel>Active Courses</StatLabel>
            </StatCard>
          </>
        ),
      };
    case 2:
      // TODO: Fetch from /api/assignments/upcoming
      return {
        id: 2,
        title: 'Upcoming Assignments',
        icon: <AssignmentIcon />,
        content: (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              No assignments loaded. Connect to backend to view upcoming assignments.
            </Typography>
          </Box>
        ),
      };
    case 3:
      // TODO: Fetch from /api/schedule/today
      return {
        id: 3,
        title: 'Today\'s Schedule',
        icon: <EventIcon />,
        content: (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              No schedule loaded. Connect to backend to view today's events.
            </Typography>
          </Box>
        ),
      };
    case 4:
      // TODO: Fetch from /api/study/insights
      return {
        id: 4,
        title: 'Study Insights',
        icon: <PsychologyIcon />,
        content: (
          <>
            <StatCard>
              <StatValue>-</StatValue>
              <StatLabel>Focus Score</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>-</StatValue>
              <StatLabel>Study Time This Week</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>-</StatValue>
              <StatLabel>Completed Tasks</StatLabel>
            </StatCard>
          </>
        ),
      };
    case 5:
      // TODO: Fetch from /api/career/goals
      return {
        id: 5,
        title: 'Career Goals',
        icon: <WorkIcon />,
        content: (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              No career goals loaded. Connect to backend to view your goals.
            </Typography>
          </Box>
        ),
      };
    case 6:
      // TODO: Remove wellness widget - not core functionality
      return {
        id: 6,
        title: 'Wellness',
        icon: <FitnessIcon />,
        content: (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Wellness tracking will be implemented in a future version.
            </Typography>
          </Box>
        ),
      };
    default:
      throw new Error('Widget not found');
  }
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [widgets, setWidgets] = useState<WidgetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWidgets = async () => {
      try {
        setLoading(true);
        const widgetIds = [1, 2, 3, 4, 5, 6];
        const widgetData = await Promise.all(
          widgetIds.map(id => fetchWidgetData(id))
        );
        setWidgets(widgetData);
        setError(null);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error('Error loading widgets:', err);
      } finally {
        setLoading(false);
      }
    };

    loadWidgets();
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    const loadWidgets = async () => {
      try {
        const widgetIds = [1, 2, 3, 4, 5, 6];
        const widgetData = await Promise.all(
          widgetIds.map(id => fetchWidgetData(id))
        );
        setWidgets(widgetData);
        setError(null);
      } catch (err) {
        setError('Failed to refresh dashboard data');
        console.error('Error refreshing widgets:', err);
      } finally {
        setLoading(false);
      }
    };

    loadWidgets();
  };

  const handleWidgetClick = (widgetId: number) => {
    switch (widgetId) {
      case 1:
        navigate('/academic');
        break;
      case 2:
        navigate('/assignments');
        break;
      case 3:
        navigate('/schedule');
        break;
      case 4:
        navigate('/study-tools');
        break;
      case 5:
        navigate('/career');
        break;
      case 6:
        navigate('/wellness');
        break;
      default:
        break;
    }
  };

  return (
    <DashboardContainer>
      <PageHeader>
        <Typography variant="h4" component="h1">
          Dashboard
        </Typography>
        <Tooltip title="Refresh Dashboard">
          <IconButton onClick={handleRefresh} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </PageHeader>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <AnimatePresence>
        <WidgetGrid container spacing={3}>
          {loading
            ? Array.from(new Array(6)).map((_, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Widget>
                    <Skeleton variant="rectangular" height={200} />
                  </Widget>
                </Grid>
              ))
            : widgets.map((widget) => (
                <Grid item xs={12} sm={6} md={4} key={widget.id}>
                  <Widget
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => handleWidgetClick(widget.id)}
                  >
                    <WidgetHeader>
                      <WidgetTitle>
                        {widget.icon} {widget.title}
                      </WidgetTitle>
                    </WidgetHeader>
                    <WidgetContent>{widget.content}</WidgetContent>
                  </Widget>
                </Grid>
              ))}
        </WidgetGrid>
      </AnimatePresence>
    </DashboardContainer>
  );
};

export default Dashboard; 