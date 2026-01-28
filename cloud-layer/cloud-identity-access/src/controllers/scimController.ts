import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  validateScimToken,
  getScimUsers,
  getScimUserById,
  createScimUser,
  updateScimUser,
  deleteScimUser,
  getScimGroups,
  createScimGroup,
  deleteScimGroup,
} from '../services/scimService';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * SCIM authentication middleware
 * Validates bearer token and finds associated tenant
 */
export async function scimAuthMiddleware(req: Request, res: Response, next: Function) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        detail: 'Unauthorized',
        status: '401',
      });
    }

    const token = authHeader.substring(7);
    
    // Find tenant by token (token is unique per tenant)
    const config = await prisma.scimConfig.findFirst({
      where: { bearerToken: token, enabled: true },
    });

    if (!config) {
      return res.status(401).json({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        detail: 'Invalid SCIM token',
        status: '401',
      });
    }

    (req as any).scimTenantId = config.tenantId;
    next();
  } catch (error) {
    logger.error('Error in SCIM auth middleware', error);
    return res.status(500).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: 'Internal server error',
      status: '500',
    });
  }
}

/**
 * SCIM 2.0 Users endpoints
 */

// GET /scim/v2/Users - List users with filtering and pagination
export async function listScimUsers(req: Request, res: Response) {
  try {
    const tenantId = (req as any).scimTenantId;
    const filter = req.query.filter as string;
    const startIndex = req.query.startIndex ? parseInt(req.query.startIndex as string, 10) : undefined;
    const count = req.query.count ? parseInt(req.query.count as string, 10) : undefined;

    const result = await getScimUsers(tenantId, filter, startIndex, count);

    return res.status(200).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: result.totalResults,
      itemsPerPage: result.itemsPerPage,
      startIndex: result.startIndex,
      Resources: result.Resources,
    });
  } catch (error) {
    logger.error('Error listing SCIM users', error);
    return res.status(500).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: 'Internal server error',
      status: '500',
    });
  }
}

// GET /scim/v2/Users/:id - Get user by ID
export async function getScimUserByIdRoute(req: Request, res: Response) {
  try {
    const tenantId = (req as any).scimTenantId;
    const { id } = req.params;

    const user = await getScimUserById(tenantId, id);

    if (!user) {
      return res.status(404).json({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        detail: 'User not found',
        status: '404',
      });
    }

    return res.status(200).json(user);
  } catch (error) {
    logger.error('Error getting SCIM user', error);
    return res.status(500).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: 'Internal server error',
      status: '500',
    });
  }
}

// POST /scim/v2/Users - Create user
export async function createScimUserRoute(req: Request, res: Response) {
  try {
    const tenantId = (req as any).scimTenantId;
    const scimUser = req.body;

    const user = await createScimUser(tenantId, scimUser);

    return res.status(201).json(user);
  } catch (error: any) {
    logger.error('Error creating SCIM user', error);
    if (error.code === 'P2002') {
      return res.status(409).json({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        detail: 'User already exists',
        status: '409',
      });
    }
    return res.status(500).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: 'Internal server error',
      status: '500',
    });
  }
}

// PUT /scim/v2/Users/:id - Update user (full replace)
export async function updateScimUserRoute(req: Request, res: Response) {
  try {
    const tenantId = (req as any).scimTenantId;
    const { id } = req.params;
    const scimUser = req.body;

    const user = await updateScimUser(tenantId, id, scimUser);

    if (!user) {
      return res.status(404).json({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        detail: 'User not found',
        status: '404',
      });
    }

    return res.status(200).json(user);
  } catch (error) {
    logger.error('Error updating SCIM user', error);
    return res.status(500).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: 'Internal server error',
      status: '500',
    });
  }
}

// PATCH /scim/v2/Users/:id - Partial update user
export async function patchScimUserRoute(req: Request, res: Response) {
  try {
    const tenantId = (req as any).scimTenantId;
    const { id } = req.params;
    const scimUser = req.body;

    const user = await updateScimUser(tenantId, id, scimUser);

    if (!user) {
      return res.status(404).json({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        detail: 'User not found',
        status: '404',
      });
    }

    return res.status(200).json(user);
  } catch (error) {
    logger.error('Error patching SCIM user', error);
    return res.status(500).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: 'Internal server error',
      status: '500',
    });
  }
}

// DELETE /scim/v2/Users/:id - Delete user
export async function deleteScimUserRoute(req: Request, res: Response) {
  try {
    const tenantId = (req as any).scimTenantId;
    const { id } = req.params;

    const deleted = await deleteScimUser(tenantId, id);

    if (!deleted) {
      return res.status(404).json({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        detail: 'User not found',
        status: '404',
      });
    }

    return res.status(204).send();
  } catch (error) {
    logger.error('Error deleting SCIM user', error);
    return res.status(500).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: 'Internal server error',
      status: '500',
    });
  }
}

/**
 * SCIM 2.0 Groups endpoints
 */

// GET /scim/v2/Groups - List groups
export async function listScimGroups(req: Request, res: Response) {
  try {
    const tenantId = (req as any).scimTenantId;
    const filter = req.query.filter as string;
    const startIndex = req.query.startIndex ? parseInt(req.query.startIndex as string, 10) : undefined;
    const count = req.query.count ? parseInt(req.query.count as string, 10) : undefined;

    const result = await getScimGroups(tenantId, filter, startIndex, count);

    return res.status(200).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: result.totalResults,
      itemsPerPage: result.itemsPerPage,
      startIndex: result.startIndex,
      Resources: result.Resources,
    });
  } catch (error) {
    logger.error('Error listing SCIM groups', error);
    return res.status(500).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: 'Internal server error',
      status: '500',
    });
  }
}

// POST /scim/v2/Groups - Create group mapping
export async function createScimGroupRoute(req: Request, res: Response) {
  try {
    const tenantId = (req as any).scimTenantId;
    const scimGroup = req.body;

    const group = await createScimGroup(tenantId, scimGroup);

    if (!group) {
      return res.status(400).json({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        detail: 'Invalid group or role not found',
        status: '400',
      });
    }

    return res.status(201).json(group);
  } catch (error) {
    logger.error('Error creating SCIM group', error);
    return res.status(500).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: 'Internal server error',
      status: '500',
    });
  }
}

// DELETE /scim/v2/Groups/:id - Delete group mapping
export async function deleteScimGroupRoute(req: Request, res: Response) {
  try {
    const tenantId = (req as any).scimTenantId;
    const { id } = req.params;

    const deleted = await deleteScimGroup(tenantId, id);

    if (!deleted) {
      return res.status(404).json({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        detail: 'Group not found',
        status: '404',
      });
    }

    return res.status(204).send();
  } catch (error) {
    logger.error('Error deleting SCIM group', error);
    return res.status(500).json({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
      detail: 'Internal server error',
      status: '500',
    });
  }
}

/**
 * Admin endpoints for SCIM configuration
 */

// GET /admin/scim/config/:tenantId - Get SCIM config
export async function getScimConfig(req: Request, res: Response) {
  try {
    const { tenantId } = req.params;

    const config = await prisma.scimConfig.findUnique({
      where: { tenantId },
    });

    if (!config) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'SCIM config not found',
          traceId: req.headers['x-trace-id'] || 'trace-id',
        },
      });
    }

    // Don't return the bearer token
    const { bearerToken, ...safeConfig } = config;

    return res.status(200).json(safeConfig);
  } catch (error) {
    logger.error('Error getting SCIM config', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get SCIM config',
        traceId: req.headers['x-trace-id'] || 'trace-id',
      },
    });
  }
}

// POST /admin/scim/config - Create or update SCIM config
export async function createOrUpdateScimConfig(req: Request, res: Response) {
  try {
    const { tenantId, bearerToken, enabled } = req.body;

    if (!tenantId || !bearerToken) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'tenantId and bearerToken are required',
          traceId: req.headers['x-trace-id'] || 'trace-id',
        },
      });
    }

    const config = await prisma.scimConfig.upsert({
      where: { tenantId },
      create: {
        tenantId,
        bearerToken,
        enabled: enabled !== undefined ? enabled : true,
      },
      update: {
        bearerToken,
        enabled: enabled !== undefined ? enabled : undefined,
      },
    });

    const { bearerToken: _, ...safeConfig } = config;

    return res.status(200).json(safeConfig);
  } catch (error) {
    logger.error('Error creating/updating SCIM config', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create/update SCIM config',
        traceId: req.headers['x-trace-id'] || 'trace-id',
      },
    });
  }
}
