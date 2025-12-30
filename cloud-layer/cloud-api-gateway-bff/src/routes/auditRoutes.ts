import express from 'express'
import { jwtAuthMiddleware } from '../middlewares/authMiddleware'
import {
  queryAuditEventsHandler,
  getAuditEventByIdHandler,
} from '../controllers/auditController'

const router = express.Router()

router.use(jwtAuthMiddleware)

router.get('/events', queryAuditEventsHandler)
router.get('/events/:id', getAuditEventByIdHandler)

export default router
