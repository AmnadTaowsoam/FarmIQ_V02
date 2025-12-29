import { logger } from '../utils/logger';

interface ImageAccessOptions {
  sessionId: string;
  imageId: string;
  tenantId: string;
}

class ImageAccessService {
  private urlCache: Map<string, { url: string; expiresAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 14 * 60 * 1000; // 14 minutes (URLs expire at 15 min)

  /**
   * Get presigned URL for image access
   * TODO: Replace with actual BFF endpoint when available
   * GET /api/v1/media/images/:imageId/presign?tenant_id=...&session_id=...
   */
  async getPresignedUrl(options: ImageAccessOptions): Promise<string> {
    const cacheKey = `${options.sessionId}-${options.imageId}`;
    const cached = this.urlCache.get(cacheKey);

    // Return cached URL if still valid
    if (cached && cached.expiresAt > Date.now()) {
      return cached.url;
    }

    try {
      // TODO: Replace with actual API call
      // const response = await apiClient.get<PresignedUrlResponse>(
      //   `${getBFFBaseURL()}/v1/media/images/${options.imageId}/presign`,
      //   {
      //     params: {
      //       tenant_id: options.tenantId,
      //       session_id: options.sessionId,
      //     },
      //   }
      // );

      // Mock response for now
      const mockUrl = `https://example.com/images/${options.imageId}?token=mock`;
      const expiresAt = Date.now() + this.CACHE_TTL_MS;

      this.urlCache.set(cacheKey, {
        url: mockUrl,
        expiresAt,
      });

      // Log image access for audit (stub)
      this.logImageAccess(options);

      return mockUrl;
    } catch (error) {
      logger.error('Failed to get presigned URL', error, {
        imageId: options.imageId,
        sessionId: options.sessionId,
      });
      throw error;
    }
  }

  /**
   * Log image access for audit
   * TODO: Call BFF endpoint when available
   * POST /api/v1/audit/image-access
   */
  private async logImageAccess(options: ImageAccessOptions): Promise<void> {
    try {
      // TODO: Replace with actual API call
      // await apiClient.post(
      //   `${getBFFBaseURL()}/v1/audit/image-access`,
      //   {
      //     image_id: options.imageId,
      //     session_id: options.sessionId,
      //     tenant_id: options.tenantId,
      //     accessed_at: new Date().toISOString(),
      //   }
      // );

      logger.info('Image access logged (stub)', {
        imageId: options.imageId,
        sessionId: options.sessionId,
      });
    } catch (error) {
      // Don't fail the request if audit logging fails
      logger.warn('Failed to log image access', {
        error: error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : String(error),
      });
    }
  }

  /**
   * Clear expired URLs from cache
   */
  clearExpiredUrls(): void {
    const now = Date.now();
    for (const [key, value] of this.urlCache.entries()) {
      if (value.expiresAt <= now) {
        this.urlCache.delete(key);
      }
    }
  }

  /**
   * Clear all cached URLs
   */
  clearCache(): void {
    this.urlCache.clear();
  }
}

export const imageAccessService = new ImageAccessService();

// Clean up expired URLs periodically
if (typeof window !== 'undefined') {
  setInterval(() => {
    imageAccessService.clearExpiredUrls();
  }, 60 * 1000); // Every minute
}

