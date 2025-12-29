import React from 'react';
import { Box, Card, CardActionArea, Typography, Chip } from '@mui/material';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { Notification, NotificationSeverity } from '../../api/notifications';
import { formatDistanceToNow, format } from 'date-fns';

const getSeverityIcon = (severity: NotificationSeverity) => {
  switch (severity) {
    case 'critical':
      return <AlertCircle size={20} />;
    case 'warning':
      return <AlertTriangle size={20} />;
    case 'info':
    default:
      return <Info size={20} />;
  }
};

const getSeverityColor = (severity: NotificationSeverity): 'error' | 'warning' | 'info' => {
  switch (severity) {
    case 'critical':
      return 'error';
    case 'warning':
      return 'warning';
    case 'info':
    default:
      return 'info';
  }
};

interface NotificationListItemProps {
  notification: Notification;
  onClick?: (notification: Notification) => void;
  showFullDate?: boolean;
}

export const NotificationListItem: React.FC<NotificationListItemProps> = ({
  notification,
  onClick,
  showFullDate = false,
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick(notification);
    }
  };

  const isUnread = !notification.read_at;

  return (
    <Card
      variant="outlined"
      sx={{
        mb: 1.5,
        bgcolor: isUnread ? 'action.hover' : 'background.paper',
        borderLeft: `4px solid`,
        borderLeftColor: `${getSeverityColor(notification.severity)}.main`,
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: 2,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardActionArea onClick={handleClick} sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* Severity Icon */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              color: `${getSeverityColor(notification.severity)}.main`,
              mt: 0.5,
            }}
          >
            {getSeverityIcon(notification.severity)}
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Header: Title + Severity Badge */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.5 }}>
              <Typography
                variant="subtitle1"
                fontWeight={isUnread ? 600 : 500}
                sx={{ flex: 1, minWidth: 0 }}
              >
                {notification.title}
              </Typography>
              <Chip
                label={notification.severity.toUpperCase()}
                size="small"
                color={getSeverityColor(notification.severity)}
                sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }}
              />
            </Box>

            {/* Message */}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {notification.message}
            </Typography>

            {/* Metadata */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                {(() => {
                  try {
                    if (!notification.created_at) return 'Unknown date';
                    const date = new Date(notification.created_at);
                    if (isNaN(date.getTime())) return 'Invalid date';
                    return showFullDate
                      ? format(date, 'PPpp')
                      : formatDistanceToNow(date, { addSuffix: true });
                  } catch {
                    return 'Invalid date';
                  }
                })()}
              </Typography>

              {notification.farm_id && (
                <Typography variant="caption" color="text.secondary">
                  Farm: {notification.farm_id}
                </Typography>
              )}

              {notification.barn_id && (
                <Typography variant="caption" color="text.secondary">
                  Barn: {notification.barn_id}
                </Typography>
              )}

              {isUnread && (
                <Chip
                  label="NEW"
                  size="small"
                  color="primary"
                  sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                />
              )}
            </Box>
          </Box>
        </Box>
      </CardActionArea>
    </Card>
  );
};
