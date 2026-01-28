import React from 'react';
import { Box, BoxProps } from '@mui/material';
import { animations } from '../../theme/animations';

interface StaggerProps extends BoxProps {
  delay?: number;
  staggerDelay?: number;
}

export const Stagger: React.FC<StaggerProps> = ({ 
  children, 
  delay = 0, 
  staggerDelay = 100,
  sx, 
  ...props 
}) => {
  return (
    <Box sx={sx} {...props}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        
        return (
          <Box
            sx={{
              opacity: 0,
              animation: animations.fadeIn,
              animationDelay: `${delay + index * staggerDelay}ms`,
              animationFillMode: 'forwards',
            }}
          >
            {child}
          </Box>
        );
      })}
    </Box>
  );
};
