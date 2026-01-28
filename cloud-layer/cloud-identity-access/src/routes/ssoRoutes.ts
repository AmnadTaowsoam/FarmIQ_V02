import { Router } from 'express';
import * as ssoController from '../controllers/ssoController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Public SSO authentication endpoints
router.get('/sso/oidc/:idpId/initiate', ssoController.initiateOidcAuth);
router.get('/sso/oidc/:idpId/callback', ssoController.handleOidcCallbackRoute);
router.get('/sso/saml/:idpId/initiate', ssoController.initiateSamlAuth);
router.post('/sso/saml/:idpId/callback', ssoController.handleSamlCallbackRoute);

// Admin endpoints for managing identity providers (require authentication)
router.get('/sso/identity-providers', authMiddleware, ssoController.listIdentityProviders);
router.get('/sso/identity-providers/:id', authMiddleware, ssoController.getIdentityProviderById);
router.post('/sso/identity-providers', authMiddleware, ssoController.createIdentityProvider);
router.patch('/sso/identity-providers/:id', authMiddleware, ssoController.updateIdentityProvider);
router.delete('/sso/identity-providers/:id', authMiddleware, ssoController.deleteIdentityProvider);

export default router;
