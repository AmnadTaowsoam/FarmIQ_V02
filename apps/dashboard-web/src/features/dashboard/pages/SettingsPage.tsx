import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  Grid,
  Switch,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { PageHeader } from '../../../components/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { useAuth } from '../../../contexts/AuthContext';
import { useSettings } from '../../../contexts/SettingsContext';
import { changePassword } from '../../../api/auth';
import { useTranslation } from 'react-i18next';

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const SettingsPage: React.FC = () => {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const { themeMode, setThemeMode, language, setLanguage } = useSettings();
  const [tabIndex, setTabIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    inApp: true,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<PasswordForm>({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const handlePasswordChange = async (values: PasswordForm) => {
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      setStatus('Password updated successfully.');
      reset();
    } catch (err: any) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <PageHeader title={t('pages.settings.title')} subtitle={t('pages.settings.subtitle')} />

      <Tabs
        value={tabIndex}
        onChange={(_, value) => setTabIndex(value)}
        sx={{ mb: 3 }}
        textColor="primary"
        indicatorColor="primary"
      >
        <Tab label="General" />
        <Tab label="Display" />
        <Tab label="Notifications" />
        <Tab label="Security" />
      </Tabs>

      {tabIndex === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <PremiumCard title="Workspace">
              <TextField label="Organization Name" fullWidth margin="normal" defaultValue="FarmIQ" />
              <TextField label="Default Tenant" fullWidth margin="normal" defaultValue={user?.tenantId || ''} />
              <Button variant="contained" sx={{ mt: 2 }}>
                {t('actions.save')}
              </Button>
            </PremiumCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <PremiumCard title="Profile">
              <TextField label="Name" fullWidth margin="normal" defaultValue={user?.name || ''} />
              <TextField label="Email" fullWidth margin="normal" defaultValue={user?.email || ''} />
              <TextField
                label="Roles"
                fullWidth
                margin="normal"
                defaultValue={(user?.roles || []).join(', ')}
                disabled
              />
            </PremiumCard>
          </Grid>
        </Grid>
      )}

      {tabIndex === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <PremiumCard title="Theme">
              <ToggleButtonGroup
                value={themeMode}
                exclusive
                onChange={(_, value) => {
                  if (value === 'light' || value === 'dark' || value === 'system') {
                    setThemeMode(value);
                  }
                }}
                sx={{ mt: 1 }}
              >
                <ToggleButton value="light">Light</ToggleButton>
                <ToggleButton value="dark">Dark</ToggleButton>
                <ToggleButton value="system">System</ToggleButton>
              </ToggleButtonGroup>
            </PremiumCard>
          </Grid>
          <Grid item xs={12} md={6}>
            <PremiumCard title="Language">
              <ToggleButtonGroup
                value={language}
                exclusive
                onChange={(_, value) => {
                  if (value === 'th' || value === 'en') {
                    setLanguage(value);
                  }
                }}
                sx={{ mt: 1 }}
              >
                <ToggleButton value="th">TH</ToggleButton>
                <ToggleButton value="en">EN</ToggleButton>
              </ToggleButtonGroup>
            </PremiumCard>
          </Grid>
        </Grid>
      )}

      {tabIndex === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <PremiumCard title="Alerts & Notifications">
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.email}
                    onChange={(e) => setNotifications((prev) => ({ ...prev, email: e.target.checked }))}
                  />
                }
                label="Email alerts"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.sms}
                    onChange={(e) => setNotifications((prev) => ({ ...prev, sms: e.target.checked }))}
                  />
                }
                label="SMS alerts"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.inApp}
                    onChange={(e) => setNotifications((prev) => ({ ...prev, inApp: e.target.checked }))}
                  />
                }
                label="In-app notifications"
              />
            </PremiumCard>
          </Grid>
        </Grid>
      )}

      {tabIndex === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <PremiumCard title="Change Password">
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              {status && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  {status}
                </Alert>
              )}
              <form onSubmit={handleSubmit(handlePasswordChange)}>
                <TextField
                  label="Current Password"
                  type="password"
                  fullWidth
                  margin="normal"
                  {...register('currentPassword', { required: 'Current password is required' })}
                  error={!!errors.currentPassword}
                  helperText={errors.currentPassword?.message}
                />
                <TextField
                  label="New Password"
                  type="password"
                  fullWidth
                  margin="normal"
                  {...register('newPassword', {
                    required: 'New password is required',
                    minLength: { value: 8, message: 'Password must be at least 8 characters' },
                  })}
                  error={!!errors.newPassword}
                  helperText={errors.newPassword?.message}
                />
                <TextField
                  label="Confirm New Password"
                  type="password"
                  fullWidth
                  margin="normal"
                  {...register('confirmPassword', {
                    required: 'Confirm your new password',
                    validate: (value) => value === watch('newPassword') || 'Passwords do not match',
                  })}
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword?.message}
                />
                <Button variant="contained" type="submit" sx={{ mt: 2 }} disabled={saving}>
                  {saving ? 'Saving...' : t('actions.updatePassword')}
                </Button>
              </form>
            </PremiumCard>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};
