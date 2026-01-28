import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import {
  getOidcAuthUrl,
  handleOidcCallback,
  getSamlAuthUrl,
  handleSamlCallback,
} from '../services/ssoService';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * List all identity providers
 */
export async function listIdentityProviders(req: Request, res: Response) {
  try {
    const { tenantId } = req.query;

    const where: any = {};
    if (tenantId) {
      where.tenantId = tenantId as string;
    } else {
      where.tenantId = null; // Platform-wide only
    }

    const idps = await prisma.identityProvider.findMany({
      where,
      include: {
        defaultRole: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      data: idps,
      total: idps.length,
    });
  } catch (error) {
    logger.error('Error listing identity providers', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list identity providers',
        traceId: req.headers['x-trace-id'] || 'trace-id',
      },
    });
  }
}

/**
 * Get identity provider by ID
 */
export async function getIdentityProviderById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const idp = await prisma.identityProvider.findUnique({
      where: { id },
      include: {
        defaultRole: true,
      },
    });

    if (!idp) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Identity provider with id ${id} not found`,
          traceId: req.headers['x-trace-id'] || 'trace-id',
        },
      });
    }

    return res.status(200).json(idp);
  } catch (error) {
    logger.error('Error getting identity provider', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get identity provider',
        traceId: req.headers['x-trace-id'] || 'trace-id',
      },
    });
  }
}

/**
 * Create identity provider
 */
export async function createIdentityProvider(req: Request, res: Response) {
  try {
    const { name, type, tenantId, metadata, config, jitEnabled, defaultRoleId } = req.body;

    if (!name || !type || !metadata || !config) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'name, type, metadata, and config are required',
          traceId: req.headers['x-trace-id'] || 'trace-id',
        },
      });
    }

    if (type !== 'saml' && type !== 'oidc') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'type must be "saml" or "oidc"',
          traceId: req.headers['x-trace-id'] || 'trace-id',
        },
      });
    }

    const idp = await prisma.identityProvider.create({
      data: {
        name,
        type,
        tenantId: tenantId || null,
        metadata,
        config,
        jitEnabled: jitEnabled !== undefined ? jitEnabled : true,
        defaultRoleId: defaultRoleId || null,
      },
      include: {
        defaultRole: true,
      },
    });

    return res.status(201).json(idp);
  } catch (error) {
    logger.error('Error creating identity provider', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create identity provider',
        traceId: req.headers['x-trace-id'] || 'trace-id',
      },
    });
  }
}

/**
 * Update identity provider
 */
export async function updateIdentityProvider(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, enabled, metadata, config, jitEnabled, defaultRoleId } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (enabled !== undefined) updateData.enabled = enabled;
    if (metadata !== undefined) updateData.metadata = metadata;
    if (config !== undefined) updateData.config = config;
    if (jitEnabled !== undefined) updateData.jitEnabled = jitEnabled;
    if (defaultRoleId !== undefined) updateData.defaultRoleId = defaultRoleId || null;

    const idp = await prisma.identityProvider.update({
      where: { id },
      data: updateData,
      include: {
        defaultRole: true,
      },
    });

    return res.status(200).json(idp);
  } catch (error: any) {
    logger.error('Error updating identity provider', error);
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Identity provider with id ${req.params.id} not found`,
          traceId: req.headers['x-trace-id'] || 'trace-id',
        },
      });
    }
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update identity provider',
        traceId: req.headers['x-trace-id'] || 'trace-id',
      },
    });
  }
}

/**
 * Delete identity provider
 */
export async function deleteIdentityProvider(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await prisma.identityProvider.delete({
      where: { id },
    });

    return res.status(204).send();
  } catch (error: any) {
    logger.error('Error deleting identity provider', error);
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Identity provider with id ${req.params.id} not found`,
          traceId: req.headers['x-trace-id'] || 'trace-id',
        },
      });
    }
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete identity provider',
        traceId: req.headers['x-trace-id'] || 'trace-id',
      },
    });
  }
}

/**
 * Initiate OIDC authentication
 */
export async function initiateOidcAuth(req: Request, res: Response) {
  try {
    const { idpId } = req.params;

    const state = uuidv4();
    const result = await getOidcAuthUrl(idpId, state);

    if (!result) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Identity provider not found or not enabled',
          traceId: req.headers['x-trace-id'] || 'trace-id',
        },
      });
    }

    // Store codeVerifier in session keyed by state
    if (req.session) {
      (req.session as any).oidcState = {
        [state]: {
          codeVerifier: result.codeVerifier,
          idpId,
        },
      };
    }

    return res.status(200).json({
      authUrl: result.url,
      state,
    });
  } catch (error) {
    logger.error('Error initiating OIDC auth', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to initiate OIDC authentication',
        traceId: req.headers['x-trace-id'] || 'trace-id',
      },
    });
  }
}

/**
 * Handle OIDC callback
 */
export async function handleOidcCallbackRoute(req: Request, res: Response) {
  try {
    const { idpId } = req.params;
    const { state } = req.query;

    if (!state) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'state is required',
          traceId: req.headers['x-trace-id'] || 'trace-id',
        },
      });
    }

    // Retrieve codeVerifier from session
    let codeVerifier: string | undefined;
    if (req.session && (req.session as any).oidcState) {
      const stateData = (req.session as any).oidcState[state as string];
      if (stateData) {
        codeVerifier = stateData.codeVerifier;
        // Clean up session data
        delete (req.session as any).oidcState[state as string];
      }
    }

    if (!codeVerifier) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid or expired state. Please initiate authentication again.',
          traceId: req.headers['x-trace-id'] || 'trace-id',
        },
      });
    }

    // Build callback URL from request
    const protocol = req.protocol;
    const host = req.get('host');
    const path = req.originalUrl;
    const callbackUrl = `${protocol}://${host}${path}`;

    const tokens = await handleOidcCallback(idpId, callbackUrl, codeVerifier, state as string);

    if (!tokens) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Failed to authenticate with identity provider',
          traceId: req.headers['x-trace-id'] || 'trace-id',
        },
      });
    }

    return res.status(200).json({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_type: 'Bearer',
      expires_in: 3600,
    });
  } catch (error) {
    logger.error('Error handling OIDC callback', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to handle OIDC callback',
        traceId: req.headers['x-trace-id'] || 'trace-id',
      },
    });
  }
}

/**
 * Initiate SAML authentication
 */
export async function initiateSamlAuth(req: Request, res: Response) {
  try {
    const { idpId } = req.params;

    const authUrl = await getSamlAuthUrl(idpId);

    if (!authUrl) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Identity provider not found or not enabled',
          traceId: req.headers['x-trace-id'] || 'trace-id',
        },
      });
    }

    return res.redirect(authUrl);
  } catch (error) {
    logger.error('Error initiating SAML auth', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to initiate SAML authentication',
        traceId: req.headers['x-trace-id'] || 'trace-id',
      },
    });
  }
}

/**
 * Handle SAML callback
 */
export async function handleSamlCallbackRoute(req: Request, res: Response) {
  try {
    const { idpId } = req.params;
    // SAML profile would be parsed by passport-saml middleware
    const profile = (req as any).user || req.body;

    if (!profile) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'SAML profile not found',
          traceId: req.headers['x-trace-id'] || 'trace-id',
        },
      });
    }

    const tokens = await handleSamlCallback(idpId, profile);

    if (!tokens) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Failed to authenticate with identity provider',
          traceId: req.headers['x-trace-id'] || 'trace-id',
        },
      });
    }

    return res.status(200).json({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_type: 'Bearer',
      expires_in: 3600,
    });
  } catch (error) {
    logger.error('Error handling SAML callback', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to handle SAML callback',
        traceId: req.headers['x-trace-id'] || 'trace-id',
      },
    });
  }
}
