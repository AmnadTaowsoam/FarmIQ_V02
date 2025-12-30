import { Router } from 'express'
import { authMiddleware } from '../middlewares/authMiddleware'
import {
  createAdminUser,
  deleteAdminUser,
  getAdminRoles,
  getAdminUserById,
  getAdminUsers,
  updateAdminUser,
} from '../controllers/adminController'

const router = Router()

router.use(authMiddleware)

router.get('/users', getAdminUsers)
router.get('/users/:id', getAdminUserById)
router.post('/users', createAdminUser)
router.patch('/users/:id', updateAdminUser)
router.delete('/users/:id', deleteAdminUser)
router.get('/roles', getAdminRoles)

export default router
