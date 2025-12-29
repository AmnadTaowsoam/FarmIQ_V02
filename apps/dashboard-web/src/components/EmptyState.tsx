import React from 'react';
import { Box, Button, Typography } from '@mui/material';

export type EmptyStateVariant = 'no-data' | 'no-context' | 'api-unavailable';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  size?: 'sm' | 'md';
  variant?: EmptyStateVariant;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  size = 'md',
  variant = 'no-data',
}) => {
  const isCompact = size === 'sm';
  
  // Variant-specific styling
  const variantStyles = {
    'no-data': {
      borderColor: 'divider',
      iconBg: 'action.hover',
    },
    'no-context': {
      borderColor: 'warning.main',
      iconBg: 'warning.light',
    },
    'api-unavailable': {
      borderColor: 'error.main',
      iconBg: 'error.light',
    },
  };

  const styles = variantStyles[variant];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: isCompact ? 3 : 4,
        textAlign: 'center',
        minHeight: isCompact ? 160 : 240,
        borderRadius: 2,
        border: '1px dashed',
        borderColor: styles.borderColor,
        bgcolor: 'background.paper',
      }}
    >
      {icon && (
        <Box
          sx={{
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: isCompact ? 44 : 56,
            height: isCompact ? 44 : 56,
            borderRadius: '50%',
            bgcolor: styles.iconBg,
            color: 'text.secondary',
          }}
        >
          {icon}
        </Box>
      )}
      <Typography variant="h6" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, mb: 3 }}>
          {description}
        </Typography>
      )}
      {(actionLabel || secondaryActionLabel) && (
        <Box sx={{ display: 'flex', gap: 2 }}>
          {actionLabel && onAction && (
            <Button variant="contained" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="outlined" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
};
