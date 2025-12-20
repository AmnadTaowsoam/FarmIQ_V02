import express from 'express'
import { jwtAuthMiddleware } from '../middlewares/authMiddleware'
import {
  queryAuditEventsHandler,
} from '../controllers/auditController'

const router = express.Router()

router.use(jwtAuthMiddleware)

router.get('/events', queryAuditEventsHandler)

export default router

