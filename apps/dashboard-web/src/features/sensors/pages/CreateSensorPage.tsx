import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
} from '@mui/material';
import { Save, X } from 'lucide-react';
import { api, unwrapApiResponse } from '../../../api';
import { PageHeader } from '../../../components/PageHeader';
import { useSnackbar } from 'notistack';
import { useActiveContext } from '../../../contexts/ActiveContext';

type SensorFormData = {
  sensorId?: string;
  type?: string;
  unit?: string;
  label?: string;
  barnId?: string;
  enabled?: boolean;
  zone?: string;
};

export const CreateSensorPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const { tenantId } = useActiveContext();

  const { control, handleSubmit, formState: { errors } } = useForm<SensorFormData>({
    defaultValues: {
      enabled: true,
      type: 'temperature',
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: SensorFormData) => {
      if (!tenantId) {
        throw new Error('Tenant is required');
      }
      return api.sensors.create({
        sensor_id: data.sensorId || data.label,
        type: data.type,
        unit: data.unit,
        label: data.label,
        barn_id: data.barnId,
        enabled: data.enabled,
        zone: (data as any).zone,
      });
    },
    onSuccess: (response) => {
      const created = unwrapApiResponse<any>(response as any);
      queryClient.invalidateQueries({ queryKey: ['sensors'] });
      enqueueSnackbar('Sensor created successfully', { variant: 'success' });
      navigate(`/sensors/${created?.sensor_id || created?.sensorId || ''}`);
    },
    onError: (error: any) => {
      enqueueSnackbar(error?.message || 'Failed to create sensor', { variant: 'error' });
    },
  });

  const onSubmit = (data: SensorFormData) => {
    createMutation.mutate(data);
  };

  return (
    <Box>
      <PageHeader
        title="Create Sensor"
        subtitle="Add a new sensor to the catalog"
      />

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 600 }}>
              <Controller
                name="sensorId"
                control={control}
                rules={{ required: 'Sensor ID is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Sensor ID"
                    required
                    error={!!errors.sensorId}
                    helperText={errors.sensorId?.message}
                    placeholder="e.g., sensor-temp-01"
                  />
                )}
              />

              <Controller
                name="label"
                control={control}
                rules={{ required: 'Label is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Label"
                    required
                    error={!!errors.label}
                    helperText={errors.label?.message}
                    placeholder="e.g., Barn 1 Temperature Sensor"
                  />
                )}
              />

              <Controller
                name="type"
                control={control}
                rules={{ required: 'Type is required' }}
                render={({ field }) => (
                  <FormControl required error={!!errors.type}>
                    <InputLabel>Type</InputLabel>
                    <Select {...field} label="Type">
                      <MenuItem value="temperature">Temperature</MenuItem>
                      <MenuItem value="humidity">Humidity</MenuItem>
                      <MenuItem value="weight">Weight</MenuItem>
                      <MenuItem value="pressure">Pressure</MenuItem>
                      <MenuItem value="flow">Flow</MenuItem>
                      <MenuItem value="co2">CO2</MenuItem>
                      <MenuItem value="nh3">NH3</MenuItem>
                    </Select>
                    {errors.type && <FormHelperText>{errors.type.message}</FormHelperText>}
                  </FormControl>
                )}
              />

              <Controller
                name="unit"
                control={control}
                rules={{ required: 'Unit is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Unit"
                    required
                    error={!!errors.unit}
                    helperText={errors.unit?.message}
                    placeholder="e.g., °C, %, kg, Pa"
                  />
                )}
              />

              <Controller
                name="barnId"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Barn ID (optional)"
                    placeholder="e.g., barn-001"
                  />
                )}
              />

              <Controller
                name="zone"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Zone (optional)"
                    placeholder="e.g., Zone A, North Wing"
                  />
                )}
              />

              <Controller
                name="enabled"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch {...field} checked={field.value} />}
                    label="Enabled"
                  />
                )}
              />

              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<Save size={18} />}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Sensor'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<X size={18} />}
                  onClick={() => navigate('/sensors')}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CreateSensorPage;
