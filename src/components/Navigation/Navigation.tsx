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
  ExitToApp as SignOutIcon,
} from '@mui/icons-material';
import { alpha, styled } from '@mui/material/styles';
import { useAuth } from '../../contexts/AuthContext';
import AuthButton from '../AuthButton';

const drawerWidth = 280;
const collapsedDrawerWidth = 72;

// Styled components
const StyledDrawer = styled(Drawer, {
  shouldForwardProp: (prop) => prop !== 'open'
})<{ open: boolean }>(({ theme, open }) => ({
  width: drawerWidth,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  '& .MuiDrawer-paper': {
    background: theme.palette.mode === 'light' 
      ? `linear-gradient(180deg, ${theme.palette.grey[50]} 0%, ${theme.palette.background.default} 100%)`
      : theme.palette.background.paper,
    borderRight: `1px solid ${theme.palette.divider}`,
    backdropFilter: 'blur(8px)',
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    width: open ? drawerWidth : `calc(${theme.spacing(9)} + 1px)`,
    overflowX: 'hidden',
    [theme.breakpoints.down('sm')]: {
      width: 0,
      '&.MuiDrawer-paper': {
        width: drawerWidth,
      },
    },
  },
}));

const NavigationHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2, 3),
  minHeight: 64,
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  backdropFilter: 'blur(8px)',
  position: 'sticky',
  top: 0,
  zIndex: theme.zIndex.appBar,
}));


const ProfileAvatar = styled(Avatar)(({ theme }) => ({
  width: 40,
  height: 40,
  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  color: theme.palette.primary.contrastText,
  boxShadow: theme.shadows[2],
  transition: theme.transitions.create(['transform', 'box-shadow'], {
    duration: theme.transitions.duration.shorter,
  }),
  '&:hover': {
    transform: 'scale(1.1)',
    boxShadow: theme.shadows[4],
  },
}));

const CompanyLogo = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  padding: theme.spacing(2, 2.5, 3),
  '& .logo-text': {
    fontWeight: 700,
    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundSize: '200% auto',
    animation: 'gradient 3s ease infinite',
  },
  '@keyframes gradient': {
    '0%': {
      backgroundPosition: '0% 50%',
    },
    '50%': {
      backgroundPosition: '100% 50%',
    },
    '100%': {
      backgroundPosition: '0% 50%',
    },
  },
}));

const NavItem = styled(ListItem, {
  shouldForwardProp: (prop) => prop !== 'active'
})<{ active?: boolean }>(({ theme, active }) => ({
  padding: theme.spacing(0.5, 1.5),
  marginBottom: theme.spacing(0.5),
  '& .MuiListItemButton-root': {
    borderRadius: theme.shape.borderRadius * 2,
    padding: theme.spacing(1, 2),
    color: active ? theme.palette.primary.main : theme.palette.text.secondary,
    backgroundColor: active ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
    '&:hover': {
      backgroundColor: active 
        ? alpha(theme.palette.primary.main, 0.12) 
        : theme.palette.action.hover,
    },
    '& .MuiListItemIcon-root': {
      color: active ? theme.palette.primary.main : theme.palette.text.secondary,
      minWidth: 40,
    },
  },
  '&:hover': {
    '& .MuiListItemButton-root': {
      color: theme.palette.primary.main,
      '& .MuiListItemIcon-root': {
        color: theme.palette.primary.main,
      },
    },
  },
}));

const StyledListItemButton = styled(ListItemButton)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius * 2,
  padding: theme.spacing(1.25, 2),
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


const Navigation: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const { user, signOut } = useAuth();
  
  // Parse user data
  const userData = user ? {
    firstName: user.attributes?.given_name || user.username?.split('@')[0] || 'User',
    lastName: user.attributes?.family_name || '',
    email: user.email || user.username,
    avatar: user.attributes?.picture
  } : null;

  const toggleCollapse = () => {
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

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Profile', icon: <PersonIcon />, path: '/profile' },
    { text: 'Advising', icon: <PsychologyIcon />, path: '/advising' },
    { text: 'Schedule', icon: <CalendarIcon />, path: '/schedule' },
    { text: 'Courses', icon: <SchoolIcon />, path: '/courses' },
    { text: 'Analytics', icon: <TimelineIcon />, path: '/analytics' },
  ];

  const drawer = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        bgcolor: 'background.paper',
      }}
    >
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
          {userData ? (
            <>
              {isCollapsed ? (
                <Tooltip title={`Sign Out (${userData?.firstName})`} placement="right">
                  <IconButton 
                    onClick={() => signOut()} 
                    sx={{ 
                      p: 1,
                      '&:hover': { 
                        backgroundColor: alpha(theme.palette.error.main, 0.1)
                      }
                    }}
                  >
                    <SignOutIcon fontSize="small" color="error" />
                  </IconButton>
                </Tooltip>
              ) : (
                <ProfileAvatar
                  src={userData?.avatar}
                  alt={`${userData?.firstName} ${userData?.lastName}`}
                  sx={{ width: 44, height: 44 }}
                >
                  {!userData?.avatar && <PersonIcon />}
                </ProfileAvatar>
              )}
              {!isCollapsed && (
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }} noWrap>
                    {userData?.firstName} {userData?.lastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {userData?.email}
                  </Typography>
                </Box>
              )}
              {!isCollapsed && (
                <Tooltip title="Sign Out">
                  <IconButton 
                    onClick={() => signOut()} 
                    size="small"
                    sx={{ 
                      color: 'text.secondary',
                      '&:hover': { 
                        color: 'error.main',
                        backgroundColor: alpha(theme.palette.error.main, 0.1)
                      }
                    }}
                  >
                    <SignOutIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </>
          ) : (
            !isCollapsed && <AuthButton />
          )}
        </Box>
      </Box>

      {/* Navigation Menu */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', py: 1 }}>
        <List sx={{ px: 2 }}>
          {menuItems.map((item) => (
            <NavItem key={item.path} disablePadding>
              <Tooltip title={isCollapsed ? item.text : ''} placement="right">
                <StyledListItemButton
                  selected={isActive(item.path)}
                  onClick={() => navigate(item.path)}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText 
                    primary={item.text} 
                    primaryTypographyProps={{
                      variant: 'body2',
                      fontWeight: isActive(item.path) ? 600 : 400,
                    }}
                    sx={{ opacity: isCollapsed ? 0 : 1, transition: 'opacity 0.2s' }}
                  />
                </StyledListItemButton>
              </Tooltip>
            </NavItem>
          ))}
        </List>
      </Box>

      {/* Footer Section */}
      <Box sx={{ p: 1.5, borderTop: `1px solid ${theme.palette.divider}` }}>
        {!isCollapsed && userData && (
          <Box sx={{ mb: 2 }}>
            <AuthButton />
          </Box>
        )}
        <NavItem disablePadding>
          <Tooltip title={isCollapsed ? 'Settings' : ''} placement="right">
            <StyledListItemButton>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary="Settings" 
                primaryTypographyProps={{
                  variant: 'body2',
                }}
                sx={{ opacity: isCollapsed ? 0 : 1, transition: 'opacity 0.2s' }}
              />
            </StyledListItemButton>
          </Tooltip>
        </NavItem>
        
        <Tooltip title={isCollapsed ? 'Toggle sidebar' : ''} placement="right">
          <IconButton
            onClick={toggleCollapse}
            sx={{
              width: '100%',
              mt: 1,
              color: 'text.secondary',
              '&:hover': {
                color: 'primary.main',
                bgcolor: 'action.hover',
              },
            }}
          >
            {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Desktop Sidebar */}
      <Box
        component="nav"
        sx={{
          width: { sm: isCollapsed ? collapsedDrawerWidth : drawerWidth },
          flexShrink: { sm: 0 },
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <StyledDrawer
          variant="permanent"
          open={!isCollapsed}
          sx={{
            display: { xs: 'none', sm: 'block' },
          }}
        >
          {drawer}
        </StyledDrawer>

        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
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
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: '100vh',
          width: { sm: `calc(100% - ${isCollapsed ? collapsedDrawerWidth : drawerWidth}px)` },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        {/* Mobile Header */}
        <Box 
          sx={{ 
            display: { sm: 'none' },
            position: 'sticky',
            top: 0,
            zIndex: theme.zIndex.appBar,
            bgcolor: 'background.paper',
            borderBottom: `1px solid ${theme.palette.divider}`,
            p: 1.5,
          }}
        >
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{ 
              color: 'text.primary',
              bgcolor: 'action.hover',
              '&:hover': {
                bgcolor: 'action.selected',
              },
            }}
          >
            <MenuIcon />
          </IconButton>
        </Box>

        {/* Page Content */}
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default Navigation; 