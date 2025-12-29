import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Plus } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { api, unwrapApiResponse } from '../../../api';
import { EmptyState } from '../../../components/EmptyState';
import { useSnackbar } from 'notistack';

interface Props {
  sensorId: string;
}

type BindingFormData = {
  device_id?: string;
  deviceId?: string;
  protocol?: string;
  channel?: string;
  topic?: string;
  samplingRate?: number;
  sampling_rate?: number;
  effectiveFrom?: string;
  effective_from?: string;
  effectiveTo?: string | null;
  effective_to?: string | null;
};

export const SensorBindingsTab: React.FC<Props> = ({ sensorId }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const { control, handleSubmit, reset } = useForm<BindingFormData>({
    defaultValues: {
      protocol: 'mqtt',
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['sensor-bindings', sensorId],
    queryFn: async () => {
      const response = await api.sensors.bindings.list(sensorId, { page: 1, pageSize: 50 });
      return unwrapApiResponse<any[]>(response) || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: BindingFormData) =>
      api.sensors.bindings.create(sensorId, {
        device_id: data.deviceId,
        protocol: (data as any).protocol,
        channel: (data as any).channel || (data as any).topic,
        sampling_rate: data.samplingRate,
        effective_from: data.effectiveFrom || (data as any).effective_from,
        effective_to: data.effectiveTo || (data as any).effective_to,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sensor-bindings', sensorId] });
      enqueueSnackbar('Binding created successfully', { variant: 'success' });
      setDialogOpen(false);
      reset();
    },
    onError: (error: any) => {
      enqueueSnackbar(error?.message || 'Failed to create binding', { variant: 'error' });
    },
  });

  const bindings = data || [];

  const columns: GridColDef[] = [
    { field: 'device_id', headerName: 'Device ID', flex: 1 },
    { field: 'protocol', headerName: 'Protocol', width: 100 },
    { field: 'channel', headerName: 'Channel', width: 100 },
    { field: 'topic', headerName: 'Topic', flex: 1 },
    {
      field: 'effective_from',
      headerName: 'Effective From',
      width: 150,
      valueGetter: (params) => new Date(params).toLocaleDateString(),
    },
    {
      field: 'effective_to',
      headerName: 'Effective To',
      width: 150,
      valueGetter: (params) => params ? new Date(params).toLocaleDateString() : 'Active',
    },
  ];

  const onSubmit = (data: BindingFormData) => {
    createMutation.mutate(data);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Device Bindings</Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<Plus size={16} />}
          onClick={() => setDialogOpen(true)}
        >
          Add Binding
        </Button>
      </Box>

      {bindings.length === 0 ? (
        <EmptyState
          title="No bindings configured"
          description="Add a device binding to start collecting data from this sensor."
          actionLabel="Add Binding"
          onAction={() => setDialogOpen(true)}
          size="sm"
        />
      ) : (
        <DataGrid
          rows={bindings.map((binding) => ({
            ...binding,
            binding_id: (binding as any).binding_id || binding.id,
            device_id: binding.device_id || (binding as any).deviceId,
            effective_from: binding.effective_from || (binding as any).effectiveFrom,
            effective_to: binding.effective_to || (binding as any).effectiveTo,
          }))}
          columns={columns}
          getRowId={(row) => row.binding_id}
          loading={isLoading}
          autoHeight
          pageSizeOptions={[10, 25]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
        />
      )}

      {/* Create Binding Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>Add Device Binding</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Controller
                name="device_id"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <TextField {...field} label="Device ID" required fullWidth />
                )}
              />
              <Controller
                name="protocol"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Protocol" fullWidth />
                )}
              />
              <Controller
                name="channel"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Channel (optional)" fullWidth />
                )}
              />
              <Controller
                name="topic"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="MQTT Topic (optional)" fullWidth />
                )}
              />
              <Controller
                name="effective_from"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <TextField {...field} label="Effective From" type="datetime-local" required fullWidth InputLabelProps={{ shrink: true }} />
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};
