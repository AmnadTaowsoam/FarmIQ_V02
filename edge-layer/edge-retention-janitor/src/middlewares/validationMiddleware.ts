import { z } from 'zod'
import { Request, Response, NextFunction } from 'express'

const exampleSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().min(0),
})

export const validateExampleMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    exampleSchema.parse(req.body)
    next()
  } catch (err) {
    res.status(400).send(err)
  }
}
