import {
  Router,
  type Request,
  type Response,
  type RequestHandler,
} from 'express'
import * as sessionController from '../controllers/sessionController'

const router = Router()

type AsyncHandler = (req: Request, res: Response) => Promise<unknown>

const wrapAsync = (fn: AsyncHandler): RequestHandler => {
  return (req, res, next) => {
    void fn(req, res).catch(next)
  }
}

// Health/Ready
router.get('/health', wrapAsync(sessionController.getHealth))
router.get('/ready', wrapAsync(sessionController.getReady))

// Sessions
router.post(
  '/v1/weighvision/sessions',
  wrapAsync(sessionController.createSession)
)
router.get(
  '/v1/weighvision/sessions/:sessionId',
  wrapAsync(sessionController.getSession)
)
router.post(
  '/v1/weighvision/sessions/:sessionId/bind-weight',
  wrapAsync(sessionController.bindWeight)
)
router.post(
  '/v1/weighvision/sessions/:sessionId/bind-media',
  wrapAsync(sessionController.bindMedia)
)
router.post(
  '/v1/weighvision/sessions/:sessionId/attach',
  wrapAsync(sessionController.attach)
)
router.post(
  '/v1/weighvision/sessions/:sessionId/finalize',
  wrapAsync(sessionController.finalizeSession)
)

export default router
