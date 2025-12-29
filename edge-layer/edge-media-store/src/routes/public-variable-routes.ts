// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable jsdoc/check-tag-names */
import express from 'express'
import { getPublicVariableFrontend } from '../controllers/public-variable-controller'

const router = express.Router()

/**
 * @swagger
 * /api/public-variable-frontend:
 *   get:
 *     summary: Get public variables for frontend
 *     tags: [Public Variables]
 *     responses:
 *       200:
 *         description: A list of public variables.
 */
router.get('/', getPublicVariableFrontend)

export default router
