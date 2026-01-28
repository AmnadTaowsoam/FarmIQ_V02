import rateLimit from 'express-rate-limit';

/**
 * Rate Limiter Configuration
 * 
 * Defines rate limiting windows and maximum request counts per IP.
 * Different limits can be applied to different routes if needed.
 */

// General API Rate Limiter
// Allow 100 requests per 15 minutes per IP
export const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
        status: 429,
        error: 'Too Many Requests',
        message: 'You have exceeded the request limit. Please try again later.'
    }
});

// Stricter Limiter for sensitive endpoints (like login)
// Allow 5 requests per hour per IP
export const authRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 429,
        error: 'Too Many Requests',
        message: 'Too many login attempts. Please try again later.'
    }
});
