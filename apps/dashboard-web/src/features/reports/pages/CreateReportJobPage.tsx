import React, { useMemo, useState } from 'react';
import { Box, Button, MenuItem, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { EmptyState } from '../../../components/EmptyState';
import { useActiveContext } from '../../../contexts/ActiveContext';
import { useCreateReportJob } from '../hooks/useReports';
import { useToast } from '../../../components/toast/useToast';

const formatDateInput = (date: Date) => date.toISOString().slice(0, 10);

const createReportSchema = z
  .object({
    jobType: z.enum(['FEED_INTAKE_EXPORT']),
    format: z.enum(['csv', 'json']),
    farmId: z.string().optional(),
    barnId: z.string().optional(),
    batchId: z.string().optional(),
    startDate: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
      message: 'Start date is required',
    }),
    endDate: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
      message: 'End date is required',
    }),
  })
  .refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

const normalizeOptional = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

export const CreateReportJobPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { tenantId, farmId, barnId, batchId, timeRange } = useActiveContext();
  const createMutation = useCreateReportJob();

  const [jobType, setJobType] = useState<'FEED_INTAKE_EXPORT'>('FEED_INTAKE_EXPORT');
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [farmIdInput, setFarmIdInput] = useState(farmId || '');
  const [barnIdInput, setBarnIdInput] = useState(barnId || '');
  const [batchIdInput, setBatchIdInput] = useState(batchId || '');
  const [startDate, setStartDate] = useState(formatDateInput(timeRange.start));
  const [endDate, setEndDate] = useState(formatDateInput(timeRange.end));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const hasTenant = !!tenantId;
  const isSubmitting = createMutation.isPending;
  const canSubmit = useMemo(() => hasTenant && !isSubmitting, [hasTenant, isSubmitting]);

  const handleSubmit = async () => {
    const result = createReportSchema.safeParse({
      jobType,
      format,
      farmId: farmIdInput.trim() || undefined,
      barnId: barnIdInput.trim() || undefined,
      batchId: batchIdInput.trim() || undefined,
      startDate,
      endDate,
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

    setErrors({});
    try {
      if (!tenantId) {
        toast.error('Select a tenant before creating a report job.');
        return;
      }
      const job = await createMutation.mutateAsync({
        tenantId,
        job_type: result.data.jobType,
        format: result.data.format,
        farm_id: normalizeOptional(result.data.farmId || ''),
        barn_id: normalizeOptional(result.data.barnId || ''),
        batch_id: normalizeOptional(result.data.batchId || ''),
        start_date: result.data.startDate,
        end_date: result.data.endDate,
      });
      toast.success('Report export job created');
      if (job?.id) {
        navigate(`/reports/jobs/${job.id}`);
      } else {
        navigate('/reports/jobs');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create report job');
    }
  };

  if (!hasTenant) {
    return (
      <Box>
        <PageHeader title="Create Report" subtitle="Generate a report export for the active tenant" />
        <EmptyState
          title="No tenant selected"
          description="Select a tenant before creating a report export."
          actionLabel="Select Tenant"
          onAction={() => navigate('/select-tenant')}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
      <PageHeader
        title="Create Report"
        subtitle="Generate a new export job for feed intake records"
        breadcrumbs={[
          { label: 'Reports', href: '/reports' },
          { label: 'Jobs', href: '/reports/jobs' },
          { label: 'Create' },
        ]}
      />

      <PremiumCard>
        <Box sx={{ display: 'grid', gap: 3, maxWidth: 640 }}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Report Type
            </Typography>
            <TextField
              select
              label="Type"
              value={jobType}
              onChange={(event) => setJobType(event.target.value as 'FEED_INTAKE_EXPORT')}
              error={!!errors.jobType}
              helperText={errors.jobType}
              fullWidth
            >
              <MenuItem value="FEED_INTAKE_EXPORT">Feed Intake Export</MenuItem>
            </TextField>
          </Box>

          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Format & Date Range
            </Typography>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
              <TextField
                select
                label="Format"
                value={format}
                onChange={(event) => setFormat(event.target.value as 'csv' | 'json')}
                error={!!errors.format}
                helperText={errors.format}
                fullWidth
              >
                <MenuItem value="csv">CSV</MenuItem>
                <MenuItem value="json">JSON</MenuItem>
              </TextField>
              <TextField
                label="Start date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                InputLabelProps={{ shrink: true }}
                error={!!errors.startDate}
                helperText={errors.startDate}
              />
              <TextField
                label="End date"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                InputLabelProps={{ shrink: true }}
                error={!!errors.endDate}
                helperText={errors.endDate}
              />
            </Box>
          </Box>

          <Box>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Scope (optional)
            </Typography>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
              <TextField
                label="Farm ID"
                value={farmIdInput}
                onChange={(event) => setFarmIdInput(event.target.value)}
                helperText={farmId ? 'Defaulted from active context' : 'Optional'}
                fullWidth
              />
              <TextField
                label="Barn ID"
                value={barnIdInput}
                onChange={(event) => setBarnIdInput(event.target.value)}
                helperText={barnId ? 'Defaulted from active context' : 'Optional'}
                fullWidth
              />
              <TextField
                label="Batch ID"
                value={batchIdInput}
                onChange={(event) => setBatchIdInput(event.target.value)}
                helperText={batchId ? 'Defaulted from active context' : 'Optional'}
                fullWidth
              />
            </Box>
          </Box>

          {errors.form ? (
            <Typography variant="body2" color="error">
              {errors.form}
            </Typography>
          ) : null}

          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <Button variant="outlined" onClick={() => navigate('/reports/jobs')}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit}>
              {isSubmitting ? 'Creating...' : 'Create Export'}
            </Button>
          </Box>
        </Box>
      </PremiumCard>
    </Box>
  );
};
