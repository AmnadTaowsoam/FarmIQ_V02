import express from 'express'
import { updateDeviceHeartbeatHandler } from '../controllers/deviceController'
import { internalAuthMiddleware } from '../middlewares/internalAuthMiddleware'

const router = express.Router()

router.use(internalAuthMiddleware)
router.post('/device-heartbeat', updateDeviceHeartbeatHandler)

export default router
