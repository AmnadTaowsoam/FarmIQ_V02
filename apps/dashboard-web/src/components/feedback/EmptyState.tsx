import React from 'react';
import { Box, Typography, Button, alpha, useTheme } from '@mui/material';
import { LucideIcon, LayoutDashboard, Server, Activity, BellRing, Inbox, PlusCircle } from 'lucide-react';
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
        description: 'Select a farm or barn to view specific data.',
        actionLabel: 'Select Context',
        onAction: () => navigate('/select-context')
    },
    NoDevices: {
        icon: Server,
        title: 'No Devices Connected',
        description: 'Add devices to start monitoring your farm.',
        actionLabel: 'Add Device',
        onAction: () => navigate('/inventory')
    },
    NoTelemetryInRange: {
        icon: Activity,
        title: 'No Data in Range',
        description: 'Try selecting a different date range.',
        actionLabel: 'Reset Range',
        onAction: onAction
    },
    NoAlerts: {
        icon: BellRing,
        title: 'All Clear',
        description: 'No active alerts at this time.',
        actionLabel: 'View History',
        onAction: () => navigate('/alerts/history')
    },
    default: {
        icon: Inbox,
        title: title || 'No Data',
        description: description || 'There is no data to display here.',
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
        p: isSimplified ? 4 : 6, 
        textAlign: 'center',
        minHeight: isSimplified ? 200 : 320,
        bgcolor: variant === 'card' ? alpha(theme.palette.background.paper, 0.4) : 'transparent',
        borderRadius: 4,
        border: variant === 'card' ? '1px dashed' : 'none',
        borderColor: alpha(theme.palette.divider, 0.5),
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        '&:hover': {
            borderColor: variant === 'card' ? theme.palette.primary.main : 'transparent',
            bgcolor: variant === 'card' ? alpha(theme.palette.background.paper, 0.6) : 'transparent',
        }
      }}
    >
      {/* Background decoration */}
      {variant === 'card' && (
          <Box 
            sx={{ 
                position: 'absolute', 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)', 
                width: '80%', 
                height: '80%', 
                background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.03)} 0%, transparent 70%)`,
                zIndex: 0,
                pointerEvents: 'none'
            }} 
          />
      )}

      <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box sx={{ 
            p: 2.5, 
            bgcolor: alpha(theme.palette.background.paper, 0.8), 
            borderRadius: '50%', 
            mb: 2.5,
            color: 'primary.main',
            boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
        }}>
            <FinalIcon size={isSimplified ? 28 : 40} strokeWidth={1.5} />
        </Box>
        
        <Typography variant="h6" fontWeight="700" gutterBottom sx={{ color: 'text.primary' }}>
            {finalTitle}
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mb: 3, lineHeight: 1.6 }}>
            {finalDescription}
        </Typography>

        {finalActionLabel && finalOnAction && (
            <Button 
                variant="outlined" 
                color="primary"
                onClick={finalOnAction}
                startIcon={<PlusCircle size={18} />}
                sx={{ 
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 3,
                    borderWidth: 2,
                    '&:hover': { borderWidth: 2 }
                }}
            >
            {finalActionLabel}
            </Button>
        )}
      </Box>
    </Box>
  );
};
