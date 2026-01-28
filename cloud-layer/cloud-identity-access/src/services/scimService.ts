import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface ScimUser {
  schemas: string[];
  id: string;
  userName: string;
  name: {
    givenName?: string;
    familyName?: string;
    formatted?: string;
  };
  emails: Array<{
    value: string;
    primary?: boolean;
  }>;
  active: boolean;
  meta: {
    resourceType: string;
    created: string;
    lastModified: string;
  };
}

interface ScimGroup {
  schemas: string[];
  id: string;
  displayName: string;
  members?: Array<{
    value: string;
    display?: string;
  }>;
  meta: {
    resourceType: string;
    created: string;
    lastModified: string;
  };
}

/**
 * Validate SCIM bearer token
 */
export async function validateScimToken(token: string, tenantId: string): Promise<boolean> {
  try {
    const config = await prisma.scimConfig.findUnique({
      where: { tenantId },
    });

    if (!config || !config.enabled) {
      return false;
    }

    return config.bearerToken === token;
  } catch (error) {
    logger.error('Error validating SCIM token', error);
    return false;
  }
}

/**
 * Get SCIM users with filtering and pagination
 */
export async function getScimUsers(
  tenantId: string,
  filter?: string,
  startIndex?: number,
  count?: number
): Promise<{ totalResults: number; itemsPerPage: number; startIndex: number; Resources: ScimUser[] }> {
  try {
    const where: any = { tenantId };

    // Parse filter (e.g., "userName eq \"user@example.com\"")
    if (filter) {
      const emailMatch = filter.match(/userName eq "([^"]+)"/);
      if (emailMatch) {
        where.email = emailMatch[1];
      }
    }

    const skip = startIndex ? startIndex - 1 : 0;
    const take = count || 100;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        include: { roles: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    const resources: ScimUser[] = users.map((user) => ({
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      id: user.id,
      userName: user.email,
      name: {
        formatted: user.email.split('@')[0],
      },
      emails: [
        {
          value: user.email,
          primary: true,
        },
      ],
      active: true,
      meta: {
        resourceType: 'User',
        created: user.createdAt.toISOString(),
        lastModified: user.updatedAt.toISOString(),
      },
    }));

    return {
      totalResults: total,
      itemsPerPage: take,
      startIndex: skip + 1,
      Resources: resources,
    };
  } catch (error) {
    logger.error('Error getting SCIM users', error);
    throw error;
  }
}

/**
 * Get SCIM user by ID
 */
export async function getScimUserById(tenantId: string, userId: string): Promise<ScimUser | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    if (!user || user.tenantId !== tenantId) {
      return null;
    }

    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      id: user.id,
      userName: user.email,
      name: {
        formatted: user.email.split('@')[0],
      },
      emails: [
        {
          value: user.email,
          primary: true,
        },
      ],
      active: true,
      meta: {
        resourceType: 'User',
        created: user.createdAt.toISOString(),
        lastModified: user.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    logger.error('Error getting SCIM user', error);
    return null;
  }
}

/**
 * Create SCIM user
 */
export async function createScimUser(tenantId: string, scimUser: Partial<ScimUser>): Promise<ScimUser> {
  try {
    const email = scimUser.emails?.[0]?.value || scimUser.userName;
    if (!email) {
      throw new Error('Email is required');
    }

    // Get default role for tenant (from SCIM config or tenant default)
    const defaultRole = await prisma.role.findFirst({
      where: { name: 'viewer' },
    });

    const roleIds = defaultRole ? [defaultRole.id] : [];

    const user = await prisma.user.create({
      data: {
        email,
        password: '', // No password for SCIM-provisioned users
        tenantId,
        roles: {
          connect: roleIds.map((id) => ({ id })),
        },
      },
      include: { roles: true },
    });

    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      id: user.id,
      userName: user.email,
      name: {
        formatted: user.email.split('@')[0],
      },
      emails: [
        {
          value: user.email,
          primary: true,
        },
      ],
      active: true,
      meta: {
        resourceType: 'User',
        created: user.createdAt.toISOString(),
        lastModified: user.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    logger.error('Error creating SCIM user', error);
    throw error;
  }
}

/**
 * Update SCIM user
 */
export async function updateScimUser(
  tenantId: string,
  userId: string,
  scimUser: Partial<ScimUser>
): Promise<ScimUser | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { roles: true },
    });

    if (!user || user.tenantId !== tenantId) {
      return null;
    }

    const updateData: any = {};
    if (scimUser.emails?.[0]?.value) {
      updateData.email = scimUser.emails[0].value;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { roles: true },
    });

    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      id: updatedUser.id,
      userName: updatedUser.email,
      name: {
        formatted: updatedUser.email.split('@')[0],
      },
      emails: [
        {
          value: updatedUser.email,
          primary: true,
        },
      ],
      active: true,
      meta: {
        resourceType: 'User',
        created: updatedUser.createdAt.toISOString(),
        lastModified: updatedUser.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    logger.error('Error updating SCIM user', error);
    return null;
  }
}

/**
 * Delete SCIM user
 */
export async function deleteScimUser(tenantId: string, userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.tenantId !== tenantId) {
      return false;
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return true;
  } catch (error) {
    logger.error('Error deleting SCIM user', error);
    return false;
  }
}

/**
 * Get SCIM groups with filtering and pagination
 */
export async function getScimGroups(
  tenantId: string,
  filter?: string,
  startIndex?: number,
  count?: number
): Promise<{ totalResults: number; itemsPerPage: number; startIndex: number; Resources: ScimGroup[] }> {
  try {
    // Get group mappings for tenant
    const mappings = await prisma.scimGroupMapping.findMany({
      where: { tenantId },
      include: { role: true },
    });

    const resources: ScimGroup[] = mappings.map((mapping) => ({
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
      id: mapping.scimGroupId,
      displayName: mapping.role.name,
      meta: {
        resourceType: 'Group',
        created: mapping.createdAt.toISOString(),
        lastModified: mapping.updatedAt.toISOString(),
      },
    }));

    const skip = startIndex ? startIndex - 1 : 0;
    const take = count || 100;

    return {
      totalResults: resources.length,
      itemsPerPage: take,
      startIndex: skip + 1,
      Resources: resources.slice(skip, skip + take),
    };
  } catch (error) {
    logger.error('Error getting SCIM groups', error);
    throw error;
  }
}

/**
 * Create SCIM group mapping
 */
export async function createScimGroup(tenantId: string, scimGroup: Partial<ScimGroup>): Promise<ScimGroup | null> {
  try {
    if (!scimGroup.id || !scimGroup.displayName) {
      throw new Error('Group ID and displayName are required');
    }

    // Find role by name (displayName maps to role name)
    const role = await prisma.role.findUnique({
      where: { name: scimGroup.displayName },
    });

    if (!role) {
      return null;
    }

    const mapping = await prisma.scimGroupMapping.create({
      data: {
        tenantId,
        scimGroupId: scimGroup.id,
        roleId: role.id,
      },
      include: { role: true },
    });

    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:Group'],
      id: mapping.scimGroupId,
      displayName: mapping.role.name,
      meta: {
        resourceType: 'Group',
        created: mapping.createdAt.toISOString(),
        lastModified: mapping.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    logger.error('Error creating SCIM group', error);
    return null;
  }
}

/**
 * Delete SCIM group mapping
 */
export async function deleteScimGroup(tenantId: string, groupId: string): Promise<boolean> {
  try {
    await prisma.scimGroupMapping.delete({
      where: {
        tenantId_scimGroupId: {
          tenantId,
          scimGroupId: groupId,
        },
      },
    });

    return true;
  } catch (error) {
    logger.error('Error deleting SCIM group', error);
    return false;
  }
}
