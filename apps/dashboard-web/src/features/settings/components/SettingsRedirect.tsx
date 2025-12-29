import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';

const LAST_SCOPE_KEY = 'farmiq.settings.lastScope.v1';

export const SettingsRedirect: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Determine default scope based on user role
  const defaultScope = user?.roles?.some(role => 
    role === 'platform_admin' || role === 'tenant_admin'
  ) ? 'workspace' : 'account';

  // Get last visited scope from localStorage
  const lastScope = localStorage.getItem(LAST_SCOPE_KEY) as 'account' | 'workspace' | null;

  // Use last scope if valid, otherwise use default
  const targetScope = lastScope && (lastScope === 'account' || lastScope === 'workspace')
    ? lastScope
    : defaultScope;

  return <Navigate to={`/settings/${targetScope}`} replace state={{ from: location }} />;
};
