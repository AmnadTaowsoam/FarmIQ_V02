import { Router } from 'express';
import * as rbacController from '../controllers/rbacController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// All RBAC endpoints require authentication
router.use(authMiddleware);

// Permissions
router.get('/rbac/permissions', rbacController.listPermissions);
router.get('/rbac/roles/:roleId/permissions', rbacController.getRolePermissionsRoute);
router.post('/rbac/roles/:roleId/permissions', rbacController.assignPermissionsToRoleRoute);

// Custom Roles
router.post('/rbac/custom-roles', rbacController.createCustomRoleRoute);
router.get('/rbac/tenants/:tenantId/custom-roles', rbacController.getCustomRolesRoute);
router.patch('/rbac/custom-roles/:roleId', rbacController.updateCustomRoleRoute);
router.delete('/rbac/custom-roles/:roleId', rbacController.deleteCustomRoleRoute);

// User role assignments
router.post('/rbac/users/assign-role', rbacController.assignCustomRoleToUserRoute);
router.post('/rbac/users/remove-role', rbacController.removeCustomRoleFromUserRoute);

// Permission checks
router.get('/rbac/users/:userId/permission', rbacController.checkUserPermissionRoute);

// User attributes (ABAC)
router.get('/rbac/users/:userId/attributes', rbacController.getUserAttributesRoute);
router.post('/rbac/users/:userId/attributes', rbacController.setUserAttributeRoute);

export default router;
