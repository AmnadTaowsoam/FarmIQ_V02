import React from 'react';
import { Box, Typography, Breadcrumbs, Link, Stack } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  action?: React.ReactNode;
  actions?: React.ReactNode;
  showHomeBreadcrumb?: boolean;
}

/**
 * AdminPageHeader Component
 * 
 * Consistent page header for all admin pages with title, subtitle, breadcrumbs, and actions.
 * 
 * Example:
 * <AdminPageHeader
 *   title="Tenant Management"
 *   subtitle="Manage tenants and their configurations"
 *   breadcrumbs={[
 *     { label: 'Admin', path: '/admin/overview' },
 *     { label: 'Tenants' }
 *   ]}
 *   actions={
 *     <Button variant="contained" startIcon={<Plus />}>
 *       Create Tenant
 *     </Button>
 *   }
 * />
 */
export const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  action,
  actions,
  showHomeBreadcrumb = true,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-generate breadcrumbs from path if not provided
  const effectiveBreadcrumbs = breadcrumbs || generateBreadcrumbsFromPath(location.pathname);

  return (
    <Box sx={{ mb: 3 }}>
      {/* Breadcrumbs */}
      {effectiveBreadcrumbs.length > 0 && (
        <Breadcrumbs
          separator={<ChevronRight size={16} />}
          sx={{ mb: 2 }}
          aria-label="breadcrumb"
        >
          {showHomeBreadcrumb && (
            <Link
              component="button"
              onClick={() => navigate('/overview')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                color: 'text.secondary',
                textDecoration: 'none',
                '&:hover': {
                  color: 'primary.main',
                  textDecoration: 'underline',
                },
                cursor: 'pointer',
                border: 'none',
                background: 'none',
                padding: 0,
                font: 'inherit',
              }}
            >
              <Home size={16} />
              Admin
            </Link>
          )}
          {effectiveBreadcrumbs.map((crumb, index) => {
            const isLast = index === effectiveBreadcrumbs.length - 1;
            
            if (isLast || !crumb.path) {
              return (
                <Typography
                  key={index}
                  color="text.primary"
                  sx={{ fontSize: 14, fontWeight: 500 }}
                >
                  {crumb.label}
                </Typography>
              );
            }
            
            return (
              <Link
                key={index}
                component="button"
                onClick={() => crumb.path && navigate(crumb.path)}
                sx={{
                  color: 'text.secondary',
                  textDecoration: 'none',
                  fontSize: 14,
                  '&:hover': {
                    color: 'primary.main',
                    textDecoration: 'underline',
                  },
                  cursor: 'pointer',
                  border: 'none',
                  background: 'none',
                  padding: 0,
                  font: 'inherit',
                }}
              >
                {crumb.label}
              </Link>
            );
          })}
        </Breadcrumbs>
      )}

      {/* Title and Actions */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        spacing={2}
        sx={{ mb: subtitle ? 1 : 0 }}
      >
        <Box>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              fontSize: { xs: 24, md: 28 },
            }}
          >
            {title}
          </Typography>
        </Box>
        
        {(actions || action) && (
          <Box sx={{ flexShrink: 0 }}>
            {actions || action}
          </Box>
        )}
      </Stack>

      {/* Subtitle */}
      {subtitle && (
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mt: 1, maxWidth: 800 }}
        >
          {subtitle}
        </Typography>
      )}
    </Box>
  );
};

// Helper to auto-generate breadcrumbs from URL path
function generateBreadcrumbsFromPath(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  
  // Remove 'admin' prefix if present
  if (segments[0] === 'admin') {
    segments.shift();
  }
  
  const breadcrumbs: BreadcrumbItem[] = [];
  let currentPath = '';
  
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    
    // Skip IDs (UUIDs or numeric IDs)
    if (isId(segment)) {
      return;
    }
    
    const label = formatSegmentLabel(segment);
    const isLast = index === segments.length - 1;
    
    breadcrumbs.push({
      label,
      path: isLast ? undefined : currentPath,
    });
  });
  
  return breadcrumbs;
}

// Check if segment looks like an ID
function isId(segment: string): boolean {
  // UUID pattern
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
    return true;
  }
  
  // Numeric ID
  if (/^\d+$/.test(segment)) {
    return true;
  }
  
  return false;
}

// Format segment into readable label
function formatSegmentLabel(segment: string): string {
  // Handle special cases
  const specialLabels: Record<string, string> = {
    'overview': 'Overview',
    'tenants': 'Tenants',
    'users': 'Users',
    'devices': 'Devices',
    'audit': 'Audit Log',
    'identity': 'Identity & Access',
    'roles': 'Roles',
    'permission-matrix': 'Permission Matrix',
    'sso': 'SSO Configuration',
    'onboarding': 'Device Onboarding',
    'ops': 'Operations',
    'health': 'System Health',
    'edge-clusters': 'Edge Clusters',
    'sync': 'Sync Status',
    'mqtt': 'MQTT Monitor',
    'queues': 'Message Queues',
    'storage': 'Storage',
    'incidents': 'Incidents',
    'audit-log': 'Audit Log',
    'access-reviews': 'Access Reviews',
    'data-export': 'Data Export',
    'settings': 'Settings',
    'data-policy': 'Data Policy',
    'notifications': 'Notifications',
    'localization': 'Localization',
    'api-keys': 'API Keys',
    'support': 'Support',
    'impersonate': 'User Impersonation',
    'context-debug': 'Context Debug',
    'runbooks': 'Runbooks',
    'new': 'Create New',
  };
  
  if (specialLabels[segment]) {
    return specialLabels[segment];
  }
  
  // Default: capitalize and replace hyphens/underscores with spaces
  return segment
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
