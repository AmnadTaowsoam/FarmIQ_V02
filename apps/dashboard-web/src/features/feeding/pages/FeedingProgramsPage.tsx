import React, { useEffect, useMemo, useState } from 'react';
import { Box, Grid, TextField, Button, Stack, MenuItem } from '@mui/material';
import { CalendarPlus } from 'lucide-react';
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

const FEED_PROGRAMS_ENABLED = import.meta.env.VITE_FEED_PROGRAMS_ENABLED === 'true';

interface ProgramRecord {
  id?: string;
  name?: string;
  status?: string;
  startDate?: string;
  start_date?: string;
  endDate?: string;
  end_date?: string;
  notes?: string;
}

interface ProgramFormValues {
  name: string;
  status: 'active' | 'inactive';
  startDate?: string;
  endDate?: string;
  notes?: string;
}

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

export const FeedingProgramsPage: React.FC = () => {
  const { tenantId, farmId, barnId, batchId } = useActiveContext();
  const toast = useToast();
  const [records, setRecords] = useState<ProgramRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const form = useForm<ProgramFormValues>({
    defaultValues: {
      name: '',
      status: 'active',
      startDate: '',
      endDate: '',
      notes: '',
    },
  });

  const columns: Column<ProgramRecord>[] = useMemo(() => [
    { id: 'name', label: 'Program Name', format: (_v, row) => row.name || '—' },
    { id: 'status', label: 'Status', format: (_v, row) => row.status || '—' },
    { id: 'startDate', label: 'Start Date', format: (_v, row) => formatDate(row.startDate || row.start_date) },
    { id: 'endDate', label: 'End Date', format: (_v, row) => formatDate(row.endDate || row.end_date) },
    { id: 'notes', label: 'Notes', format: (_v, row) => row.notes || '—' },
  ], []);

  const fetchPrograms = async (cursor?: string, replace = false) => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const response = await feedingApi.listPrograms({ tenantId, farmId, barnId, batchId }, { limit: 25, cursor });
      setRecords((prev) => (replace ? response.items : [...prev, ...response.items]));
      setNextCursor(response.nextCursor || null);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load feed programs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setRecords([]);
    fetchPrograms(undefined, true);
  }, [tenantId, farmId, barnId, batchId]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!tenantId) return;
    const idempotencyKey = createIdempotencyKey();
    const payload = {
      tenantId,
      farmId: farmId || undefined,
      barnId: barnId || undefined,
      name: values.name,
      status: values.status,
      startDate: values.startDate || undefined,
      endDate: values.endDate || undefined,
      notes: values.notes || undefined,
    };
    try {
      await feedingApi.createProgram(payload, idempotencyKey);
      toast.success('Feed program created');
      form.reset();
      fetchPrograms(undefined, true);
    } catch (err: any) {
      toast.error('Failed to create feed program', { description: err.message });
    }
  });

  if (!FEED_PROGRAMS_ENABLED) {
    return (
      <Box>
        <PageHeader
          title="Feed Programs"
          subtitle="Feature flag disabled in this environment"
        />
        <EmptyState
          title="Feed programs disabled"
          description="Enable VITE_FEED_PROGRAMS_ENABLED to access feed program management."
        />
      </Box>
    );
  }

  if (error) return <ErrorState title="Failed to load feed programs" message={error} />;

  return (
    <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
      <PageHeader
        title="Feed Programs"
        subtitle="Optional program schedules per farm/barn"
      />

      <Grid container spacing={3}>
        <Grid item xs={12} lg={5}>
          <SectionCard title="New Program" subtitle="Define a feed program schedule">
            <Box component="form" onSubmit={onSubmit}>
              <Stack spacing={2}>
                <TextField
                  label="Program Name"
                  size="small"
                  fullWidth
                  {...form.register('name', { required: 'Name is required' })}
                  error={!!form.formState.errors.name}
                  helperText={form.formState.errors.name?.message}
                />
                <TextField
                  label="Status"
                  size="small"
                  select
                  fullWidth
                  {...form.register('status')}
                >
                  <MenuItem value="active">active</MenuItem>
                  <MenuItem value="inactive">inactive</MenuItem>
                </TextField>
                <TextField
                  label="Start Date"
                  type="date"
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  {...form.register('startDate')}
                />
                <TextField
                  label="End Date"
                  type="date"
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  {...form.register('endDate')}
                />
                <TextField label="Notes" size="small" fullWidth multiline minRows={2} {...form.register('notes')} />
                <RoleGate requiredRoles={['platform_admin', 'tenant_admin', 'farm_manager']}>
                  <Button type="submit" variant="contained" startIcon={<CalendarPlus size={18} />}>
                    Create Program
                  </Button>
                </RoleGate>
              </Stack>
            </Box>
          </SectionCard>
        </Grid>

        <Grid item xs={12} lg={7}>
          <SectionCard title="Programs" subtitle="Active and historical programs">
            {loading && records.length === 0 ? (
              <LoadingCard title="Loading programs" lines={3} />
            ) : records.length === 0 ? (
              <EmptyState title="No programs" description="Create a program to start tracking schedules." />
            ) : (
              <BasicTable<ProgramRecord>
                columns={columns}
                data={records}
                rowKey="id"
                emptyMessage="No programs found."
              />
            )}
            {nextCursor && (
              <Box mt={2} display="flex" justifyContent="center">
                <Button variant="outlined" onClick={() => fetchPrograms(nextCursor)} disabled={loading}>
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
