import React, { useState } from 'react';
import { Alert, Box, Button, Container, Link, Paper, Stack, TextField, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { resetPassword } from '../../../api/auth';
import { EmptyState } from '../../../components/EmptyState';
import { useTranslation } from 'react-i18next';

interface ResetPasswordForm {
  password: string;
  confirmPassword: string;
}

export const ResetPasswordPage: React.FC = () => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ResetPasswordForm>({
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: ResetPasswordForm) => {
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      await resetPassword(token, values.password);
      setStatus('Password reset successfully. You can sign in now.');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <PageHeader title={t('auth.reset.title')} subtitle={t('auth.reset.subtitle')} />
        <EmptyState
          title="Missing reset token"
          description="The reset link is missing a token. Please request a new link."
          actionLabel={t('actions.requestReset')}
          onAction={() => navigate('/auth/forgot-password')}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <PageHeader title={t('auth.reset.title')} subtitle={t('auth.reset.subtitle')} />

      <Paper sx={{ p: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Stack spacing={2.5}>
          {error && <Alert severity="error">{error}</Alert>}
          {status && <Alert severity="success">{status}</Alert>}

          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={2.5}>
              <TextField
                label="New password"
                type="password"
                fullWidth
                {...register('password', {
                  required: 'Password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters',
                  },
                })}
                error={!!errors.password}
                helperText={errors.password?.message}
              />
              <TextField
                label="Confirm password"
                type="password"
                fullWidth
                {...register('confirmPassword', {
                  required: 'Confirm your password',
                  validate: (value) => value === watch('password') || 'Passwords do not match',
                })}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                startIcon={<KeyRound size={18} />}
                disabled={loading}
              >
                {loading ? 'Saving...' : t('actions.resetPassword')}
              </Button>
            </Stack>
          </form>

          <Box>
            <Typography variant="body2" color="text.secondary">
              Need to sign in?
            </Typography>
            <Link
              component="button"
              type="button"
              onClick={() => navigate('/login')}
              sx={{ fontWeight: 600, mt: 0.5 }}
            >
              {t('actions.backToLogin')}
            </Link>
          </Box>
        </Stack>
      </Paper>
    </Container>
  );
};
