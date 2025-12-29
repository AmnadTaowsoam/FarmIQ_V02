import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from '../components/feedback/LoadingScreen';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const hasRole = user.roles.some(role => allowedRoles.includes(role));

  if (!hasRole) {
    return <Navigate to="/403" replace />; // Redirect to Forbidden page
  }

  return <>{children}</>;
};
