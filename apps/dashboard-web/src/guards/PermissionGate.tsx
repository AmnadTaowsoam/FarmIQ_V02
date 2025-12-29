import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, Tooltip } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import {
  AdminRole,
  Permission,
  PermissionContext,
  PermissionScope,
  hasPermission,
  hasAnyRole,
  getUserAdminRoles,
} from '../lib/permissions';

// ============================================================================
// TYPES
// ============================================================================

type PermissionGateMode = 'route' | 'ui';

interface BasePermissionGateProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface RoutePermissionGateProps extends BasePermissionGateProps {
  mode?: 'route';
  requiredRoles?: AdminRole[];
  requiredPermissions?: Permission[];
  requireAll?: boolean;
  scope?: PermissionScope;
}

interface UIPermissionGateProps extends BasePermissionGateProps {
  mode: 'ui';
  requiredRoles?: AdminRole[];
  requiredPermissions?: Permission[];
  requireAll?: boolean;
  scope?: PermissionScope;
  showTooltip?: boolean;
  tooltipText?: string;
  disableOnly?: boolean; // If true, show disabled state instead of hiding
}

type PermissionGateProps = RoutePermissionGateProps | UIPermissionGateProps;

// ============================================================================
// PERMISSION GATE COMPONENT
// ============================================================================

/**
 * PermissionGate - Flexible permission-based access control
 * 
 * Modes:
 * - route: Redirects to 403 if permission denied (default)
 * - ui: Hides or disables UI elements if permission denied
 * 
 * Examples:
 * 
 * // Route protection (redirects to 403)
 * <PermissionGate requiredRoles={['SUPER_ADMIN']}>
 *   <AdminPage />
 * </PermissionGate>
 * 
 * // UI element hiding
 * <PermissionGate mode="ui" requiredPermissions={['DEVICE_ONBOARD']}>
 *   <Button>Onboard Device</Button>
 * </PermissionGate>
 * 
 * // UI element disabling with tooltip
 * <PermissionGate 
 *   mode="ui" 
 *   requiredPermissions={['DEVICE_CONFIG_PUBLISH']}
 *   disableOnly
 *   showTooltip
 * >
 *   <Button>Publish Config</Button>
 * </PermissionGate>
 * 
 * // Scope-based permission
 * <PermissionGate
 *   mode="ui"
 *   requiredPermissions={['DEVICE_ASSIGN']}
 *   scope={{ tenantId: 'tenant-123' }}
 * >
 *   <Button>Assign Device</Button>
 * </PermissionGate>
 */
export const PermissionGate: React.FC<PermissionGateProps> = (props) => {
  const {
    children,
    fallback,
    requiredRoles = [],
    requiredPermissions = [],
    requireAll = false,
    scope,
  } = props;

  const mode: PermissionGateMode = props.mode || 'route';
  const { user } = useAuth();
  const location = useLocation();

  // Get user's admin roles
  const userAuthRoles = user?.roles || [];
  const adminRoles = getUserAdminRoles(userAuthRoles);

  // Build permission context
  const context: PermissionContext = {
    roles: adminRoles,
    scope: scope || {},
  };

  // Check role-based access
  const hasRequiredRole = requiredRoles.length === 0 || hasAnyRole(context, requiredRoles);

  // Check permission-based access
  let hasRequiredPermissions = true;
  if (requiredPermissions.length > 0) {
    if (requireAll) {
      hasRequiredPermissions = requiredPermissions.every((perm) =>
        hasPermission(context, perm, scope)
      );
    } else {
      hasRequiredPermissions = requiredPermissions.some((perm) =>
        hasPermission(context, perm, scope)
      );
    }
  }

  const hasAccess = hasRequiredRole && hasRequiredPermissions;

  // Route mode: redirect to 403 if no access
  if (mode === 'route') {
    if (!hasAccess) {
      return <Navigate to="/403" state={{ from: location }} replace />;
    }
    return <>{children}</>;
  }

  // UI mode: hide, disable, or show tooltip
  if (mode === 'ui') {
    const uiProps = props as UIPermissionGateProps;
    const { showTooltip = false, tooltipText, disableOnly = false } = uiProps;

    if (!hasAccess) {
      // If disableOnly, wrap in disabled state
      if (disableOnly) {
        const disabledChild = React.cloneElement(children as React.ReactElement, {
          disabled: true,
          sx: {
            ...(children as React.ReactElement).props.sx,
            opacity: 0.5,
            cursor: 'not-allowed',
          },
        });

        if (showTooltip) {
          const defaultTooltip = 'You do not have permission to perform this action';
          return (
            <Tooltip title={tooltipText || defaultTooltip} arrow>
              <Box component="span" sx={{ display: 'inline-block' }}>
                {disabledChild}
              </Box>
            </Tooltip>
          );
        }

        return disabledChild;
      }

      // Otherwise, hide completely or show fallback
      return <>{fallback || null}</>;
    }

    return <>{children}</>;
  }

  return <>{children}</>;
};

// ============================================================================
// HOOK: usePermissions
// ============================================================================

/**
 * Hook to check permissions programmatically
 * 
 * Example:
 * const { hasPermission, hasRole } = usePermissions();
 * 
 * if (hasPermission('DEVICE_ONBOARD')) {
 *   // Show onboarding button
 * }
 */
export function usePermissions() {
  const { user } = useAuth();
  const userAuthRoles = user?.roles || [];
  const adminRoles = getUserAdminRoles(userAuthRoles);

  const context: PermissionContext = {
    roles: adminRoles,
    scope: {},
  };

  return {
    roles: adminRoles,
    hasRole: (role: AdminRole) => adminRoles.includes(role),
    hasAnyRole: (roles: AdminRole[]) => hasAnyRole(context, roles),
    hasPermission: (permission: Permission, scope?: PermissionScope) =>
      hasPermission(context, permission, scope),
    hasAnyPermission: (permissions: Permission[], scope?: PermissionScope) =>
      permissions.some((perm) => hasPermission(context, perm, scope)),
    hasAllPermissions: (permissions: Permission[], scope?: PermissionScope) =>
      permissions.every((perm) => hasPermission(context, perm, scope)),
  };
}
