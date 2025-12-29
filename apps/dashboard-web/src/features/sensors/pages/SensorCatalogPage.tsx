import React, { useMemo, useState } from 'react';
import { Box, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Button, Typography } from '@mui/material';
import { PageHeader } from '../../../components/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { BasicTable } from '../../../components/tables/BasicTable';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { LoadingCard } from '../../../components/LoadingCard';
import { useActiveContext } from '../../../contexts/ActiveContext';
import { api, isApiError, getCorrelationId, unwrapApiResponse } from '../../../api';
import ApiErrorState from '../../../components/error/ApiErrorState';
import { Activity } from 'lucide-react';
import { NeedHelpButton } from '../../../components/help/NeedHelpButton';

export const SensorCatalogPage: React.FC = () => {
  const { tenantId, barnId } = useActiveContext();
  const [sensors, setSensors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [sensorId, setSensorId] = useState('');
  const [type, setType] = useState('');
  const [unit, setUnit] = useState('');
  const [label, setLabel] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchSensors = async () => {
    console.log('[SensorCatalogPage] fetchSensors called with tenantId:', tenantId, 'barnId:', barnId);
    if (!tenantId) {
      console.log('[SensorCatalogPage] No tenantId, setting empty sensors');
      setSensors([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await api.sensors.list({
        tenantId,
        barnId: barnId || undefined,
        page: 1,
        pageSize: 50,
      });
      console.log('[SensorCatalogPage] API response:', response);
      const sensorsResponse = unwrapApiResponse<any>(response);
      console.log('[SensorCatalogPage] Unwrapped sensors:', sensorsResponse);
      
      // Handle both array and paginated response formats
      let sensorsArray: any[] = [];
      if (Array.isArray(sensorsResponse)) {
        sensorsArray = sensorsResponse;
      } else if (sensorsResponse && typeof sensorsResponse === 'object' && 'items' in sensorsResponse) {
        sensorsArray = Array.isArray(sensorsResponse.items) ? sensorsResponse.items : [];
      }
      
      console.log('[SensorCatalogPage] Sensors array:', sensorsArray);
      const normalized = sensorsArray.map((sensor) => ({
        ...sensor,
        sensor_id: sensor.sensor_id || sensor.sensorId || sensor.id,
        barn_id: sensor.barn_id || sensor.barnId,
      }));
      console.log('[SensorCatalogPage] Normalized sensors:', normalized);
      setSensors(normalized);
      setError(null);
    } catch (err) {
      console.error('[SensorCatalogPage] Error fetching sensors:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchSensors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, barnId]);

  const createDisabled = useMemo(
    () => !tenantId || !sensorId.trim() || !type.trim() || !unit.trim(),
    [tenantId, sensorId, type, unit]
  );

  const handleCreate = async () => {
    if (!tenantId || !sensorId.trim() || !type.trim() || !unit.trim()) return;
    try {
      await api.sensors.create({
        sensor_id: sensorId.trim(),
        type: type.trim(),
        unit: unit.trim(),
        label: label.trim() || undefined,
        barn_id: barnId || undefined,
      });
      setCreateOpen(false);
      setSensorId('');
      setType('');
      setUnit('');
      setLabel('');
      setCreateError(null);
      await fetchSensors();
    } catch (err: any) {
      setCreateError(err?.message || 'Failed to create sensor');
    }
  };

  if (loading) {
    return (
      <Box>
        <PageHeader title="Sensor Catalog" subtitle="Registry of configured sensors" />
        <LoadingCard title="Loading sensors" lines={3} />
      </Box>
    );
  }

  if (error) {
    if (isApiError(error)) {
      return (
        <ApiErrorState
          status={error.response?.status}
          message={error.message}
          correlationId={getCorrelationId(error)}
          endpoint="/api/v1/sensors"
          onRetry={fetchSensors}
        />
      );
    }
    return <ErrorState title="Failed to load sensors" message={(error as Error).message} />;
  }

  return (
    <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
      <PageHeader
        title="Sensor Catalog"
        subtitle="Registry of configured sensors"
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <NeedHelpButton />
            <Button variant="contained" startIcon={<Activity size={18} />} onClick={() => setCreateOpen(true)}>
              Add Sensor
            </Button>
          </Box>
        }
      />

      {sensors.length === 0 ? (
        <EmptyState
          icon={<Activity size={32} />}
          title="No sensors registered"
          description="Create a sensor entry to start tracking device bindings."
        />
      ) : (
        <PremiumCard noPadding>
          <BasicTable<any>
            columns={[
              { id: 'sensor_id', label: 'Sensor ID' },
              { id: 'type', label: 'Type' },
              { id: 'unit', label: 'Unit' },
              { id: 'label', label: 'Label' },
              { id: 'barn_id', label: 'Barn' },
            ]}
            data={sensors}
            rowKey="sensor_id"
          />
        </PremiumCard>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Sensor</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
          <TextField
            label="Sensor ID"
            value={sensorId}
            onChange={(event) => setSensorId(event.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Type"
            value={type}
            onChange={(event) => setType(event.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Unit"
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            fullWidth
          />
          {!tenantId && (
            <Typography variant="body2" color="warning.main">
              Select a tenant before creating sensors.
            </Typography>
          )}
          {createError ? (
            <Typography variant="body2" color="error">
              {createError}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={createDisabled} onClick={handleCreate}>
            Create Sensor
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
