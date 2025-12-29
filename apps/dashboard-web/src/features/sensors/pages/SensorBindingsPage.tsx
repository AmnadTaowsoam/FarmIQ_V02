import React, { useMemo, useState } from 'react';
import { Box, Button, TextField } from '@mui/material';
import { PageHeader } from '../../../components/PageHeader';
import { PremiumCard } from '../../../components/common/PremiumCard';
import { BasicTable } from '../../../components/tables/BasicTable';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { LoadingCard } from '../../../components/LoadingCard';
import { useActiveContext } from '../../../contexts/ActiveContext';
import { api, isApiError, getCorrelationId, unwrapApiResponse } from '../../../api';
import ApiErrorState from '../../../components/error/ApiErrorState';
import { Link2 } from 'lucide-react';

export const SensorBindingsPage: React.FC = () => {
  const { tenantId } = useActiveContext();
  const [sensorId, setSensorId] = useState('');
  const [bindings, setBindings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown | null>(null);

  const canSearch = useMemo(() => !!tenantId && !!sensorId.trim(), [tenantId, sensorId]);

  const fetchBindings = async () => {
    if (!tenantId || !sensorId.trim()) return;
    setLoading(true);
    try {
      const response = await api.sensors.bindings.list(sensorId.trim(), { page: 1, pageSize: 100 });
      const bindingsResponse = unwrapApiResponse<any[]>(response) || [];
      const normalized = bindingsResponse.map((binding) => ({
        ...binding,
        device_id: binding.device_id || (binding as any).deviceId,
        sensor_id: binding.sensor_id || (binding as any).sensorId,
        sampling_rate: binding.sampling_rate ?? (binding as any).samplingRate,
        effective_from: binding.effective_from || (binding as any).effectiveFrom,
        effective_to: binding.effective_to || (binding as any).effectiveTo,
      }));
      setBindings(normalized);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ animation: 'fadeIn 0.6s ease-out' }}>
      <PageHeader
        title="Sensor Bindings"
        subtitle="Inspect sensor to device bindings"
        actions={[
          {
            label: 'Load Bindings',
            variant: 'contained',
            startIcon: <Link2 size={18} />,
            onClick: fetchBindings,
            disabled: !canSearch,
          },
        ]}
      />

      <PremiumCard sx={{ mb: 3 }}>
        <TextField
          label="Sensor ID"
          value={sensorId}
          onChange={(event) => setSensorId(event.target.value)}
          fullWidth
        />
        <Box sx={{ mt: 2 }}>
          <Button variant="outlined" onClick={fetchBindings} disabled={!canSearch}>
            Search
          </Button>
        </Box>
      </PremiumCard>

      {loading ? (
        <LoadingCard title="Loading bindings" lines={3} />
      ) : error ? (
        isApiError(error) ? (
          <ApiErrorState
            status={error.response?.status}
            message={error.message}
            correlationId={getCorrelationId(error)}
            endpoint={`/api/v1/sensors/${sensorId.trim()}/bindings`}
            onRetry={fetchBindings}
          />
        ) : (
          <ErrorState title="Failed to load bindings" message={(error as Error).message} />
        )
      ) : bindings.length === 0 ? (
        <EmptyState
          icon={<Link2 size={32} />}
          title="No bindings found"
          description="Enter a sensor ID to view device bindings."
        />
      ) : (
        <PremiumCard noPadding>
          <BasicTable<any>
            columns={[
              { id: 'device_id', label: 'Device ID' },
              { id: 'protocol', label: 'Protocol' },
              { id: 'channel', label: 'Channel' },
              { id: 'sampling_rate', label: 'Sampling Rate' },
              {
                id: 'effective_from',
                label: 'Effective From',
                format: (value) => (value ? new Date(value).toLocaleDateString() : '—'),
              },
              {
                id: 'effective_to',
                label: 'Effective To',
                format: (value) => (value ? new Date(value).toLocaleDateString() : '—'),
              },
            ]}
            data={bindings}
            rowKey="id"
          />
        </PremiumCard>
      )}
    </Box>
  );
};
