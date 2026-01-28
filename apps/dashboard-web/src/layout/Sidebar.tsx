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
  IconButton,
  alpha,
  TextField,
  InputAdornment,
  Popover,
  useTheme,
  Chip,
} from '@mui/material';
import { ExpandLess, ExpandMore } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { getAccessibleRoutes, NAV_SECTIONS, RouteConfig } from '../config/routes';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Settings as SettingsIcon, User, Star, Search, X, ChevronRight, Command } from 'lucide-react';
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
              borderRadius: 2,
              minHeight: isSubmenu ? 36 : 44,
              py: isSubmenu ? 0.75 : 1.25,
              mb: 0.5,
              pl: isCollapsed ? 1.5 : 2 + depth * 2,
              pr: 1,
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              position: 'relative',
              color: 'text.secondary',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              bgcolor: hasActiveChild && !isActive
                ? alpha(theme.palette.primary.main, 0.04)
                : undefined,
              '&:hover': {
                color: 'text.primary',
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                transform: 'translateX(4px)',
              },
              '&.Mui-selected': {
                 bgcolor: alpha(theme.palette.primary.main, 0.12),
                 color: 'primary.main',
                 fontWeight: 600,
                 '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.16),
                 }
              }
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: isCollapsed ? 0 : (isSubmenu ? 28 : 34),
                color: isActive ? 'primary.main' : 'inherit',
                opacity: isSubmenu && !isActive ? 0.7 : 1,
                mr: isCollapsed ? 0 : 1,
                transition: 'color 0.2s',
              }}
            >
              {React.cloneElement(route.icon as React.ReactElement, {
                size: isSubmenu ? 18 : 20,
                strokeWidth: isActive ? 2.5 : 2
              })}
            </ListItemIcon>
            {!isCollapsed && (
              <>
                <ListItemText
                  primary={label}
                  primaryTypographyProps={{
                    variant: 'body2',
                    fontSize: isSubmenu ? 13 : 14,
                    fontWeight: isSubmenu ? 400 : (isActive ? 600 : 500),
                    color: 'inherit',
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
                    transition: 'all 0.2s',
                    '&:hover': { opacity: 1, color: 'accent.gold' },
                    color: pinned ? 'accent.gold' : 'text.disabled',
                    mr: 0.5,
                    transform: pinned ? 'scale(1)' : 'scale(0.8)',
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
            <ListItem disablePadding sx={{ display: 'block' }}>
              {isCollapsed ? (
                <Tooltip title={label} placement="right" arrow>
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
                        left: 26,
                        top: 0,
                        bottom: 0,
                        width: '1px',
                        bgcolor: 'divider',
                        opacity: 0.5
                      }}
                    />
                  )}
                  <List component="div" disablePadding sx={{ pl: 0 }}>
                    {renderMenuItems(route.children || [], depth + 1, label)}
                  </List>
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
            borderRadius: 2,
            minHeight: isSubmenu ? 36 : 44,
            py: isSubmenu ? 0.75 : 1.25,
            mb: 0.5,
            pl: isCollapsed ? 1.5 : 2 + depth * 2,
            pr: 1,
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            position: 'relative',
            color: 'text.secondary',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              color: 'text.primary',
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              transform: isCollapsed ? 'none' : 'translateX(4px)',
              '& .pin-icon': { opacity: 1, transform: 'scale(1)' }
            },
            '&.Mui-selected': {
                background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0.15)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                color: 'primary.main',
                fontWeight: 600,
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    right: 0,
                    top: '10%',
                    bottom: '10%',
                    width: 3,
                    borderRadius: '4px 0 0 4px',
                    bgcolor: 'primary.main',
                },
                '&:hover': {
                    bgcolor: alpha(theme.palette.primary.main, 0.2),
                }
            }
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: isCollapsed ? 0 : (isSubmenu ? 28 : 34),
              color: isActive ? 'primary.main' : 'inherit',
              opacity: isSubmenu && !isActive ? 0.7 : 1,
              mr: isCollapsed ? 0 : 1,
              transition: 'color 0.2s',
            }}
          >
            {React.cloneElement(route.icon as React.ReactElement, {
              size: isSubmenu ? 18 : 20,
              strokeWidth: isActive ? 2.5 : 2
            })}
          </ListItemIcon>
          {!isCollapsed && (
            <>
              <ListItemText
                primary={label}
                primaryTypographyProps={{
                  variant: 'body2',
                  fontSize: isSubmenu ? 13 : 14,
                  fontWeight: isSubmenu ? 400 : (isActive ? 600 : 500),
                  color: 'inherit',
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
                  transition: 'all 0.2s',
                  transform: pinned ? 'scale(1)' : 'scale(0.8)',
                  color: pinned ? 'accent.gold' : 'text.disabled',
                  '&:hover': { color: 'accent.gold' }
                }}
              >
                <Star size={14} fill={pinned ? 'currentColor' : 'none'} />
              </IconButton>
            </>
          )}
        </ListItemButton>
      );

      return (
        <ListItem disablePadding key={route.path} sx={{ display: 'block' }}>
          {isCollapsed ? (
            <Tooltip title={label} placement="right" arrow>
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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflowX: 'hidden', color: 'text.primary', bgcolor: 'background.paper' }}>
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2, justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
        <Box sx={{ 
            width: 36, 
            height: 36, 
            background: theme.palette.primary.gradient, 
            borderRadius: 1.5,
            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            flexShrink: 0
        }}>
            <Box component="img" src="/favicon.ico" sx={{ width: 24, height: 24, filter: 'brightness(0) invert(1)' }} onError={(e) => e.currentTarget.style.display = 'none'} />
        </Box>
        {!isCollapsed && (
          <Box>
            <Typography variant="h6" fontWeight="800" sx={{ color: 'text.primary', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {t('app.name')}
            </Typography>
            <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 600, letterSpacing: '0.05em' }}>
              PLATFORM
            </Typography>
          </Box>
        )}
      </Box>

      {/* Search Input */}
      {!isCollapsed && (
        <Box sx={{ px: 2, pb: 2 }}>
          <TextField
            inputRef={searchInputRef}
            fullWidth
            size="small"
            placeholder={t('nav.search', 'Search...')}
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
                  <Search size={16} color={theme.palette.text.secondary} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                    {searchQuery ? (
                        <IconButton size="small" onClick={() => setSearchQuery('')}>
                            <X size={14} />
                        </IconButton>
                    ) : (
                        <Box sx={{ 
                            border: `1px solid ${theme.palette.divider}`, 
                            borderRadius: 1, 
                            px: 0.5, 
                            py: 0.2, 
                            display: 'flex', 
                            alignItems: 'center',
                            bgcolor: 'action.hover'
                        }}>
                            <Command size={10} style={{ marginRight: 2 }} />
                            <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 700 }}>K</Typography>
                        </Box>
                    )}
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                bgcolor: alpha(theme.palette.background.default, 0.6),
                transition: 'all 0.2s',
                '& fieldset': { borderColor: 'transparent' },
                '&:hover': { bgcolor: alpha(theme.palette.background.default, 0.8) },
                '&.Mui-focused': {
                  bgcolor: 'background.paper',
                  boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
                  '& fieldset': { borderColor: 'primary.main' },
                },
              },
            }}
          />
        </Box>
      )}

      <Box sx={{ flexGrow: 1, px: isCollapsed ? 1 : 2, overflowY: 'auto', overflowX: 'hidden', pb: 2 }}>
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
          <Divider sx={{ my: 2, borderStyle: 'dashed' }} />
        )}

        {/* Accordion Sections with Sticky Headers */}
        {filteredGroups.map((section) => {
          const isExpanded = searchQuery ? true : expandedGroups.has(section.key);
          return (
            <Box key={section.key} sx={{ mb: 1 }}>
              {!isCollapsed && (
                <ListItemButton
                  onClick={() => !searchQuery && toggleGroup(section.key)}
                  disabled={!!searchQuery}
                  sx={{
                    borderRadius: 2,
                    px: 1.5,
                    py: 0.5,
                    mb: 0.5,
                    mt: 1.5,
                    color: 'text.secondary',
                    '&:hover': {
                      color: 'primary.main',
                      bgcolor: 'transparent'
                    },
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      flexGrow: 1,
                      color: isExpanded ? 'primary.main' : 'text.disabled',
                      transition: 'color 0.2s'
                    }}
                  >
                    {t(section.labelKey)}
                  </Typography>
                  {!searchQuery && (
                    <Box sx={{ 
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', 
                        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        display: 'flex',
                        color: isExpanded ? 'primary.main' : 'text.disabled'
                    }}>
                        <ExpandMore fontSize="small" sx={{ fontSize: 16 }} />
                    </Box>
                  )}
                </ListItemButton>
              )}
              
              {/* Divider for collapsed mode to separate sections */}
              {isCollapsed && (
                 <Divider sx={{ my: 1, width: '40%', mx: 'auto', opacity: 0.5 }} />
              )}

              <Collapse in={!isCollapsed && isExpanded} timeout="auto" unmountOnExit>
                <List disablePadding>{renderMenuItems(section.routes, 0, t(section.labelKey))}</List>
              </Collapse>
              {isCollapsed && (
                <List disablePadding>{renderMenuItems(section.routes, 0, t(section.labelKey))}</List>
              )}
            </Box>
          );
        })}

        {/* Non-grouped Items (Help, Guide, Changelog) */}
        {menuItems.filter(r => !r.section && !r.hideFromMenu).length > 0 && (
            <Box sx={{ mt: 2 }}>
                {!isCollapsed && <Divider sx={{ my: 2, borderStyle: 'dashed' }} />}
                <List disablePadding>
                    {renderMenuItems(menuItems.filter(r => !r.section && !r.hideFromMenu))}
                </List>
            </Box>
        )}
      </Box>

      <Divider />
      <Box sx={{ px: isCollapsed ? 1 : 2, py: 1.5, bgcolor: alpha(theme.palette.background.default, 0.5) }}>
        <List disablePadding>
          <ListItem disablePadding>
            {isCollapsed ? (
              <Tooltip title={t('nav.items.profile')} placement="right" arrow>
                <ListItemButton
                  onClick={() => {
                    navigate('/profile');
                    onClose();
                  }}
                  sx={{ borderRadius: 2, justifyContent: 'center', mb: 0.5 }}
                >
                  <ListItemIcon sx={{ minWidth: 0 }}>
                    <User size={20} />
                  </ListItemIcon>
                </ListItemButton>
              </Tooltip>
            ) : (
              <ListItemButton
                onClick={() => {
                  navigate('/profile');
                  onClose();
                }}
                sx={{ 
                    borderRadius: 2, 
                    color: 'text.secondary', 
                    mb: 0.5,
                    '&:hover': { color: 'text.primary', bgcolor: alpha(theme.palette.primary.main, 0.08) } 
                }}
              >
                <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
                  <User size={18} />
                </ListItemIcon>
                <ListItemText primary={t('nav.items.profile')} primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }} />
              </ListItemButton>
            )}
          </ListItem>
          <ListItem disablePadding>
            {isCollapsed ? (
              <Tooltip title={t('settings.workspace.menuLabel', 'Workspace Settings')} placement="right" arrow>
                <ListItemButton
                  onClick={() => {
                    navigate('/settings/workspace');
                    onClose();
                  }}
                  sx={{ borderRadius: 2, justifyContent: 'center' }}
                >
                  <ListItemIcon sx={{ minWidth: 0 }}>
                    <SettingsIcon size={20} />
                  </ListItemIcon>
                </ListItemButton>
              </Tooltip>
            ) : (
              <ListItemButton
                onClick={() => {
                  navigate('/settings/workspace');
                  onClose();
                }}
                sx={{ 
                    borderRadius: 2, 
                    color: 'text.secondary',
                    '&:hover': { color: 'text.primary', bgcolor: alpha(theme.palette.primary.main, 0.08) } 
                }}
              >
                <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
                  <SettingsIcon size={18} />
                </ListItemIcon>
                <ListItemText primary={t('settings.workspace.menuLabel', 'Workspace Settings')} primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }} />
              </ListItemButton>
            )}
          </ListItem>
        </List>
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
              ml: 1.5,
              minWidth: 220,
              maxHeight: 400,
              overflowY: 'auto',
              borderRadius: 3,
              boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)',
              border: `1px solid ${theme.palette.divider}`,
            },
          },
        }}
        disableRestoreFocus
        sx={{ pointerEvents: 'none' }} // Allow hovering back to sidebar
      >
        <Box sx={{ p: 1.5, bgcolor: 'background.paper', pointerEvents: 'auto' }}>
            <Typography variant="subtitle2" sx={{ px: 1.5, py: 1, color: 'text.secondary', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: 11 }}>
                {flyoutGroup && resolveLabel(flyoutGroup)}
            </Typography>
            <Divider sx={{ my: 0.5 }} />
            {flyoutGroup?.children && (
            <List disablePadding>
                {flyoutGroup.children.map((child) => (
                <ListItem key={child.path} disablePadding>
                    <ListItemButton
                    onClick={() => {
                        handleNavigate(child, resolveLabel(flyoutGroup));
                        handleFlyoutClose();
                    }}
                    sx={{ borderRadius: 1.5 }}
                    >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                        {React.cloneElement(child.icon as React.ReactElement, { size: 16 })}
                    </ListItemIcon>
                    <ListItemText primary={resolveLabel(child)} primaryTypographyProps={{ fontSize: 13, fontWeight: 500 }} />
                    </ListItemButton>
                </ListItem>
                ))}
            </List>
            )}
        </Box>
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
            backgroundColor: 'background.paper',
            borderRight: '1px solid',
            borderColor: 'divider',
            backgroundImage: 'none',
            boxShadow: 'none',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
