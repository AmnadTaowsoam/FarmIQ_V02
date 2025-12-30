import express from 'express'
import { loginHandler, refreshHandler, meHandler } from '../controllers/authProxyController'

const router = express.Router()

router.post('/auth/login', loginHandler)
router.post('/auth/refresh', refreshHandler)
router.get('/auth/me', meHandler)

export default router
