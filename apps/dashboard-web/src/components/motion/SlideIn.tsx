import React from 'react';
import { Box, BoxProps } from '@mui/material';
import { animations } from '../../theme/animations';

interface SlideInProps extends BoxProps {
  direction?: 'left' | 'right';
  delay?: number;
  duration?: number;
}

export const SlideIn: React.FC<SlideInProps> = ({ 
  children, 
  direction = 'right',
  delay = 0, 
  duration = 0.4,
  sx, 
  ...props 
}) => {
  return (
    <Box
      sx={{
        opacity: 0,
        animation: direction === 'left' ? animations.slideInLeft : animations.slideInRight,
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
