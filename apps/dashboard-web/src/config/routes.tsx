import React from 'react';
import {
  LayoutDashboard,
  Warehouse,
  Building2,
  Server,
  Activity,
  Scale,
  TrendingUp,
  UtensilsCrossed,
  Brain,
  AlertCircle,
  Bell,
  FileText,
  Settings,
  Users,
  Shield,
  Eye,
  Database,
  BarChart3,
  ClipboardList,
} from 'lucide-react';

export type Role = 'platform_admin' | 'tenant_admin' | 'farm_manager' | 'operator' | 'viewer';

const FEED_PROGRAMS_ENABLED = import.meta.env.VITE_FEED_PROGRAMS_ENABLED === 'true';

export type NavSectionKey = 'operations' | 'ai' | 'admin';

export interface RouteConfig {
  path: string;
  label: string;
  labelKey?: string;
  icon: React.ReactNode;
  requiredRoles?: Role[];
  hideFromMenu?: boolean;
  section?: NavSectionKey;
  children?: RouteConfig[];
}

export const NAV_SECTIONS: { key: NavSectionKey; labelKey: string }[] = [
  { key: 'operations', labelKey: 'nav.sections.operations' },
  { key: 'ai', labelKey: 'nav.sections.ai' },
  { key: 'admin', labelKey: 'nav.sections.admin' },
];

export const ROUTES: RouteConfig[] = [
  {
    path: '/profile',
    label: 'Profile',
    labelKey: 'nav.items.profile',
    icon: <Users size={20} />,
    hideFromMenu: true,
  },
  {
    path: '/overview',
    label: 'Overview',
    labelKey: 'nav.items.overview',
    icon: <LayoutDashboard size={20} />,
    section: 'operations',
  },
  {
    path: '/farms',
    label: 'Farms',
    labelKey: 'nav.items.farms',
    icon: <Warehouse size={20} />,
    section: 'operations',
  },
  {
    path: '/barns',
    label: 'Barns',
    labelKey: 'nav.items.barns',
    icon: <Building2 size={20} />,
    section: 'operations',
    requiredRoles: ['platform_admin', 'tenant_admin', 'farm_manager', 'operator', 'viewer'],
    children: [
      {
        path: '/barns',
        label: 'Overview',
        icon: <LayoutDashboard size={18} />,
        requiredRoles: ['platform_admin', 'tenant_admin', 'farm_manager', 'operator', 'viewer'],
      },
      {
        path: '/barns/records',
        label: 'Health & Records',
        icon: <ClipboardList size={18} />,
        requiredRoles: ['platform_admin', 'tenant_admin', 'farm_manager', 'operator', 'viewer'],
      },
      {
        path: '/barns/batches',
        label: 'Batches & Flocks',
        icon: <ClipboardList size={18} />,
        requiredRoles: ['platform_admin', 'tenant_admin', 'farm_manager', 'operator', 'viewer'],
      },
    ],
  },
  {
    path: '/devices',
    label: 'Devices',
    labelKey: 'nav.items.devices',
    icon: <Server size={20} />,
    section: 'operations',
    children: [
      {
        path: '/devices',
        label: 'Inventory',
        icon: <Server size={18} />,
      },
      {
        path: '/devices/status',
        label: 'Status',
        icon: <Activity size={18} />,
      },
    ],
  },
  {
    path: '/telemetry',
    label: 'Telemetry',
    labelKey: 'nav.items.telemetry',
    icon: <Activity size={20} />,
    section: 'operations',
  },
  {
    path: '/standards',
    label: 'Standards',
    icon: <Database size={20} />,
    section: 'operations',
  },
  {
    path: '/weighvision',
    label: 'WeighVision',
    labelKey: 'nav.items.weighvision',
    icon: <Scale size={20} />,
    section: 'operations',
    children: [
      {
        path: '/weighvision/sessions',
        label: 'Sessions',
        labelKey: 'nav.items.sessions',
        icon: <FileText size={18} />,
      },
      {
        path: '/weighvision/analytics',
        label: 'Analytics',
        labelKey: 'nav.items.analytics',
        icon: <TrendingUp size={18} />,
      },
      {
        path: '/weighvision/distribution',
        label: 'Size Distribution',
        labelKey: 'nav.items.distribution',
        icon: <BarChart3 size={18} />,
      },
    ],
  },
  {
    path: '/sensors',
    label: 'Sensors',
    labelKey: 'nav.items.sensors',
    icon: <Activity size={20} />,
    section: 'operations',
    children: [
      {
        path: '/sensors/catalog',
        label: 'Catalog',
        labelKey: 'nav.items.sensorCatalog',
        icon: <Database size={18} />,
      },
      {
        path: '/sensors/bindings',
        label: 'Bindings',
        labelKey: 'nav.items.sensorBindings',
        icon: <Activity size={18} />,
      },
      {
        path: '/sensors/matrix',
        label: 'Sensor Matrix',
        labelKey: 'nav.items.sensorMatrix',
        icon: <Database size={18} />,
      },
      {
        path: '/sensors/trends',
        label: 'Trends & Correlation',
        labelKey: 'nav.items.sensorTrends',
        icon: <TrendingUp size={18} />,
      },
    ],
  },
  {
    path: '/feeding',
    label: 'Feeding Module',
    icon: <UtensilsCrossed size={20} />,
    requiredRoles: ['platform_admin', 'tenant_admin', 'farm_manager', 'operator', 'viewer'],
    section: 'operations',
    children: [
      {
        path: '/feeding/kpi',
        label: 'KPI Dashboard',
        icon: <TrendingUp size={18} />,
        requiredRoles: ['platform_admin', 'tenant_admin', 'farm_manager', 'operator', 'viewer'],
      },
      {
        path: '/feeding/intake',
        label: 'Daily Feed Intake',
        icon: <ClipboardList size={18} />,
        requiredRoles: ['platform_admin', 'tenant_admin', 'farm_manager', 'operator'],
      },
      {
        path: '/feeding/lots',
        label: 'Feed Lots & Deliveries',
        icon: <Warehouse size={18} />,
        requiredRoles: ['platform_admin', 'tenant_admin', 'farm_manager'],
      },
      {
        path: '/feeding/quality',
        label: 'Feed Quality Results',
        icon: <Activity size={18} />,
        requiredRoles: ['platform_admin', 'tenant_admin', 'farm_manager'],
      },
      {
        path: '/feeding/programs',
        label: 'Feed Programs',
        icon: <Settings size={18} />,
        requiredRoles: ['platform_admin', 'tenant_admin', 'farm_manager'],
        hideFromMenu: !FEED_PROGRAMS_ENABLED,
      },
    ],
  },
  // AI Section - Enhanced
  {
    path: '/ai/overview',
    label: 'AI Overview',
    icon: <Brain size={20} />,
    requiredRoles: ['platform_admin', 'tenant_admin', 'farm_manager'],
    section: 'ai',
  },
  {
    path: '/ai/insights',
    label: 'AI Insights',
    icon: <AlertCircle size={20} />,
    requiredRoles: ['platform_admin', 'tenant_admin', 'farm_manager'],
    section: 'ai',
    children: [
      {
        path: '/ai/anomalies',
        label: 'Anomalies',
        icon: <AlertCircle size={18} />,
        requiredRoles: ['platform_admin', 'tenant_admin', 'farm_manager'],
      },
      {
        path: '/ai/recommendations',
        label: 'Recommendations',
        icon: <Brain size={18} />,
        requiredRoles: ['platform_admin', 'tenant_admin', 'farm_manager'],
      },
      {
        path: '/ai/insights-feed',
        label: 'Insights Feed',
        icon: <Activity size={18} />,
        requiredRoles: ['platform_admin', 'tenant_admin', 'farm_manager'],
      },
    ],
  },
  {
    path: '/ai/planning',
    label: 'Planning',
    icon: <BarChart3 size={20} />,
    requiredRoles: ['platform_admin', 'tenant_admin', 'farm_manager'],
    section: 'ai',
    children: [
      {
        path: '/ai/scenario-planner',
        label: 'Scenario Planner',
        icon: <Settings size={18} />,
        requiredRoles: ['platform_admin', 'tenant_admin', 'farm_manager'],
      },
      {
        path: '/ai/what-if',
        label: 'What-if Simulator',
        icon: <TrendingUp size={18} />,
        requiredRoles: ['platform_admin', 'tenant_admin', 'farm_manager'],
      },
    ],
  },
  {
    path: '/ai/model-ops',
    label: 'Model Ops',
    icon: <Server size={20} />,
    requiredRoles: ['platform_admin', 'tenant_admin'],
    section: 'ai',
    children: [
      {
        path: '/ai/models',
        label: 'Model Registry',
        icon: <Database size={18} />,
        requiredRoles: ['platform_admin', 'tenant_admin'],
      },
      {
        path: '/ai/model-health',
        label: 'Model Health & Drift',
        icon: <Activity size={18} />,
        requiredRoles: ['platform_admin', 'tenant_admin'],
      },
    ],
  },
  {
    path: '/ai/settings',
    label: 'AI Settings',
    icon: <Settings size={20} />,
    requiredRoles: ['platform_admin', 'tenant_admin'],
    section: 'ai',
  },
  {
    path: '/alerts',
    label: 'Alerts',
    labelKey: 'nav.items.alerts',
    icon: <AlertCircle size={20} />,
    section: 'operations',
  },
  {
    path: '/notifications',
    label: 'Notifications',
    labelKey: 'nav.items.notifications',
    icon: <Bell size={20} />,
    requiredRoles: ['platform_admin', 'tenant_admin', 'farm_manager', 'operator', 'viewer'],
    section: 'operations',
  },
  {
    path: '/reports',
    label: 'Reports',
    labelKey: 'nav.items.reports',
    icon: <FileText size={20} />,
    requiredRoles: ['platform_admin', 'tenant_admin', 'farm_manager'],
    section: 'operations',
  },
  {
    path: '/ops',
    label: 'Ops',
    labelKey: 'nav.items.ops',
    icon: <Database size={20} />,
    requiredRoles: ['platform_admin', 'tenant_admin'],
    section: 'operations',
    children: [
      {
        path: '/ops/data-quality',
        label: 'Data Quality',
        labelKey: 'nav.items.dataQuality',
        icon: <Eye size={18} />,
        requiredRoles: ['platform_admin', 'tenant_admin'],
      },
      {
        path: '/ops/health',
        label: 'Health Monitor',
        labelKey: 'nav.items.healthMonitor',
        icon: <Activity size={18} />,
        requiredRoles: ['platform_admin', 'tenant_admin'],
      },
    ],
  },
  // Admin Section - Comprehensive Sitemap
  {
    path: '/admin/overview',
    label: 'Admin Overview',
    icon: <LayoutDashboard size={20} />,
    requiredRoles: ['platform_admin', 'tenant_admin'],
    section: 'admin',
  },
  {
    path: '/admin/governance',
    label: 'Governance',
    icon: <Building2 size={20} />,
    requiredRoles: ['platform_admin'],
    section: 'admin',
    children: [
      {
        path: '/admin/tenants',
        label: 'Tenants',
        icon: <Warehouse size={18} />,
        requiredRoles: ['platform_admin'],
      },
    ],
  },
  {
    path: '/admin/identity',
    label: 'Identity & Access',
    icon: <Users size={20} />,
    requiredRoles: ['platform_admin', 'tenant_admin'],
    section: 'admin',
    children: [
      {
        path: '/admin/identity/users',
        label: 'Users',
        icon: <Users size={18} />,
        requiredRoles: ['platform_admin', 'tenant_admin'],
      },
      {
        path: '/admin/identity/roles',
        label: 'Roles',
        icon: <Shield size={18} />,
        requiredRoles: ['platform_admin', 'tenant_admin'],
      },
    ],
  },
  {
    path: '/admin/fleet',
    label: 'Fleet',
    icon: <Server size={20} />,
    requiredRoles: ['platform_admin', 'tenant_admin'],
    section: 'admin',
    children: [
      {
        path: '/admin/devices',
        label: 'Devices',
        icon: <Server size={18} />,
        requiredRoles: ['platform_admin', 'tenant_admin'],
      },
      {
        path: '/admin/devices/onboarding',
        label: 'Device Onboarding',
        icon: <Server size={18} />,
        requiredRoles: ['platform_admin', 'tenant_admin'],
      },
    ],
  },
  {
    path: '/admin/operations',
    label: 'Operations',
    icon: <Activity size={20} />,
    requiredRoles: ['platform_admin', 'tenant_admin'],
    section: 'admin',
    children: [
      {
        path: '/admin/ops/health',
        label: 'System Health',
        icon: <Activity size={18} />,
        requiredRoles: ['platform_admin', 'tenant_admin'],
      },
    ],
  },
  {
    path: '/admin/compliance',
    label: 'Compliance',
    icon: <FileText size={20} />,
    requiredRoles: ['platform_admin', 'tenant_admin'],
    section: 'admin',
    children: [
      {
        path: '/admin/audit-log',
        label: 'Audit Log',
        icon: <FileText size={18} />,
        requiredRoles: ['platform_admin', 'tenant_admin'],
      },
    ],
  },
];

// Helper to check if user has required role
export const hasRequiredRole = (userRoles: Role[], requiredRoles?: Role[]): boolean => {
  if (!requiredRoles || requiredRoles.length === 0) return true;
  return requiredRoles.some((role) => userRoles.includes(role));
};

// Get all routes user can access
export const getAccessibleRoutes = (userRoles: Role[]): RouteConfig[] => {
  const filterRoutes = (routes: RouteConfig[]): RouteConfig[] => {
    return routes
      .filter((route) => hasRequiredRole(userRoles, route.requiredRoles))
      .map((route) => ({
        ...route,
        children: route.children ? filterRoutes(route.children) : undefined,
      }))
      .filter((route) => !route.hideFromMenu);
  };
  
  return filterRoutes(ROUTES);
};
