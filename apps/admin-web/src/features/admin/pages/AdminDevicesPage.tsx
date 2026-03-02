import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import { Eye, Pencil, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminPageHeader } from '../../../components/admin/AdminPageHeader';
import { AdminDataTable, FilterOption } from '../../../components/admin/AdminDataTable';
import { StatusPill } from '../../../components/admin/StatusPill';
import { HealthBadge } from '../../../components/admin/HealthBadge';
import { apiClient } from '../../../api/client';
import { useCreateDevice, useDevicesQuery, useUpdateDevice } from '../../../api/admin/adminQueries';
import { formatDistanceToNow } from 'date-fns';
import type { Device } from '../../../api/admin/types';

type DeviceFormValues = {
  tenantId: string;
  farmId: string;
  barnId: string;
  batchId: string;
  deviceType: string;
  serialNo: string;
  status: 'active' | 'inactive' | 'maintenance';
  name: string;
  ipAddress: string;
  firmwareVersion: string;
};

const INITIAL_FORM_VALUES: DeviceFormValues = {
  tenantId: '',
  farmId: '',
  barnId: '',
  batchId: '',
  deviceType: 'weighvision',
  serialNo: '',
  status: 'active',
  name: '',
  ipAddress: '',
  firmwareVersion: '',
};

function mapUiStatusToDb(status: string): 'active' | 'inactive' | 'maintenance' {
  if (status === 'online') return 'active';
  if (status === 'offline') return 'inactive';
  return 'maintenance';
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

type LookupItem = {
  id?: string;
  name?: string;
};

async function resolveEntityId(
  endpoint: '/api/v1/farms' | '/api/v1/barns' | '/api/v1/batches',
  tenantId: string,
  input: string,
  extraParams?: Record<string, string>
): Promise<string | undefined> {
  if (!input) return undefined;

  const response = await apiClient.get(endpoint, {
    params: {
      tenantId,
      ...extraParams,
    },
  });

  const rows = (Array.isArray(response.data) ? response.data : response.data?.data || []) as LookupItem[];
  const needle = input.trim().toLowerCase();
  const matched = rows.find((row) => {
    const id = String(row?.id || '').toLowerCase();
    const name = String(row?.name || '').toLowerCase();
    return id === needle || name === needle;
  });

  return matched?.id;
}

export const AdminDevicesPage: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FilterOption[]>([]);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<DeviceFormValues>(INITIAL_FORM_VALUES);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const filterParams = filters.reduce((acc, filter) => {
    acc[filter.key] = filter.value;
    return acc;
  }, {} as Record<string, string>);

  const createDevice = useCreateDevice();
  const updateDevice = useUpdateDevice();

  const { data, isLoading, refetch } = useDevicesQuery({
    page,
    pageSize,
    search,
    ...filterParams,
  });

  const submitPending = createDevice.isPending || updateDevice.isPending;

  const openCreateDialog = () => {
    setDialogMode('create');
    setEditingDeviceId(null);
    setFormValues(INITIAL_FORM_VALUES);
    setSubmitError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (device: Device) => {
    setDialogMode('edit');
    setEditingDeviceId(device.id);
    setFormValues({
      tenantId: device.tenantId || '',
      farmId: device.farmId || '',
      barnId: device.barnId || '',
      batchId: '',
      deviceType: device.type || 'weighvision',
      serialNo: device.serialNumber || device.name || '',
      status: mapUiStatusToDb(device.status),
      name: device.name || '',
      ipAddress: device.ipAddress || '',
      firmwareVersion: device.firmwareVersion || '',
    });
    setSubmitError(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (submitPending) return;
    setDialogOpen(false);
  };

  const handleSubmit = async () => {
    const tenantId = formValues.tenantId.trim();
    const farmId = formValues.farmId.trim();
    const barnId = formValues.barnId.trim();
    const batchId = formValues.batchId.trim();
    const deviceType = formValues.deviceType.trim();
    const serialNo = formValues.serialNo.trim();

    if (!tenantId) {
      setSubmitError('Tenant ID is required.');
      return;
    }
    if (!deviceType) {
      setSubmitError('Device type is required.');
      return;
    }

    try {
      setSubmitError(null);
      const resolvedFarmId = await resolveEntityId('/api/v1/farms', tenantId, farmId);
      if (farmId && !resolvedFarmId) {
        setSubmitError('Farm ID not found. Please use Farm UUID or existing farm name.');
        return;
      }

      const resolvedBarnId = await resolveEntityId('/api/v1/barns', tenantId, barnId, resolvedFarmId ? { farmId: resolvedFarmId } : undefined);
      if (barnId && !resolvedBarnId) {
        setSubmitError('Barn ID not found. Please use Barn UUID or existing barn name.');
        return;
      }

      const resolvedBatchId = await resolveEntityId(
        '/api/v1/batches',
        tenantId,
        batchId,
        {
          ...(resolvedFarmId ? { farmId: resolvedFarmId } : {}),
          ...(resolvedBarnId ? { barnId: resolvedBarnId } : {}),
        }
      );

      const metadata: Record<string, unknown> = {};
      if (formValues.name.trim()) metadata.name = formValues.name.trim();
      if (formValues.ipAddress.trim()) metadata.ipAddress = formValues.ipAddress.trim();
      if (formValues.firmwareVersion.trim()) metadata.firmwareVersion = formValues.firmwareVersion.trim();
      if (batchId && isUuid(batchId) && !resolvedBatchId) {
        setSubmitError('Batch ID UUID not found for this tenant.');
        return;
      }
      if (batchId && !resolvedBatchId && !isUuid(batchId)) metadata.batchCode = batchId;

      if (dialogMode === 'create') {
        await createDevice.mutateAsync({
          tenantId,
          farmId: resolvedFarmId || undefined,
          barnId: resolvedBarnId || undefined,
          batchId: resolvedBatchId || undefined,
          deviceType,
          serialNo: serialNo || undefined,
          status: formValues.status,
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        });
      } else {
        if (!editingDeviceId) {
          setSubmitError('Device ID is missing for edit.');
          return;
        }
        await updateDevice.mutateAsync({
          deviceId: editingDeviceId,
          data: {
            tenantId,
            farmId: farmId ? resolvedFarmId || null : null,
            barnId: barnId ? resolvedBarnId || null : null,
            batchId: batchId ? resolvedBatchId || null : null,
            deviceType,
            serialNo: serialNo || undefined,
            status: formValues.status,
            metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
          },
        });
      }
      setDialogOpen(false);
      refetch();
    } catch (error: any) {
      setSubmitError(error?.message || `Failed to ${dialogMode === 'create' ? 'create' : 'update'} device`);
    }
  };

  const dialogTitle = useMemo(() => {
    return dialogMode === 'create' ? 'Add Device' : 'Edit Device';
  }, [dialogMode]);

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Device Name', flex: 1, minWidth: 150 },
    {
      field: 'type',
      headerName: 'Type',
      width: 120,
      renderCell: (params) => <StatusPill label={params.value.toUpperCase()} color="info" />,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => (
        <HealthBadge
          status={params.value === 'online' ? 'healthy' : params.value === 'offline' ? 'degraded' : 'critical'}
          label={params.value.toUpperCase()}
          showIcon
        />
      ),
    },
    { field: 'tenantName', headerName: 'Tenant', width: 150 },
    { field: 'farmName', headerName: 'Farm', width: 150 },
    { field: 'barnName', headerName: 'Barn', width: 150 },
    { field: 'ipAddress', headerName: 'IP Address', width: 130 },
    {
      field: 'lastSeen',
      headerName: 'Last Seen',
      width: 150,
      renderCell: (params) => formatDistanceToNow(new Date(params.value), { addSuffix: true }),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button size="small" startIcon={<Eye size={16} />} onClick={() => navigate(`/devices/${params.row.id}`)}>
            View
          </Button>
          <Button
            size="small"
            startIcon={<Pencil size={16} />}
            onClick={() => openEditDialog(params.row as Device)}
          >
            Edit
          </Button>
        </Stack>
      ),
    },
  ];

  return (
    <Box>
      <AdminPageHeader
        title="Device Management"
        subtitle="Global device inventory and monitoring"
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<Plus size={16} />} onClick={openCreateDialog}>
              Add Device
            </Button>
            <Button variant="contained" onClick={() => navigate('/devices/onboarding')}>
              Onboard Device
            </Button>
          </Stack>
        }
      />

      <AdminDataTable
        columns={columns}
        rows={data?.data || []}
        loading={isLoading}
        totalRows={data?.total}
        pageSize={pageSize}
        searchPlaceholder="Search devices..."
        filters={filters}
        onFilterChange={setFilters}
        onSearchChange={setSearch}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onRefresh={refetch}
        syncUrlParams
      />

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {submitError && <Alert severity="error">{submitError}</Alert>}
            <TextField
              required
              label="Tenant ID"
              value={formValues.tenantId}
              onChange={(e) => setFormValues((prev) => ({ ...prev, tenantId: e.target.value }))}
              disabled={dialogMode === 'edit'}
              helperText={dialogMode === 'edit' ? 'Tenant ID cannot be changed during edit' : undefined}
              fullWidth
            />
            <TextField
              label="Farm ID"
              value={formValues.farmId}
              onChange={(e) => setFormValues((prev) => ({ ...prev, farmId: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Barn ID"
              value={formValues.barnId}
              onChange={(e) => setFormValues((prev) => ({ ...prev, barnId: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Batch ID"
              value={formValues.batchId}
              onChange={(e) => setFormValues((prev) => ({ ...prev, batchId: e.target.value }))}
              fullWidth
            />
            <TextField
              required
              label="Device Type"
              value={formValues.deviceType}
              onChange={(e) => setFormValues((prev) => ({ ...prev, deviceType: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Serial No / Claim Code"
              value={formValues.serialNo}
              onChange={(e) => setFormValues((prev) => ({ ...prev, serialNo: e.target.value }))}
              fullWidth
            />
            <TextField
              select
              label="Status"
              value={formValues.status}
              onChange={(e) =>
                setFormValues((prev) => ({
                  ...prev,
                  status: e.target.value as 'active' | 'inactive' | 'maintenance',
                }))
              }
              fullWidth
            >
              <MenuItem value="active">active</MenuItem>
              <MenuItem value="inactive">inactive</MenuItem>
              <MenuItem value="maintenance">maintenance</MenuItem>
            </TextField>
            <TextField
              label="Display Name (metadata.name)"
              value={formValues.name}
              onChange={(e) => setFormValues((prev) => ({ ...prev, name: e.target.value }))}
              fullWidth
            />
            <TextField
              label="IP Address (metadata.ipAddress)"
              value={formValues.ipAddress}
              onChange={(e) => setFormValues((prev) => ({ ...prev, ipAddress: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Firmware Version (metadata.firmwareVersion)"
              value={formValues.firmwareVersion}
              onChange={(e) => setFormValues((prev) => ({ ...prev, firmwareVersion: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={submitPending}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitPending}>
            {submitPending ? 'Saving...' : dialogMode === 'create' ? 'Create Device' : 'Update Device'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
