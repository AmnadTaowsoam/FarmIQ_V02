import React, { useState } from 'react';
import {
  Badge,
  Box,
  CircularProgress,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Tooltip,
  Typography,
  Divider,
  Button,
  Alert,
} from '@mui/material';
import { Bell, X, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotificationsInbox } from '../../hooks/useNotifications';
import { Notification, NotificationSeverity } from '../../api/notifications';
import { formatDistanceToNow } from 'date-fns';

const getSeverityIcon = (severity: NotificationSeverity) => {
  switch (severity) {
    case 'critical':
      return <AlertCircle size={18} color="#d32f2f" />;
    case 'warning':
      return <AlertTriangle size={18} color="#ed6c02" />;
    case 'info':
    default:
      return <Info size={18} color="#0288d1" />;
  }
};

const getSeverityColor = (severity: NotificationSeverity): string => {
  switch (severity) {
    case 'critical':
      return '#d32f2f';
    case 'warning':
      return '#ed6c02';
    case 'info':
    default:
      return '#0288d1';
  }
};

interface NotificationBellProps {
  /** Optional: Override default drawer width */
  drawerWidth?: number;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ drawerWidth = 420 }) => {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data, isLoading, isError, error } = useNotificationsInbox();

  const unreadCount = data?.unread_count ?? 0;
  const notifications = data?.data ?? [];
  const recentNotifications = notifications.slice(0, 10); // Show top 10 in drawer

  const handleNotificationClick = (notification: Notification) => {
    // Navigate based on payload link, insightId, or entityId
    if (notification.payload_json?.link) {
      navigate(notification.payload_json.link);
    } else if (notification.payload_json?.insightId) {
      navigate(`/ai/insights/${notification.payload_json.insightId}`);
    } else if (notification.payload_json?.entityId) {
      // Fallback: use entityId as insightId
      navigate(`/ai/insights/${notification.payload_json.entityId}`);
    } else {
      // Final fallback: go to notifications history
      navigate('/notifications');
    }
    setDrawerOpen(false);
  };

  const handleViewAll = () => {
    navigate('/notifications');
    setDrawerOpen(false);
  };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton color="inherit" onClick={() => setDrawerOpen(true)}>
          <Badge badgeContent={unreadCount} color="error" max={99}>
            <Bell size={18} />
          </Badge>
        </IconButton>
      </Tooltip>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: drawerWidth,
            maxWidth: '100vw',
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6" fontWeight={600}>
            Notifications
          </Typography>
          <IconButton size="small" onClick={() => setDrawerOpen(false)}>
            <X size={20} />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          )}

          {isError && (
            <Box sx={{ p: 2 }}>
              <Alert severity="error">
                Failed to load notifications: {error?.message || 'Unknown error'}
              </Alert>
            </Box>
          )}

          {!isLoading && !isError && recentNotifications.length === 0 && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Bell size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
              <Typography variant="body2" color="text.secondary">
                No notifications yet
              </Typography>
            </Box>
          )}

          {!isLoading && !isError && recentNotifications.length > 0 && (
            <List sx={{ p: 0 }}>
              {recentNotifications.map((notification, index) => (
                <React.Fragment key={notification.notification_id}>
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => handleNotificationClick(notification)}
                      sx={{
                        py: 1.5,
                        px: 2,
                        bgcolor: notification.read_at ? 'transparent' : 'action.hover',
                        '&:hover': {
                          bgcolor: 'action.selected',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', gap: 1.5, width: '100%' }}>
                        {/* Severity Icon */}
                        <Box sx={{ flexShrink: 0, mt: 0.5 }}>
                          {getSeverityIcon(notification.severity)}
                        </Box>

                        {/* Content */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="subtitle2"
                            fontWeight={notification.read_at ? 400 : 600}
                            sx={{
                              mb: 0.5,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {notification.title}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              mb: 0.5,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {notification.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                            })}
                          </Typography>
                        </Box>

                        {/* Unread Indicator */}
                        {!notification.read_at && (
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: getSeverityColor(notification.severity),
                              flexShrink: 0,
                              mt: 1,
                            }}
                          />
                        )}
                      </Box>
                    </ListItemButton>
                  </ListItem>
                  {index < recentNotifications.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>

        {/* Footer */}
        {!isLoading && !isError && recentNotifications.length > 0 && (
          <Box
            sx={{
              p: 2,
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Button fullWidth variant="outlined" onClick={handleViewAll}>
              View All Notifications
            </Button>
          </Box>
        )}
      </Drawer>
    </>
  );
};
