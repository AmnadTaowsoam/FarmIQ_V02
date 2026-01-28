import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Divider,
  Toolbar,
  useTheme,
  useMediaQuery,
  alpha,
  Tooltip
} from '@mui/material';
import {
  LayoutDashboard,
  Users,
  Settings,
  Shield,
  FileText,
  BarChart3,
  ChevronRight,
  Building2,
  Database,
  Key,
  Activity
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface AdminSidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  width: number;
}

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: number;
  children?: NavItem[];
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, path: '/overview' },
    ]
  },
  {
    title: 'Tenants',
    items: [
      { label: 'Tenants', icon: Building2, path: '/tenants' },
      { label: 'Quotas', icon: Database, path: '/settings/quotas' },
    ]
  },
  {
    title: 'Identity',
    items: [
      { label: 'Users', icon: Users, path: '/identity/users' },
      { label: 'Roles', icon: Shield, path: '/identity/roles' },
      { label: 'Permissions', icon: Shield, path: '/identity/permission-matrix' },
      { label: 'Custom Roles', icon: Shield, path: '/identity/custom-roles' },
      { label: 'SSO Config', icon: Key, path: '/identity/sso' },
      { label: 'SCIM Config', icon: Key, path: '/identity/scim' },
    ]
  },
  {
    title: 'Devices',
    items: [
      { label: 'Devices', icon: Database, path: '/devices' },
      { label: 'Onboarding', icon: Database, path: '/devices/onboarding' },
    ]
  },
  {
    title: 'Operations',
    items: [
      { label: 'System Health', icon: Activity, path: '/ops/health' },
      { label: 'Sync Dashboard', icon: Activity, path: '/ops/sync' },
      { label: 'MQTT Monitor', icon: Activity, path: '/ops/mqtt' },
      { label: 'Storage', icon: Database, path: '/ops/storage' },
      { label: 'Queue Monitor', icon: Activity, path: '/ops/queues' },
      { label: 'Incidents', icon: Activity, path: '/ops/incidents' },
    ]
  },
  {
    title: 'Billing',
    items: [
      { label: 'Dashboard', icon: BarChart3, path: '/billing' },
    ]
  },
  {
    title: 'Audit',
    items: [
      { label: 'Audit Logs', icon: FileText, path: '/audit-log' },
      { label: 'Data Policy', icon: FileText, path: '/settings/data-policy' },
    ]
  },
  {
    title: 'Settings',
    items: [
      { label: 'Settings', icon: Settings, path: '/settings' },
      { label: 'Notifications', icon: Settings, path: '/settings/notifications' },
      { label: 'Impersonate', icon: Users, path: '/support/impersonate' },
    ]
  },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  mobileOpen,
  onClose,
  isCollapsed,
  width
}) => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const navigate = useNavigate();
  const location = useLocation();

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo Section */}
      <Box
        sx={{
          height: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          px: isCollapsed ? 0 : 3,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(180, 83, 9, 0.3)',
          }}
        >
          <Database size={24} color="white" />
        </Box>
        {!isCollapsed && (
          <Box sx={{ ml: 2 }}>
            <Box
              component="span"
              sx={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'primary.main',
                letterSpacing: -0.5,
              }}
            >
              FarmIQ
            </Box>
            <Box
              component="span"
              sx={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'text.primary',
                letterSpacing: -0.5,
              }}
            >
              Admin
            </Box>
          </Box>
        )}
      </Box>

      {/* Navigation Items */}
      <List sx={{ flex: 1, py: 2, px: 1 }}>
        {navSections.map((section, sectionIndex) => (
          <React.Fragment key={sectionIndex}>
            {section.title && !isCollapsed && (
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  mt: sectionIndex > 0 ? 2 : 0,
                }}
              >
                {section.title}
              </Box>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path ||
                (item.path !== '/overview' && location.pathname.startsWith(item.path));

              return (
                <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                  <Tooltip title={isCollapsed ? item.label : ''} placement="right">
                    <ListItemButton
                      onClick={() => {
                        navigate(item.path);
                        if (!isDesktop) onClose();
                      }}
                      selected={isActive}
                      sx={{
                        borderRadius: 2,
                        py: isCollapsed ? 1.5 : 1.25,
                        px: isCollapsed ? 1.5 : 2,
                        minHeight: 'auto',
                        transition: 'all 0.2s ease',
                        '&.Mui-selected': {
                          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                          '&:hover': {
                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
                          },
                        },
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: 'auto',
                          mr: isCollapsed ? 0 : 2,
                          justifyContent: 'center',
                          color: isActive ? 'primary.main' : 'text.secondary',
                        }}
                      >
                        <Icon size={20} />
                      </ListItemIcon>
                      {!isCollapsed && (
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{
                            variant: 'body2',
                            fontWeight: isActive ? 600 : 500,
                            color: isActive ? 'primary.main' : 'text.primary',
                          }}
                        />
                      )}
                      {!isCollapsed && isActive && (
                        <Box component={ChevronRight} sx={{ ml: 'auto', color: 'primary.main', width: 16, height: 16 }} />
                      )}
                    </ListItemButton>
                  </Tooltip>
                </ListItem>
              );
            })}
            {sectionIndex < navSections.length - 1 && !isCollapsed && (
              <Divider sx={{ my: 1 }} />
            )}
          </React.Fragment>
        ))}
      </List>

      {/* Footer Section */}
      <Box
        sx={{
          p: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        {!isCollapsed && (
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box
              component="span"
              sx={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'text.primary',
                display: 'block',
              }}
            >
              Need Help?
            </Box>
            <Box
              component="span"
              sx={{
                fontSize: '0.7rem',
                color: 'text.secondary',
                display: 'block',
                mt: 0.5,
              }}
            >
              Check documentation
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );

  return (
    <>
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', lg: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: SIDEBAR_WIDTH,
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          },
        }}
      >
        <Toolbar />
        {drawerContent}
      </Drawer>

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', lg: 'block' },
          width: width,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: width,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            position: 'fixed',
            top: 0,
            height: '100vh',
            transition: (theme) =>
              theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </>
  );
};

const SIDEBAR_WIDTH = 280;