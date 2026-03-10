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

interface UiError {
  title: string;
  message: string;
  code?: string;
  traceId?: string;
}

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const parseNumber = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const mapFeedingError = (err: any, action: 'load' | 'create' | 'retry'): UiError => {
  const status = err?.status ?? err?.originalError?.response?.status;
  const code = err?.code;
  const traceId = err?.traceId ?? err?.originalError?.response?.headers?.['x-trace-id'];
  const fallbackMessage =
    (typeof err?.message === 'string' && err.message.trim()) || 'เกิดข้อผิดพลาดที่ไม่คาดคิด';

  if (status === 401) {
    return {
      title: action === 'load' ? 'Session หมดอายุ' : 'Session หมดอายุระหว่างบันทึก',
      message: 'กรุณาเข้าสู่ระบบใหม่ แล้วลองอีกครั้ง',
      code,
      traceId,
    };
  }

  if (status === 403) {
    return {
      title: action === 'load' ? 'ไม่มีสิทธิ์ดูข้อมูล Feed Intake' : 'ไม่มีสิทธิ์สร้าง Intake Record',
      message: 'บัญชีของคุณไม่มีสิทธิ์เข้าถึงข้อมูลใน tenant/farm/barn นี้',
      code,
      traceId,
    };
  }

  if (status === 404) {
    return {
      title: 'ไม่พบ endpoint ของบริการ',
      message: 'บริการ Feed API ยังไม่พร้อมใช้งาน หรือเส้นทาง API ไม่ถูกต้อง',
      code,
      traceId,
    };
  }

  if (typeof status === 'number' && status >= 500) {
    return {
      title: 'เซิร์ฟเวอร์ขัดข้องชั่วคราว',
      message: 'ระบบส่วนกลางมีปัญหาชั่วคราว กรุณาลองใหม่อีกครั้งในภายหลัง',
      code,
      traceId,
    };
  }

  return {
    title:
      action === 'load'
        ? 'ไม่สามารถโหลดข้อมูล Feed Intake'
        : action === 'retry'
        ? 'Retry ไม่สำเร็จ'
        : 'ไม่สามารถสร้าง Intake Record',
    message: fallbackMessage,
    code,
    traceId,
  };
};

export const FeedingIntakePage: React.FC = () => {
  const { tenantId, farmId, barnId, batchId, timeRange } = useActiveContext();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const [records, setRecords] = useState<IntakeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<UiError | null>(null);
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
    {
      id: 'quantityKg',
      label: 'Quantity (kg)',
      align: 'right',
      format: (_value, row) => {
        const quantity = parseNumber(row.quantityKg ?? row.quantity_kg);
        return quantity !== null ? quantity.toFixed(2) : '—';
      },
    },
    { id: 'barnId', label: 'Barn', format: (_value, row) => row.barnId || row.barn_id || '—' },
    { id: 'batchId', label: 'Batch', format: (_value, row) => row.batchId || row.batch_id || '—' },
    { id: 'feedLotId', label: 'Feed Lot', format: (_value, row) => row.feedLotId || row.feed_lot_id || '—' },
    { id: 'feedFormulaId', label: 'Feed Formula ID', format: (_value, row) => row.feedFormulaId || row.feed_formula_id || '—' },
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
      setError(mapFeedingError(err, 'load'));
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
      const mapped = mapFeedingError(err, 'create');
      setSubmitError(mapped.message);
      setPendingSubmission({ key: idempotencyKey, payload: values });
      toast.error(mapped.title, { description: mapped.message });
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
      const mapped = mapFeedingError(err, 'retry');
      setSubmitError(mapped.message);
      toast.error(mapped.title, { description: mapped.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <ErrorState
        title={error.title}
        message={error.message}
        code={error.code}
        traceId={error.traceId}
        onRetry={() => fetchRecords(undefined, true)}
      />
    );
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
