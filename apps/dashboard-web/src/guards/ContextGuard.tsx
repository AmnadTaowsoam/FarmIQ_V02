import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useActiveContext } from '../contexts/ActiveContext';
import { ContextRequiredCard } from '../components/feedback/ContextRequiredCard';

interface ContextGuardProps {
  children: React.ReactNode;
  requireTenant?: boolean;
  requireFarm?: boolean;
  requireBarn?: boolean;
  allowBanner?: boolean; // If true, shows card instead of redirecting
}

/**
 * ContextGuard ensures required context is selected before rendering data pages.
 */
export const ContextGuard: React.FC<ContextGuardProps> = ({
  children,
  requireTenant = true,
  requireFarm = false,
  requireBarn = false,
  allowBanner = false,
}) => {
  const { tenantId, farmId, barnId } = useActiveContext();
  const location = useLocation();

  const hasRequired = (() => {
    if (requireTenant && !tenantId) return false;
    if (requireFarm && !farmId) return false;
    if (requireBarn && !barnId) return false;
    return true;
  })();

  if (!hasRequired) {
    // Don't redirect if we're already on the context selection page to avoid redirect loops
    if (location.pathname === '/select-context' || location.pathname === '/select-tenant' || location.pathname === '/select-farm') {
      if (allowBanner) {
        const level = requireBarn ? 'barn' : requireFarm ? 'farm' : 'organization';
        return <ContextRequiredCard requiredLevel={level} />;
      }
      return null; // Allow the context selection page to render
    }
    
    if (allowBanner) {
      const level = requireBarn ? 'barn' : requireFarm ? 'farm' : 'organization';
      return <ContextRequiredCard requiredLevel={level} />;
    }
    return <Navigate to="/select-context" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

/**
 * TenantIsolationGuard checks response data for tenant_id mismatch.
 * This is a runtime safety check to prevent cross-tenant data leakage.
 */
export const useTenantIsolationCheck = (responseTenantId: string | null | undefined) => {
  const { tenantId } = useActiveContext();

  useEffect(() => {
    if (responseTenantId && tenantId && responseTenantId !== tenantId) {
      console.error('Tenant isolation violation detected', {
        expected: tenantId,
        received: responseTenantId,
      });
      // This should trigger an error state in the UI
      throw new Error(
        `Security error: Response tenant_id (${responseTenantId}) does not match active context (${tenantId})`
      );
    }
  }, [responseTenantId, tenantId]);
};

