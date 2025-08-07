import { 
  Box, 
  Grid, 
  Typography, 
  IconButton, 
  Tooltip, 
  Skeleton, 
  Alert, 
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  alpha,
  useTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import {
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  Psychology as PsychologyIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Notifications as NotificationsIcon,
  Bookmark as BookmarkIcon,
} from '@mui/icons-material';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const DashboardContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  minHeight: '100%',
  background: theme.palette.background.default,
  color: theme.palette.text.primary,
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
  },
  [theme.breakpoints.up('md')]: {
    padding: theme.spacing(4),
  },
}));

const PageHeader = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  alignItems: 'stretch',
  gap: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    flexDirection: 'row',
    alignItems: 'center',
  },
}));

const PageTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  background: theme.palette.mode === 'light' 
    ? `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
    : theme.palette.primary.main,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  display: 'inline-block',
  marginBottom: theme.spacing(1),
}));

const WidgetGrid = styled(Grid)(({ theme }) => ({
  marginBottom: theme.spacing(4),
}));

const Widget = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  background: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius * 2,
  boxShadow: theme.shadows[1],
  transition: theme.transitions.create(['transform', 'box-shadow'], {
    duration: theme.transitions.duration.shorter,
  }),
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[4],
  },
  '& .MuiCardHeader-root': {
    padding: theme.spacing(2, 3, 1),
    '& .MuiCardHeader-action': {
      alignSelf: 'center',
      margin: 0,
    },
  },
  '& .MuiCardContent-root': {
    padding: theme.spacing(0, 3, 3),
    flexGrow: 1,
  },
}));

interface WidgetData {
  id: number;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  loading?: boolean;
  error?: string;
}

const createSampleData = (navigate: (path: string) => void, theme: any) => [
    {
      id: 1,
      title: 'Upcoming Classes',
      icon: <SchoolIcon />,
      content: (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
          <Typography variant="body2" color="text.secondary">
            No data available
          </Typography>
        </Box>
      ),
    },
    {
      id: 2,
      title: 'Assignments Due',
      icon: <AssignmentIcon />,
      content: (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
          <Typography variant="body2" color="text.secondary">
            No data available
          </Typography>
        </Box>
      ),
    },
    {
      id: 3,
      title: 'Study Goals',
      icon: <PsychologyIcon />,
      content: (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
          <Typography variant="body2" color="text.secondary">
            No data available
          </Typography>
        </Box>
      ),
    },
    {
      id: 4,
      title: 'AI Study Assistant',
      icon: <PsychologyIcon />,
      content: (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
          <Typography variant="body2" color="text.secondary">
            No data available
          </Typography>
        </Box>
      ),
    },
];

const Dashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [widgets, setWidgets] = useState<WidgetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const sampleData = createSampleData(navigate, theme);
      setWidgets(sampleData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate, theme]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    if (refreshing) return;
    await loadData();
  };

  if (loading) {
    return (
      <DashboardContainer>
        <PageHeader>
          <Box>
            <PageTitle variant="h4" component="h1">
              Dashboard
            </PageTitle>
            <Typography variant="body1" color="text.secondary">
              Loading your personalized dashboard...
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            disabled
            sx={{ minWidth: 120 }}
          >
            Refreshing...
          </Button>
        </PageHeader>
        <WidgetGrid container>
          {[1, 2, 3, 4].map((item) => (
            <Grid item xs={12} sm={6} md={6} lg={3} key={item}>
              <Skeleton 
                variant="rectangular" 
                height={180} 
                sx={{ 
                  borderRadius: 3,
                  bgcolor: theme.palette.mode === 'light' ? 'grey.100' : 'grey.900'
                }} 
              />
            </Grid>
          ))}
        </WidgetGrid>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <PageHeader>
        <Box>
          <Box 
            component="h1"
            sx={{
              margin: 0,
              background: theme.palette.mode === 'light' 
                ? `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
                : theme.palette.primary.main,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: '2.125rem',
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: '0.0075em',
              display: 'inline-block',
              mb: 1
            }}
          >
            Welcome back, Student! 👋
          </Box>
          <Typography variant="body1" color="text.secondary">
            Here's what's happening with your academics
          </Typography>
        </Box>
        <Button
          variant="outlined"
          color="inherit"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={refreshing}
          sx={{ 
            minWidth: 120,
            borderColor: 'divider',
            '&:hover': {
              borderColor: 'text.secondary',
              backgroundColor: theme.palette.mode === 'light' 
                ? 'rgba(0, 0, 0, 0.04)' 
                : 'rgba(255, 255, 255, 0.08)'
            },
          }}
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </PageHeader>

      <AnimatePresence mode="wait">
        <WidgetGrid container>
          {widgets.map((widget) => (
            <Grid item xs={12} sm={6} md={6} lg={3} key={widget.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  transition: { 
                    duration: 0.4,
                    ease: [0.4, 0, 0.2, 1]
                  }
                }}
                whileHover={{ y: -4 }}
              >
                <Widget>
                  <CardHeader
                    title={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          color: theme.palette.primary.main,
                          mr: 1.5,
                        }}>
                          {widget.icon}
                        </Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                          {widget.title}
                        </Typography>
                      </Box>
                    }
                    action={
                      <Tooltip title="More options">
                        <IconButton size="small" color="inherit">
                          <NotificationsIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    }
                    sx={{ 
                      p: 2, 
                      '& .MuiCardHeader-content': {
                        overflow: 'hidden',
                      },
                      '& .MuiCardHeader-title': {
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      },
                    }}
                  />
                  <Divider sx={{ mx: 3, my: 0 }} />
                  <CardContent>
                    {widget.error ? (
                      <Alert severity="error" sx={{ mb: 2 }}>{widget.error}</Alert>
                    ) : widget.loading ? (
                      <Skeleton 
                        variant="rectangular" 
                        height={60} 
                        sx={{ 
                          borderRadius: 2,
                          bgcolor: theme.palette.mode === 'light' ? 'grey.100' : 'grey.900'
                        }} 
                      />
                    ) : (
                      <Box sx={{ minHeight: 80, display: 'flex', flexDirection: 'column' }}>
                        {widget.content}
                      </Box>
                    )}
                  </CardContent>
                </Widget>
              </motion.div>
            </Grid>
          ))}
        </WidgetGrid>
      </AnimatePresence>
    </DashboardContainer>
  );
};

export default Dashboard; 