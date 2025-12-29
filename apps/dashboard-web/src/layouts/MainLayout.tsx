import React, { useState } from 'react';
import { Box, Drawer, List, ListItemIcon, ListItemText, ListItemButton, AppBar, Toolbar, Typography, IconButton, Avatar, useTheme, useMediaQuery, Tooltip, ListSubheader, Divider } from '@mui/material';
import { Outlet, useNavigate } from 'react-router-dom';
import { 
  Menu as MenuIcon,
  LogOut,
  Bell,
  HelpCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getAccessibleRoutes, RouteConfig } from '../config/routes';
import { ContextSelector } from '../components/forms/ContextSelector';
import { TimeRangeSelector } from '../components/forms/TimeRangeSelector';

import { DegradedModeBanner } from '../components/degraded/DegradedModeBanner';
import { SupportDrawer } from '../components/support/SupportDrawer';
import { BrandMark } from '../components/Brand/BrandMark';
import { SidebarNavItem } from '../components/layout/SidebarNavItem';

const SIDEBAR_WIDTH = 280;
const COLLAPSED_SIDEBAR_WIDTH = 88;

export const MainLayout: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [supportDrawerOpen, setSupportDrawerOpen] = useState(false);
  
  const { user, logout } = useAuth();

  // Get accessible routes based on user roles
  const userRoles = (user?.roles || []) as any[];
  const menuItems = getAccessibleRoutes(userRoles);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleCollapseToggle = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    if (!isDesktop) setMobileOpen(false);
  };

  const currentSidebarWidth = isDesktop 
    ? (isCollapsed ? COLLAPSED_SIDEBAR_WIDTH : SIDEBAR_WIDTH)
    : SIDEBAR_WIDTH;

  const renderMenuItems = (routes: RouteConfig[]) => {
    let lastSection = '';
    
    return routes.map((route) => {
      if (route.hideFromMenu) return null;
      
      let header = null;
      if (route.section && route.section !== lastSection) {
        lastSection = route.section;
        // Simple mapping for display since we don't have i18n handy here, or just use UpperCase key
        const displayLabel = route.section.toUpperCase(); 
        
        header = isCollapsed ? (
             <Divider sx={{ my: 1, borderColor: 'divider' }} />
        ) : (
            <ListSubheader 
                sx={{ 
                    bgcolor: 'transparent', 
                    fontSize: '0.75rem', 
                    fontWeight: 700, 
                    color: 'text.disabled', 
                    textTransform: 'uppercase', 
                    letterSpacing: 1,
                    mt: 2,
                    mb: 1,
                    lineHeight: 1
                }}
            >
                {displayLabel}
            </ListSubheader>
        );
      }

      return (
        <React.Fragment key={route.path}>
            {header}
            <SidebarNavItem
                item={route}
                collapsed={isCollapsed && isDesktop}
                onNavigate={handleNavigate}
            />
        </React.Fragment>
      );
    });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  }

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
      {/* Brand */}
      <Box 
        onClick={() => navigate('/overview')}
        sx={{ 
          p: 3, 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5,
          cursor: 'pointer',
          '&:hover': { opacity: 0.8 },
          transition: 'opacity 0.2s',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
        }}
      >
        <BrandMark sx={{ fontSize: 32, color: 'primary.main', minWidth: 32 }} />
        <Typography 
            variant="h5" 
            fontWeight="800" 
            color="text.primary" 
            sx={{ 
                letterSpacing: -0.5,
                opacity: isCollapsed ? 0 : 1,
                width: isCollapsed ? 0 : 'auto',
                transition: theme.transitions.create(['opacity', 'width'], { duration: 200 }),
                whiteSpace: 'nowrap',
                overflow: 'hidden'
            }}
        >
          FarmIQ
        </Typography>
      </Box>

      {/* Menu */}
      <List sx={{ flexGrow: 1, px: 2 }}>
        {renderMenuItems(menuItems)}
      </List>

      {/* Collapse Toggle (Desktop only) */}
      {isDesktop && (
        <Box sx={{ p: 2, display: 'flex', justifyContent: isCollapsed ? 'center' : 'flex-end' }}>
            <IconButton onClick={handleCollapseToggle} size="small">
                {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </IconButton>
        </Box>
      )}

      {/* User Footer */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Tooltip title="Logout" placement="right" disableInteractive={!isCollapsed}>
            <ListItemButton 
                onClick={handleLogout} 
                sx={{ 
                    borderRadius: 1.5, 
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    px: isCollapsed ? 1.5 : 2
                }}
            >
                <ListItemIcon sx={{ minWidth: 0, mr: isCollapsed ? 0 : 2, justifyContent: 'center' }}>
                    <LogOut size={20} />
                </ListItemIcon>
                <ListItemText 
                    primary="Logout" 
                    sx={{ 
                        opacity: isCollapsed ? 0 : 1, 
                        width: isCollapsed ? 0 : 'auto',
                        transition: theme.transitions.create(['opacity', 'width'], { duration: 200 }),
                        whiteSpace: 'nowrap',
                    }}
                />
            </ListItemButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* AppBar (Desktop: shift right, Mobile: full width) */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${currentSidebarWidth}px)` },
          ml: { md: `${currentSidebarWidth}px` },
          bgcolor: 'background.default', // Transparent/matching bg
          borderBottom: '1px solid',
          borderColor: 'divider',
          color: 'text.primary',
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar>
            <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2, display: { md: 'none' } }}
            >
                <MenuIcon />
            </IconButton>
            
            {/* Mobile Brand */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1, ml: 1, flexGrow: 1 }}>
                <BrandMark sx={{ color: 'primary.main', fontSize: 24 }} />
                <Typography variant="h6" fontWeight="bold" color="text.primary" sx={{ letterSpacing: -0.5 }}>
                    FarmIQ
                </Typography>
            </Box>

            {/* Context Selector */}
            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, justifyContent: 'center', gap: 2, alignItems: 'center' }}>
              <ContextSelector />
              <TimeRangeSelector />
            </Box>

            <IconButton color="inherit" sx={{ mr: 2 }}>
                <Bell size={20} />
            </IconButton>

            <IconButton color="inherit" onClick={() => setSupportDrawerOpen(true)}>
                <HelpCircle size={20} />
            </IconButton>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="body2" fontWeight="500" display={{ xs: 'none', sm: 'block' }}>
                    {user?.name || 'User'}
                </Typography>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.dark' }}>
                    {user?.name?.[0] || 'U'}
                </Avatar>
            </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar Drawer */}
      <Box
        component="nav"
        sx={{ 
            width: { md: currentSidebarWidth }, 
            flexShrink: { md: 0 },
            transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
            }),
        }}
      >
        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: SIDEBAR_WIDTH },
          }}
        >
          {drawerContent}
        </Drawer>
        {/* Desktop Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: currentSidebarWidth, 
                borderRight: '1px solid', 
                borderColor: 'divider',
                overflowX: 'hidden',
                transition: theme.transitions.create('width', {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.leavingScreen,
                }),
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${currentSidebarWidth}px)` },
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar /> {/* Spacer taking up exact height of AppBar */}
        <Box sx={{ pt: 2, px: 3, pb: 3 }}>
            <DegradedModeBanner />
            <Outlet />
        </Box>
      </Box>

      {/* Support Drawer */}
      <SupportDrawer open={supportDrawerOpen} onClose={() => setSupportDrawerOpen(false)} />
    </Box>
  );
};
