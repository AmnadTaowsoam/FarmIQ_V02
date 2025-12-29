import React from 'react';
import { Box, Typography, Button, alpha, useTheme } from '@mui/material';
import { LucideIcon, LayoutDashboard, Server, Activity, BellRing, Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export type EmptyStateVariant = 'card' | 'minimal' | 'NoContextSelected' | 'NoDevices' | 'NoTelemetryInRange' | 'NoAlerts';

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: EmptyStateVariant;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  variant = 'card'
}) => {
  const theme = useTheme();
  const navigate = useNavigate();

  // Variant Mapping
  const configs: Record<string, any> = {
    NoContextSelected: {
        icon: LayoutDashboard,
        title: 'No Context Selected',
        description: 'Please select an organization and farm to view telemetry and analytics.',
        actionLabel: 'Select Context',
        onAction: () => navigate('/select-context')
    },
    NoDevices: {
        icon: Server,
        title: 'No Devices Connected',
        description: 'We couldn’t find any active hardware in this segment. Add devices to start monitoring.',
        actionLabel: 'Provision Devices',
        onAction: () => navigate('/inventory')
    },
    NoTelemetryInRange: {
        icon: Activity,
        title: 'No Telemetry in Range',
        description: 'Connect devices or expand the time window to see operational trends.',
        actionLabel: 'Refresh Sync',
        onAction: onAction // Fallback to provided action
    },
    NoAlerts: {
        icon: BellRing,
        title: 'System Clear',
        description: 'No critical alerts or incidents detected in this window. Operational stability is optimal.',
        actionLabel: 'Configure Alerts',
        onAction: () => navigate('/settings')
    },
    default: {
        icon: Inbox,
        title: title || 'No data available',
        description: description,
        actionLabel: actionLabel,
        onAction: onAction
    }
  };

  const config = configs[variant] || configs.default;
  const FinalIcon = Icon || config.icon;
  const finalTitle = title || config.title;
  const finalDescription = description || config.description;
  const finalActionLabel = actionLabel || config.actionLabel;
  const finalOnAction = onAction || config.onAction;

  const isSimplified = variant === 'minimal' || variant === 'NoAlerts';

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        p: isSimplified ? 4 : 8, 
        textAlign: 'center',
        minHeight: isSimplified ? 200 : 300,
        bgcolor: variant === 'card' ? alpha(theme.palette.background.default, 0.4) : 'transparent',
        borderRadius: 4,
        border: variant === 'card' ? '1px dashed' : 'none',
        borderColor: 'divider',
        width: '100%'
      }}
    >
      {FinalIcon && (
        <Box sx={{ 
            p: isSimplified ? 1.5 : 2.5, 
            bgcolor: alpha(theme.palette.primary.main, 0.08), 
            borderRadius: 3, 
            mb: isSimplified ? 2 : 3,
            color: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
          <FinalIcon size={isSimplified ? 32 : 48} strokeWidth={1.5} />
        </Box>
      )}
      <Typography variant={isSimplified ? "subtitle1" : "h5"} fontWeight="800" gutterBottom sx={{ color: 'text.primary', letterSpacing: -0.5 }}>
        {finalTitle}
      </Typography>
      {finalDescription && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460, mb: 4, fontWeight: 500, lineHeight: 1.6 }}>
          {finalDescription}
        </Typography>
      )}
      {finalActionLabel && finalOnAction && (
        <Button 
            variant="contained" 
            size={isSimplified ? "small" : "large"}
            onClick={finalOnAction}
            sx={{ 
                px: 4, 
                py: isSimplified ? 0.8 : 1.2, 
                borderRadius: 2,
                fontWeight: 800,
                boxShadow: `0 8px 16px -4px ${alpha(theme.palette.primary.main, 0.3)}`
            }}
        >
          {finalActionLabel}
        </Button>
      )}
    </Box>
  );
};
