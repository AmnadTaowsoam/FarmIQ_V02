import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

/**
 * Creates a user in the database.
 * @param {object} payload - The data for the new user.
 * @param {string} payload.name - The username.
 * @param {string} payload.email - The phone number.
 * @param {number} payload.age - The age of the user
 * @returns {Promise<object>} A promise that resolves to the created user.
 */
export async function createExample(payload: {
  name: string
  email: string
  age: number
}): Promise<object> {
  try {
    logger.info('++++++ Creating user ++++++++')
    const result = await prisma.example.create({
      data: payload,
    })
    return result
  } catch (error) {
    logger.error('Error creating user:', error)
    throw error
  }
}

/**
 * Fetches examples from the database asynchronously.
 * @returns {Promise<Array>} An array of example objects.
 */
export async function getExamplesFromDatabase(): Promise<Array<unknown>> {
  try {
    logger.info('++++++ Get example data ++++++++')
    const examples = await prisma.example.findMany()
    return examples
  } catch (error) {
    logger.error('Error fetching examples:', error)
    throw error
  }
}
