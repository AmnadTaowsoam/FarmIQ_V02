import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Grid,
  TextField,
  Button,
  Stack,
} from '@mui/material';
import { CheckCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
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

interface QualityRecord {
  id?: string;
  feedLotId?: string;
  feed_lot_id?: string;
  sampledAt?: string;
  sampled_at?: string;
  metric?: string;
  value?: number;
  unit?: string;
  method?: string;
}

interface QualityFormValues {
  feedLotId: string;
  sampledAt: string;
  metric: string;
  value: number;
  unit?: string;
  method?: string;
}

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export const FeedingQualityPage: React.FC = () => {
  const { tenantId, farmId, barnId, batchId } = useActiveContext();
  const toast = useToast();
  const [records, setRecords] = useState<QualityRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const form = useForm<QualityFormValues>({
    defaultValues: {
      feedLotId: '',
      sampledAt: new Date().toISOString().slice(0, 16),
      metric: '',
      value: 0,
      unit: '',
      method: '',
    },
  });

  const columns: Column<QualityRecord>[] = useMemo(() => [
    { id: 'feedLotId', label: 'Feed Lot', format: (_v, row) => row.feedLotId || row.feed_lot_id || '—' },
    { id: 'sampledAt', label: 'Sampled At', format: (_v, row) => formatDateTime(row.sampledAt || row.sampled_at) },
    { id: 'metric', label: 'Metric', format: (_v, row) => row.metric || '—' },
    { id: 'value', label: 'Value', align: 'right', format: (_v, row) => (row.value ?? 0).toLocaleString() },
    { id: 'unit', label: 'Unit', format: (_v, row) => row.unit || '—' },
    { id: 'method', label: 'Method', format: (_v, row) => row.method || '—' },
  ], []);

  const fetchQuality = async (cursor?: string, replace = false) => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const response = await feedingApi.listQualityResults({ tenantId, farmId, barnId, batchId }, { limit: 25, cursor });
      setRecords((prev) => (replace ? response.items : [...prev, ...response.items]));
      setNextCursor(response.nextCursor || null);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load quality results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setRecords([]);
    fetchQuality(undefined, true);
  }, [tenantId, farmId, barnId, batchId]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!tenantId) return;
    const idempotencyKey = createIdempotencyKey();
    const payload = {
      tenantId,
      feedLotId: values.feedLotId,
      sampledAt: new Date(values.sampledAt).toISOString(),
      metric: values.metric,
      value: values.value,
      unit: values.unit || undefined,
      method: values.method || undefined,
    };
    try {
      await feedingApi.createQualityResult(payload, idempotencyKey);
      toast.success('Quality result recorded');
      form.reset();
      fetchQuality(undefined, true);
    } catch (err: any) {
      toast.error('Failed to record quality result', { description: err.message });
    }
  });

  if (error) return <ErrorState title="Failed to load quality results" message={error} />;

  return (
    <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
      <PageHeader
        title="Feed Quality Results"
        subtitle="Record and review lab/QA results per feed lot"
      />

      <Grid container spacing={3}>
        <Grid item xs={12} lg={5}>
          <SectionCard title="New Quality Result" subtitle="Validated lab results for a lot">
            <Box component="form" onSubmit={onSubmit}>
              <Stack spacing={2}>
                <TextField
                  label="Feed Lot ID"
                  size="small"
                  fullWidth
                  {...form.register('feedLotId', { required: 'Feed lot is required' })}
                  error={!!form.formState.errors.feedLotId}
                  helperText={form.formState.errors.feedLotId?.message}
                />
                <TextField
                  label="Sampled At"
                  type="datetime-local"
                  size="small"
                  fullWidth
                  {...form.register('sampledAt', { required: 'Sample time is required' })}
                  error={!!form.formState.errors.sampledAt}
                  helperText={form.formState.errors.sampledAt?.message}
                />
                <TextField
                  label="Metric"
                  size="small"
                  fullWidth
                  {...form.register('metric', { required: 'Metric is required' })}
                  error={!!form.formState.errors.metric}
                  helperText={form.formState.errors.metric?.message}
                />
                <TextField
                  label="Value"
                  type="number"
                  size="small"
                  fullWidth
                  inputProps={{ min: 0, step: 0.01 }}
                  {...form.register('value', { required: 'Value is required', min: 0, valueAsNumber: true })}
                  error={!!form.formState.errors.value}
                  helperText={form.formState.errors.value?.message}
                />
                <TextField label="Unit" size="small" fullWidth {...form.register('unit')} />
                <TextField label="Method" size="small" fullWidth {...form.register('method')} />
                <RoleGate requiredRoles={['platform_admin', 'tenant_admin', 'farm_manager']}>
                  <Button type="submit" variant="contained" startIcon={<CheckCircle size={18} />}>
                    Record Result
                  </Button>
                </RoleGate>
              </Stack>
            </Box>
          </SectionCard>
        </Grid>
        <Grid item xs={12} lg={7}>
          <SectionCard title="Quality Results" subtitle="Most recent results by lot">
            {loading && records.length === 0 ? (
              <LoadingCard title="Loading quality results" lines={3} />
            ) : records.length === 0 ? (
              <EmptyState title="No quality results" description="Record results to populate this list." />
            ) : (
              <BasicTable<QualityRecord>
                columns={columns}
                data={records}
                rowKey="id"
                emptyMessage="No quality results found."
              />
            )}
            {nextCursor && (
              <Box mt={2} display="flex" justifyContent="center">
                <Button variant="outlined" onClick={() => fetchQuality(nextCursor)} disabled={loading}>
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
