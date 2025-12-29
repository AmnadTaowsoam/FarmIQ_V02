import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Grid,
  TextField,
  Button,
  Stack,
  Typography,
} from '@mui/material';
import { PlusCircle, PackagePlus } from 'lucide-react';
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

interface LotRecord {
  id?: string;
  lotCode?: string;
  lot_code?: string;
  feedFormulaId?: string;
  feed_formula_id?: string;
  quantityKg?: number;
  quantity_kg?: number;
  remainingKg?: number;
  remaining_kg?: number;
  receivedDate?: string;
  received_date?: string;
}

interface DeliveryRecord {
  id?: string;
  feedLotId?: string;
  feed_lot_id?: string;
  deliveredAt?: string;
  delivered_at?: string;
  quantityKg?: number;
  quantity_kg?: number;
  unitCost?: number;
  unit_cost?: number;
}

interface LotFormValues {
  lotCode: string;
  feedFormulaId?: string;
  supplierName?: string;
  manufactureDate?: string;
  receivedDate?: string;
  quantityKg?: number;
}

interface DeliveryFormValues {
  feedLotId: string;
  deliveredAt: string;
  quantityKg: number;
  unitCost?: number;
}

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

export const FeedingLotsPage: React.FC = () => {
  const { tenantId, farmId, barnId, batchId } = useActiveContext();
  const toast = useToast();
  const [lots, setLots] = useState<LotRecord[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [loadingLots, setLoadingLots] = useState(false);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextLotCursor, setNextLotCursor] = useState<string | null>(null);
  const [nextDeliveryCursor, setNextDeliveryCursor] = useState<string | null>(null);

  const lotForm = useForm<LotFormValues>({
    defaultValues: {
      lotCode: '',
      feedFormulaId: '',
      supplierName: '',
      manufactureDate: '',
      receivedDate: '',
      quantityKg: undefined,
    },
  });

  const deliveryForm = useForm<DeliveryFormValues>({
    defaultValues: {
      feedLotId: '',
      deliveredAt: new Date().toISOString().slice(0, 16),
      quantityKg: 0,
      unitCost: undefined,
    },
  });

  const lotColumns: Column<LotRecord>[] = useMemo(() => [
    { id: 'lotCode', label: 'Lot Code', format: (_v, row) => row.lotCode || row.lot_code || '—' },
    { id: 'feedFormulaId', label: 'Formula', format: (_v, row) => row.feedFormulaId || row.feed_formula_id || '—' },
    { id: 'quantityKg', label: 'Qty (kg)', align: 'right', format: (_v, row) => (row.quantityKg ?? row.quantity_kg ?? 0).toLocaleString() },
    { id: 'remainingKg', label: 'Remaining (kg)', align: 'right', format: (_v, row) => (row.remainingKg ?? row.remaining_kg ?? 0).toLocaleString() },
    { id: 'receivedDate', label: 'Received', format: (_v, row) => formatDate(row.receivedDate || row.received_date) },
  ], []);

  const deliveryColumns: Column<DeliveryRecord>[] = useMemo(() => [
    { id: 'feedLotId', label: 'Lot', format: (_v, row) => row.feedLotId || row.feed_lot_id || '—' },
    { id: 'deliveredAt', label: 'Delivered At', format: (_v, row) => formatDate(row.deliveredAt || row.delivered_at) },
    { id: 'quantityKg', label: 'Qty (kg)', align: 'right', format: (_v, row) => (row.quantityKg ?? row.quantity_kg ?? 0).toLocaleString() },
    { id: 'unitCost', label: 'Unit Cost', align: 'right', format: (_v, row) => row.unitCost ?? row.unit_cost ? (row.unitCost ?? row.unit_cost)?.toFixed(2) : '—' },
  ], []);

  const fetchLots = async (cursor?: string, replace = false) => {
    if (!tenantId) return;
    setLoadingLots(true);
    try {
      const response = await feedingApi.listLots({ tenantId, farmId, barnId, batchId }, { limit: 25, cursor });
      setLots((prev) => (replace ? response.items : [...prev, ...response.items]));
      setNextLotCursor(response.nextCursor || null);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load feed lots');
    } finally {
      setLoadingLots(false);
    }
  };

  const fetchDeliveries = async (cursor?: string, replace = false) => {
    if (!tenantId) return;
    setLoadingDeliveries(true);
    try {
      const response = await feedingApi.listDeliveries({ tenantId, farmId, barnId, batchId }, { limit: 25, cursor });
      setDeliveries((prev) => (replace ? response.items : [...prev, ...response.items]));
      setNextDeliveryCursor(response.nextCursor || null);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load deliveries');
    } finally {
      setLoadingDeliveries(false);
    }
  };

  useEffect(() => {
    setLots([]);
    setDeliveries([]);
    fetchLots(undefined, true);
    fetchDeliveries(undefined, true);
  }, [tenantId, farmId, barnId, batchId]);

  const onCreateLot = lotForm.handleSubmit(async (values) => {
    if (!tenantId) return;
    const idempotencyKey = createIdempotencyKey();
    const payload = {
      tenantId,
      farmId: farmId || undefined,
      lotCode: values.lotCode,
      feedFormulaId: values.feedFormulaId || undefined,
      supplierName: values.supplierName || undefined,
      manufactureDate: values.manufactureDate || undefined,
      receivedDate: values.receivedDate || undefined,
      quantityKg: values.quantityKg || undefined,
    };
    try {
      await feedingApi.createLot(payload, idempotencyKey);
      toast.success('Feed lot created');
      lotForm.reset();
      fetchLots(undefined, true);
    } catch (err: any) {
      toast.error('Failed to create feed lot', { description: err.message });
    }
  });

  const onCreateDelivery = deliveryForm.handleSubmit(async (values) => {
    if (!tenantId) return;
    const idempotencyKey = createIdempotencyKey();
    const payload = {
      tenantId,
      farmId: farmId || undefined,
      barnId: barnId || undefined,
      feedLotId: values.feedLotId,
      deliveredAt: new Date(values.deliveredAt).toISOString(),
      quantityKg: values.quantityKg,
      unitCost: values.unitCost || undefined,
    };
    try {
      await feedingApi.createDelivery(payload, idempotencyKey);
      toast.success('Delivery recorded');
      deliveryForm.reset();
      fetchDeliveries(undefined, true);
    } catch (err: any) {
      toast.error('Failed to create delivery', { description: err.message });
    }
  });

  if (error) return <ErrorState title="Failed to load feed lots" message={error} />;

  return (
    <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
      <PageHeader
        title="Feed Lots & Deliveries"
        subtitle="Manage feed lot master data and delivery records"
      />

      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          <SectionCard title="Create Feed Lot" subtitle="Register a new feed lot">
            <Box component="form" onSubmit={onCreateLot}>
              <Stack spacing={2}>
                <TextField
                  label="Lot Code"
                  size="small"
                  fullWidth
                  {...lotForm.register('lotCode', { required: 'Lot code is required' })}
                  error={!!lotForm.formState.errors.lotCode}
                  helperText={lotForm.formState.errors.lotCode?.message}
                />
                <TextField label="Feed Formula ID" size="small" fullWidth {...lotForm.register('feedFormulaId')} />
                <TextField label="Supplier Name" size="small" fullWidth {...lotForm.register('supplierName')} />
                <TextField
                  label="Manufacture Date"
                  type="date"
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  {...lotForm.register('manufactureDate')}
                />
                <TextField
                  label="Received Date"
                  type="date"
                  size="small"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  {...lotForm.register('receivedDate')}
                />
                <TextField
                  label="Quantity (kg)"
                  type="number"
                  size="small"
                  fullWidth
                  inputProps={{ min: 0, step: 0.1 }}
                  {...lotForm.register('quantityKg', { valueAsNumber: true })}
                />
                <RoleGate requiredRoles={['platform_admin', 'tenant_admin', 'farm_manager']}>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<PlusCircle size={18} />}
                  >
                    Create Lot
                  </Button>
                </RoleGate>
              </Stack>
            </Box>
          </SectionCard>
        </Grid>

        <Grid item xs={12} lg={6}>
          <SectionCard title="Record Delivery" subtitle="Add delivery to a lot">
            <Box component="form" onSubmit={onCreateDelivery}>
              <Stack spacing={2}>
                <TextField
                  label="Feed Lot ID"
                  size="small"
                  fullWidth
                  {...deliveryForm.register('feedLotId', { required: 'Feed lot is required' })}
                  error={!!deliveryForm.formState.errors.feedLotId}
                  helperText={deliveryForm.formState.errors.feedLotId?.message}
                />
                <TextField
                  label="Delivered At"
                  type="datetime-local"
                  size="small"
                  fullWidth
                  {...deliveryForm.register('deliveredAt', { required: 'Delivered time is required' })}
                  error={!!deliveryForm.formState.errors.deliveredAt}
                  helperText={deliveryForm.formState.errors.deliveredAt?.message}
                />
                <TextField
                  label="Quantity (kg)"
                  type="number"
                  size="small"
                  fullWidth
                  inputProps={{ min: 0, step: 0.1 }}
                  {...deliveryForm.register('quantityKg', { required: 'Quantity is required', min: 0, valueAsNumber: true })}
                  error={!!deliveryForm.formState.errors.quantityKg}
                  helperText={deliveryForm.formState.errors.quantityKg?.message}
                />
                <TextField
                  label="Unit Cost"
                  type="number"
                  size="small"
                  fullWidth
                  inputProps={{ min: 0, step: 0.01 }}
                  {...deliveryForm.register('unitCost', { valueAsNumber: true })}
                />
                <RoleGate requiredRoles={['platform_admin', 'tenant_admin', 'farm_manager']}>
                  <Button
                    type="submit"
                    variant="contained"
                    startIcon={<PackagePlus size={18} />}
                  >
                    Record Delivery
                  </Button>
                </RoleGate>
              </Stack>
            </Box>
          </SectionCard>
        </Grid>

        <Grid item xs={12}>
          <SectionCard title="Feed Lots" subtitle="Current feed lots for the selected context">
            {loadingLots && lots.length === 0 ? (
              <LoadingCard title="Loading feed lots" lines={3} />
            ) : lots.length === 0 ? (
              <EmptyState title="No feed lots" description="Create a lot to start tracking inventory." />
            ) : (
              <BasicTable<LotRecord>
                columns={lotColumns}
                data={lots}
                rowKey="id"
                emptyMessage="No feed lots found."
              />
            )}
            {nextLotCursor && (
              <Box mt={2} display="flex" justifyContent="center">
                <Button variant="outlined" onClick={() => fetchLots(nextLotCursor)} disabled={loadingLots}>
                  {loadingLots ? 'Loading...' : 'Load more lots'}
                </Button>
              </Box>
            )}
          </SectionCard>
        </Grid>

        <Grid item xs={12}>
          <SectionCard title="Deliveries" subtitle="Delivery history for the selected context">
            {loadingDeliveries && deliveries.length === 0 ? (
              <LoadingCard title="Loading deliveries" lines={3} />
            ) : deliveries.length === 0 ? (
              <EmptyState title="No deliveries" description="Record a delivery to start tracking inbound feed." />
            ) : (
              <BasicTable<DeliveryRecord>
                columns={deliveryColumns}
                data={deliveries}
                rowKey="id"
                emptyMessage="No deliveries found."
              />
            )}
            {nextDeliveryCursor && (
              <Box mt={2} display="flex" justifyContent="center">
                <Button variant="outlined" onClick={() => fetchDeliveries(nextDeliveryCursor)} disabled={loadingDeliveries}>
                  {loadingDeliveries ? 'Loading...' : 'Load more deliveries'}
                </Button>
              </Box>
            )}
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  );
};
