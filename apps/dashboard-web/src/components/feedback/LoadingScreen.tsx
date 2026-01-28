import React from 'react';
import { Box, CircularProgress, Typography, Skeleton, useTheme, alpha } from '@mui/material';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Loading...' }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        height: '100%',
        width: '100%',
        position: 'relative',
      }}
    >
      <Box position="relative">
        <CircularProgress 
            size={60} 
            thickness={2} 
            sx={{ 
                color: alpha(theme.palette.primary.main, 0.2),
                position: 'absolute',
                left: 0,
            }} 
            variant="determinate" 
            value={100} 
        />
        <CircularProgress 
            size={60} 
            thickness={2} 
            sx={{ 
                color: theme.palette.primary.main,
                animationDuration: '1.5s',
                [`& .MuiCircularProgress-circle`]: {
                    strokeLinecap: 'round',
                },
            }} 
            disableShrink 
        />
      </Box>
      
      <Typography 
        variant="body2" 
        sx={{ 
            mt: 3, 
            color: 'text.secondary', 
            fontWeight: 500, 
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            fontSize: '0.75rem',
            animation: 'pulse 2s infinite',
            '@keyframes pulse': {
                '0%': { opacity: 0.6 },
                '50%': { opacity: 1 },
                '100%': { opacity: 0.6 },
            }
        }}
      >
        {message}
      </Typography>
    </Box>
  );
};

export const SectionLoader: React.FC<{ height?: number }> = ({ height = 200 }) => (
    <Skeleton 
        variant="rectangular" 
        height={height} 
        sx={{ borderRadius: 3, bgcolor: 'action.hover' }} 
        animation="wave" 
    />
);
