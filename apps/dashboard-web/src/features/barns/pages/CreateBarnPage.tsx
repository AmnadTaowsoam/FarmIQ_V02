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

const createBarnSchema = z.object({
  name: z.string().min(2, 'Barn name is required'),
  animalType: z.string().optional(),
  status: z.enum(['active', 'inactive']),
});

export const CreateBarnPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { tenantId, farmId } = useActiveContext();
  const [name, setName] = useState('');
  const [animalType, setAnimalType] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const hasContext = !!tenantId && !!farmId;
  const canSubmit = useMemo(() => hasContext && !submitting, [hasContext, submitting]);

  const handleSubmit = async () => {
    const result = createBarnSchema.safeParse({
      name: name.trim(),
      animalType: animalType.trim() || undefined,
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

    if (!farmId) {
      setErrors({ form: 'Select a farm before creating a barn.' });
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      await api.barns.create({
        name: result.data.name,
        animal_type: result.data.animalType,
        status: result.data.status,
        farm_id: farmId,
      });
      enqueueSnackbar('Barn created successfully', { variant: 'success' });
      navigate('/barns');
    } catch (error: any) {
      enqueueSnackbar(error?.message || 'Failed to create barn', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!tenantId) {
    return (
      <Box>
        <PageHeader title="Create Barn" subtitle="Register a new barn under a farm" />
        <EmptyState
          title="No tenant selected"
          description="Select a tenant before creating a barn."
          actionLabel="Select Tenant"
          onAction={() => navigate('/select-tenant')}
        />
      </Box>
    );
  }

  if (!farmId) {
    return (
      <Box>
        <PageHeader title="Create Barn" subtitle="Register a new barn under a farm" />
        <EmptyState
          title="No farm selected"
          description="Select a farm before creating a barn."
          actionLabel="Select Farm"
          onAction={() => navigate('/select-farm')}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
      <PageHeader
        title="Create Barn"
        subtitle="Register a new barn under the selected farm"
        breadcrumbs={[
          { label: 'Barns', href: '/barns' },
          { label: 'Create' },
        ]}
      />

      <PremiumCard>
        <Box sx={{ display: 'grid', gap: 2, maxWidth: 520 }}>
          <TextField
            label="Barn name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={!!errors.name}
            helperText={errors.name}
            required
            fullWidth
          />
          <TextField
            label="Animal type"
            value={animalType}
            onChange={(event) => setAnimalType(event.target.value)}
            error={!!errors.animalType}
            helperText={errors.animalType}
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
            <Button variant="outlined" onClick={() => navigate('/barns')}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit}>
              {submitting ? 'Creating...' : 'Create Barn'}
            </Button>
          </Box>
        </Box>
      </PremiumCard>
    </Box>
  );
};
