import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  IconButton,
  Box,
  Avatar,
  Typography,
  Tooltip,
  Divider,
  Badge,
  useTheme,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  CalendarToday as CalendarIcon,
  School as SchoolIcon,
  Menu as MenuIcon,
  Settings as SettingsIcon,
  Timeline as TimelineIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Psychology as PsychologyIcon,
  Person as PersonIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { motion } from 'framer-motion';
// TODO: Replace with AWS Cognito authentication

const drawerWidth = 280;
const collapsedDrawerWidth = 72;

// Styled components
const StyledDrawer = styled(Drawer)(({ theme }) => ({
  '& .MuiDrawer-paper': {
    background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
    borderRight: `1px solid ${theme.palette.divider}`,
    backdropFilter: 'blur(8px)',
  },
}));

const NavigationHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(2.5),
  gap: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  background: 'rgba(255, 255, 255, 0.6)',
  backdropFilter: 'blur(8px)',
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    background: 'linear-gradient(90deg, transparent, rgba(37, 99, 235, 0.3), transparent)',
  },
}));

const ProfileAvatar = styled(Avatar)(({ theme }) => ({
  width: 44,
  height: 44,
  background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
  border: `2px solid ${theme.palette.background.paper}`,
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'scale(1.05)',
    boxShadow: '0 6px 16px rgba(37, 99, 235, 0.4)',
  },
}));

const CompanyLogo = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginBottom: theme.spacing(2),
  padding: theme.spacing(1),
}));

const AnimatedListItem = styled(motion(ListItem))(({ theme }) => ({
  borderRadius: theme.spacing(1.5),
  margin: theme.spacing(0.5, 1),
  transition: 'all 0.2s ease',
  '&:hover': {
    background: 'rgba(37, 99, 235, 0.08)',
  },
}));

const StyledListItemButton = styled(ListItemButton)(({ theme }) => ({
  borderRadius: theme.spacing(1.5),
  padding: theme.spacing(1.5, 2),
  transition: 'all 0.3s ease',
  '&.Mui-selected': {
    background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
    color: theme.palette.primary.contrastText,
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
    '&:hover': {
      background: 'linear-gradient(135deg, #1E40AF, #5B21B6)',
      boxShadow: '0 6px 16px rgba(37, 99, 235, 0.4)',
    },
    '& .MuiListItemIcon-root': {
      color: 'inherit',
    },
  },
  '&:hover': {
    background: 'rgba(37, 99, 235, 0.08)',
    transform: 'translateX(4px)',
  },
}));

const MainContent = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
  minHeight: '100vh',
  transition: 'all 0.3s ease',
}));

const Navigation: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // TODO: Replace with AWS Cognito user data
  const user = {
    firstName: 'Demo',
    lastName: 'User',
    email: 'demo@example.com',
    avatar: undefined
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState) {
      setIsCollapsed(JSON.parse(savedState));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);


  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', badge: null },
    { text: 'Schedule', icon: <CalendarIcon />, path: '/schedule', badge: null },
    { text: 'Course Planner', icon: <TimelineIcon />, path: '/course-planner', badge: null },
    { text: 'Study Tools', icon: <SchoolIcon />, path: '/study-tools', badge: null },
    { text: 'AI Advising', icon: <PsychologyIcon />, path: '/advising', badge: 'New' },
  ];

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with user info */}
      <NavigationHeader sx={{ justifyContent: isCollapsed ? 'center' : 'space-between' }}>
        {!isCollapsed && (
          <>
            <CompanyLogo>
              <Box sx={{ 
                width: 36, 
                height: 36, 
                borderRadius: 2,
                background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '1.2rem'
              }}>
                CH
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                College HQ
              </Typography>
            </CompanyLogo>
          </>
        )}
        {isCollapsed && (
          <Box sx={{ 
            width: 32, 
            height: 32, 
            borderRadius: 2,
            background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '1rem'
          }}>
            CH
          </Box>
        )}
      </NavigationHeader>

      {/* User Profile Section */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <ProfileAvatar
            src={user?.avatar}
            alt={`${user?.firstName} ${user?.lastName}`}
            sx={{ width: isCollapsed ? 32 : 44, height: isCollapsed ? 32 : 44 }}
          >
            {!user?.avatar && <PersonIcon />}
          </ProfileAvatar>
          {!isCollapsed && (
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }} noWrap>
                {user?.firstName} {user?.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {user?.email}
              </Typography>
            </Box>
          )}
          {!isCollapsed && (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="Notifications">
                <IconButton size="small" sx={{ '&:hover': { background: 'rgba(37, 99, 235, 0.08)' } }}>
                  <Badge badgeContent={3} color="error" variant="dot">
                    <NotificationsIcon fontSize="small" />
                  </Badge>
                </IconButton>
              </Tooltip>
              <Tooltip title="Profile Settings">
                <IconButton 
                  onClick={() => navigate('/profile')} 
                  size="small"
                  sx={{ '&:hover': { background: 'rgba(37, 99, 235, 0.08)' } }}
                >
                  <SettingsIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
        
        {/* Collapse Button */}
        <Box sx={{ display: 'flex', justifyContent: isCollapsed ? 'center' : 'flex-end' }}>
          <Tooltip title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <IconButton 
              onClick={handleCollapse} 
              size="small"
              sx={{ 
                background: 'rgba(37, 99, 235, 0.08)',
                '&:hover': { background: 'rgba(37, 99, 235, 0.12)' }
              }}
            >
              {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Navigation Menu */}
      <List sx={{ flex: 1, px: 1, py: 2 }}>
        {menuItems.map((item, index) => (
          <AnimatedListItem 
            key={item.text} 
            disablePadding
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Tooltip 
              title={isCollapsed ? item.text : ''} 
              placement="right"
              disableHoverListener={!isCollapsed}
            >
              <StyledListItemButton
                selected={location.pathname === item.path}
                onClick={() => navigate(item.path)}
                sx={{
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  px: isCollapsed ? 1 : 2,
                }}
              >
                <ListItemIcon sx={{ 
                  minWidth: isCollapsed ? 'auto' : 40,
                  justifyContent: 'center'
                }}>
                  {item.icon}
                </ListItemIcon>
                {!isCollapsed && (
                  <ListItemText 
                    primary={item.text}
                    primaryTypographyProps={{
                      fontWeight: location.pathname === item.path ? 600 : 500,
                      fontSize: '0.95rem',
                    }}
                  />
                )}
                {!isCollapsed && item.badge && (
                  <Badge 
                    badgeContent={item.badge} 
                    color="secondary" 
                    sx={{
                      '& .MuiBadge-badge': {
                        fontSize: '0.7rem',
                        height: 18,
                        minWidth: 18,
                      }
                    }}
                  />
                )}
              </StyledListItemButton>
            </Tooltip>
          </AnimatedListItem>
        ))}
      </List>

      {/* Footer */}
      {!isCollapsed && (
        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
            College HQ v1.0.0
          </Typography>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <IconButton
        color="inherit"
        aria-label="open drawer"
        edge="start"
        onClick={handleDrawerToggle}
        sx={{ 
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 1200,
          display: { sm: 'none' },
          backgroundColor: 'background.paper',
          boxShadow: 1,
          '&:hover': {
            backgroundColor: 'background.paper',
          },
        }}
      >
        <MenuIcon />
      </IconButton>
      
      <StyledDrawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: drawerWidth,
          },
        }}
      >
        {drawer}
      </StyledDrawer>
      
      <StyledDrawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: isCollapsed ? collapsedDrawerWidth : drawerWidth,
            transition: 'width 0.3s ease-in-out',
            overflowX: 'hidden',
          },
        }}
        open
      >
        {drawer}
      </StyledDrawer>
      
      <MainContent
        component="main"
        sx={{
          p: { xs: 2, sm: 3 },
          width: { 
            sm: `calc(100% - ${isCollapsed ? collapsedDrawerWidth : drawerWidth}px)` 
          },
        }}
      >
        <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
          <Outlet />
        </Box>
      </MainContent>
    </Box>
  );
};

export default Navigation; 