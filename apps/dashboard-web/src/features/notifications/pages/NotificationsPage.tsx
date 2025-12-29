import React, { useState } from 'react';
import {
  Box,
  Tab,
  Tabs,
  Typography,
  TextField,
  MenuItem,
  Button,
  CircularProgress,
  Alert,
  Stack,
  Paper,
} from '@mui/material';
import { RefreshCw, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotificationsInbox, useNotificationsHistory } from '../../../hooks/useNotifications';
import { NotificationListItem } from '../../../components/notifications/NotificationListItem';
import { Notification, NotificationSeverity, NotificationFilters } from '../../../api/notifications';
import { PageHeader } from '../../../components/layout/PageHeader';

const SEVERITY_OPTIONS: { value: NotificationSeverity | ''; label: string }[] = [
  { value: '', label: 'All Severities' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' },
];

const CHANNEL_OPTIONS = [
  { value: '', label: 'All Channels' },
  { value: 'in_app', label: 'In-App' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'created', label: 'Created' },
  { value: 'queued', label: 'Queued' },
  { value: 'sent', label: 'Sent' },
  { value: 'failed', label: 'Failed' },
  { value: 'canceled', label: 'Canceled' },
];

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'inbox' | 'history'>('inbox');

  // Filters for history tab
  const [filters, setFilters] = useState<NotificationFilters>({
    limit: 20,
  });

  // Fetch data
  const inboxQuery = useNotificationsInbox();
  const historyQuery = useNotificationsHistory(activeTab === 'history' ? filters : undefined);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: 'inbox' | 'history') => {
    setActiveTab(newValue);
  };

  const handleFilterChange = (key: keyof NotificationFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
      cursor: undefined, // Reset cursor when filters change
    }));
  };

  const handleLoadMore = () => {
    if (historyQuery.data?.cursor) {
      setFilters((prev) => ({ ...prev, cursor: historyQuery.data?.cursor }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Navigate based on payload link or stay on page
    if (notification.payload_json?.link) {
      navigate(notification.payload_json.link);
    }
  };

  const handleRefresh = () => {
    if (activeTab === 'inbox') {
      inboxQuery.refetch();
    } else {
      historyQuery.refetch();
    }
  };

  const handleClearFilters = () => {
    setFilters({
      limit: 20,
    });
  };

  // Determine which data to show
  const isLoading = activeTab === 'inbox' ? inboxQuery.isLoading : historyQuery.isLoading;
  const isError = activeTab === 'inbox' ? inboxQuery.isError : historyQuery.isError;
  const error = activeTab === 'inbox' ? inboxQuery.error : historyQuery.error;
  const notifications =
    activeTab === 'inbox' ? inboxQuery.data?.data ?? [] : historyQuery.data?.data ?? [];
  const totalCount = activeTab === 'inbox' ? inboxQuery.data?.total ?? 0 : historyQuery.data?.total ?? 0;
  const hasMore = activeTab === 'history' && !!historyQuery.data?.cursor;

  const hasActiveFilters =
    filters.severity || filters.channel || filters.status || filters.farm_id || filters.barn_id || filters.batch_id || filters.start_date || filters.end_date || filters.topic;

  return (
    <Box>
      <PageHeader
        title="Notifications"
        subtitle="Stay updated with system alerts and important messages"
        breadcrumbs={[
          { label: 'Dashboard', href: '/overview' },
          { label: 'Notifications' },
        ]}
        action={
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={16} />}
            onClick={handleRefresh}
            disabled={isLoading}
          >
            Refresh
          </Button>
        }
      />

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Inbox
                {inboxQuery.data?.unread_count ? (
                  <Box
                    component="span"
                    sx={{
                      bgcolor: 'error.main',
                      color: 'white',
                      borderRadius: '12px',
                      px: 1,
                      py: 0.25,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      minWidth: 20,
                      textAlign: 'center',
                    }}
                  >
                    {inboxQuery.data.unread_count}
                  </Box>
                ) : null}
              </Box>
            }
            value="inbox"
          />
          <Tab label="History" value="history" />
        </Tabs>

        {/* Filters (History Tab Only) */}
        {activeTab === 'history' && (
          <Box sx={{ p: 2, bgcolor: 'background.default', borderTop: 1, borderColor: 'divider' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Filter size={18} />
                <Typography variant="body2" fontWeight={600}>
                  Filters:
                </Typography>
              </Box>

              <TextField
                select
                size="small"
                label="Severity"
                value={filters.severity || ''}
                onChange={(e) => handleFilterChange('severity', e.target.value)}
                sx={{ minWidth: 150 }}
              >
                {SEVERITY_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                size="small"
                label="Farm ID"
                value={filters.farm_id || ''}
                onChange={(e) => handleFilterChange('farm_id', e.target.value)}
                placeholder="Filter by farm"
                sx={{ minWidth: 150 }}
              />

              <TextField
                size="small"
                label="Barn ID"
                value={filters.barn_id || ''}
                onChange={(e) => handleFilterChange('barn_id', e.target.value)}
                placeholder="Filter by barn"
                sx={{ minWidth: 150 }}
              />

              <TextField
                type="date"
                size="small"
                label="Start Date"
                value={filters.start_date || ''}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 150 }}
              />

              <TextField
                type="date"
                size="small"
                label="End Date"
                value={filters.end_date || ''}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 150 }}
              />

              {hasActiveFilters && (
                <Button variant="text" size="small" onClick={handleClearFilters}>
                  Clear Filters
                </Button>
              )}
            </Stack>
          </Box>
        )}
      </Paper>

      {/* Content */}
      <Box>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Failed to load notifications: {error?.message || 'Unknown error'}
          </Alert>
        )}

        {!isLoading && !isError && notifications.length === 0 && (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No notifications found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {hasActiveFilters
                ? 'Try adjusting your filters'
                : activeTab === 'inbox'
                ? "You're all caught up!"
                : 'No notification history available'}
            </Typography>
          </Paper>
        )}

        {!isLoading && !isError && notifications.length > 0 && (
          <>
            <Box>
              {notifications.map((notification) => (
                <NotificationListItem
                  key={notification.notification_id}
                  notification={notification}
                  onClick={handleNotificationClick}
                  showFullDate={activeTab === 'history'}
                />
              ))}
            </Box>

            {/* Load More Button (History Tab Only) */}
            {activeTab === 'history' && hasMore && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Button
                  variant="outlined"
                  onClick={handleLoadMore}
                  disabled={historyQuery.isLoading}
                >
                  {historyQuery.isLoading ? 'Loading...' : 'Load More'}
                </Button>
              </Box>
            )}

            {/* Summary */}
            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Showing {notifications.length} of {totalCount} notification
                {totalCount !== 1 ? 's' : ''}
              </Typography>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};
