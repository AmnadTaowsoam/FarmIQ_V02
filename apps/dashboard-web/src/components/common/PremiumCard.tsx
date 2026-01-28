import React from 'react';
import { Paper, Box, Typography, PaperProps, alpha, useTheme } from '@mui/material';

interface PremiumCardProps extends PaperProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  noPadding?: boolean;
  hoverable?: boolean;
  accent?: 'primary' | 'secondary' | 'error' | 'success' | 'info' | 'warning';
  variant?: 'elevated' | 'glass' | 'outlined' | 'gradient';
  glow?: boolean;
  glassEffect?: boolean; // Deprecated, use variant="glass"
}

export const PremiumCard: React.FC<PremiumCardProps> = ({
  title,
  subtitle,
  action,
  children,
  noPadding = false,
  hoverable = false,
  accent,
  variant = 'elevated',
  glow = false,
  glassEffect,
  sx,
  ...other
}) => {
  const theme = useTheme();
  
  // Backward compatibility
  const resolvedVariant = glassEffect ? 'glass' : variant;

  const getVariantStyles = () => {
    switch (resolvedVariant) {
      case 'glass':
        return {
          bgcolor: alpha(theme.palette.background.paper, 0.72),
          backdropFilter: 'blur(20px) saturate(180%)',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
        };
      case 'gradient':
        return {
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        };
      case 'outlined':
        return {
          bgcolor: 'transparent',
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: 'none',
        };
      case 'elevated':
      default:
        return {
          bgcolor: 'background.paper',
          boxShadow: theme.shadows[1],
          border: '1px solid',
          borderColor: 'divider',
        };
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        ...getVariantStyles(),
        ...(glow && {
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: -1,
            borderRadius: 'inherit',
            padding: 1,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            opacity: 0.3,
          },
        }),
        ...(accent && {
            '&::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                bgcolor: `${accent}.main`
            }
        }),
        ...(hoverable && {
          cursor: 'pointer',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: theme.shadows[8],
            borderColor: alpha(theme.palette.primary.main, 0.3),
            '& .card-header-title': {
                color: 'primary.main'
            }
          },
        }),
        ...sx,
      }}
      {...other}
    >
      {(title || action || subtitle) && (
        <Box sx={{ 
          px: 3,
          pt: 3, 
          pb: noPadding ? 3 : 1, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          borderBottom: noPadding ? `1px solid ${alpha(theme.palette.divider, 0.5)}` : 'none',
        }}>
          <Box>
            {title && (
              <Typography 
                variant="h6" 
                className="card-header-title"
                sx={{ 
                  fontWeight: 700,
                  transition: 'color 0.2s',
                  color: 'text.primary',
                  lineHeight: 1.2
                }}
              >
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          {action && <Box sx={{ ml: 2 }}>{action}</Box>}
        </Box>
      )}
      <Box sx={{ p: noPadding ? 0 : 3, flexGrow: 1, position: 'relative' }}>
        {children}
      </Box>
    </Paper>
  );
};
