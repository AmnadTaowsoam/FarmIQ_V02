import React from 'react';
import { Box, BoxProps } from '@mui/material';
import { animations } from '../../theme/animations';

interface FadeInProps extends BoxProps {
  delay?: number;
  duration?: number;
}

export const FadeIn: React.FC<FadeInProps> = ({ 
  children, 
  delay = 0, 
  duration = 0.4,
  sx, 
  ...props 
}) => {
  return (
    <Box
      sx={{
        opacity: 0, // Start hidden
        animation: animations.fadeIn,
        animationDelay: `${delay}ms`,
        animationDuration: `${duration}s`,
        ...sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
};
