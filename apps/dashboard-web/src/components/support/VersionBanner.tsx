import React from 'react';
import { Box, Chip, Typography } from '@mui/material';

export const VersionBanner: React.FC = () => {
  const appVersion = import.meta.env.VITE_APP_VERSION || import.meta.env.PACKAGE_VERSION || '0.1.0';
  const environment = import.meta.env.MODE || 'development';
  const buildSha = import.meta.env.VITE_BUILD_SHA || 'dev';

  // Only show in development
  if (environment === 'production') {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        p: 1,
        bgcolor: 'background.paper',
        borderTop: 1,
        borderLeft: 1,
        borderColor: 'divider',
        borderRadius: '4px 0 0 0',
        zIndex: 1000,
      }}
    >
      <Box display="flex" alignItems="center" gap={1}>
        <Typography variant="caption" color="text.secondary">
          v{appVersion}
        </Typography>
        <Chip label={environment} size="small" color={environment === 'production' ? 'success' : 'default'} />
        {buildSha !== 'dev' && (
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            {buildSha.substring(0, 7)}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

