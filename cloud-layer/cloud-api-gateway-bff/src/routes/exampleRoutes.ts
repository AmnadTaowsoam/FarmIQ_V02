// eslint-disable-next-line eslint-comments/disable-enable-pair
/* eslint-disable jsdoc/check-tag-names */
import express from 'express'
import {
  createUserHandler,
  getExamples,
} from '../controllers/exampleController'
import { validateExampleMiddleware } from '../middlewares/validationMiddleware'
import { exampleMiddleware } from '../middlewares/middlewares'

const router = express.Router()

/**
 * @swagger
 * /api/example:
 *   post:
 *     summary: Create a new example
 *     tags: [Examples]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: test
 *               email:
 *                 type: string
 *                 example: test@gmail.com
 *               age:
 *                 type: number
 *                 example: 3
 *     responses:
 *       201:
 *         description: The created example.
 *       400:
 *         description: Bad request.
 */
// eslint-disable-next-line @typescript-eslint/no-misused-promises
router.post('/example', validateExampleMiddleware, createUserHandler)

/**
 * @swagger
 * /api/example:
 *   get:
 *     summary: Get all examples
 *     tags: [Examples]
 *     responses:
 *       200:
 *         description: A list of examples.
 */
// eslint-disable-next-line @typescript-eslint/no-misused-promises
router.get('/example', exampleMiddleware, getExamples)

export default router
