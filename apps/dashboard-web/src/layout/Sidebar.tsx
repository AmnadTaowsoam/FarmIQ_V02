import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import {
  Box,
  Collapse,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
  useTheme,
  IconButton,
  alpha,
  TextField,
  InputAdornment,
  Popover,
} from '@mui/material';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { getAccessibleRoutes, NAV_SECTIONS, RouteConfig } from '../config/routes';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Settings as SettingsIcon, User, Star, Search, X } from 'lucide-react';
import { useSidebarState } from '../hooks/useSidebarState';
import { PinnedSection } from '../components/sidebar/PinnedSection';
import { RecentsSection } from '../components/sidebar/RecentsSection';

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  width: number;
  expandedWidth: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onClose, isCollapsed, width, expandedWidth }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation('common');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    expandedGroups,
    toggleGroup,
    autoExpandActiveGroup,
    pinnedItems,
    togglePin,
    isPinned,
    recents,
    trackRecent,
  } = useSidebarState();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Flyout state for collapsed mode
  const [flyoutAnchor, setFlyoutAnchor] = useState<HTMLElement | null>(null);
  const [flyoutGroup, setFlyoutGroup] = useState<RouteConfig | null>(null);

  const rolesKey = useMemo(() => (user?.roles || []).join('|'), [user?.roles]);
  const userRoles = useMemo(() => (user?.roles || []) as any[], [rolesKey]);
  const menuItems = useMemo(() => getAccessibleRoutes(userRoles), [userRoles, rolesKey]);

  const isRouteActive = (route: RouteConfig): boolean => {
    if (location.pathname.startsWith(route.path)) return true;
    if (route.children) return route.children.some(isRouteActive);
    return false;
  };

  const resolveLabel = (route: RouteConfig) => {
    if (route.labelKey) return t(route.labelKey);
    return route.label;
  };

  // Auto-expand group containing active route
  useEffect(() => {
    const activeGroup = NAV_SECTIONS.find(section => {
      const sectionRoutes = menuItems.filter(r => r.section === section.key);
      return sectionRoutes.some(isRouteActive);
    });
    if (activeGroup) {
      autoExpandActiveGroup(activeGroup.key);
    }
  }, [location.pathname, menuItems, autoExpandActiveGroup]);

  // Search hotkey (Ctrl/Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigate = useCallback((route: RouteConfig, parentLabel?: string) => {
    navigate(route.path);
    trackRecent(route, parentLabel);
    onClose();
  }, [navigate, trackRecent, onClose]);

  const handleUnpin = useCallback((path: string) => {
    const route = menuItems.find(r => r.path === path);
    if (route) togglePin(route);
  }, [menuItems, togglePin]);

  const handleFlyoutOpen = (event: React.MouseEvent<HTMLElement>, group: RouteConfig) => {
    if (isCollapsed && group.children) {
      setFlyoutAnchor(event.currentTarget);
      setFlyoutGroup(group);
    }
  };

  const handleFlyoutClose = () => {
    setFlyoutAnchor(null);
    setFlyoutGroup(null);
  };


  const renderMenuItems = (routes: RouteConfig[], depth = 0, parentLabel?: string): React.ReactNode => {
    return routes.map((route) => {
      if (route.hideFromMenu) return null;
      const isActive = isRouteActive(route);
      const isGroup = !!route.children?.length;
      const pinned = isPinned(route.path);
      const label = resolveLabel(route);
      const isSubmenu = depth > 0;
      const hasActiveChild = route.children?.some(isRouteActive);

      // Filter by search query
      if (searchQuery && !label.toLowerCase().includes(searchQuery.toLowerCase())) {
        return null;
      }

      if (isGroup) {
        const button = (
          <ListItemButton
            onClick={() => handleNavigate(route, parentLabel)}
            onMouseEnter={(e) => handleFlyoutOpen(e, route)}
            selected={isActive}
            sx={{
              borderRadius: 1.5,
              minHeight: isSubmenu ? 36 : 44,
              py: isSubmenu ? 0.75 : 1.25,
              mb: isSubmenu ? 0.25 : 0.5,
              pl: isCollapsed ? 1.5 : 2 + depth * 2,
              pr: 1,
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              position: 'relative',
              bgcolor: hasActiveChild && !isActive 
                ? (theme) => alpha(theme.palette.primary.main, 0.04)
                : undefined,
              '&::before': {
                content: '""',
                position: 'absolute',
                left: isCollapsed ? 'auto' : 0,
                top: isSubmenu ? 8 : 10,
                bottom: isSubmenu ? 8 : 10,
                width: isSubmenu ? 2 : 3,
                bgcolor: isActive ? 'primary.main' : 'transparent',
                borderRadius: 2,
              },
            }}
          >
            <ListItemIcon 
              sx={{ 
                minWidth: isCollapsed ? 0 : (isSubmenu ? 28 : 34),
                color: 'inherit',
                opacity: isSubmenu ? 0.7 : 1,
                mr: isCollapsed ? 0 : 1 
              }}
            >
              {React.cloneElement(route.icon as React.ReactElement, {
                size: isSubmenu ? 16 : 20
              })}
            </ListItemIcon>
            {!isCollapsed && (
              <>
                <ListItemText
                  primary={label}
                  primaryTypographyProps={{
                    variant: 'body2',
                    fontSize: isSubmenu ? 12 : 14,
                    fontWeight: isSubmenu ? 400 : (isActive ? 600 : 500),
                    color: isSubmenu ? 'text.secondary' : 'text.primary',
                    lineHeight: 1.3,
                    noWrap: true
                  }}
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                />
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePin(route, parentLabel);
                  }}
                  sx={{
                    opacity: pinned ? 1 : 0,
                    transition: 'opacity 0.2s',
                    '&:hover': { opacity: 1 },
                    mr: 0.5,
                  }}
                >
                  <Star size={14} fill={pinned ? 'currentColor' : 'none'} />
                </IconButton>
              </>
            )}
          </ListItemButton>
        );
        return (
          <React.Fragment key={route.path}>
            <ListItem disablePadding>
              {isCollapsed ? (
                <Tooltip title={label} placement="right">
                  {button}
                </Tooltip>
              ) : (
                button
              )}
            </ListItem>
            {!isCollapsed && route.children && (
              <Collapse in={true} timeout="auto" unmountOnExit>
                <Box sx={{ position: 'relative' }}>
                  {/* Visual guide line for submenu */}
                  {depth === 0 && (
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 24,
                        top: 4,
                        bottom: 4,
                        width: 1,
                        bgcolor: 'divider',
                        opacity: 0.3
                      }}
                    />
                  )}
                  <List sx={{ pl: 1 }}>{renderMenuItems(route.children || [], depth + 1, label)}</List>
                </Box>
              </Collapse>
            )}
          </React.Fragment>
        );
      }

      const button = (
        <ListItemButton
          onClick={() => handleNavigate(route, parentLabel)}
          selected={isActive}
          sx={{
            borderRadius: 1.5,
            minHeight: isSubmenu ? 36 : 44,
            py: isSubmenu ? 0.75 : 1.25,
            mb: isSubmenu ? 0.25 : 0.5,
            pl: isCollapsed ? 1.5 : 2 + depth * 2,
            pr: 1,
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            position: 'relative',
            '&:hover .pin-icon': {
              opacity: 1,
            },
            '&::before': {
              content: '""',
              position: 'absolute',
              left: isCollapsed ? 'auto' : 0,
              top: isSubmenu ? 8 : 10,
              bottom: isSubmenu ? 8 : 10,
              width: isSubmenu ? 2 : 3,
              bgcolor: isActive ? 'primary.main' : 'transparent',
              borderRadius: 2,
            },
          }}
        >
          <ListItemIcon 
            sx={{ 
              minWidth: isCollapsed ? 0 : (isSubmenu ? 28 : 34),
              color: 'inherit',
              opacity: isSubmenu ? 0.7 : 1,
              mr: isCollapsed ? 0 : 1 
            }}
          >
            {React.cloneElement(route.icon as React.ReactElement, {
              size: isSubmenu ? 16 : 20
            })}
          </ListItemIcon>
          {!isCollapsed && (
            <>
              <ListItemText
                primary={label}
                primaryTypographyProps={{
                  variant: 'body2',
                  fontSize: isSubmenu ? 12 : 14,
                  fontWeight: isSubmenu ? 400 : (isActive ? 600 : 500),
                  color: isSubmenu ? 'text.secondary' : 'text.primary',
                  lineHeight: 1.3,
                  noWrap: true
                }}
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              />
              <IconButton
                className="pin-icon"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePin(route, parentLabel);
                }}
                sx={{
                  opacity: pinned ? 1 : 0,
                  transition: 'opacity 0.2s',
                }}
              >
                <Star size={14} fill={pinned ? 'currentColor' : 'none'} />
              </IconButton>
            </>
          )}
        </ListItemButton>
      );

      return (
        <ListItem disablePadding key={route.path}>
          {isCollapsed ? (
            <Tooltip title={label} placement="right">
              {button}
            </Tooltip>
          ) : (
            button
          )}
        </ListItem>
      );
    });
  };

  const groupedRoutes = NAV_SECTIONS.map((section) => ({
    ...section,
    routes: menuItems.filter((route) => route.section === section.key),
  })).filter((section) => section.routes.length > 0);

  // Filter groups by search
  const filteredGroups = useMemo(() => {
    if (!searchQuery) return groupedRoutes;
    
    return groupedRoutes.map(group => ({
      ...group,
      routes: group.routes.filter(route => 
        resolveLabel(route).toLowerCase().includes(searchQuery.toLowerCase()) ||
        (route.children && route.children.some(child => 
          resolveLabel(child).toLowerCase().includes(searchQuery.toLowerCase())
        ))
      )
    })).filter(group => group.routes.length > 0);
  }, [searchQuery, groupedRoutes]);

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2, justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
        <Box sx={{ width: 32, height: 32, bgcolor: 'primary.main', borderRadius: 1 }} />
        {!isCollapsed && (
          <Typography variant="h6" fontWeight="bold" color="text.primary">
            {t('app.name')}
          </Typography>
        )}
      </Box>

      {/* Search Input */}
      {!isCollapsed && (
        <Box sx={{ px: 2, pb: 2 }}>
          <TextField
            inputRef={searchInputRef}
            fullWidth
            size="small"
            placeholder="Search menu... (Ctrl+K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                if (searchQuery) {
                  setSearchQuery('');
                } else {
                  e.currentTarget.blur();
                }
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')}>
                    <X size={16} />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
        </Box>
      )}

      <Box sx={{ flexGrow: 1, px: isCollapsed ? 0.5 : 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {/* Pinned Section */}
        <PinnedSection
          items={pinnedItems}
          onUnpin={handleUnpin}
          isCollapsed={isCollapsed}
          onNavigate={(path) => {
            const route = menuItems.find(r => r.path === path);
            if (route) handleNavigate(route);
          }}
        />

        {/* Recents Section */}
        <RecentsSection
          items={recents}
          isCollapsed={isCollapsed}
          onNavigate={(path) => {
            const route = menuItems.find(r => r.path === path);
            if (route) handleNavigate(route);
          }}
        />

        {/* Separator */}
        {(pinnedItems.length > 0 || recents.length > 0) && !isCollapsed && (
          <Divider sx={{ my: 2 }} />
        )}

        {/* Accordion Sections with Sticky Headers */}
        {filteredGroups.map((section) => {
          const isExpanded = searchQuery ? true : expandedGroups.has(section.key);
          return (
            <Box key={section.key} sx={{ mb: 1 }}>
              {!isCollapsed && (
                <Box
                  sx={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    bgcolor: 'background.paper',
                    borderBottom: '1px solid transparent',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderBottomColor: 'divider',
                    },
                  }}
                >
                  <ListItemButton
                    onClick={() => !searchQuery && toggleGroup(section.key)}
                    disabled={!!searchQuery}
                    sx={{
                      borderRadius: 1.5,
                      px: 2,
                      py: 1,
                      bgcolor: isExpanded ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                      '&:hover': {
                        bgcolor: isExpanded
                          ? alpha(theme.palette.primary.main, 0.12)
                          : alpha(theme.palette.text.primary, 0.04),
                      },
                    }}
                  >
                    <Typography
                      variant="overline"
                      sx={{
                        color: isExpanded ? 'primary.main' : 'text.secondary',
                        fontWeight: 700,
                        letterSpacing: 0.6,
                        flexGrow: 1,
                      }}
                    >
                      {t(section.labelKey)}
                    </Typography>
                    {!searchQuery && (isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />)}
                  </ListItemButton>
                </Box>
              )}
              <Collapse in={!isCollapsed && isExpanded} timeout="auto" unmountOnExit>
                <List sx={{ mt: 0.5 }}>{renderMenuItems(section.routes, 0, t(section.labelKey))}</List>
              </Collapse>
              {isCollapsed && (
                <List sx={{ mt: 0.5 }}>{renderMenuItems(section.routes, 0, t(section.labelKey))}</List>
              )}
            </Box>
          );
        })}
      </Box>

      <Divider />
      <Box sx={{ px: isCollapsed ? 1 : 2, py: 1.5 }}>
        <List disablePadding>
          <ListItem disablePadding>
            {isCollapsed ? (
              <Tooltip title={t('nav.items.profile')} placement="right">
                <ListItemButton
                  onClick={() => {
                    navigate('/profile');
                    onClose();
                  }}
                  sx={{ borderRadius: 1.5, justifyContent: 'center' }}
                >
                  <ListItemIcon sx={{ minWidth: 0 }}>
                    <User size={18} />
                  </ListItemIcon>
                </ListItemButton>
              </Tooltip>
            ) : (
              <ListItemButton
                onClick={() => {
                  navigate('/profile');
                  onClose();
                }}
                sx={{ borderRadius: 1.5 }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <User size={18} />
                </ListItemIcon>
                <ListItemText primary={t('nav.items.profile')} primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }} />
              </ListItemButton>
            )}
          </ListItem>
          <ListItem disablePadding>
            {isCollapsed ? (
              <Tooltip title={t('settings.workspace.menuLabel', 'Workspace Settings')} placement="right">
                <ListItemButton
                  onClick={() => {
                    navigate('/settings/workspace');
                    onClose();
                  }}
                  sx={{ borderRadius: 1.5, justifyContent: 'center' }}
                >
                  <ListItemIcon sx={{ minWidth: 0 }}>
                    <SettingsIcon size={18} />
                  </ListItemIcon>
                </ListItemButton>
              </Tooltip>
            ) : (
              <ListItemButton
                onClick={() => {
                  navigate('/settings/workspace');
                  onClose();
                }}
                sx={{ borderRadius: 1.5 }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <SettingsIcon size={18} />
                </ListItemIcon>
                <ListItemText primary={t('settings.workspace.menuLabel', 'Workspace Settings')} primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }} />
              </ListItemButton>
            )}
          </ListItem>
        </List>
      </Box>

      <Divider />
      <Box sx={{ p: 2, textAlign: isCollapsed ? 'center' : 'left' }}>
        {!isCollapsed && (
          <Typography variant="caption" color="text.secondary">
            Powered by FarmIQ
          </Typography>
        )}
      </Box>

      {/* Flyout Popover for Collapsed Mode */}
      <Popover
        open={Boolean(flyoutAnchor)}
        anchorEl={flyoutAnchor}
        onClose={handleFlyoutClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              ml: 1,
              minWidth: 200,
              maxHeight: 400,
              overflowY: 'auto',
            },
          },
        }}
      >
        {flyoutGroup?.children && (
          <List>
            {flyoutGroup.children.map((child) => (
              <ListItem key={child.path} disablePadding>
                <ListItemButton
                  onClick={() => {
                    handleNavigate(child, resolveLabel(flyoutGroup));
                    handleFlyoutClose();
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {child.icon}
                  </ListItemIcon>
                  <ListItemText primary={resolveLabel(child)} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Popover>
    </Box>
  );

  return (
    <Box component="nav" sx={{ width: { md: width }, flexShrink: { md: 0 } }}>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: expandedWidth,
            overflowX: 'hidden'
          },
        }}
      >
        {drawerContent}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width,
            borderRight: '1px solid',
            borderColor: 'divider',
            backgroundImage: `linear-gradient(180deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
            transition: 'width 0.2s ease',
            overflowX: 'hidden',
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};
