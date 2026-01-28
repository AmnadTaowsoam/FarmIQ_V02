import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  IconButton, 
  Typography, 
  Box, 
  Avatar, 
  Menu, 
  MenuItem, 
  alpha, 
  Tooltip,
  Badge,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { Menu as MenuIcon, Bell, Search, Globe, LogOut, User, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const SIDEBAR_WIDTH = 280;
const SIDEBAR_COLLAPSED_WIDTH = 88;

interface AdminTopbarProps {
  onMenuClick: () => void;
  isCollapsed: boolean;
}

export const AdminTopbar: React.FC<AdminTopbarProps> = ({ onMenuClick, isCollapsed }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const sidebarWidth = isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        bgcolor: (theme) => alpha(theme.palette.background.paper, 0.8),
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid',
        borderColor: 'divider',
        color: 'text.primary',
        zIndex: (theme) => theme.zIndex.drawer + 1,
        // Responsive width and margin logic
        width: {
            lg: `calc(100% - ${sidebarWidth}px)`
        },
        ml: {
            lg: `${sidebarWidth}px`
        },
        transition: (theme) => theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
      }}
    >
      <Toolbar sx={{ minHeight: 80 }}>
        <IconButton
          color="inherit"
          onClick={onMenuClick}
          edge="start"
          sx={{ mr: 2, display: { lg: 'none' } }}
        >
          <MenuIcon />
        </IconButton>

        {/* Toggle button for Desktop (Collapse/Expand) */}
        <IconButton
          color="inherit"
          onClick={onMenuClick}
          edge="start"
          sx={{ mr: 2, display: { xs: 'none', lg: 'inline-flex' } }}
        >
          <MenuIcon />
        </IconButton>

        <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 2 }}>
            <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                bgcolor: 'action.hover', 
                px: 2, py: 0.8, 
                borderRadius: 2, 
                width: 300
            }}>
                <Search size={18} style={{ opacity: 0.5 }} />
                <Typography variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
                    Search platform settings...
                </Typography>
            </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 'auto' }}>
            <Tooltip title="Platform Notifications">
                <IconButton color="inherit">
                    <Badge badgeContent={4} color="error">
                        <Bell size={20} />
                    </Badge>
                </IconButton>
            </Tooltip>

            <Tooltip title="Switch Language">
                <IconButton color="inherit">
                    <Globe size={20} />
                </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ mx: 1, height: 24, alignSelf: 'center' }} />

            <Box sx={{ textAlign: 'right', mr: 1, display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="body2" fontWeight="700">
                    {user?.name || 'Platform Admin'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    Super User
                </Typography>
            </Box>

            <IconButton onClick={handleMenuOpen} sx={{ p: 0.5 }}>
                <Avatar 
                    sx={{ 
                        width: 40, 
                        height: 40, 
                        bgcolor: 'primary.main',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(180, 83, 9, 0.2)'
                    }}
                >
                    {user?.name?.[0] || 'A'}
                </Avatar>
            </IconButton>
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{
            paper: {
                sx: { 
                    mt: 1.5, minWidth: 200, borderRadius: 2, 
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                    border: '1px solid',
                    borderColor: 'divider'
                }
            }
          }}
        >
          <MenuItem onClick={() => { handleMenuClose(); navigate('/profile'); }}>
            <User size={18} style={{ marginRight: 12 }} /> Profile Settings
          </MenuItem>
          <MenuItem onClick={() => { handleMenuClose(); navigate('/settings'); }}>
            <Settings size={18} style={{ marginRight: 12 }} /> Platform Settings
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
            <LogOut size={18} style={{ marginRight: 12 }} /> Sign Out
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};
