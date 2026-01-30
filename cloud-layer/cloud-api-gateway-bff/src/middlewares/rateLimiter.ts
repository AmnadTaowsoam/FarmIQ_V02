import rateLimit from 'express-rate-limit';

/**
 * Rate Limiter Configuration
 * 
 * Defines rate limiting windows and maximum request counts per IP.
 * Different limits can be applied to different routes if needed.
 */

// General API Rate Limiter
// Allow 1000 requests per 15 minutes per IP (Relaxed for Dev)
export const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per `window`
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
        status: 429,
        error: 'Too Many Requests',
        message: 'You have exceeded the request limit. Please try again later.'
    }
});

// Stricter Limiter for sensitive endpoints (like login)
// Allow 100 requests per hour per IP (Relaxed for Dev)
export const authRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 429,
        error: 'Too Many Requests',
        message: 'Too many login attempts. Please try again later.'
    }
});
