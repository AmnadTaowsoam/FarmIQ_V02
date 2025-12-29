import React from 'react';
import { Paper, Box, Typography, PaperProps, alpha, useTheme } from '@mui/material';

interface PremiumCardProps extends PaperProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  noPadding?: boolean;
  hoverable?: boolean;
  accent?: 'primary' | 'secondary' | 'error' | 'success' | 'info';
}

export const PremiumCard: React.FC<PremiumCardProps> = ({ 
  title, 
  subtitle,
  action, 
  children, 
  noPadding = false,
  hoverable = false,
  accent,
  sx,
  ...other 
}) => {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 4, 
        border: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        bgcolor: 'background.paper',
        ...(accent && {
            '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                bgcolor: `${accent}.main`
            }
        }),
        ...(hoverable && {
          cursor: 'pointer',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: theme.shadows[2],
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
          alignItems: 'flex-start' 
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
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mt: 0.5, display: 'block' }}>
                    {subtitle}
                </Typography>
            )}
          </Box>
          {action && <Box sx={{ ml: 2 }}>{action}</Box>}
        </Box>
      )}
      <Box sx={{ p: noPadding ? 0 : 3, flexGrow: 1 }}>
        {children}
      </Box>
    </Paper>
  );
};
