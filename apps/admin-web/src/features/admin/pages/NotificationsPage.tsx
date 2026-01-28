import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, Grid, Stack, TextField, Button, Switch, FormControlLabel, Chip, Divider } from '@mui/material';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { Bell, Mail, MessageSquare, Save } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const [emailNotifications, setEmailNotifications] = useState({
    systemAlerts: true,
    deviceOffline: true,
    userActivity: false,
    dailyReport: true,
  });

  const [slackIntegration, setSlackIntegration] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');

  const handleSave = () => {
    console.log('Saving notification settings:', { emailNotifications, slackIntegration, webhookUrl });
    // TODO: Implement save logic
  };

  return (
    <Box>
      <AdminPageHeader
        title="Notification Settings"
        subtitle="Configure system notifications and alerts"
        actions={
          <Button
            variant="contained"
            startIcon={<Save size={18} />}
            onClick={handleSave}
          >
            Save Changes
          </Button>
        }
      />

      <Grid container spacing={3}>
        {/* Email Notifications */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Mail size={20} />
                <Typography variant="h6">
                  Email Notifications
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" paragraph>
                Configure which events trigger email notifications to administrators.
              </Typography>

              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={emailNotifications.systemAlerts}
                      onChange={(e) =>
                        setEmailNotifications({
                          ...emailNotifications,
                          systemAlerts: e.target.checked,
                        })
                      }
                    />
                  }
                  label="System Alerts"
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: -1, ml: 4 }}>
                  Critical system errors and warnings
                </Typography>

                <Divider />

                <FormControlLabel
                  control={
                    <Switch
                      checked={emailNotifications.deviceOffline}
                      onChange={(e) =>
                        setEmailNotifications({
                          ...emailNotifications,
                          deviceOffline: e.target.checked,
                        })
                      }
                    />
                  }
                  label="Device Offline Alerts"
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: -1, ml: 4 }}>
                  When devices go offline for more than 5 minutes
                </Typography>

                <Divider />

                <FormControlLabel
                  control={
                    <Switch
                      checked={emailNotifications.userActivity}
                      onChange={(e) =>
                        setEmailNotifications({
                          ...emailNotifications,
                          userActivity: e.target.checked,
                        })
                      }
                    />
                  }
                  label="User Activity Alerts"
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: -1, ml: 4 }}>
                  New user registrations and role changes
                </Typography>

                <Divider />

                <FormControlLabel
                  control={
                    <Switch
                      checked={emailNotifications.dailyReport}
                      onChange={(e) =>
                        setEmailNotifications({
                          ...emailNotifications,
                          dailyReport: e.target.checked,
                        })
                      }
                    />
                  }
                  label="Daily Summary Report"
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: -1, ml: 4 }}>
                  Daily system health and activity summary
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Slack Integration */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <MessageSquare size={20} />
                <Typography variant="h6">
                  Slack Integration
                </Typography>
                <Chip
                  label={slackIntegration ? 'ENABLED' : 'DISABLED'}
                  color={slackIntegration ? 'success' : 'default'}
                  size="small"
                />
              </Stack>
              <Typography variant="body2" color="text.secondary" paragraph>
                Send critical alerts to Slack channels via webhook.
              </Typography>

              <Stack spacing={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={slackIntegration}
                      onChange={(e) => setSlackIntegration(e.target.checked)}
                    />
                  }
                  label="Enable Slack Notifications"
                />

                {slackIntegration && (
                  <>
                    <TextField
                      fullWidth
                      label="Webhook URL"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://hooks.slack.com/services/..."
                      helperText="Enter your Slack webhook URL"
                    />

                    <Button variant="outlined" fullWidth>
                      Test Connection
                    </Button>
                  </>
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* Alert Routing */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                <Bell size={20} />
                <Typography variant="h6">
                  Alert Routing
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" paragraph>
                Configure alert severity thresholds and routing rules.
              </Typography>

              <Stack spacing={2}>
                <Box>
                  <Typography variant="body2" fontWeight={600} gutterBottom>
                    Critical Alerts
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Email + Slack + SMS
                  </Typography>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="body2" fontWeight={600} gutterBottom>
                    Warning Alerts
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Email + Slack
                  </Typography>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="body2" fontWeight={600} gutterBottom>
                    Info Alerts
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Email only (batched)
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
