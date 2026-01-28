import React from 'react';
import { Button, ButtonProps, alpha, useTheme } from '@mui/material';

interface PremiumButtonProps extends Omit<ButtonProps, 'variant'> {
  variant?: 'primary' | 'secondary' | 'gradient' | 'glass';
}

export const PremiumButton: React.FC<PremiumButtonProps> = ({ 
  variant = 'primary',
  children,
  sx,
  ...other 
}) => {
  const theme = useTheme();

  const getButtonStyles = () => {
    switch (variant) {
      case 'gradient':
        return {
          borderRadius: 10,
          padding: '12px 24px',
          fontWeight: 600,
          textTransform: 'none' as const,
          background: 'linear-gradient(135deg, #4caf50 0%, #43a047 100%)',
          color: '#FFFFFF',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0px 4px 16px rgba(76, 175, 80, 0.4)',
            transform: 'translateY(-2px)',
            background: 'linear-gradient(135deg, #43a047 0%, #388e3c 100%)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
          '&:disabled': {
            background: alpha('#4caf50', 0.3),
            color: alpha('#FFFFFF', 0.5),
            boxShadow: 'none',
            transform: 'none',
          },
        };
      case 'secondary':
        return {
          borderRadius: 10,
          padding: '12px 24px',
          fontWeight: 600,
          textTransform: 'none' as const,
          background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
          color: '#FFFFFF',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0px 4px 16px rgba(33, 150, 243, 0.4)',
            transform: 'translateY(-2px)',
            background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
          '&:disabled': {
            background: alpha('#2196f3', 0.3),
            color: alpha('#FFFFFF', 0.5),
            boxShadow: 'none',
            transform: 'none',
          },
        };
      case 'glass':
        return {
          borderRadius: 10,
          padding: '12px 24px',
          fontWeight: 600,
          textTransform: 'none' as const,
          background: alpha(theme.palette.background.paper, 0.8),
          backdropFilter: 'blur(10px)',
          border: '1px solid',
          borderColor: alpha(theme.palette.primary.main, 0.2),
          color: 'primary.main',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            background: alpha(theme.palette.primary.main, 0.1),
            borderColor: 'primary.main',
            boxShadow: '0px 4px 16px rgba(76, 175, 80, 0.2)',
            transform: 'translateY(-2px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
          '&:disabled': {
            background: alpha(theme.palette.background.paper, 0.5),
            color: alpha(theme.palette.text.primary, 0.3),
            borderColor: 'transparent',
            boxShadow: 'none',
            transform: 'none',
          },
        };
      case 'primary':
      default:
        return {
          borderRadius: 10,
          padding: '12px 24px',
          fontWeight: 600,
          textTransform: 'none' as const,
          bgcolor: 'primary.main',
          color: '#FFFFFF',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            bgcolor: 'primary.dark',
            boxShadow: '0px 4px 16px rgba(76, 175, 80, 0.4)',
            transform: 'translateY(-2px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
          '&:disabled': {
            bgcolor: alpha('#4caf50', 0.3),
            color: alpha('#FFFFFF', 0.5),
            boxShadow: 'none',
            transform: 'none',
          },
        };
    }
  };

  return (
    <Button
      sx={{
        ...getButtonStyles(),
        ...sx,
      }}
      {...other}
    >
      {children}
    </Button>
  );
};
