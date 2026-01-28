import React, { useMemo, useState } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  IconButton,
  Menu,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Toolbar,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import { HelpCircle, Menu as MenuIcon, Monitor, Moon, Sun, BookOpen, Keyboard, Bug, MessageCircle, FileText } from 'lucide-react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useThemeMode } from '../hooks/useThemeMode';
import { useSettings } from '../contexts/SettingsContext';
import { ContextSelector } from '../components/forms/ContextSelector';
import { TimeRangeSelector } from '../components/forms/TimeRangeSelector';
import { useTranslation } from 'react-i18next';
import { TopbarStatus } from '../components/TopbarStatus';
import { KeyboardShortcutsModal } from '../features/help/components/KeyboardShortcutsModal';
import { NotificationBell } from '../components/notifications/NotificationBell';

interface TopbarProps {
  onMenuClick: () => void;
  onSupportOpen: () => void;
  isCollapsed: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({ onMenuClick, isCollapsed }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { themeMode, setThemeMode, resolvedMode } = useThemeMode();
  const { language, setLanguage } = useSettings();
  const { t } = useTranslation('common');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [helpAnchorEl, setHelpAnchorEl] = useState<null | HTMLElement>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const menuOpen = Boolean(anchorEl);

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

  const handleHelpMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setHelpAnchorEl(event.currentTarget);
  };

  const handleHelpMenuClose = () => {
    setHelpAnchorEl(null);
  };

  const nextThemeMode = useMemo(() => {
    if (themeMode === 'light') return 'dark';
    if (themeMode === 'dark') return 'system';
    return 'light';
  }, [themeMode]);

  const themeIcon = themeMode === 'system' ? (
    <Monitor size={18} />
  ) : resolvedMode === 'dark' ? (
    <Moon size={18} />
  ) : (
    <Sun size={18} />
  );

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
        zIndex: (muiTheme) => muiTheme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 'auto', md: 72 }, py: { xs: 1, md: 0 } }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            width: '100%',
            flexWrap: 'wrap',
          }}
        >
          {/* LEFT GROUP: Menu + Brand */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: '1 1 auto', minWidth: 0 }}>
            <Tooltip title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              <IconButton
                color="inherit"
                edge="start"
                onClick={onMenuClick}
              >
                <MenuIcon size={20} />
              </IconButton>
            </Tooltip>
            <Box
              component={RouterLink}
              to="/overview"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <Box sx={{ width: 28, height: 28, bgcolor: 'primary.main', borderRadius: 1 }} />
              <Typography variant="h6" fontWeight={700} sx={{ display: { xs: 'none', sm: 'block' } }}>
                {t('app.name')}
              </Typography>
            </Box>
          </Box>

          {/* RIGHT GROUP: Context + Time + Status + Actions + Profile */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              flex: '0 1 auto',
              ml: { xs: 0, md: 'auto' },
              flexWrap: 'wrap',
            }}
          >
            <Box sx={{ display: { xs: 'none', md: 'block' }, minWidth: 0 }}>
              <ContextSelector />
            </Box>

            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <TimeRangeSelector />
            </Box>

            <TopbarStatus />
            
            <NotificationBell />

            <Tooltip title="Help">
              <IconButton color="inherit" onClick={handleHelpMenuOpen}>
                <HelpCircle size={18} />
              </IconButton>
            </Tooltip>

            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <Tooltip title={`Theme: ${themeMode} → ${nextThemeMode}`}>
                <IconButton
                  color="inherit"
                  onClick={() => setThemeMode(nextThemeMode)}
                >
                  {themeIcon}
                </IconButton>
              </Tooltip>
            </Box>

            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <ToggleButtonGroup
                value={language}
                exclusive
                size="small"
                onChange={(_, value) => {
                  if (value === 'th' || value === 'en') {
                    setLanguage(value);
                  }
                }}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.default',
                  '& .MuiToggleButton-root': {
                    px: 1.25,
                    py: 0.35,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                  },
                }}
              >
                <ToggleButton value="th">TH</ToggleButton>
                <ToggleButton value="en">EN</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <IconButton onClick={handleMenuOpen} sx={{ p: 0.5 }}>
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: 'primary.main',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                {user?.name?.[0] || 'U'}
              </Avatar>
            </IconButton>
          </Box>
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={handleMenuClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem
            onClick={() => {
              handleMenuClose();
              navigate('/profile');
            }}
          >
            {t('nav.items.profile')}
          </MenuItem>
          <MenuItem
            onClick={() => {
              handleMenuClose();
              navigate('/settings/account');
            }}
          >
            {t('settings.account.menuLabel', 'Account Settings')}
          </MenuItem>
          <MenuItem
            onClick={() => {
              handleMenuClose();
              handleLogout();
            }}
          >
            Logout
          </MenuItem>
        </Menu>

        {/* Help Menu */}
        <Menu
          anchorEl={helpAnchorEl}
          open={Boolean(helpAnchorEl)}
          onClose={handleHelpMenuClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem
            onClick={() => {
              handleHelpMenuClose();
              navigate('/help');
            }}
          >
            <BookOpen size={18} style={{ marginRight: 8 }} />
            Help Center
          </MenuItem>
          <MenuItem
            onClick={() => {
              handleHelpMenuClose();
              navigate('/user-guide');
            }}
          >
            <FileText size={18} style={{ marginRight: 8 }} />
            User Guide
          </MenuItem>
          <MenuItem
            onClick={() => {
              handleHelpMenuClose();
              setShortcutsOpen(true);
            }}
          >
            <Keyboard size={18} style={{ marginRight: 8 }} />
            Keyboard Shortcuts
          </MenuItem>
          <MenuItem
            onClick={() => {
              handleHelpMenuClose();
              window.open('https://github.com/farmiq/issues/new', '_blank');
            }}
          >
            <Bug size={18} style={{ marginRight: 8 }} />
            Report a Bug
          </MenuItem>
          <MenuItem
            onClick={() => {
              handleHelpMenuClose();
              window.location.href = 'mailto:support@farmiq.ai';
            }}
          >
            <MessageCircle size={18} style={{ marginRight: 8 }} />
            Contact Support
          </MenuItem>
          <MenuItem
            onClick={() => {
              handleHelpMenuClose();
              navigate('/changelog');
            }}
          >
            <FileText size={18} style={{ marginRight: 8 }} />
            Changelog
          </MenuItem>
        </Menu>

        {/* Keyboard Shortcuts Modal */}
        <KeyboardShortcutsModal 
          open={shortcutsOpen} 
          onClose={() => setShortcutsOpen(false)} 
        />
      </Toolbar>
    </AppBar>
  );
};
