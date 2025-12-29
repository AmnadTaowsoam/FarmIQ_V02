import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Grid,
  TextField,
  MenuItem,
  Button,
  Stack,
  Typography,
} from '@mui/material';
import { PlusCircle, RefreshCw } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../../components/PageHeader';
import { SectionCard } from '../../../components/ui/SectionCard';
import { BasicTable, Column } from '../../../components/tables/BasicTable';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { LoadingCard } from '../../../components/LoadingCard';
import { useActiveContext } from '../../../contexts/ActiveContext';
import { feedingApi, createIdempotencyKey } from '../api';
import { useToast } from '../../../components/toast/useToast';
import { RoleGate } from '../../../guards/RoleGate';

interface IntakeRecord {
  id?: string;
  occurredAt?: string;
  occurred_at?: string;
  source?: string;
  quantityKg?: number;
  quantity_kg?: number;
  barnId?: string;
  barn_id?: string;
  batchId?: string;
  batch_id?: string;
  feedLotId?: string;
  feed_lot_id?: string;
  feedFormulaId?: string;
  feed_formula_id?: string;
  notes?: string;
}

interface IntakeFormValues {
  barnId: string;
  batchId?: string;
  source: 'MANUAL' | 'API_IMPORT' | 'SILO_AUTO';
  quantityKg: number;
  occurredAt: string;
  feedLotId?: string;
  feedFormulaId?: string;
  notes?: string;
}

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export const FeedingIntakePage: React.FC = () => {
  const { tenantId, farmId, barnId, batchId, timeRange } = useActiveContext();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const [records, setRecords] = useState<IntakeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingSubmission, setPendingSubmission] = useState<{ key: string; payload: IntakeFormValues } | null>(null);

  const startDate = searchParams.get('start') || timeRange.start.toISOString().slice(0, 10);
  const endDate = searchParams.get('end') || timeRange.end.toISOString().slice(0, 10);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
  } = useForm<IntakeFormValues>({
    defaultValues: {
      barnId: barnId || '',
      batchId: batchId || '',
      source: 'MANUAL',
      quantityKg: 0,
      occurredAt: new Date().toISOString().slice(0, 16),
      feedLotId: '',
      feedFormulaId: '',
      notes: '',
    },
  });
  
  useEffect(() => {
    if (barnId) setValue('barnId', barnId);
    if (batchId) setValue('batchId', batchId);
  }, [barnId, batchId, setValue]);

  const columns: Column<IntakeRecord>[] = useMemo(() => [
    { id: 'occurredAt', label: 'Occurred At', format: (_value, row) => formatDateTime(row.occurredAt || row.occurred_at) },
    { id: 'source', label: 'Source', format: (_value, row) => row.source || '—' },
    { id: 'quantityKg', label: 'Quantity (kg)', align: 'right', format: (_value, row) => (row.quantityKg ?? row.quantity_kg ?? 0).toFixed(2) },
    { id: 'barnId', label: 'Barn', format: (_value, row) => row.barnId || row.barn_id || '—' },
    { id: 'batchId', label: 'Batch', format: (_value, row) => row.batchId || row.batch_id || '—' },
    { id: 'feedLotId', label: 'Feed Lot', format: (_value, row) => row.feedLotId || row.feed_lot_id || '—' },
  ], []);

  const fetchRecords = async (cursor?: string, replace = false) => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const response = await feedingApi.listIntakeRecords(
        { tenantId, farmId, barnId, batchId },
        { startDate, endDate, limit: 25, cursor }
      );
      setRecords((prev) => (replace ? response.items : [...prev, ...response.items]));
      setNextCursor(response.nextCursor || null);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load intake records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setRecords([]);
    fetchRecords(undefined, true);
  }, [tenantId, farmId, barnId, batchId, startDate, endDate]);

  const handleCreate = async (values: IntakeFormValues) => {
    if (!tenantId) return;
    setSubmitting(true);
    setSubmitError(null);
    const idempotencyKey = createIdempotencyKey();
    const payload = {
      tenantId,
      farmId: farmId || undefined,
      barnId: values.barnId,
      batchId: values.batchId || undefined,
      source: values.source,
      quantityKg: values.quantityKg,
      occurredAt: new Date(values.occurredAt).toISOString(),
      feedLotId: values.feedLotId || undefined,
      feedFormulaId: values.feedFormulaId || undefined,
      notes: values.notes || undefined,
    };

    try {
      await feedingApi.createIntakeRecord(payload, idempotencyKey);
      toast.success('Intake record created');
      setPendingSubmission(null);
      reset({
        ...values,
        quantityKg: 0,
        notes: '',
      });
      fetchRecords(undefined, true);
    } catch (err: any) {
      const message = err.message || 'Failed to create intake record';
      setSubmitError(message);
      setPendingSubmission({ key: idempotencyKey, payload: values });
      toast.error('Failed to create intake record', { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  const retrySubmission = async () => {
    if (!pendingSubmission || !tenantId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const values = pendingSubmission.payload;
      const payload = {
        tenantId,
        farmId: farmId || undefined,
        barnId: values.barnId,
        batchId: values.batchId || undefined,
        source: values.source,
        quantityKg: values.quantityKg,
        occurredAt: new Date(values.occurredAt).toISOString(),
        feedLotId: values.feedLotId || undefined,
        feedFormulaId: values.feedFormulaId || undefined,
        notes: values.notes || undefined,
      };
      await feedingApi.createIntakeRecord(payload, pendingSubmission.key);
      toast.success('Intake record created');
      setPendingSubmission(null);
      fetchRecords(undefined, true);
    } catch (err: any) {
      const message = err.message || 'Retry failed';
      setSubmitError(message);
      toast.error('Retry failed', { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    return <ErrorState title="Failed to load intake records" message={error} />;
  }

  return (
    <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
      <PageHeader
        title="Daily Feed Intake"
        subtitle="Record manual feed intake and review daily logs"
      />

      <Grid container spacing={3}>
        <Grid item xs={12} lg={5}>
          <SectionCard title="New Intake Record" subtitle="Manual key-in (idempotent)">
            <Box component="form" onSubmit={handleSubmit(handleCreate)}>
              <Stack spacing={2}>
                <TextField
                  label="Barn ID"
                  size="small"
                  fullWidth
                  {...register('barnId', { required: 'Barn is required' })}
                  error={!!errors.barnId}
                  helperText={errors.barnId?.message}
                  disabled={!!barnId}
                />
                <TextField
                  label="Batch ID"
                  size="small"
                  fullWidth
                  {...register('batchId')}
                />
                <TextField
                  label="Source"
                  size="small"
                  select
                  fullWidth
                  {...register('source', { required: true })}
                >
                  <MenuItem value="MANUAL">MANUAL</MenuItem>
                  <MenuItem value="API_IMPORT">API_IMPORT</MenuItem>
                  <MenuItem value="SILO_AUTO">SILO_AUTO</MenuItem>
                </TextField>
                <TextField
                  label="Quantity (kg)"
                  size="small"
                  type="number"
                  fullWidth
                  inputProps={{ min: 0, step: 0.1 }}
                  {...register('quantityKg', { required: 'Quantity is required', min: 0, valueAsNumber: true })}
                  error={!!errors.quantityKg}
                  helperText={errors.quantityKg?.message}
                />
                <TextField
                  label="Occurred At"
                  size="small"
                  type="datetime-local"
                  fullWidth
                  {...register('occurredAt', { required: 'Occurred time is required' })}
                  error={!!errors.occurredAt}
                  helperText={errors.occurredAt?.message}
                />
                <TextField
                  label="Feed Lot ID"
                  size="small"
                  fullWidth
                  {...register('feedLotId')}
                />
                <TextField
                  label="Feed Formula ID"
                  size="small"
                  fullWidth
                  {...register('feedFormulaId')}
                />
                <TextField
                  label="Notes"
                  size="small"
                  fullWidth
                  multiline
                  minRows={2}
                  {...register('notes')}
                />
                {submitError && (
                  <Typography variant="caption" color="error.main">
                    {submitError}
                  </Typography>
                )}
                <RoleGate requiredRoles={['platform_admin', 'tenant_admin', 'farm_manager', 'operator']}>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<PlusCircle size={18} />}
                    disabled={submitting || !tenantId}
                  >
                    {submitting ? 'Saving...' : 'Create Intake Record'}
                  </Button>
                </RoleGate>
                {pendingSubmission && (
                  <Button
                    variant="outlined"
                    startIcon={<RefreshCw size={16} />}
                    onClick={retrySubmission}
                    disabled={submitting}
                  >
                    Retry last submission
                  </Button>
                )}
              </Stack>
            </Box>
          </SectionCard>
        </Grid>

        <Grid item xs={12} lg={7}>
          <SectionCard
            title="Intake Records"
            subtitle={`Showing ${startDate} to ${endDate}`}
          >
            {loading && records.length === 0 ? (
              <LoadingCard title="Loading intake records" lines={3} />
            ) : records.length === 0 ? (
              <EmptyState title="No intake records" description="Log your first intake record to populate this list." />
            ) : (
              <BasicTable<IntakeRecord>
                columns={columns}
                data={records}
                rowKey="id"
                emptyMessage="No intake records found."
              />
            )}
            {nextCursor && (
              <Box mt={2} display="flex" justifyContent="center">
                <Button
                  variant="outlined"
                  onClick={() => fetchRecords(nextCursor)}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load more'}
                </Button>
              </Box>
            )}
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
};
