import { Request, Response } from 'express'
import {
  getExamplesFromDatabase,
  createExample,
} from '../services/exampleService'

/**
 * Handle GET request to get examples.
 * @param {Request} _req - Express request object
 * @param {Response} res - Express response object
 */
export async function getExamples(_req: Request, res: Response) {
  try {
    const examples = await getExamplesFromDatabase()
    res.json(examples)
  } catch (err) {
    res.status(500).json({ error: 'An error occurred while getting examples.' })
  }
}

/**
 * Handle POST request to create a user.
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
export async function createUserHandler(req: Request, res: Response) {
  try {
    const payload = req.body
    const user = await createExample(payload)
    res.status(201).json(user)
  } catch (err) {
    res
      .status(500)
      .json({ error: 'An error occurred while creating the user.' })
  }
}
