import express from 'express'
import { jwtAuthMiddleware, requireRole } from '../middlewares/authMiddleware'
import {
  createAdminUserHandler,
  deleteAdminUserHandler,
  getAdminRolesHandler,
  getAdminUserByIdHandler,
  getAdminUsersHandler,
  updateAdminUserHandler,
} from '../controllers/identityController'

const router = express.Router()

router.use(jwtAuthMiddleware)

router.get('/admin/users', requireRole('platform_admin'), getAdminUsersHandler)
router.get('/admin/users/:id', requireRole('platform_admin'), getAdminUserByIdHandler)
router.post('/admin/users', requireRole('platform_admin'), createAdminUserHandler)
router.patch('/admin/users/:id', requireRole('platform_admin'), updateAdminUserHandler)
router.delete('/admin/users/:id', requireRole('platform_admin'), deleteAdminUserHandler)
router.get('/admin/roles', requireRole('platform_admin'), getAdminRolesHandler)

export default router
