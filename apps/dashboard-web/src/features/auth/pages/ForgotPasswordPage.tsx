import React, { useState } from 'react';
import { Box, Button, Container, TextField, Alert, Stack, Link, Paper, Typography } from '@mui/material';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { PageHeader } from '../../../components/PageHeader';
import { requestPasswordReset } from '../../../api/auth';
import { useTranslation } from 'react-i18next';

interface ForgotPasswordForm {
  email: string;
}

export const ForgotPasswordPage: React.FC = () => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotPasswordForm) => {
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      await requestPasswordReset(values.email);
      setStatus('Reset link sent. Check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to request reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <PageHeader
        title={t('auth.forgot.title')}
        subtitle={t('auth.forgot.subtitle')}
      />

      <Paper sx={{ p: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Stack spacing={2.5}>
          {error && <Alert severity="error">{error}</Alert>}
          {status && <Alert severity="success">{status}</Alert>}

          <form onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={2.5}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /\S+@\S+\.\S+/,
                    message: 'Enter a valid email address',
                  },
                })}
                error={!!errors.email}
                helperText={errors.email?.message}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                startIcon={<Mail size={18} />}
                disabled={loading}
              >
                {loading ? 'Sending...' : t('actions.requestReset')}
              </Button>
            </Stack>
          </form>

          <Box>
            <Typography variant="body2" color="text.secondary">
              Remember your password?
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
