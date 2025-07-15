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
} from '@mui/icons-material';
// TODO: Replace with AWS Cognito authentication

const drawerWidth = 280;
const collapsedDrawerWidth = 72;

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
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Schedule', icon: <CalendarIcon />, path: '/schedule' },
    { text: 'Course Planner', icon: <TimelineIcon />, path: '/course-planner' },
    { text: 'Study Tools', icon: <SchoolIcon />, path: '/study-tools' },
    { text: 'Advising', icon: <SchoolIcon />, path: '/advising' },
  ];

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          padding: 2,
          gap: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          justifyContent: isCollapsed ? 'center' : 'space-between',
        }}
      >
        {!isCollapsed && (
          <>
            <Avatar
              src={user?.avatar}
              alt={`${user?.firstName} ${user?.lastName}`}
              sx={{ width: 40, height: 40 }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" noWrap>
                {user?.firstName} {user?.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {user?.email}
              </Typography>
            </Box>
            <Tooltip title="Settings">
              <IconButton onClick={() => navigate('/profile')} size="small">
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </>
        )}
        {isCollapsed && (
          <Avatar
            src={user?.avatar}
            alt={`${user?.firstName} ${user?.lastName}`}
            sx={{ width: 32, height: 32 }}
          />
        )}
      </Box>
      
      <Box
        sx={{
          display: 'flex',
          justifyContent: isCollapsed ? 'center' : 'flex-end',
          p: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Tooltip title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <IconButton onClick={handleCollapse} size="small">
            {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </Tooltip>
      </Box>
      
      <List sx={{ flex: 1, px: 1, py: 2 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <Tooltip 
              title={isCollapsed ? item.text : ''} 
              placement="right"
              disableHoverListener={!isCollapsed}
            >
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => navigate(item.path)}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  px: isCollapsed ? 1 : 2,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'inherit',
                    },
                  },
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
                      fontWeight: location.pathname === item.path ? 600 : 400,
                    }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>

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
      
      <Drawer
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
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        {drawer}
      </Drawer>
      
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: isCollapsed ? collapsedDrawerWidth : drawerWidth,
            borderRight: '1px solid',
            borderColor: 'divider',
            transition: 'width 0.3s ease-in-out',
            overflowX: 'hidden',
          },
        }}
        open
      >
        {drawer}
      </Drawer>
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { 
            sm: `calc(100% - ${isCollapsed ? collapsedDrawerWidth : drawerWidth}px)` 
          },
          backgroundColor: 'background.default',
          transition: 'width 0.3s ease-in-out',
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default Navigation; 