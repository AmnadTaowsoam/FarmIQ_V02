import React from 'react';
import { Chip, ChipProps, alpha } from '@mui/material';
import { CheckCircle2, AlertCircle, XCircle, HelpCircle } from 'lucide-react';

export type HealthStatus = 'healthy' | 'degraded' | 'critical' | 'unknown';

interface HealthBadgeProps {
  status: HealthStatus;
  label?: string;
  size?: 'small' | 'medium';
  showIcon?: boolean;
}

/**
 * HealthBadge Component
 * 
 * Color-coded health status badge with optional icon.
 * 
 * Example:
 * <HealthBadge status="healthy" label="Online" showIcon />
 * <HealthBadge status="degraded" />
 * <HealthBadge status="critical" label="Offline" size="small" />
 */
export const HealthBadge: React.FC<HealthBadgeProps> = ({
  status,
  label,
  size = 'small',
  showIcon = true,
}) => {
  const getStatusConfig = (): {
    color: ChipProps['color'];
    icon: React.ReactNode;
    defaultLabel: string;
    bgcolor: (theme: any) => string;
    textColor: string;
  } => {
    switch (status) {
      case 'healthy':
        return {
          color: 'success',
          icon: <CheckCircle2 size={14} />,
          defaultLabel: 'Healthy',
          bgcolor: (theme: any) => alpha(theme.palette.success.main, 0.1),
          textColor: 'success.dark',
        };
      case 'degraded':
        return {
          color: 'warning',
          icon: <AlertCircle size={14} />,
          defaultLabel: 'Degraded',
          bgcolor: (theme: any) => alpha(theme.palette.warning.main, 0.1),
          textColor: 'warning.dark',
        };
      case 'critical':
        return {
          color: 'error',
          icon: <XCircle size={14} />,
          defaultLabel: 'Critical',
          bgcolor: (theme: any) => alpha(theme.palette.error.main, 0.1),
          textColor: 'error.dark',
        };
      case 'unknown':
      default:
        return {
          color: 'default',
          icon: <HelpCircle size={14} />,
          defaultLabel: 'Unknown',
          bgcolor: (theme: any) => alpha(theme.palette.grey[500], 0.1),
          textColor: 'text.secondary',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Chip
      label={label || config.defaultLabel}
      size={size}
      icon={showIcon ? (config.icon as any) : undefined}
      sx={{
        bgcolor: config.bgcolor,
        color: config.textColor,
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
