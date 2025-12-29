import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { hasRequiredRole, Role } from '../config/routes';

interface RoleGateProps {
  requiredRoles?: Role[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  hide?: boolean; // If true, render nothing instead of fallback
}

export const RoleGate: React.FC<RoleGateProps> = ({
  requiredRoles,
  children,
  fallback = null,
  hide = false,
}) => {
  const { user } = useAuth();
  const userRoles = (user?.roles || []) as Role[];
  
  const hasAccess = hasRequiredRole(userRoles, requiredRoles);
  
  if (!hasAccess) {
    if (hide) return null;
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

