/**
 * Enhanced RBAC Permission System for FarmIQ Admin Console
 * 
 * Features:
 * - 8 roles with hierarchical permissions
 * - Scope-based permission checking (global, tenant, farm, barn)
 * - Granular permission categories
 * - Permission inheritance
 */

// ============================================================================
// ROLES
// ============================================================================

export enum AdminRole {
    SUPER_ADMIN = 'SUPER_ADMIN',
    OPS_ADMIN = 'OPS_ADMIN',
    TENANT_ADMIN = 'TENANT_ADMIN',
    FARM_MANAGER = 'FARM_MANAGER',
    DEVICE_OPERATOR = 'DEVICE_OPERATOR',
    AUDITOR = 'AUDITOR',
    SUPPORT = 'SUPPORT',
    READ_ONLY = 'READ_ONLY',
}

export const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
    [AdminRole.SUPER_ADMIN]: 'Full system access across all tenants',
    [AdminRole.OPS_ADMIN]: 'Operations and infrastructure management',
    [AdminRole.TENANT_ADMIN]: 'Full access within assigned tenant',
    [AdminRole.FARM_MANAGER]: 'Manage specific farms and barns',
    [AdminRole.DEVICE_OPERATOR]: 'Device onboarding and configuration',
    [AdminRole.AUDITOR]: 'Audit log access and compliance reporting',
    [AdminRole.SUPPORT]: 'Support tools and debugging access',
    [AdminRole.READ_ONLY]: 'View-only access to assigned resources',
};

// ============================================================================
// PERMISSIONS
// ============================================================================

export enum Permission {
    // Governance - Tenants
    TENANT_READ = 'admin.tenants.read',
    TENANT_WRITE = 'admin.tenants.write',
    TENANT_SUSPEND = 'admin.tenants.suspend',

    // Governance - Topology
    TOPOLOGY_READ = 'admin.topology.read',
    TOPOLOGY_WRITE = 'admin.topology.write',

    // Governance - Policies
    POLICY_READ = 'admin.policies.read',
    POLICY_WRITE = 'admin.policies.write',

    // Governance - Features
    FEATURE_READ = 'admin.features.read',
    FEATURE_WRITE = 'admin.features.write',

    // Identity - Users
    USER_READ = 'admin.users.read',
    USER_WRITE = 'admin.users.write',
    USER_DISABLE = 'admin.users.disable',

    // Identity - Roles
    ROLE_READ = 'admin.roles.read',
    ROLE_ASSIGN = 'admin.roles.assign',

    // Identity - Permissions
    PERMISSION_VIEW = 'admin.permissions.view',
    PERMISSION_MATRIX = 'admin.permissions.matrix',

    // Fleet - Devices
    DEVICE_READ = 'admin.devices.read',
    DEVICE_ONBOARD = 'admin.devices.onboard',
    DEVICE_ASSIGN = 'admin.devices.assign',
    DEVICE_CONFIG_PUBLISH = 'admin.devices.config.publish',
    DEVICE_DECOMMISSION = 'admin.devices.decommission',

    // Operations - Health
    OPS_HEALTH_READ = 'admin.ops.health.read',

    // Operations - Sync
    OPS_SYNC_READ = 'admin.ops.sync.read',
    OPS_SYNC_TRIGGER = 'admin.ops.sync.trigger',

    // Operations - MQTT
    OPS_MQTT_READ = 'admin.ops.mqtt.read',

    // Operations - Storage
    OPS_STORAGE_READ = 'admin.ops.storage.read',

    // Operations - Queues
    OPS_QUEUES_READ = 'admin.ops.queues.read',

    // Operations - Incidents
    OPS_INCIDENTS_READ = 'admin.ops.incidents.read',
    OPS_INCIDENTS_MANAGE = 'admin.ops.incidents.manage',

    // Compliance - Audit
    AUDIT_READ = 'admin.audit.read',
    AUDIT_EXPORT = 'admin.audit.export',

    // Support
    SUPPORT_IMPERSONATE = 'admin.support.impersonate',
    SUPPORT_DEBUG = 'admin.support.debug',
}

export const PERMISSION_CATEGORIES = {
    governance: [
        Permission.TENANT_READ,
        Permission.TENANT_WRITE,
        Permission.TENANT_SUSPEND,
        Permission.TOPOLOGY_READ,
        Permission.TOPOLOGY_WRITE,
        Permission.POLICY_READ,
        Permission.POLICY_WRITE,
        Permission.FEATURE_READ,
        Permission.FEATURE_WRITE,
    ],
    identity: [
        Permission.USER_READ,
        Permission.USER_WRITE,
        Permission.USER_DISABLE,
        Permission.ROLE_READ,
        Permission.ROLE_ASSIGN,
        Permission.PERMISSION_VIEW,
        Permission.PERMISSION_MATRIX,
    ],
    fleet: [
        Permission.DEVICE_READ,
        Permission.DEVICE_ONBOARD,
        Permission.DEVICE_ASSIGN,
        Permission.DEVICE_CONFIG_PUBLISH,
        Permission.DEVICE_DECOMMISSION,
    ],
    operations: [
        Permission.OPS_HEALTH_READ,
        Permission.OPS_SYNC_READ,
        Permission.OPS_SYNC_TRIGGER,
        Permission.OPS_MQTT_READ,
        Permission.OPS_STORAGE_READ,
        Permission.OPS_QUEUES_READ,
        Permission.OPS_INCIDENTS_READ,
        Permission.OPS_INCIDENTS_MANAGE,
    ],
    compliance: [
        Permission.AUDIT_READ,
        Permission.AUDIT_EXPORT,
    ],
    support: [
        Permission.SUPPORT_IMPERSONATE,
        Permission.SUPPORT_DEBUG,
    ],
};

// ============================================================================
// PERMISSION SCOPE
// ============================================================================

export interface PermissionScope {
    tenantId?: string | null;  // null = global access
    farmId?: string | null;    // null = all farms in tenant
    barnId?: string | null;    // null = all barns in farm
}

export interface PermissionContext {
    roles: AdminRole[];
    scope: PermissionScope;
}

export interface EffectivePermission {
    permission: Permission;
    scope: PermissionScope;
    grantedBy: AdminRole;
}

// ============================================================================
// ROLE PERMISSIONS MAPPING
// ============================================================================

export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
    [AdminRole.SUPER_ADMIN]: Object.values(Permission), // All permissions

    [AdminRole.OPS_ADMIN]: [
        Permission.TENANT_READ,
        Permission.TOPOLOGY_READ,
        Permission.POLICY_READ,
        Permission.FEATURE_READ,
        Permission.USER_READ,
        Permission.ROLE_READ,
        Permission.PERMISSION_VIEW,
        Permission.PERMISSION_MATRIX,
        Permission.DEVICE_READ,
        Permission.DEVICE_ONBOARD,
        Permission.DEVICE_ASSIGN,
        Permission.DEVICE_CONFIG_PUBLISH,
        Permission.DEVICE_DECOMMISSION,
        Permission.OPS_HEALTH_READ,
        Permission.OPS_SYNC_READ,
        Permission.OPS_SYNC_TRIGGER,
        Permission.OPS_MQTT_READ,
        Permission.OPS_STORAGE_READ,
        Permission.OPS_QUEUES_READ,
        Permission.OPS_INCIDENTS_READ,
        Permission.OPS_INCIDENTS_MANAGE,
        Permission.AUDIT_READ,
        Permission.AUDIT_EXPORT,
        Permission.SUPPORT_DEBUG,
    ],

    [AdminRole.TENANT_ADMIN]: [
        Permission.TENANT_READ,
        Permission.TOPOLOGY_READ,
        Permission.TOPOLOGY_WRITE,
        Permission.POLICY_READ,
        Permission.POLICY_WRITE,
        Permission.FEATURE_READ,
        Permission.FEATURE_WRITE,
        Permission.USER_READ,
        Permission.USER_WRITE,
        Permission.USER_DISABLE,
        Permission.ROLE_READ,
        Permission.ROLE_ASSIGN,
        Permission.PERMISSION_VIEW,
        Permission.DEVICE_READ,
        Permission.DEVICE_ONBOARD,
        Permission.DEVICE_ASSIGN,
        Permission.DEVICE_CONFIG_PUBLISH,
        Permission.OPS_HEALTH_READ,
        Permission.OPS_SYNC_READ,
        Permission.AUDIT_READ,
    ],

    [AdminRole.FARM_MANAGER]: [
        Permission.TOPOLOGY_READ,
        Permission.USER_READ,
        Permission.ROLE_READ,
        Permission.DEVICE_READ,
        Permission.DEVICE_ASSIGN,
        Permission.OPS_HEALTH_READ,
        Permission.AUDIT_READ,
    ],

    [AdminRole.DEVICE_OPERATOR]: [
        Permission.DEVICE_READ,
        Permission.DEVICE_ONBOARD,
        Permission.DEVICE_ASSIGN,
        Permission.DEVICE_CONFIG_PUBLISH,
        Permission.OPS_HEALTH_READ,
    ],

    [AdminRole.AUDITOR]: [
        Permission.TENANT_READ,
        Permission.TOPOLOGY_READ,
        Permission.USER_READ,
        Permission.ROLE_READ,
        Permission.PERMISSION_VIEW,
        Permission.PERMISSION_MATRIX,
        Permission.DEVICE_READ,
        Permission.OPS_HEALTH_READ,
        Permission.OPS_SYNC_READ,
        Permission.OPS_MQTT_READ,
        Permission.OPS_STORAGE_READ,
        Permission.OPS_QUEUES_READ,
        Permission.OPS_INCIDENTS_READ,
        Permission.AUDIT_READ,
        Permission.AUDIT_EXPORT,
    ],

    [AdminRole.SUPPORT]: [
        Permission.TENANT_READ,
        Permission.TOPOLOGY_READ,
        Permission.POLICY_READ,
        Permission.FEATURE_READ,
        Permission.USER_READ,
        Permission.ROLE_READ,
        Permission.PERMISSION_VIEW,
        Permission.PERMISSION_MATRIX,
        Permission.DEVICE_READ,
        Permission.OPS_HEALTH_READ,
        Permission.OPS_SYNC_READ,
        Permission.OPS_MQTT_READ,
        Permission.OPS_STORAGE_READ,
        Permission.OPS_QUEUES_READ,
        Permission.OPS_INCIDENTS_READ,
        Permission.AUDIT_READ,
        Permission.SUPPORT_IMPERSONATE,
        Permission.SUPPORT_DEBUG,
    ],

    [AdminRole.READ_ONLY]: [
        Permission.TENANT_READ,
        Permission.TOPOLOGY_READ,
        Permission.USER_READ,
        Permission.ROLE_READ,
        Permission.DEVICE_READ,
        Permission.AUDIT_READ,
    ],
};


// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Map existing auth roles to admin roles
function mapAuthRoleToAdminRole(authRole: string): AdminRole | null {
    const roleMap: Record<string, AdminRole> = {
        platform_admin: AdminRole.SUPER_ADMIN,
        tenant_admin: AdminRole.TENANT_ADMIN,
        ops_admin: AdminRole.OPS_ADMIN,
        farm_manager: AdminRole.FARM_MANAGER,
        device_operator: AdminRole.DEVICE_OPERATOR,
        auditor: AdminRole.AUDITOR,
        support: AdminRole.SUPPORT,
        viewer: AdminRole.READ_ONLY,
    };

    return roleMap[authRole] || null;
}

// Get admin roles from user's auth roles
export function getUserAdminRoles(authRoles: string[]): AdminRole[] {
    const adminRoles = authRoles
        .map(mapAuthRoleToAdminRole)
        .filter((role): role is AdminRole => role !== null);

    // Remove duplicates
    return Array.from(new Set(adminRoles));
}

export function hasRole(context: PermissionContext, role: AdminRole): boolean {
    return context.roles.includes(role);
}

export function hasAnyRole(context: PermissionContext, roles: AdminRole[]): boolean {
    return roles.some((role) => context.roles.includes(role));
}

export function hasPermission(
    context: PermissionContext,
    permission: Permission,
    requiredScope?: PermissionScope
): boolean {
    // Check if any of the user's roles grant this permission
    const hasPermissionFromRole = context.roles.some((role) =>
        ROLE_PERMISSIONS[role]?.includes(permission)
    );

    if (!hasPermissionFromRole) {
        return false;
    }

    // If no scope required, permission is granted
    if (!requiredScope) {
        return true;
    }

    // Check scope constraints
    // SUPER_ADMIN always has global scope
    if (context.roles.includes(AdminRole.SUPER_ADMIN)) {
        return true;
    }

    // Check tenant scope
    if (requiredScope.tenantId && context.scope.tenantId !== requiredScope.tenantId) {
        return false;
    }

    // Check farm scope
    if (requiredScope.farmId && context.scope.farmId !== requiredScope.farmId) {
        return false;
    }

    // Check barn scope
    if (requiredScope.barnId && context.scope.barnId !== requiredScope.barnId) {
        return false;
    }

    return true;
}

export function getEffectivePermissions(context: PermissionContext): EffectivePermission[] {
    const permissions: EffectivePermission[] = [];

    context.roles.forEach((role) => {
        const rolePermissions = ROLE_PERMISSIONS[role] || [];
        rolePermissions.forEach((permission) => {
            // Avoid duplicates
            if (!permissions.some((p) => p.permission === permission)) {
                permissions.push({
                    permission,
                    scope: context.scope,
                    grantedBy: role,
                });
            }
        });
    });

    return permissions;
}

export function canAccessRoute(context: PermissionContext, requiredPermissions: Permission[]): boolean {
    return requiredPermissions.every((permission) => hasPermission(context, permission));
}

export function getPermissionLabel(permission: Permission): string {
    const labels: Record<Permission, string> = {
        [Permission.TENANT_READ]: 'View Tenants',
        [Permission.TENANT_WRITE]: 'Manage Tenants',
        [Permission.TENANT_SUSPEND]: 'Suspend Tenants',
        [Permission.TOPOLOGY_READ]: 'View Topology',
        [Permission.TOPOLOGY_WRITE]: 'Manage Topology',
        [Permission.POLICY_READ]: 'View Policies',
        [Permission.POLICY_WRITE]: 'Manage Policies',
        [Permission.FEATURE_READ]: 'View Features',
        [Permission.FEATURE_WRITE]: 'Manage Features',
        [Permission.USER_READ]: 'View Users',
        [Permission.USER_WRITE]: 'Manage Users',
        [Permission.USER_DISABLE]: 'Disable Users',
        [Permission.ROLE_READ]: 'View Roles',
        [Permission.ROLE_ASSIGN]: 'Assign Roles',
        [Permission.PERMISSION_VIEW]: 'View Permissions',
        [Permission.PERMISSION_MATRIX]: 'View Permission Matrix',
        [Permission.DEVICE_READ]: 'View Devices',
        [Permission.DEVICE_ONBOARD]: 'Onboard Devices',
        [Permission.DEVICE_ASSIGN]: 'Assign Devices',
        [Permission.DEVICE_CONFIG_PUBLISH]: 'Publish Device Config',
        [Permission.DEVICE_DECOMMISSION]: 'Decommission Devices',
        [Permission.OPS_HEALTH_READ]: 'View System Health',
        [Permission.OPS_SYNC_READ]: 'View Sync Status',
        [Permission.OPS_SYNC_TRIGGER]: 'Trigger Sync',
        [Permission.OPS_MQTT_READ]: 'View MQTT Status',
        [Permission.OPS_STORAGE_READ]: 'View Storage Metrics',
        [Permission.OPS_QUEUES_READ]: 'View Queue Status',
        [Permission.OPS_INCIDENTS_READ]: 'View Incidents',
        [Permission.OPS_INCIDENTS_MANAGE]: 'Manage Incidents',
        [Permission.AUDIT_READ]: 'View Audit Logs',
        [Permission.AUDIT_EXPORT]: 'Export Audit Logs',
        [Permission.SUPPORT_IMPERSONATE]: 'Impersonate Users',
        [Permission.SUPPORT_DEBUG]: 'Debug Tools',
    };

    return labels[permission] || permission;
}
