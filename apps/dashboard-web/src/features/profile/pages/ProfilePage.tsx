import { Box, Button, Grid, TextField } from '@mui/material';
import { useForm } from 'react-hook-form';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { useAuth } from '../../../contexts/AuthContext';
import { changePassword } from '../../../api/auth';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../components/toast/useToast';
import { useDelayedLoading } from '../../../hooks/useDelayedLoading';
import { KpiSkeleton } from '../../../components/loading/KpiSkeleton';
import { useEffect, useState } from 'react';

const PROFILE_NAME_KEY = 'farmiq_profile_name';

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const ProfilePage: React.FC = () => {
  const { t } = useTranslation('common');
  const { user, isLoading: authLoading } = useAuth();
  const toast = useToast();
  const showSkeleton = useDelayedLoading(authLoading);
  
  const [displayName, setDisplayName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<PasswordForm>({
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    const stored = localStorage.getItem(PROFILE_NAME_KEY);
    if (stored) {
      setDisplayName(stored);
    } else if (user?.name) {
      setDisplayName(user.name);
    }
  }, [user?.name]);

  const handleSaveProfile = async () => {
    setSaving(true);
    // Simulate API delay for polish feel
    await new Promise(r => setTimeout(r, 1000));
    localStorage.setItem(PROFILE_NAME_KEY, displayName);
    toast.success('Profile Updated', { description: 'Your display name has been saved locally.' });
    setSaving(false);
  };

  const onChangePassword = async (values: PasswordForm) => {
    setSaving(true);
    toast.info('Updating password...', { persist: true, id: 'pw-update' } as any);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      toast.removeToast('pw-update');
      toast.success('Password updated successfully.');
      reset();
    } catch (err: any) {
      toast.removeToast('pw-update');
      toast.error('Update Failed', { description: err.message || 'Please check your inputs.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <PageHeader title={t('pages.profile.title')} subtitle={t('pages.profile.subtitle')} />
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          {showSkeleton ? (
            <KpiSkeleton />
          ) : (
            <PremiumCard title="Profile Details">
              <TextField
                label="Display Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                fullWidth
                margin="normal"
              />
              <TextField label="Email" value={user?.email || ''} fullWidth margin="normal" disabled />
              <TextField
                label="Roles"
                value={(user?.roles || []).join(', ')}
                fullWidth
                margin="normal"
                disabled
              />
              <Button 
                variant="contained" 
                onClick={handleSaveProfile} 
                sx={{ mt: 2 }}
                disabled={saving}
              >
                {saving ? 'Saving...' : t('actions.save')}
              </Button>
            </PremiumCard>
          )}
        </Grid>
        <Grid item xs={12} md={6}>
          {showSkeleton ? (
            <KpiSkeleton />
          ) : (
            <PremiumCard title="Change Password">
              <form onSubmit={handleSubmit(onChangePassword)}>
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
                  {saving ? 'Processing...' : t('actions.updatePassword')}
                </Button>
              </form>
            </PremiumCard>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};
