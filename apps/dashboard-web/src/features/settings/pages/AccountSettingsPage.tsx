import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  Grid,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useForm } from 'react-hook-form';
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

export const AccountSettingsPage: React.FC = () => {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const { themeMode, setThemeMode, language, setLanguage } = useSettings();
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
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage your personal account settings, preferences, and security.
      </Typography>

      <Grid container spacing={3}>
        {/* Profile */}
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
            <Button variant="contained" sx={{ mt: 2 }}>
              {t('actions.save')}
            </Button>
          </PremiumCard>
        </Grid>

        {/* Display Preferences */}
        <Grid item xs={12} md={6}>
          <PremiumCard title="Display">
            <Typography variant="subtitle2" gutterBottom>Theme</Typography>
            <ToggleButtonGroup
              value={themeMode}
              exclusive
              onChange={(_, value) => {
                if (value === 'light' || value === 'dark' || value === 'system') {
                  setThemeMode(value);
                }
              }}
              fullWidth
              sx={{ mb: 2 }}
            >
              <ToggleButton value="light">Light</ToggleButton>
              <ToggleButton value="dark">Dark</ToggleButton>
              <ToggleButton value="system">System</ToggleButton>
            </ToggleButtonGroup>

            <Typography variant="subtitle2" gutterBottom>Language</Typography>
            <ToggleButtonGroup
              value={language}
              exclusive
              onChange={(_, value) => {
                if (value === 'th' || value === 'en') {
                  setLanguage(value);
                }
              }}
              fullWidth
            >
              <ToggleButton value="th">ไทย</ToggleButton>
              <ToggleButton value="en">English</ToggleButton>
            </ToggleButtonGroup>
          </PremiumCard>
        </Grid>

        {/* Notifications */}
        <Grid item xs={12} md={6}>
          <PremiumCard title="Notifications">
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
            <Button variant="contained" sx={{ mt: 2 }}>
              {t('actions.save')}
            </Button>
          </PremiumCard>
        </Grid>

        {/* Security */}
        <Grid item xs={12} md={6}>
          <PremiumCard title="Security">
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
    </Box>
  );
};
