import { Router, Request } from 'express';
import * as authController from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiter for authentication endpoints
// In dev mode, allow more attempts for testing
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Relaxed for verification
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many login attempts. Try again in 15 minutes.'
    }
  },
  keyGenerator: (req: Request) => {
    const body = req.body as { email?: string };
    return body.email || req.ip || 'unknown';
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', authRateLimiter, authController.login);
router.post('/refresh', authRateLimiter, authController.refresh);
router.get('/me', authMiddleware, authController.me);

export default router;
