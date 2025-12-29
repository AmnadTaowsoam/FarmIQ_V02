import React, { useMemo, useState } from 'react';
import { Box, Button, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useSnackbar } from 'notistack';
import { PageHeader } from '../../../components/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { EmptyState } from '../../../components/EmptyState';
import { useActiveContext } from '../../../contexts/ActiveContext';
import { api } from '../../../api';

const createFarmSchema = z.object({
  name: z.string().min(2, 'Farm name is required'),
  location: z.string().optional(),
  status: z.enum(['active', 'inactive']),
});

export const CreateFarmPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { tenantId } = useActiveContext();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const hasTenant = !!tenantId;
  const canSubmit = useMemo(() => hasTenant && !submitting, [hasTenant, submitting]);

  const handleSubmit = async () => {
    const result = createFarmSchema.safeParse({
      name: name.trim(),
      location: location.trim() || undefined,
      status,
    });

    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as string;
        nextErrors[field] = issue.message;
      });
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      await api.farms.create({
        name: result.data.name,
        location: result.data.location,
        status: result.data.status,
      });
      enqueueSnackbar('Farm created successfully', { variant: 'success' });
      navigate('/farms');
    } catch (error: any) {
      enqueueSnackbar(error?.message || 'Failed to create farm', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasTenant) {
    return (
      <Box>
        <PageHeader title="Create Farm" subtitle="Register a new farm for your tenant" />
        <EmptyState
          title="No tenant selected"
          description="Select a tenant before creating a farm."
          actionLabel="Select Tenant"
          onAction={() => navigate('/select-tenant')}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
      <PageHeader
        title="Create Farm"
        subtitle="Register a new farm for your tenant"
        breadcrumbs={[
          { label: 'Farms', href: '/farms' },
          { label: 'Create' },
        ]}
      />

      <PremiumCard>
        <Box sx={{ display: 'grid', gap: 2, maxWidth: 520 }}>
          <TextField
            label="Farm name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={!!errors.name}
            helperText={errors.name}
            required
            fullWidth
          />
          <TextField
            label="Location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            error={!!errors.location}
            helperText={errors.location}
            fullWidth
          />
          <TextField
            label="Status"
            value={status}
            onChange={(event) => setStatus(event.target.value as 'active' | 'inactive')}
            helperText="active or inactive"
            error={!!errors.status}
            fullWidth
          />
          {errors.form ? (
            <Typography variant="body2" color="error">
              {errors.form}
            </Typography>
          ) : null}
          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <Button variant="outlined" onClick={() => navigate('/farms')}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit}>
              {submitting ? 'Creating...' : 'Create Farm'}
            </Button>
          </Box>
        </Box>
      </PremiumCard>
    </Box>
  );
};
