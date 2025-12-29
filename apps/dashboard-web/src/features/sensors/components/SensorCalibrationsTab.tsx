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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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

type CalibrationFormData = {
  performed_at?: string;
  performedAt?: string;
  performed_by?: string;
  performedBy?: string;
  method?: string;
  offset?: number;
  gain?: number;
  notes?: string;
};

export const SensorCalibrationsTab: React.FC<Props> = ({ sensorId }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const { control, handleSubmit, reset } = useForm<CalibrationFormData>({
    defaultValues: {
      method: 'manual',
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['sensor-calibrations', sensorId],
    queryFn: async () => {
      const response = await api.sensors.calibrations.list(sensorId, { page: 1, pageSize: 50 });
      return unwrapApiResponse<any[]>(response) || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CalibrationFormData) =>
      api.sensors.calibrations.create(sensorId, {
        offset: data.offset,
        gain: data.gain,
        method: data.method,
        performed_at: data.performedAt || data.performed_at,
        performed_by: data.performedBy || data.performed_by,
        notes: data.notes,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sensor-calibrations', sensorId] });
      queryClient.invalidateQueries({ queryKey: ['sensor', sensorId] });
      enqueueSnackbar('Calibration recorded successfully', { variant: 'success' });
      setDialogOpen(false);
      reset();
    },
    onError: (error: any) => {
      enqueueSnackbar(error?.message || 'Failed to record calibration', { variant: 'error' });
    },
  });

  const calibrations = data || [];

  const columns: GridColDef[] = [
    {
      field: 'performed_at',
      headerName: 'Performed At',
      flex: 1,
      valueGetter: (params) => new Date(params).toLocaleString(),
    },
    { field: 'method', headerName: 'Method', width: 120 },
    { field: 'offset', headerName: 'Offset', width: 100 },
    { field: 'gain', headerName: 'Gain', width: 100 },
    { field: 'performed_by', headerName: 'Performed By', flex: 1 },
    { field: 'notes', headerName: 'Notes', flex: 1 },
  ];

  const onSubmit = (data: CalibrationFormData) => {
    createMutation.mutate(data);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Calibration History</Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<Plus size={16} />}
          onClick={() => setDialogOpen(true)}
        >
          Record Calibration
        </Button>
      </Box>

      {calibrations.length === 0 ? (
        <EmptyState
          title="No calibrations recorded"
          description="Record the first calibration to maintain sensor accuracy."
          actionLabel="Record Calibration"
          onAction={() => setDialogOpen(true)}
          size="sm"
        />
      ) : (
        <DataGrid
          rows={calibrations.map((calibration) => ({
            ...calibration,
            calibration_id: (calibration as any).calibration_id || calibration.id,
            performed_at: calibration.performed_at || (calibration as any).performedAt,
            performed_by: calibration.performed_by || (calibration as any).performedBy,
          }))}
          columns={columns}
          getRowId={(row) => row.calibration_id}
          loading={isLoading}
          autoHeight
          pageSizeOptions={[10, 25]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
        />
      )}

      {/* Record Calibration Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>Record Calibration</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Controller
                name="performed_at"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Performed At"
                    type="datetime-local"
                    required
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />
              <Controller
                name="method"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <FormControl fullWidth required>
                    <InputLabel>Method</InputLabel>
                    <Select {...field} label="Method">
                      <MenuItem value="manual">Manual</MenuItem>
                      <MenuItem value="automatic">Automatic</MenuItem>
                      <MenuItem value="reference">Reference Standard</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
              <Controller
                name="offset"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Offset" type="number" fullWidth />
                )}
              />
              <Controller
                name="gain"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Gain" type="number" fullWidth />
                )}
              />
              <Controller
                name="performed_by"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <TextField {...field} label="Performed By" required fullWidth />
                )}
              />
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <TextField {...field} label="Notes" multiline rows={3} fullWidth />
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Recording...' : 'Record'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};
