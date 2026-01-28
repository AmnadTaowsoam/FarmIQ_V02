import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Get all permissions
 */
export async function getAllPermissions() {
  try {
    return await prisma.permission.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  } catch (error) {
    logger.error('Error getting permissions', error);
    throw error;
  }
}

/**
 * Get permissions for a role
 */
export async function getRolePermissions(roleId: string) {
  try {
    return await prisma.rolePermission.findMany({
      where: { roleId },
      include: {
        permission: true,
      },
    });
  } catch (error) {
    logger.error('Error getting role permissions', error);
    throw error;
  }
}

/**
 * Assign permissions to a role
 */
export async function assignPermissionsToRole(
  roleId: string,
  permissionIds: string[],
  scope?: string
) {
  try {
    // Remove existing permissions for this role and scope
    await prisma.rolePermission.deleteMany({
      where: {
        roleId,
        scope: scope || null,
      },
    });

    // Add new permissions
    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId,
          permissionId,
          scope: scope || null,
        })),
      });
    }

    return await getRolePermissions(roleId);
  } catch (error) {
    logger.error('Error assigning permissions to role', error);
    throw error;
  }
}

/**
 * Create custom role for tenant
 */
export async function createCustomRole(
  tenantId: string,
  name: string,
  description: string | null,
  baseRoleId: string | null,
  permissionIds: string[]
) {
  try {
    // Check if role name already exists for tenant
    const existing = await prisma.customRole.findUnique({
      where: {
        tenantId_name: {
          tenantId,
          name,
        },
      },
    });

    if (existing) {
      throw new Error('Custom role with this name already exists for tenant');
    }

    const customRole = await prisma.customRole.create({
      data: {
        tenantId,
        name,
        description,
        baseRoleId,
        permissions: {
          create: permissionIds.map((permissionId) => ({
            permissionId,
            scope: 'tenant', // Custom roles are tenant-scoped
          })),
        },
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return customRole;
  } catch (error) {
    logger.error('Error creating custom role', error);
    throw error;
  }
}

/**
 * Get custom roles for tenant
 */
export async function getCustomRoles(tenantId: string) {
  try {
    return await prisma.customRole.findMany({
      where: { tenantId },
      include: {
        baseRole: true,
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    logger.error('Error getting custom roles', error);
    throw error;
  }
}

/**
 * Update custom role
 */
export async function updateCustomRole(
  roleId: string,
  name: string | undefined,
  description: string | null | undefined,
  permissionIds: string[] | undefined
) {
  try {
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    if (permissionIds !== undefined) {
      // Remove existing permissions
      await prisma.customRolePermission.deleteMany({
        where: {
          customRoleId: roleId,
        },
      });

      // Add new permissions
      if (permissionIds.length > 0) {
        await prisma.customRolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            customRoleId: roleId,
            permissionId,
            scope: 'tenant',
          })),
        });
      }
    }

    const updatedRole = await prisma.customRole.update({
      where: { id: roleId },
      data: updateData,
      include: {
        baseRole: true,
        permissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
    });

    return updatedRole;
  } catch (error) {
    logger.error('Error updating custom role', error);
    throw error;
  }
}

/**
 * Delete custom role
 */
export async function deleteCustomRole(roleId: string) {
  try {
    await prisma.customRole.delete({
      where: { id: roleId },
    });
    return true;
  } catch (error) {
    logger.error('Error deleting custom role', error);
    throw error;
  }
}

/**
 * Assign custom role to user
 */
export async function assignCustomRoleToUser(userId: string, customRoleId: string) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        customRoles: {
          connect: { id: customRoleId },
        },
      },
    });
    return true;
  } catch (error) {
    logger.error('Error assigning custom role to user', error);
    throw error;
  }
}

/**
 * Remove custom role from user
 */
export async function removeCustomRoleFromUser(userId: string, customRoleId: string) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        customRoles: {
          disconnect: { id: customRoleId },
        },
      },
    });
    return true;
  } catch (error) {
    logger.error('Error removing custom role from user', error);
    throw error;
  }
}

/**
 * Check if user has permission (with ABAC support)
 */
export async function checkUserPermission(
  userId: string,
  permissionName: string,
  scope?: { tenantId?: string; farmId?: string; barnId?: string }
): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        customRoles: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return false;
    }

    // Check system roles
    for (const role of user.roles) {
      for (const rolePermission of role.permissions) {
        if (rolePermission.permission.name === permissionName) {
          // Check scope
          if (!rolePermission.scope || rolePermission.scope === 'global') {
            return true;
          }
          if (rolePermission.scope === 'tenant' && scope?.tenantId === user.tenantId) {
            return true;
          }
          // Add more scope checks as needed
        }
      }
    }

    // Check custom roles
    for (const customRole of user.customRoles) {
      for (const customRolePermission of customRole.permissions) {
        if (customRolePermission.permission.name === permissionName) {
          if (!customRolePermission.scope || customRolePermission.scope === 'tenant') {
            return true;
          }
        }
      }
    }

    return false;
  } catch (error) {
    logger.error('Error checking user permission', error);
    return false;
  }
}

/**
 * Get user attributes for ABAC
 */
export async function getUserAttributes(userId: string) {
  try {
    return await prisma.userAttribute.findMany({
      where: { userId },
    });
  } catch (error) {
    logger.error('Error getting user attributes', error);
    throw error;
  }
}

/**
 * Set user attribute
 */
export async function setUserAttribute(userId: string, key: string, value: string) {
  try {
    return await prisma.userAttribute.upsert({
      where: {
        userId_key: {
          userId,
          key,
        },
      },
      create: {
        userId,
        key,
        value,
      },
      update: {
        value,
      },
    });
  } catch (error) {
    logger.error('Error setting user attribute', error);
    throw error;
  }
}
