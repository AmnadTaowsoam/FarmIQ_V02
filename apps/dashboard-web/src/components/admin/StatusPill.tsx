import React from 'react';
import { Chip, alpha } from '@mui/material';

export type StatusColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

interface StatusPillProps {
  label: string;
  color?: StatusColor;
  variant?: 'filled' | 'outlined';
  size?: 'small' | 'medium';
  icon?: React.ReactNode;
}

/**
 * StatusPill Component
 * 
 * Inline status indicator with customizable colors and labels.
 * 
 * Example:
 * <StatusPill label="Active" color="success" />
 * <StatusPill label="Pending" color="warning" variant="outlined" />
 * <StatusPill label="Inactive" color="default" size="small" />
 */
export const StatusPill: React.FC<StatusPillProps> = ({
  label,
  color = 'default',
  variant = 'filled',
  size = 'small',
  icon,
}) => {
  const getCustomStyles = () => {
    if (variant === 'outlined') {
      return {
        borderColor: color === 'default' ? 'divider' : `${color}.main`,
        color: color === 'default' ? 'text.primary' : `${color}.main`,
        bgcolor: 'transparent',
      };
    }

    // Filled variant
    if (color === 'default') {
      return {
        bgcolor: (theme: any) => alpha(theme.palette.grey[500], 0.1),
        color: 'text.primary',
      };
    }

    return {
      bgcolor: (theme: any) => alpha(theme.palette[color].main, 0.1),
      color: `${color}.dark`,
    };
  };

  return (
    <Chip
      label={label}
      size={size}
      icon={icon as any}
      variant={variant === 'outlined' ? 'outlined' : 'filled'}
      sx={{
        ...getCustomStyles(),
        fontWeight: 600,
        fontSize: size === 'small' ? 11 : 13,
        height: size === 'small' ? 24 : 28,
        '& .MuiChip-icon': {
          color: 'inherit',
          marginLeft: 1,
        },
      }}
    />
  );
};
