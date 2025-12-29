import React from 'react';
import { Chip, ChipProps, useTheme } from '@mui/material';

export type StatusType = 'success' | 'warning' | 'error' | 'info';

interface StatusChipProps extends Omit<ChipProps, 'color'> {
  status: StatusType;
  label: string;
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, label, sx, ...other }) => {
  const theme = useTheme();

  const getStatusColor = (type: StatusType) => {
    switch (type) {
      case 'success':
        return {
          bg: theme.palette.success.light,
          color: theme.palette.success.dark,
          border: theme.palette.success.main
        };
      case 'warning':
        return {
          bg: theme.palette.warning.light,
          color: theme.palette.warning.dark,
          border: theme.palette.warning.main,
        };
      case 'error':
        return {
          bg: theme.palette.error.light,
          color: theme.palette.error.dark,
          border: theme.palette.error.main,
        };
      case 'info':
      default:
        return {
          bg: theme.palette.info.light,
          color: theme.palette.info.dark,
          border: theme.palette.info.main,
        };
    }
  };

  const colors = getStatusColor(status);

  return (
    <Chip
      label={label}
      sx={{
        backgroundColor: colors.bg,
        color: colors.color,
        fontWeight: 600,
        borderRadius: '6px', // Slightly less rounded than pill for technical look
        height: '24px',
        fontSize: '0.75rem',
        border: '1px solid',
        borderColor: 'transparent', // Reserved for high contrast
        ...sx,
      }}
      {...other}
    />
  );
};
