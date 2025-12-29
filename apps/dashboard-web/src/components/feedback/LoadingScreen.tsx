import React from 'react';
import { Box, CircularProgress, Typography, Skeleton } from '@mui/material';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Loading...' }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px', // or 100vh depending on usage contexts
      height: '100%',
    }}
  >
    <CircularProgress size={48} thickness={4} color="primary" />
    <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
      {message}
    </Typography>
  </Box>
);

export const SectionLoader: React.FC<{ height?: number }> = ({ height = 200 }) => (
    <Skeleton variant="rectangular" height={height} sx={{ borderRadius: 2 }} />
);
