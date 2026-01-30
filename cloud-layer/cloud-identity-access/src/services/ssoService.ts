import { PrismaClient } from '@prisma/client';
import * as oidc from 'openid-client';
import { Strategy as SamlStrategy } from 'passport-saml';
import jwt, { SignOptions } from 'jsonwebtoken';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '1h';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-secret-key';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

interface OidcConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string[];
}

interface SamlConfig {
  entryPoint: string;
  issuer: string;
  cert: string;
  callbackUrl: string;
}

/**
 * Initialize OIDC configuration for authentication
 */
export async function initializeOidcConfig(idpId: string): Promise<oidc.Configuration | null> {
  try {
    const idp = await prisma.identityProvider.findUnique({
      where: { id: idpId },
    });

    if (!idp || idp.type !== 'oidc' || !idp.enabled) {
      return null;
    }

    const config = idp.config as unknown as OidcConfig;
    const metadata = idp.metadata as any;

    const issuerUrl = new URL(config.issuer || metadata.issuer);
    const oidcConfig = await oidc.discovery(
      issuerUrl,
      config.clientId,
      {
        client_secret: config.clientSecret,
        redirect_uris: [config.redirectUri],
        response_types: ['code'],
      }
    );

    return oidcConfig;
  } catch (error) {
    logger.error('Error initializing OIDC config', error);
    return null;
  }
}

/**
 * Generate OIDC authorization URL
 */
export async function getOidcAuthUrl(idpId: string, state: string): Promise<{ url: string; codeVerifier: string } | null> {
  try {
    const config = await initializeOidcConfig(idpId);
    if (!config) {
      return null;
    }

    const codeVerifier = oidc.randomPKCECodeVerifier();
    const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

    const idp = await prisma.identityProvider.findUnique({
      where: { id: idpId },
    });

    if (!idp) {
      return null;
    }

    const oidcConfig = idp.config as unknown as OidcConfig;
    const authUrl = oidc.buildAuthorizationUrl(config, {
      redirect_uri: oidcConfig.redirectUri,
      scope: 'openid email profile',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return { url: authUrl.toString(), codeVerifier };
  } catch (error) {
    logger.error('Error generating OIDC auth URL', error);
    return null;
  }
}

/**
 * Handle OIDC callback and create/update user
 */
export async function handleOidcCallback(
  idpId: string,
  callbackUrl: string,
  codeVerifier: string,
  state: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const config = await initializeOidcConfig(idpId);
    if (!config) {
      return null;
    }

    const idp = await prisma.identityProvider.findUnique({
      where: { id: idpId },
      include: { defaultRole: true },
    });

    if (!idp) {
      return null;
    }

    const currentUrl = new URL(callbackUrl);
    const tokenSet = await oidc.authorizationCodeGrant(
      config,
      currentUrl,
      {
        expectedState: state,
        pkceCodeVerifier: codeVerifier,
      }
    );

    // Get user info
    const expectedSubject = tokenSet.claims()?.sub || '';
    const userInfo = await oidc.fetchUserInfo(config, tokenSet.access_token, expectedSubject);

    // JIT (Just-In-Time) user provisioning
    let user = await prisma.user.findUnique({
      where: { email: userInfo.email as string },
      include: { roles: true },
    });

    if (!user && idp.jitEnabled) {
      // Create user on first login
      const defaultRoleId = idp.defaultRoleId;
      const roleIds = defaultRoleId ? [defaultRoleId] : [];

      user = await prisma.user.create({
        data: {
          email: userInfo.email as string,
          password: '', // No password for SSO users
          tenantId: idp.tenantId || null,
          roles: {
            connect: roleIds.map((id) => ({ id })),
          },
        },
        include: { roles: true },
      });
    }

    if (!user) {
      return null;
    }

    // Create SSO session
    const idToken = tokenSet.id_token; // id_token is a property, not a method
    await prisma.ssoSession.create({
      data: {
        userId: user.id,
        idpId: idp.id,
        sessionId: idToken || state,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
      },
    });

    // Generate JWT tokens
    const payload = {
      sub: user.id,
      roles: user.roles.map((r) => r.name),
      tenant_id: user.tenantId,
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as SignOptions);
    const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    } as SignOptions);

    return { accessToken, refreshToken };
  } catch (error) {
    logger.error('Error handling OIDC callback', error);
    return null;
  }
}

/**
 * Initialize SAML strategy
 */
export function initializeSamlStrategy(idpId: string, config: SamlConfig): SamlStrategy {
  return new SamlStrategy(
    {
      entryPoint: config.entryPoint,
      issuer: config.issuer,
      cert: config.cert,
      callbackUrl: config.callbackUrl,
      identifierFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    },
    async (profile: any, done: any) => {
      try {
        const idp = await prisma.identityProvider.findUnique({
          where: { id: idpId },
          include: { defaultRole: true },
        });

        if (!idp) {
          return done(new Error('Identity provider not found'));
        }

        const email = profile.email || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];

        // JIT user provisioning
        let user = await prisma.user.findUnique({
          where: { email },
          include: { roles: true },
        });

        if (!user && idp.jitEnabled) {
          const defaultRoleId = idp.defaultRoleId;
          const roleIds = defaultRoleId ? [defaultRoleId] : [];

          user = await prisma.user.create({
            data: {
              email,
              password: '',
              tenantId: idp.tenantId || null,
              roles: {
                connect: roleIds.map((id) => ({ id })),
              },
            },
            include: { roles: true },
          });
        }

        if (!user) {
          return done(new Error('User not found and JIT disabled'));
        }

        // Create SSO session
        await prisma.ssoSession.create({
          data: {
            userId: user.id,
            idpId: idp.id,
            sessionId: profile.nameID || profile.sessionIndex,
            expiresAt: new Date(Date.now() + 3600000),
          },
        });

        return done(null, user);
      } catch (error) {
        logger.error('Error in SAML authentication', error);
        return done(error);
      }
    }
  );
}

/**
 * Generate SAML authentication URL
 * Returns the IdP entry point URL for SAML authentication
 */
export async function getSamlAuthUrl(idpId: string): Promise<string | null> {
  try {
    const idp = await prisma.identityProvider.findUnique({
      where: { id: idpId },
    });

    if (!idp || idp.type !== 'saml' || !idp.enabled) {
      return null;
    }

    const config = idp.config as unknown as SamlConfig;
    // For SAML, the entry point is the IdP's SSO URL
    return config.entryPoint;
  } catch (error) {
    logger.error('Error generating SAML auth URL', error);
    return null;
  }
}

/**
 * Handle SAML callback and create/update user
 */
export async function handleSamlCallback(
  idpId: string,
  profile: any
): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    const idp = await prisma.identityProvider.findUnique({
      where: { id: idpId },
      include: { defaultRole: true },
    });

    if (!idp) {
      return null;
    }

    const email = profile.email || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];

    if (!email) {
      logger.error('No email found in SAML profile', { profile });
      return null;
    }

    // JIT user provisioning
    let user = await prisma.user.findUnique({
      where: { email },
      include: { roles: true },
    });

    if (!user && idp.jitEnabled) {
      const defaultRoleId = idp.defaultRoleId;
      const roleIds = defaultRoleId ? [defaultRoleId] : [];

      user = await prisma.user.create({
        data: {
          email,
          password: '', // No password for SSO users
          tenantId: idp.tenantId || null,
          roles: {
            connect: roleIds.map((id) => ({ id })),
          },
        },
        include: { roles: true },
      });
    }

    if (!user) {
      return null;
    }

    // Create SSO session
    await prisma.ssoSession.create({
      data: {
        userId: user.id,
        idpId: idp.id,
        sessionId: profile.nameID || profile.sessionIndex || email,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
      },
    });

    // Generate JWT tokens
    const payload = {
      sub: user.id,
      roles: user.roles.map((r) => r.name),
      tenant_id: user.tenantId,
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as SignOptions);
    const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    } as SignOptions);

    return { accessToken, refreshToken };
  } catch (error) {
    logger.error('Error handling SAML callback', error);
    return null;
  }
}
