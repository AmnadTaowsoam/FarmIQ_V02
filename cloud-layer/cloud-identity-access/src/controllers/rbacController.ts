import { Request, Response } from 'express';
import {
  getAllPermissions,
  getRolePermissions,
  assignPermissionsToRole,
  createCustomRole,
  getCustomRoles,
  updateCustomRole,
  deleteCustomRole,
  assignCustomRoleToUser,
  removeCustomRoleFromUser,
  checkUserPermission,
  getUserAttributes,
  setUserAttribute,
} from '../services/rbacService';
import { logger } from '../utils/logger';

/**
 * Get all permissions
 */
export async function listPermissions(req: Request, res: Response) {
  try {
    const permissions = await getAllPermissions();

    // Group by category
    const grouped = permissions.reduce((acc: any, perm) => {
      if (!acc[perm.category]) {
        acc[perm.category] = [];
      }
      acc[perm.category].push(perm);
      return acc;
    }, {});

    return res.status(200).json({
      data: permissions,
      grouped,
      total: permissions.length,
    });
  } catch (error) {
    logger.error('Error listing permissions', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list permissions',
        traceId: req.headers['x-trace-id'] || 'trace-id',
      },
    });
  }
}

/**
 * Get permissions for a role
 */
export async function getRolePermissionsRoute(req: Request, res: Response) {
  try {
    const { roleId } = req.params;
    const permissions = await getRolePermissions(roleId);

    return res.status(200).json({
      data: permissions,
      total: permissions.length,
    });
  } catch (error) {
    logger.error('Error getting role permissions', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get role permissions',
        traceId: req.headers['x-trace-id'] || 'trace-id',
      },
    });
  }
}

/**
 * Assign permissions to a role
 */
export async function assignPermissionsToRoleRoute(req: Request, res: Response) {
  try {
    const { roleId } = req.params;
    const { permissionIds, scope } = req.body;

    if (!Array.isArray(permissionIds)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'permissionIds must be an array',
          traceId: req.headers['x-trace-id'] || 'trace-id',
        },
      });
    }

    const permissions = await assignPermissionsToRole(roleId, permissionIds, scope);

    return res.status(200).json({
      data: permissions,
      total: permissions.length,
    });
  } catch (error) {
    logger.error('Error assigning permissions to role', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to assign permissions to role',
        traceId: req.headers['x-trace-id'] || 'trace-id',
      },
    });
  }
}

/**
 * Create custom role
 */
export async function createCustomRoleRoute(req: Request, res: Response) {
  try {
    const { tenantId, name, description, baseRoleId, permissionIds } = req.body;

    if (!tenantId || !name) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId and name are required',
          traceId: req.headers['x-trace-id'] || 'trace-id',
        },
      });
    }

    const customRole = await createCustomRole(
      tenantId,
      name,
      description || null,
      baseRoleId || null,
      permissionIds || []
    );

    return res.status(201).json(customRole);
  } catch (error: any) {
    logger.error('Error creating custom role', error);
    if (error.message?.includes('already exists')) {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: error.message,
          traceId: req.headers['x-trace-id'] || 'trace-id',
        },
      });
    }
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create custom role',
        traceId: req.headers['x-trace-id'] || 'trace-id',
      },
    });
  }
}

/**
 * Get custom roles for tenant
 */
export async function getCustomRolesRoute(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;

    const customRoles = await getCustomRoles(tenantId);

    return res.status(200).json({
      data: customRoles,
      total: customRoles.length,
    });
  } catch (error) {
    logger.error('Error getting custom roles', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get custom roles',
        traceId: req.headers['x-trace-id'] || 'trace-id',
      },
    });
  }
}

/**
 * Update custom role
 */
export async function updateCustomRoleRoute(req: Request, res: Response) {
  try {
    const { roleId } = req.params;
    const { name, description, permissionIds } = req.body;

    const customRole = await updateCustomRole(roleId, name, description, permissionIds);

    return res.status(200).json(customRole);
  } catch (error: any) {
    logger.error('Error updating custom role', error);
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Custom role with id ${req.params.roleId} not found`,
          traceId: req.headers['x-trace-id'] || 'trace-id',
        },
      });
    }
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update custom role',
        traceId: req.headers['x-trace-id'] || 'trace-id',
      },
    });
  }
}

/**
 * Delete custom role
 */
export async function deleteCustomRoleRoute(req: Request, res: Response) {
  try {
    const { roleId } = req.params;

    await deleteCustomRole(roleId);

    return res.status(204).send();
  } catch (error: any) {
    logger.error('Error deleting custom role', error);
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Custom role with id ${req.params.roleId} not found`,
          traceId: req.headers['x-trace-id'] || 'trace-id',
        },
      });
    }
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete custom role',
        traceId: req.headers['x-trace-id'] || 'trace-id',
      },
    });
  }
}

/**
 * Assign custom role to user
 */
export async function assignCustomRoleToUserRoute(req: Request, res: Response) {
  try {
    const { userId, customRoleId } = req.body;

    if (!userId || !customRoleId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'userId and customRoleId are required',
          traceId: req.headers['x-trace-id'] || 'trace-id',
        },
      });
    }

    await assignCustomRoleToUser(userId, customRoleId);

    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error assigning custom role to user', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to assign custom role to user',
        traceId: req.headers['x-trace-id'] || 'trace-id',
      },
    });
  }
}

/**
 * Remove custom role from user
 */
export async function removeCustomRoleFromUserRoute(req: Request, res: Response) {
  try {
    const { userId, customRoleId } = req.body;

    if (!userId || !customRoleId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'userId and customRoleId are required',
          traceId: req.headers['x-trace-id'] || 'trace-id',
        },
      });
    }

    await removeCustomRoleFromUser(userId, customRoleId);

    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error removing custom role from user', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to remove custom role from user',
        traceId: req.headers['x-trace-id'] || 'trace-id',
      },
    });
  }
}

/**
 * Check user permission
 */
export async function checkUserPermissionRoute(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { permissionName, scope } = req.query;

    if (!permissionName) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'permissionName is required',
          traceId: req.headers['x-trace-id'] || 'trace-id',
        },
      });
    }

    const hasPermission = await checkUserPermission(
      userId,
      permissionName as string,
      scope ? JSON.parse(scope as string) : undefined
    );

    return res.status(200).json({
      hasPermission,
    });
  } catch (error) {
    logger.error('Error checking user permission', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to check user permission',
        traceId: req.headers['x-trace-id'] || 'trace-id',
      },
    });
  }
}

/**
 * Get user attributes
 */
export async function getUserAttributesRoute(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    const attributes = await getUserAttributes(userId);

    return res.status(200).json({
      data: attributes,
      total: attributes.length,
    });
  } catch (error) {
    logger.error('Error getting user attributes', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get user attributes',
        traceId: req.headers['x-trace-id'] || 'trace-id',
      },
    });
  }
}

/**
 * Set user attribute
 */
export async function setUserAttributeRoute(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const { key, value } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'key and value are required',
          traceId: req.headers['x-trace-id'] || 'trace-id',
        },
      });
    }

    const attribute = await setUserAttribute(userId, key, value);

    return res.status(200).json(attribute);
  } catch (error) {
    logger.error('Error setting user attribute', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to set user attribute',
        traceId: req.headers['x-trace-id'] || 'trace-id',
      },
    });
  }
}
