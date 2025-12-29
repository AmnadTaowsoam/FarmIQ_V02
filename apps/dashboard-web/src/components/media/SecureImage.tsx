import React, { useState, useEffect } from 'react';
import { Box, Typography, Skeleton } from '@mui/material';
import { imageAccessService } from '../../services/ImageAccessService';
import { useActiveContext } from '../../contexts/ActiveContext';
import { useAuth } from '../../contexts/AuthContext';
import { isFeatureEnabled } from '../../utils/featureFlags';
import { logger } from '../../utils/logger';

interface SecureImageProps {
  imageId: string;
  sessionId: string;
  alt?: string;
  width?: number | string;
  height?: number | string;
  fallback?: React.ReactNode;
}

export const SecureImage: React.FC<SecureImageProps> = ({
  imageId,
  sessionId,
  alt = 'Image',
  width = '100%',
  height = 'auto',
  fallback,
}) => {
  const { tenantId } = useActiveContext();
  const { user } = useAuth();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user has image access permission
  const hasImageAccess = isFeatureEnabled('ENABLE_IMAGE_ACCESS') && 
    (user?.roles.includes('platform_admin') || 
     user?.roles.includes('tenant_admin') || 
     user?.roles.includes('farm_manager'));

  useEffect(() => {
    if (!tenantId || !hasImageAccess) {
      setError('Image access not permitted');
      setLoading(false);
      return;
    }

    const loadImage = async () => {
      try {
        setLoading(true);
        const url = await imageAccessService.getPresignedUrl({
          imageId,
          sessionId,
          tenantId,
        });
        setImageUrl(url);
      } catch (err: any) {
        setError(err.message || 'Failed to load image');
        logger.error('Failed to load secure image', err, {
          imageId,
          sessionId,
        });
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [imageId, sessionId, tenantId, hasImageAccess]);

  if (!hasImageAccess) {
    return (
      <Box
        sx={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.100',
          borderRadius: 1,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Image access restricted
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return <Skeleton variant="rectangular" width={width} height={height} />;
  }

  if (error || !imageUrl) {
    return fallback || (
      <Box
        sx={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.100',
          borderRadius: 1,
        }}
      >
        <Typography variant="caption" color="error">
          {error || 'Image unavailable'}
        </Typography>
      </Box>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      style={{ width, height, objectFit: 'contain' }}
      onError={() => {
        setError('Failed to load image');
        setImageUrl(null);
      }}
    />
  );
};

